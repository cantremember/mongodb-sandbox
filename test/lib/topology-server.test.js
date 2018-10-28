const { expect } = require('chai');
const sinon = require('sinon');
const assert = require('assert');
// TODO:  restore `require('mongodb-download')`
const { MongoDBDownload } = require('@cantremember/mongodb-down-load');
const { Server: TopologyServer } = require('mongodb-topology-manager');

const Sandbox = require('../../lib/sandbox');
const topologyServer = require('../../lib/topology-server');

const HOST = 'HOST';
const PORT = 23;
const MONGOD_BIN_PATH = 'MONGOD_BIN_PATH';


describe('lib/topology-server', () => {
  const sinonSandbox = sinon.createSandbox(); // to avoid confusion
  let sandbox;

  beforeEach(() => {
    sandbox = new Sandbox({
      host: HOST,
    });
    sandbox._port = PORT;
  });
  afterEach(() => {
    sinonSandbox.restore();
  });


  describe('#deriveTopologyConfigArgs', () => {
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
      sandbox._port = undefined;

      expect(() => {
        return topologyServer.deriveTopologyConfigArgs(sandbox);
      }).to.throw(/port has not been derived/);
    });

    it('leverages configuration', () => {
      mongoDBDownloadMock.expects('getDownloadDir').once().returns('/getDownloadDir');

      const configArgs = topologyServer.deriveTopologyConfigArgs(sandbox);
      expect(configArgs).to.deep.equal([
        {
          bind_ip: HOST,
          port: PORT,
          dbpath: '/getDownloadDir/mongodb-sandbox-server-23',
        },
      ]);
    });

    it('falls back to defaults', () => {
      sandbox = new Sandbox();
      // well ... except for the derived port.  we need that.
      sandbox._port = PORT;

      mongoDBDownloadMock.expects('getDownloadDir').once().returns('/getDownloadDir');

      const configArgs = topologyServer.deriveTopologyConfigArgs(sandbox);
      expect(configArgs).to.deep.equal([
        {
          bind_ip: '127.0.0.1',
          port: PORT,
          dbpath: '/getDownloadDir/mongodb-sandbox-server-23',
        },
      ]);
    });
  });


  describe('#deriveTopology', () => {
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
      sinonSandbox.stub(topologyServer, 'deriveTopologyConfigArgs').returns(CONFIG_ARGS);
      sinonSandbox.stub(TopologyServer.prototype, 'purge').resolves();
      sinonSandbox.stub(TopologyServer.prototype, 'discover').resolves();
    });


    it('resolves a Topology', () => {
      return topologyServer.deriveTopology(sandbox, MONGOD_BIN_PATH)
      .then((topology) => {
        expect(topology).to.be.instanceOf(TopologyServer);

        expect(topology.binary).to.equal(MONGOD_BIN_PATH);
        expect(topology.options).to.deep.equal(OPTIONS);
        expect(topology.clientOptions).to.equal(CLIENT_OPTIONS);

        expect(topology.purge.callCount).to.equal(1);
        expect(topology.discover.callCount).to.equal(1);
      });
    });

    it('purges the Topology', () => {
      return topologyServer.deriveTopology(sandbox, MONGOD_BIN_PATH)
      .then((topology) => {
        expect(topology.purge.callCount).to.equal(1);
      });
    });

    it('fails to purge the Topology', () => {
      TopologyServer.prototype.purge.restore();
      sinonSandbox.stub(TopologyServer.prototype, 'purge').rejects(new Error('BOOM'));

      return topologyServer.deriveTopology(sandbox, MONGOD_BIN_PATH)
      .then(assert.fail, (err) => {
        expect(err.message).to.equal('BOOM');

        expect(TopologyServer.prototype.purge.callCount).to.equal(1);
      });
    });

    it('discovers the Topology', () => {
      return topologyServer.deriveTopology(sandbox, MONGOD_BIN_PATH)
      .then((topology) => {
        expect(topology.discover.callCount).to.equal(1);
      });
    });
  });
});

