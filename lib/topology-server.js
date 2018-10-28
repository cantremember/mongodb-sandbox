const path = require('path');
const { Server: TopologyServer } = require('mongodb-topology-manager');

const {
  DEFAULT_HOST,
} = require('./options');


/**
 * @private
 * @returns {Object}
 * @throws {Error} if a port has not been derived for the Sandbox.
 */
function deriveTopologyConfigArgs(sandbox) {
  const { _mongoBins, _port, options } = sandbox;
  const { host } = options;

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
function deriveTopology(sandbox, mongodBinPath) {
  // establish a MongoDB Topology
  const args = exports.deriveTopologyConfigArgs(sandbox); // for easy stubbing
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


exports = module.exports = {
  deriveTopologyConfigArgs,
  deriveTopology,
};
