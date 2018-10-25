const Sandbox = require('./lib/sandbox');
const Lifecycle = require('./lib/lifecycle');


/**
 * A Factory method for a Sandbox.
 *
 * @params {Sandbox.config} [config] a Sandbox configuration
 * @returns {Sandbox} a MongoDB Sandbox instance
 */
function createSandbox(config) {
  return new Sandbox(config);
}

/**
 * @params {Sandbox.config} [config] a Sandbox configuration
 * @returns {Promise<Sandbox>} a Promise resolving
 *   a Sandbox instance which has been installed.
 */
function installSandbox(config) {
  return createSandbox(config).install();
}


exports = module.exports = {
  createSandbox,
  installSandbox,

  Sandbox,
  Lifecycle,
};
