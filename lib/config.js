/**
 * Configuration for a Sandbox.
 *
 * Beyond the properties called out below,
 * the configuration may include any options passed to a `MongoDBDownload` instance
 * from the [mongodb-download](https://github.com/winfinit/mongodb-download) module,
 * eg. `{ version, downloadDir }`, etc.
 *
 * @typedef {Object} Sandbox.config
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
