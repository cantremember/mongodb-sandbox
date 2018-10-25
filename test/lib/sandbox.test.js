const { expect } = require('chai');
const sinon = require('sinon');
const assert = require('assert');
const { EventEmitter } = require('events');
const {
  MongoClient,
  Db: MongoDb,
  Collection: MongoCollection,
} = require('mongodb');
const { MongoBins } = require('mongodb-prebuilt');
// TODO:  restore `require('mongodb-download')`
const { MongoDBDownload } = require('@cantremember/mongodb-down-load');
const { Server: TopologyServer } = require('mongodb-topology-manager');

const Lifecycle = require('../../lib/lifecycle');
const Sandbox = require('../../lib/sandbox');
const portUtils = require('../../lib/port');

// stubbable skeleton vs. a pure Mock;
//   we also need the named constant for #isRunning purposes
const TOPOLOGY = {
  /* eslint-disable no-empty-function */
  start() { },
  stop() { },
  purge() { },
  /* eslint-enable no-empty-function */
};

const NOW = 1234567890000;
const DELAY = 50; // first multiple of 7 beyond 50
const FAKE_TIME_DELTA = 7;  // a good prime number
const FAKE_DELAY = 56; // first multiple of 7 beyond 50

const HOST = 'HOST';
const PORT = 23;
const DATABASE = 'DATABASE';
const URL = 'mongodb://HOST:23/DATABASE';
const MONGOD_BIN_PATH = 'MONGOD_BIN_PATH';

function _ensureRunningSandbox(sandbox) {
  sandbox._topology = TOPOLOGY;
  expect(sandbox.isRunning).to.equal(true);
}


