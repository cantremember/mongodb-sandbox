const urlLib = require('url');
const { EventEmitter } = require('events');
const { MongoClient } = require('mongodb');

const Lifecycle = require('./lifecycle');
const debug = require('./debug');
const portUtils = require('./port'); // for easy stubbing
const winfinit = require('./winfinit'); // for easy stubbing
const topologyServer = require('./topology-server'); // for easy stubbing
const {
  DEFAULT_HOST,
  DEFAULT_DATABASE,
} = require('./options');


const MONGO_CLIENT_OPTIONS = {
  useNewUrlParser: true,
};

/**
 * @private
 */
function _waitForEmit(eventEmitter, eventName) {
  debug(`Sandbox: waiting on a concurrent ${ eventName } ...`);

  return new Promise((resolve, reject) => {
    eventEmitter.once(eventName, (err) => {
      debug(`Sandbox: rejoining a concurrent ${ eventName }`);

      if (err === undefined) {
        resolve();
      }
      else {
        reject(err);
      }
    });
  });
}

/**
 * @private
 */
function _formatMongoDBURL({ host, port, database }) {
  // `url.format` does a crappy job across Node versions with { protocol: 'mongodb://' } and any variant
  const urlParsed = {
    protocol: 'mongodb://',
    hostname: host,
    port,
    pathname: `/${ database }`,
  };
  const url = urlLib.format(urlParsed).replace(/mongodb:[/]+:?/, 'mongodb://');

  return url;
}


/**
 * A Sandbox that launches a stand-alone MongoDB Topology for use within a Test Suite.
 *
 * @class
 */
class Sandbox {
  /**
   * @constructor
   * @params {Sandbox.options} [options] Sandbox configuration options
   */
  constructor(options) {
    /**
     * The configuration options passed to the constructor.
     *
     * @property {Sandbox.options}
     */
    this.options = options || {};


    // pre-bind a context, to allow for easy deconstruction
    [
      'start', 'stop', 'install',
      'hasDocuments', 'purgeDocuments',
      'client', 'newClient',
    ].forEach((methodName) => {
      this[methodName] = this[methodName].bind(this);
    });

    this._reset();
  }


  /**
   * `true` if the Sandbox is running.
   *
   * @member {Boolean}
   */
  get isRunning() {
    return (this._topology !== undefined);
  }

  /**
   * Configuration properties for connecting to the MongoDB Topology backing a running Sandbox.
   *
   * @member {Sandbox.config}
   * @throws {Error} if the Sandbox is not running.
   */
  get config() {
    this._assertRunning();

    const { _port: port, _mongoBins, _topology, options } = this;

    // our options
    const host = (options.host || DEFAULT_HOST);
    const database = (options.database || DEFAULT_DATABASE);
    const downloadDir = _mongoBins.mongoDBPrebuilt.mongoDBDownload.getDownloadDir();
    const topologyUrl = _formatMongoDBURL({ host, port, database });

    // `mongod` daemon options
    //   with the connection URL
    const daemons = [ _topology.options ].map((daemonOptions) => {
      const url = _formatMongoDBURL({
        host: (daemonOptions.bind_ip || host),
        port: daemonOptions.port,
        database,
      });

      return Object.assign({}, daemonOptions, { url });
    });

    return {
      // applies to the entire Topology
      url: topologyUrl,
      host,
      database,
      downloadDir,
      daemons,

      // whereas `port` is daemon-specific, so we don't expose it at top-level
    };
  }


  /**
   * @returns {Promise<Sandbox>} a Promise resolving `this`
   */
  start() {
    const { _eventEmitter, _mongoBins, options } = this;

    if (this._isStarting) {
      // thank you, concurrent use of a singleton Sandbox
      return _waitForEmit(_eventEmitter, 'start')
      .then(() => {
        return this;
      });
    }

    if (this.isRunning) {
      return Promise.resolve(this);
    }

    this._isStarting = true;
    const finish = (err) => {
      this._isStarting = false;
      _eventEmitter.emit('start', err);

      if (err) {
        throw err;
      }
    };


    return this.install()
    .then(() => {
      const { basePort } = options;

      // we must derive ...
      return Promise.all([
        portUtils.derivePort(basePort), // an available port on this host
        _mongoBins.getCommand(), // the path to the installed `mongod` binary from `mongodb-prebuilt`
      ]);
    })
    .then(([ port, mongodBinPath ]) => {
      // before we derive anything
      this._port = port;
      debug(`Sandbox: derived port: ${ port }`);

      return topologyServer.deriveTopology(this, mongodBinPath);
    })
    .then((topology) => {
      return topology.start()
      .then(() => {
        // @see #isRunning
        this._topology = topology;
      });
    })
    .then(() => {
      const { config } = this;
      debug(`Sandbox: started: ${ JSON.stringify(config) }`);
      finish();

      return this;
    })
    .catch(finish);
  }

