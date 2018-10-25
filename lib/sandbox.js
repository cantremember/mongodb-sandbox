const urlLib = require('url');
const path = require('path');
const { EventEmitter } = require('events');
const { MongoClient } = require('mongodb');
const { MongoDBPrebuilt, MongoBins } = require('mongodb-prebuilt');
// TODO:  restore `require('mongodb-download')`
const { MongoDBDownload } = require('@cantremember/mongodb-down-load');
const { Server: TopologyServer } = require('mongodb-topology-manager');

const Lifecycle = require('./lifecycle');
const debug = require('./debug');
const portUtils = require('./port'); // for easy stubbing


// defaults
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_DATABASE = 'mongodb-sandbox';

const MONGO_CLIENT_OPTIONS = {
  useNewUrlParser: true,
};

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
 * A Sandbox that launches a stand-alone MongoDB Server for use within a Test Suite.
 *
 * @class
 */
class Sandbox {
  /**
   * @constructor
   * @params {Sandbox.config} [config] a Sandbox configuration
   */
  constructor(config) {
    this.config = config || {};

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
   * Options for connecting to the MongoDB Topology backing a running Sandbox.
   *
   * - host
   * - port
   * - database
   * - url
   *
   * @member {Object}
   * @throws {Error} if the Sandbox is not running.
   */
  get options() {
    this._assertRunning();

    const { _port: port, config } = this;
    const host = (config.host || DEFAULT_HOST);
    const database = (config.database || DEFAULT_DATABASE);

    // `url.format` does a crappy job with { protocol: 'mongodb://' } and any variant
    const urlParsed = {
      hostname: host,
      port,
      pathname: `/${ database }`,
    };
    const url = `mongodb:${ urlLib.format(urlParsed) }`;

    return {
      host,
      port,
      database,
      url,
    };
  }


  /**
   * @returns {Promise<Sandbox>} a Promise resolving `this`
   */
  start() {
    const { _eventEmitter, _mongoBins, config } = this;

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
      const { basePort } = config;

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

      return this._deriveTopology(mongodBinPath);
    })
    .then((topology) => {
      return topology.start()
      .then(() => {
        // @see #isRunning
        this._topology = topology;
      });
    })
    .then(() => {
      const { options } = this;
      debug(`Sandbox: started: ${ JSON.stringify(options) }`);
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
      const { database } = this.options;
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
      const { database } = this.options;
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
    const { url } = this.options;

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
    const { config } = this;

    // a configured downloader
    const downloadConfig = Object.assign({}, config);
    delete downloadConfig.host;
    delete downloadConfig.basePort;
    const mongoDBDownload = (new MongoDBDownload(downloadConfig));

    // binaries coupled to a pre-built backed by the downloader
    //   eg. to propagate { version, downloadDir } etc.
    const mongoBins = new MongoBins('mongod');
    mongoBins.mongoDBPrebuilt = new MongoDBPrebuilt(mongoDBDownload);

    // @private
    this._mongoBins = mongoBins;

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
   * @returns {Object}
   * @throws {Error} if a port has not been derived for the Sandbox.
   */
  _deriveTopologyConfigArgs() {
    const { _mongoBins, _port, config } = this;
    const { host } = config;

    if (_port === undefined) {
      throw new Error('MongoDB Sandbox port has not been derived');
    }

    // allocate a temporary directory for database files
    //   we expect `mongodb-download` to create its own subdir beneath { downloadDir };
    //   we'll produce a sibling directory
    const { mongoDBDownload } = _mongoBins.mongoDBPrebuilt;
    const downloadDir = mongoDBDownload.getDownloadDir();
    const pathSegments = downloadDir.split(path.sep);
    const dbpath = path.join(pathSegments.join(path.sep), `mongodb-sandbox-server-${ _port }`);

    // call signature: TopologyServer(urlNotOurProblem, options, clientOptions)
    return [
      // single Server options
      {
        bind_ip: (host || DEFAULT_HOST),
        port: _port,
        dbpath,
      }
      // no clientOptions
    ];
  }

  /**
   * @private
   * @returns {Promise<Object>} a Promise resolving
   *   a Topology
   */
  _deriveTopology(mongodBinPath) {
    // establish a MongoDB Topology
    const args = this._deriveTopologyConfigArgs();
    const topology = new TopologyServer(mongodBinPath, ...args);

    // cleanup
    return topology.purge()
    .then(() => {
      // query for the resulting configuration
      return topology.discover();
    })
    .then(() => {
      return topology;
    });
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
