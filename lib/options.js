const path = require('path');

// cached local to the module
const DEFAULT_DOWNLOAD_BASE_DIR = path.normalize(
  path.join(__dirname, '..', 'build')
);


// @private
exports = module.exports = {
  DEFAULT_HOST: '127.0.0.1',
  DEFAULT_BASE_PORT: 27017, // standard MongoDB port, where we start looking
  DEFAULT_DATABASE: 'mongodb-sandbox',
  DEFAULT_DOWNLOAD_BASE_DIR,
};


/**
 * Options for constructing a Sandbox.
 *
 * Beyond the properties called out below,
 * you may provide any options passed to a `MongoDBDownload` instance
 * from the [mongodb-download](https://github.com/winfinit/mongodb-download) module,
 * eg. `{ version, downloadDir }`, etc.
 *
 * @see [Options](https://github.com/cantremember/mongodb-sandbox/JSDOC.md#options)
 *
 * @typedef {Object} Sandbox.options
 * @property {String} host an alternate `bind_ip` for the `mongod` Daemon, eg. '0.0.0.0';
 *   *default* = 127.0.0.1
 * @property {Number} basePort where to start looking for an available local port;
 *   *default* = 27017 (MongoDB standard)
 * @property {String} database the Database name to use in the Test Suite;
 *   *default* = 'mongodb-sandbox'
 * @property {Number} minimumUptimeMs the minimum amount of time that the Topology should be left running,
 *   in milliseconds;
 *   *default* = 0ms
 */


/**
 * Configuration available from a running Sandbox.
 *
 * `port` is not exposed at the top level;
 * rather, it is exposed from the `mongod` option entries within `daemons`.
 *
 * @typedef {Object} Sandbox.config
 * @property {String} url a MongoDB connection URL for the MongoDB Topology
 * @property {String} host the host where the Sandbox is listening
 * @property {String} database the name of the Sandbox database to be used for testing
 * @property {String} downloadDir the directory where the MongoDB binaries have been installed
 * @property {Array<Object>} daemons an Array of `mongod` daemon options,
 *   one for each MongoDB Server which backs the Sandbox,
 *   providing (at least) `{ bind_ip, port, dbpath, url }`
 */