describe('Sandbox', () => {
  const sinonSandbox = sinon.createSandbox(); // to avoid confusion
  let sandbox;

  beforeEach(() => {
    sandbox = new Sandbox();
  });
  afterEach(() => {
    sinonSandbox.restore();
  });


  describe('constructor', () => {
    it('populates the instance', () => {
      const CONFIG = Object.freeze({ config: true });
      sandbox = new Sandbox(CONFIG);

      expect(sandbox.config).to.equal(CONFIG);
    });

    it('ensures a config Object', () => {
      expect(sandbox.config).to.deep.equal({});
    });

    it('pre-binds its methods', () => {
      const THAT = Object.freeze({ instance: true });
      sinonSandbox.stub(Sandbox.prototype, 'start').callsFake(function() {
        expect(this).to.equal(sandbox); // eslint-disable-line no-invalid-this
      });
      sinonSandbox.stub(Sandbox.prototype, 'stop').callsFake(function() {
        expect(this).to.equal(sandbox); // eslint-disable-line no-invalid-this
      });
      sinonSandbox.stub(Sandbox.prototype, 'install').callsFake(function() {
        expect(this).to.equal(sandbox); // eslint-disable-line no-invalid-this
      });
      sinonSandbox.stub(Sandbox.prototype, 'hasDocuments').callsFake(function() {
        expect(this).to.equal(sandbox); // eslint-disable-line no-invalid-this
      });
      sinonSandbox.stub(Sandbox.prototype, 'purgeDocuments').callsFake(function() {
        expect(this).to.equal(sandbox); // eslint-disable-line no-invalid-this
      });
      sinonSandbox.stub(Sandbox.prototype, 'client').callsFake(function() {
        expect(this).to.equal(sandbox); // eslint-disable-line no-invalid-this
      });
      sinonSandbox.stub(Sandbox.prototype, 'newClient').callsFake(function() {
        expect(this).to.equal(sandbox); // eslint-disable-line no-invalid-this
      });

      // reconstruct after the stubbing
      sandbox = new Sandbox();

      sandbox.start.call(THAT);
      sandbox.stop.call(THAT);
      sandbox.install.call(THAT);
      sandbox.hasDocuments.call(THAT);
      sandbox.purgeDocuments.call(THAT);
      sandbox.client.call(THAT);
      sandbox.newClient.call(THAT);
    });

    it('resets the instance', () => {
      expect(sandbox._mongoBins).to.be.instanceOf(MongoBins);
      expect(sandbox._eventEmitter).to.be.instanceOf(EventEmitter);
      expect(sandbox._isStarting).to.equal(false);
      expect(sandbox._isStopping).to.equal(false);
      expect(sandbox._port).to.equal(undefined);
      expect(sandbox._topology).to.equal(undefined);
      expect(sandbox._client).to.equal(undefined);
      expect(sandbox._clients).to.deep.equal([]);
    });
  });


  describe('#isRunning', () => {
    it('returns true when there is a Topology', () => {
      expect(sandbox.isRunning).to.equal(false);

      _ensureRunningSandbox(sandbox);
      expect(sandbox.isRunning).to.equal(true);
    });
  });


  describe('#options', () => {
    it('fails unless the Sandbox is running', () => {
      expect(sandbox.isRunning).to.equal(false);

      expect(() => {
        return sandbox.options;
      }).to.throw(/not running/);
    });

    it('leverages configuration', () => {
      sandbox = new Sandbox({
        host: HOST,
        database: DATABASE,
      });
      sandbox._topology = TOPOLOGY;
      sandbox._port = PORT;

      expect(sandbox.options).to.deep.equal({
        host: HOST,
        database: DATABASE,
        port: PORT,
        url: URL,
      });
    });

    it('falls back to defaults', () => {
      expect(sandbox.config).to.deep.equal({});
      sandbox._topology = TOPOLOGY;
      sandbox._port = PORT; // Topology + port go hand-in-hand

      expect(sandbox.options).to.deep.equal({
        host: '127.0.0.1',
        database: 'mongodb-sandbox',
        port: PORT,
        url: 'mongodb://127.0.0.1:23/mongodb-sandbox',
      });
    });
  });


  describe('#start', () => {
    let clock; // eslint-disable-line no-unused-vars

    beforeEach(() => {
      clock = sinonSandbox.useFakeTimers({
        now: NOW,
        shouldAdvanceTime: true,
        advanceTimeDelta: FAKE_TIME_DELTA,
      });

      // assume Happy Path
      sinonSandbox.stub(Sandbox.prototype, 'install').resolves();
      sinonSandbox.stub(portUtils, 'derivePort').resolves(PORT);
      sinonSandbox.stub(MongoBins.prototype, 'getCommand').resolves(MONGOD_BIN_PATH);
      sinonSandbox.stub(Sandbox.prototype, '_deriveTopology').resolves(TOPOLOGY);
      sinonSandbox.stub(TOPOLOGY, 'start').resolves();

      // reconstruct after the stubbing
      sandbox = new Sandbox();

      expect(sandbox._isStarting).to.equal(false);
      expect(sandbox.isRunning).to.equal(false);
    });


    it('resolves the Sandbox instance', () => {
      return sandbox.start()
      .then((resolved) => {
        expect(resolved).to.equal(sandbox);
      });
    });

    it('waits for concurrent calls to #start', () => {
      sandbox._isStarting = true;

      const promise = sandbox.start()
      .then((resolved) => {
        // it('resolves the Sandbox instance')
        expect(resolved).to.equal(sandbox);

        // we assume that the #start was already completed concurrently
        expect(Sandbox.prototype.install.callCount).to.equal(0);

        expect(Date.now()).to.equal(NOW + FAKE_DELAY);
      });

      setTimeout(() => {
        const { _eventEmitter } = sandbox;
        _eventEmitter.emit('start');
      }, DELAY);

      return promise;
    });

    it('fails if a concurrent call to #start failed', () => {
      sandbox._isStarting = true;

      const promise = sandbox.start()
      .then(assert.fail, (err) => {
        expect(err.message).to.equal('BOOM');

        expect(Date.now()).to.equal(NOW + FAKE_DELAY);
      });

      setTimeout(() => {
        const { _eventEmitter } = sandbox;
        _eventEmitter.emit('start', new Error('BOOM'));
      }, DELAY);

      return promise;
    });

    it('is a no-op if the Sandbox is already running', () => {
      _ensureRunningSandbox(sandbox);

      return sandbox.start()
      .then((resolved) => {
        // it('resolves the Sandbox instance')
        expect(resolved).to.equal(sandbox);

        // the #start was already completed
        expect(Sandbox.prototype.install.callCount).to.equal(0);
      });
    });

    it('installs the MongoDB binaries', () => {
      return sandbox.start()
      .then(() => {
        expect(Sandbox.prototype.install.callCount).to.equal(1);
      });
    });

    it('fails to install', () => {
      Sandbox.prototype.install.restore();
      sinonSandbox.stub(Sandbox.prototype, 'install').rejects(new Error('BOOM'));

      // reconstruct after the stubbing
      sandbox = new Sandbox();

      return sandbox.start()
      .then(assert.fail, (err) => {
        expect(err.message).to.equal('BOOM');

        expect(Sandbox.prototype.install.callCount).to.equal(1);
      });
    });

    it('derives an available port on this host', () => {
      sandbox = new Sandbox({
        basePort: 5,
      });

      return sandbox.start()
      .then(() => {
        expect(sandbox._port).to.equal(PORT);

        expect(portUtils.derivePort.callCount).to.equal(1);
        expect(portUtils.derivePort.calledWith(5)).to.equal(true);
      });
    });

    it('derives the path to the installed `mongod` binary', () => {
      return sandbox.start()
      .then(() => {
        expect(MongoBins.prototype.getCommand.callCount).to.equal(1);
      });
    });

    it('derives a Topology instance', () => {
      return sandbox.start()
      .then(() => {
        expect(sandbox._topology).to.equal(TOPOLOGY);

        expect(Sandbox.prototype._deriveTopology.callCount).to.equal(1);
        expect(Sandbox.prototype._deriveTopology.calledWith(MONGOD_BIN_PATH)).to.equal(true);
      });
    });

    it('starts a Topology instance', () => {
      return sandbox.start()
      .then(() => {
        expect(TOPOLOGY.start.callCount).to.equal(1);
      });
    });

    it('fails to start a Topology instance', () => {
      TOPOLOGY.start.restore();
      sinonSandbox.stub(TOPOLOGY, 'start').rejects(new Error('BOOM'));

      // reconstruct after the stubbing
      sandbox = new Sandbox();

      return sandbox.start()
      .then(assert.fail, (err) => {
        expect(err.message).to.equal('BOOM');

        expect(TOPOLOGY.start.callCount).to.equal(1);
      });
    });

    it('transitions internal state', () => {
      Sandbox.prototype.install.restore();
      sinonSandbox.stub(Sandbox.prototype, 'install').callsFake(() => {
        expect(sandbox._isStarting).to.equal(true);

        return Promise.resolve();
      });

      // reconstruct after the stubbing
      sandbox = new Sandbox();

      expect(sandbox._isStarting).to.equal(false);
      expect(sandbox.isRunning).to.equal(false);
      expect(sandbox._port).to.equal(undefined);
      expect(sandbox._topology).to.equal(undefined);

      return sandbox.start()
      .then(() => {
        expect(sandbox._isStarting).to.equal(false);
        expect(sandbox.isRunning).to.equal(true);
        expect(sandbox._port).to.equal(PORT);
        expect(sandbox._topology).to.equal(TOPOLOGY);
      });
    });
  });


  describe('#stop', () => {
    let clock; // eslint-disable-line no-unused-vars

    beforeEach(() => {
      clock = sinonSandbox.useFakeTimers({
        now: NOW,
        shouldAdvanceTime: true,
        advanceTimeDelta: FAKE_TIME_DELTA,
      });

      // assume Happy Path
      sinonSandbox.stub(MongoClient.prototype, 'close').resolves();
      sinonSandbox.stub(TOPOLOGY, 'stop').resolves();
      sinonSandbox.stub(TOPOLOGY, 'purge').resolves();
      sinonSandbox.stub(portUtils, 'releasePort').resolves();

      // reconstruct after the stubbing
      sandbox = new Sandbox();

      sandbox._port = PORT;
      sandbox._topology = TOPOLOGY;

      expect(sandbox._isStopping).to.equal(false);
      expect(sandbox.isRunning).to.equal(true);
    });


    it('resolves the Sandbox instance', () => {
      return sandbox.stop()
      .then((resolved) => {
        expect(resolved).to.equal(sandbox);
      });
    });

    it('waits for concurrent calls to #stop', () => {
      sandbox._isStopping = true;

      const promise = sandbox.stop()
      .then((resolved) => {
        // it('resolves the Sandbox instance')
        expect(resolved).to.equal(sandbox);

        // we assume that the #stop was already completed concurrently
        expect(TOPOLOGY.stop.callCount).to.equal(0);

        expect(Date.now()).to.equal(NOW + FAKE_DELAY);
      });

      setTimeout(() => {
        const { _eventEmitter } = sandbox;
        _eventEmitter.emit('stop');
      }, DELAY);

      return promise;
    });

    it('fails if a concurrent call to #stop failed', () => {
      sandbox._isStopping = true;

      const promise = sandbox.stop()
      .then(assert.fail, (err) => {
        expect(err.message).to.equal('BOOM');

        expect(Date.now()).to.equal(NOW + FAKE_DELAY);
      });

      setTimeout(() => {
        const { _eventEmitter } = sandbox;
        _eventEmitter.emit('stop', new Error('BOOM'));
      }, DELAY);

      return promise;
    });

    it('is a no-op if the Sandbox is not running', () => {
      sandbox._topology = undefined;
      expect(sandbox.isRunning).to.equal(false);

      return sandbox.stop()
      .then((resolved) => {
        // it('resolves the Sandbox instance')
        expect(resolved).to.equal(sandbox);

        // the #stop was already completed
        expect(TOPOLOGY.stop.callCount).to.equal(0);
      });
    });

    it('closes all the MongoClients that it allocated', () => {
      const CLIENT_1 = { close: sinonSandbox.spy() };
      const CLIENT_2 = { close: sinonSandbox.spy() };
      sandbox._clients = [ CLIENT_1, CLIENT_2 ];

      return sandbox.stop()
      .then(() => {
        expect(CLIENT_1.close.callCount).to.equal(1);
        expect(CLIENT_2.close.callCount).to.equal(1);

        expect(sandbox._clients.length).to.equal(0);
      });
    });

    it('stops the Topology instance', () => {
      return sandbox.stop()
      .then(() => {
        expect(TOPOLOGY.stop.callCount).to.equal(1);
      });
    });

    it('fails to stop the Topology instance', () => {
      TOPOLOGY.stop.restore();
      sinonSandbox.stub(TOPOLOGY, 'stop').rejects(new Error('BOOM'));

      return sandbox.stop()
      .then(assert.fail, (err) => {
        expect(err.message).to.equal('BOOM');

        expect(TOPOLOGY.stop.callCount).to.equal(1);
      });
    });

    it('purges the Topology\'s temporary directory', () => {
      return sandbox.stop()
      .then(() => {
        expect(TOPOLOGY.purge.callCount).to.equal(1);
      });
    });

    it('releases its reserved port', () => {
      return sandbox.stop()
      .then(() => {
        expect(TOPOLOGY.purge.callCount).to.equal(1);

        expect(portUtils.releasePort.callCount).to.equal(1);
        expect(portUtils.releasePort.calledWith(PORT)).to.equal(true);
      });
    });

    it('resets the instance', () => {
      TOPOLOGY.stop.restore();
      sinonSandbox.stub(TOPOLOGY, 'stop').callsFake(() => {
        expect(sandbox._isStopping).to.equal(true);

        return Promise.resolve();
      });

      return sandbox.stop()
      .then(() => {
        expect(sandbox._mongoBins).to.be.instanceOf(MongoBins);
        expect(sandbox._eventEmitter).to.be.instanceOf(EventEmitter);
        expect(sandbox._isStarting).to.equal(false);
        expect(sandbox._isStopping).to.equal(false);
        expect(sandbox._port).to.equal(undefined);
        expect(sandbox._topology).to.equal(undefined);
        expect(sandbox._client).to.equal(undefined);
        expect(sandbox._clients).to.deep.equal([]);
      });
    });
  });


  describe('#install', () => {
    let mongoDBDownloadMock;

    beforeEach(() => {
      mongoDBDownloadMock = sinonSandbox.mock(MongoDBDownload.prototype);

      // a winfinit module hierarchy
      sandbox._mongoBins = {
        mongoDBPrebuilt: {
          mongoDBDownload: mongoDBDownloadMock.object,
        },
      };
    });

    afterEach(() => {
      mongoDBDownloadMock.verify();
    });


    it('resolves the Sandbox instance', () => {
      mongoDBDownloadMock.expects('isDownloadPresent').once().resolves(true);

      return sandbox.install()
      .then((resolved) => {
        expect(resolved).to.equal(sandbox);
      });
    });

    it('is a no-op if the MongoDB binaries are already installed', () => {
      mongoDBDownloadMock.expects('isDownloadPresent').once().resolves(true);

      return sandbox.install();
    });

    it('downloads the MongoDB binaries', () => {
      mongoDBDownloadMock.expects('isDownloadPresent').once().resolves(false);
      mongoDBDownloadMock.expects('download').once().resolves();

      return sandbox.install();
    });

    it('fails to download the MongoDB binaries', () => {
      mongoDBDownloadMock.expects('isDownloadPresent').once().resolves(false);
      mongoDBDownloadMock.expects('download').once().rejects(new Error('BOOM'));

      return sandbox.install()
      .then(assert.fail, (err) => {
        expect(err.message).to.equal('BOOM');
      });
    });
  });


  describe('#hasDocuments', () => {
    let clientMock;

    beforeEach(() => {
      clientMock = sinonSandbox.mock(MongoClient.prototype);

      sinonSandbox.stub(Sandbox.prototype, 'client').resolves(clientMock.object);

      // reconstruct with configuration
      sandbox = new Sandbox({
        database: DATABASE,
      });

      _ensureRunningSandbox(sandbox);
    });

    afterEach(() => {
      clientMock.verify();
    });


    it('fails unless the Sandbox is running', () => {
      sandbox._topology = undefined;
      expect(sandbox.isRunning).to.equal(false);

      return sandbox.hasDocuments()
      .then(assert.fail, (err) => {
        expect(err.message).to.match(/not running/);
      });
    });

    it('resolves true if any of the Sandbox database Collections contain a Document', () => {
      // the Collection has 1 Document
      const collectionMock = sinonSandbox.mock(MongoCollection.prototype);
      collectionMock.expects('countDocuments').once().resolves(1);

      const dbMock = sinonSandbox.mock(MongoDb.prototype);
      dbMock.expects('collections').once().resolves([ collectionMock.object ]);

      clientMock.expects('db').once().withArgs(DATABASE).returns(dbMock.object);

      return sandbox.hasDocuments()
      .then((hasDocuments) => {
        expect(hasDocuments).to.equal(true);

        dbMock.verify();
        collectionMock.verify();
      });
    });

    it('resolves false if none of the Sandbox database Collections contain a Document', () => {
      // the Collection has no Documents
      const collectionMock = sinonSandbox.mock(MongoCollection.prototype);
      collectionMock.expects('countDocuments').once().resolves(0);

      const dbMock = sinonSandbox.mock(MongoDb.prototype);
      dbMock.expects('collections').once().resolves([ collectionMock.object ]);

      clientMock.expects('db').once().withArgs(DATABASE).returns(dbMock.object);

      return sandbox.hasDocuments()
      .then((hasDocuments) => {
        expect(hasDocuments).to.equal(false);

        dbMock.verify();
        collectionMock.verify();
      });
    });
  });


  describe('#purgeDocuments', () => {
    const DELETE_QUERY = {
      // empty query = match all Documents
    };
    let clientMock;

    beforeEach(() => {
      clientMock = sinonSandbox.mock(MongoClient.prototype);

      sinonSandbox.stub(Sandbox.prototype, 'client').resolves(clientMock.object);

      // reconstruct with configuration
      sandbox = new Sandbox({
        database: DATABASE,
      });

      _ensureRunningSandbox(sandbox);
    });

    afterEach(() => {
      clientMock.verify();
    });


    it('fails unless the Sandbox is running', () => {
      sandbox._topology = undefined;
      expect(sandbox.isRunning).to.equal(false);

      return sandbox.purgeDocuments()
      .then(assert.fail, (err) => {
        expect(err.message).to.match(/not running/);
      });
    });

    it('resolves the Sandbox instance', () => {
      const collectionMock = sinonSandbox.mock(MongoCollection.prototype);
      collectionMock.expects('deleteMany').once().withArgs(DELETE_QUERY).resolves();

      const dbMock = sinonSandbox.mock(MongoDb.prototype);
      dbMock.expects('collections').once().resolves([ collectionMock.object ]);

      clientMock.expects('db').once().withArgs(DATABASE).returns(dbMock.object);

      return sandbox.purgeDocuments()
      .then((resolved) => {
        expect(resolved).to.equal(sandbox);
      });
    });

    it('deletes Documents from every Sandbox database Collection', () => {
      const collectionMock = sinonSandbox.mock(MongoCollection.prototype);
      collectionMock.expects('deleteMany').once().withArgs(DELETE_QUERY).resolves();

      const dbMock = sinonSandbox.mock(MongoDb.prototype);
      dbMock.expects('collections').once().resolves([ collectionMock.object ]);

      clientMock.expects('db').once().withArgs(DATABASE).returns(dbMock.object);

      return sandbox.purgeDocuments()
      .then(() => {
        dbMock.verify();
        collectionMock.verify();
      });
    });
  });


  describe('#lifecycle', () => {
    it('returns a Lifecycle bound to the Sandbox', () => {
      const lifecycle = sandbox.lifecycle();

      expect(lifecycle).to.be.instanceOf(Lifecycle);
      expect(lifecycle.sandbox).to.equal(sandbox);
      expect(lifecycle.context).to.equal(undefined);
    });

    it('accepts a Test Framework context', () => {
      const CONTEXT = Object.freeze({ context: true });
      const lifecycle = sandbox.lifecycle(CONTEXT);

      expect(lifecycle.context).to.equal(CONTEXT);
    });
  });


  describe('#client', () => {
    const CLIENT = Object.freeze({ client: true });

    beforeEach(() => {
      sinonSandbox.stub(Sandbox.prototype, 'newClient').resolves(CLIENT);

      // reconstruct after the stubbing
      sandbox = new Sandbox();

      _ensureRunningSandbox(sandbox);
    });


    it('fails unless the Sandbox is running', () => {
      sandbox._topology = undefined;
      expect(sandbox.isRunning).to.equal(false);

      return sandbox.client()
      .then(assert.fail, (err) => {
        expect(err.message).to.match(/not running/);

        expect(Sandbox.prototype.newClient.callCount).to.equal(0);
      });
    });

    it('resolves a new MongoClient', () => {
      expect(sandbox._clients.length).to.equal(0);

      return sandbox.client()
      .then((client) => {
        expect(client).to.equal(CLIENT);

        expect(Sandbox.prototype.newClient.callCount).to.equal(1);
      });
    });

    it('resolves the same MongoClient', () => {
      sandbox._clients.push(CLIENT);

      return sandbox.client()
      .then((client) => {
        expect(client).to.equal(CLIENT);

        expect(Sandbox.prototype.newClient.callCount).to.equal(0);
      });
    });
  });


  describe('#newClient', () => {
    const CLIENT = Object.freeze({ client: true });

    beforeEach(() => {
      sinonSandbox.stub(MongoClient, 'connect');

      // reconstruct after the stubbing
      sandbox = new Sandbox({
        host: HOST,
        database: DATABASE,
      });
      sandbox._port = PORT;

      _ensureRunningSandbox(sandbox);
      expect(sandbox._clients.length).to.equal(0);
    });


    it('fails unless the Sandbox is running', () => {
      sandbox._topology = undefined;
      expect(sandbox.isRunning).to.equal(false);

      return sandbox.newClient()
      .then(assert.fail, (err) => {
        expect(err.message).to.match(/not running/);
      });
    });

    it('resolves a new MongoClient', () => {
      MongoClient.connect.resolves(CLIENT);

      return sandbox.newClient()
      .then((client) => {
        expect(client).to.equal(CLIENT);

        expect(sandbox._clients).to.deep.equal([ CLIENT ]);

        expect(MongoClient.connect.callCount).to.equal(1);
        expect(MongoClient.connect.calledWith(
          // it('leverages configuration')
          URL,
          { useNewUrlParser: true }
        )).to.equal(true);
      });
    });

    it('resolves a different new MongoClient', () => {
      // it('has already allocated a Client')
      const PRIOR_CLIENT = Object.freeze({ priorClient: true });
      const { _clients } = sandbox;
      _clients.push(PRIOR_CLIENT);

      MongoClient.connect.resolves(CLIENT);

      return sandbox.newClient()
      .then((client) => {
        expect(client).to.equal(CLIENT);

        expect(sandbox._clients).to.deep.equal([ PRIOR_CLIENT, CLIENT ]);

        expect(MongoClient.connect.callCount).to.equal(1);
      });
    });

    it('fails to connect the MongoClient', () => {
      MongoClient.connect.rejects(new Error('BOOM'));

      return sandbox.newClient()
      .then(assert.fail, (err) => {
        expect(err.message).to.equal('BOOM');

        expect(MongoClient.connect.callCount).to.equal(1);
      });
    });
  });


  describe('#_reset', () => {
    const CONFIG = Object.freeze({ // implicit mutation test
      host: HOST,
      basePort: PORT,
      version: 'VERSION',
    });

    beforeEach(() => {
      sandbox = new Sandbox(CONFIG);
    });

    it('resets the local state of the instance', () => {
      expect(sandbox._mongoBins).to.be.instanceOf(MongoBins);
      expect(sandbox._eventEmitter).to.be.instanceOf(EventEmitter);
      expect(sandbox._isStarting).to.equal(false);
      expect(sandbox._isStopping).to.equal(false);
      expect(sandbox._port).to.equal(undefined);
      expect(sandbox._topology).to.equal(undefined);
      expect(sandbox._client).to.equal(undefined);
      expect(sandbox._clients).to.deep.equal([]);
    });

    it('constructs a configured winfinit module hierarchy', () => {
      const { mongoDBDownload } = sandbox._mongoBins.mongoDBPrebuilt;
      expect(mongoDBDownload).to.not.equal(undefined);

      const { options } = mongoDBDownload;
      expect(options).to.not.have.any.keys([ 'host', 'basePort' ]);
      expect(options).to.include.all.keys([ 'version' ]);
      expect(options.version).to.equal('VERSION');
    });
  });


  describe('#_deriveTopologyConfigArgs', () => {
    let mongoDBDownloadMock;

    beforeEach(() => {
      mongoDBDownloadMock = sinonSandbox.mock(MongoDBDownload.prototype);

      // a winfinit module hierarchy
      sandbox._mongoBins = {
        mongoDBPrebuilt: {
          mongoDBDownload: mongoDBDownloadMock.object,
        },
      };
    });

    afterEach(() => {
      mongoDBDownloadMock.verify();
    });


    it('requires a port to have been derived for the Sandbox', () => {
      expect(sandbox._port).to.equal(undefined);

      expect(() => {
        return sandbox._deriveTopologyConfigArgs();
      }).to.throw(/port has not been derived/);
    });

    it('leverages configuration', () => {
      sandbox = new Sandbox({
        host: HOST,
      });
      sandbox._port = PORT;

      mongoDBDownloadMock.expects('getDownloadDir').once().returns('/getDownloadDir');

      const configArgs = sandbox._deriveTopologyConfigArgs();
      expect(configArgs).to.deep.equal([
        {
          bind_ip: HOST,
          port: PORT,
          dbpath: '/getDownloadDir/mongodb-sandbox-server-23',
        },
      ]);
    });

    it('falls back to defaults', () => {
      // well ... except for the derived port.  we need that.
      sandbox._port = PORT;

      mongoDBDownloadMock.expects('getDownloadDir').once().returns('/getDownloadDir');

      const configArgs = sandbox._deriveTopologyConfigArgs();
      expect(configArgs).to.deep.equal([
        {
          bind_ip: '127.0.0.1',
          port: PORT,
          dbpath: '/getDownloadDir/mongodb-sandbox-server-23',
        },
      ]);
    });
  });


  describe('#_deriveTopology', () => {
    const OPTIONS = Object.freeze({
      // things it would really expect
      //   and auto-default it we just passed { options: true }
      bind_ip: HOST,
      port: PORT,
      dbpath: '/path/to/database',
    });
    const CLIENT_OPTIONS = Object.freeze({ clientOptions: true });

    beforeEach(() => {
      const CONFIG_ARGS = [ OPTIONS, CLIENT_OPTIONS ];

      // assume Happy Path
      sinonSandbox.stub(Sandbox.prototype, '_deriveTopologyConfigArgs').returns(CONFIG_ARGS);
      sinonSandbox.stub(TopologyServer.prototype, 'purge').resolves();
      sinonSandbox.stub(TopologyServer.prototype, 'discover').resolves();

      // reconstruct after the stubbing
      sandbox = new Sandbox();
    });


    it('resolves a Topology', () => {
      return sandbox._deriveTopology()
      .then((topology) => {
        expect(topology).to.be.instanceOf(TopologyServer);
        expect(topology.options).to.deep.equal(OPTIONS);
        expect(topology.clientOptions).to.equal(CLIENT_OPTIONS);

        expect(topology.purge.callCount).to.equal(1);
        expect(topology.discover.callCount).to.equal(1);
      });
    });

    it('purges the Topology', () => {
      return sandbox._deriveTopology()
      .then((topology) => {
        expect(topology.purge.callCount).to.equal(1);
      });
    });

    it('fails to purge the Topology', () => {
      TopologyServer.prototype.purge.restore();
      sinonSandbox.stub(TopologyServer.prototype, 'purge').rejects(new Error('BOOM'));

      return sandbox._deriveTopology()
      .then(assert.fail, (err) => {
        expect(err.message).to.equal('BOOM');

        expect(TopologyServer.prototype.purge.callCount).to.equal(1);
      });
    });

    it('discoveres the Topology', () => {
      return sandbox._deriveTopology()
      .then((topology) => {
        expect(topology.discover.callCount).to.equal(1);
      });
    });
  });


  describe('#_assertRunning', () => {
    it('throws an Error unless the Sandbox is running', () => {
      expect(sandbox.isRunning).to.equal(false);

      expect(() => {
        return sandbox._assertRunning();
      }).to.throw(/not running/);
    });

    it('is happy with a running Sandbox', () => {
      _ensureRunningSandbox(sandbox);

      expect(() => {
        return sandbox._assertRunning();
      }).to.not.throw();
    });
  });
});
