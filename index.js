const Sandbox = require('./lib/sandbox');
const Lifecycle = require('./lib/lifecycle');


/**
 * A Factory method for a Sandbox.
 *
 * @params {Sandbox.options} [options] Sandbox configuration options
 * @returns {Sandbox} a MongoDB Sandbox instance
 */
function createSandbox(options) {
  return new Sandbox(options);
}

/**
 * Installs MongoDB support for a Sandbox.
 *
 * @params {Sandbox.options} [options] Sandbox configuration options
 * @returns {Promise<Sandbox>} a Promise resolving
 *   a Sandbox instance which has been installed.
 */
function installSandbox(options) {
  return createSandbox(options).install();
}


exports = module.exports = {
  createSandbox,
  installSandbox,

  Sandbox,
  Lifecycle,
};
