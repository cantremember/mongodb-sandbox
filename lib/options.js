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
 * Configuration options for constructing a Sandbox.
 *
 * Beyond the properties called out below,
 * you may provide any options passed to a `MongoDBDownload` instance
 * from the [mongodb-download](https://github.com/winfinit/mongodb-download) module,
 * eg. `{ version, downloadDir }`, etc.
 *
 * @see {Object} https://github.com/cantremember/mongodb-sandbox/JSDOC.md#options
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