  /**
   * @returns {Promise<Sandbox>} a Promise resolving `this`
   */
  stop() {
    const { _eventEmitter, _clients, _topology } = this;

    if (this._isStopping) {
      // thank you, concurrent use of a singleton Sandbox
      return _waitForEmit(_eventEmitter, 'stop')
      .then(() => {
        return this;
      });
    }

    if (! this.isRunning) {
      return Promise.resolve(this);
    }

    this._isStopping = true;
    const finish = (err) => {
      this._isStopping = false;
      _eventEmitter.emit('stop', err);

      if (err) {
        throw err;
      }
    };


    return Promise.all(
      _clients.map((client) => client.close())
    )
    .then(() => {
      // they're all closed;  don't try to close them again
      _clients.length = 0;

      return _topology.stop();
    })
    .then(() => {
      // purge the temporary directory
      return _topology.purge();
    })
    .then(() => {
      // free up the port we'd reserved
      portUtils.releasePort(this._port);

      // detach & forget
      this._reset();

      debug('Sandbox: stopped');
      finish();

      return this;
    })
    .catch(finish);
  }


  /**
   * Install a version of MongoDB.
   *
   * @see [mongodb-download](https://github.com/winfinit/mongodb-download)
   * @returns {Promise<Sandbox>} a Promise resolving `this`
   */
  install() {
    const { _mongoBins } = this;
    const { mongoDBDownload } = _mongoBins.mongoDBPrebuilt;

    return mongoDBDownload.isDownloadPresent()
    .then((isDownloadPresent) => {
      if (isDownloadPresent) {
        return undefined;
      }

      return mongoDBDownload.download();
    })
    .then(() => {
      return this;
    });
  }

  /**
   * @returns {Promise<Boolean>} a Promise resolving `true`
   *   if the Sandbox contains any Documents.
   */
  hasDocuments() {
    try {
      this._assertRunning();
    }
    catch (err) {
      return Promise.reject(err);
    }

    return this.client()
    .then((client) => {
      const { database } = this.config;
      const db = client.db(database);

      return db.collections();
    })
    .then((collections) => {
      return Promise.all(collections.map((collection) => collection.countDocuments()));
    })
    .then((counts) => {
      return counts.some((count) => count !== 0);
    });
  }

  /**
   * Delete all Documents from the Sandbox.
   *
   * @returns {Promise<Sandbox>} a Promise resolving `this`
   */
  purgeDocuments() {
    try {
      this._assertRunning();
    }
    catch (err) {
      return Promise.reject(err);
    }

    return this.client()
    .then((client) => {
      const { database } = this.config;
      const db = client.db(database);

      return db.collections();
    })
    .then((collections) => {
      return Promise.all(collections.map((collection) => {
        return collection.deleteMany({});
      }));
    })
    .then(() => {
      return this;
    });
  }


  /**
   * @params {Object} [context] an instance of the Test Framework context
   * @returns {Promise<Lifecycle>} a Promise resolving
   *   a Lifecycle instance.
   */
  lifecycle(context) {
    return new Lifecycle(this, context);
  }

  /**
   * @see {@link Sandbox#newClient}
   * @returns {Promise<MongoClient>} a Promise resolving
   *   a singleton MongoDB Client connected to the Sandbox.
   */
  client() {
    try {
      this._assertRunning();
    }
    catch (err) {
      return Promise.reject(err);
    }

    // the first one we allocated
    const { _clients } = this;
    const client = _clients[0];
    if (client !== undefined) {
      return Promise.resolve(client);
    }

    // implicitly allocate
    return this.newClient();
  }

  /**
   * The Connections backing all returned Clients will be closed automatically upon `#stop`.
   *
   * @returns {Promise<MongoClient>} a Promise resolving
   *   a MongoDB Client connected to the Sandbox.
   */
  newClient() {
    try {
      this._assertRunning();
    }
    catch (err) {
      return Promise.reject(err);
    }

    const { _clients } = this;
    const { url } = this.config;

    return MongoClient.connect(url, MONGO_CLIENT_OPTIONS)
    .then((client) => {
      _clients.push(client);

      return client;
    });
  }


  /**
   * Flush the cached state of this instance.
   *
   * @private
   */
  _reset() {
    const { options } = this;

    // @private
    this._mongoBins = winfinit.deriveMongoBins(options);

    this._eventEmitter = new EventEmitter();
    this._isStarting = false;
    this._isStopping = false;

    this._port = undefined;
    this._topology = undefined;

    this._client = undefined;
    this._clients = [];
  }

  /**
   * @private
   * @throws {Error} if the Sandbox is not running.
   */
  _assertRunning() {
    if (! this.isRunning) {
      throw new Error('MongoDB Sandbox is not running');
    }
  }
}


exports = module.exports = Sandbox;
