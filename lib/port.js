const portfinder = require('portfinder');

const debug = require('./debug');

const DEFAULT_BASE_PORT = 27017; // standard MongoDB port, where we start looking
const reservedPortSet = new Set();


/**
 * @private
 * @returns {Promise<Number>} a Promise resolving
 *   an available port on this host
 */
function derivePort(basePort) {
  // find the first free port
  portfinder.basePort = (basePort || DEFAULT_BASE_PORT);

  return portfinder.getPortPromise()
  .then((port) => {
    if (reservedPortSet.has(port)) {
      // start one past there
      debug(`reserved port collision on ${ port } ... re-deriving`);
      return derivePort(port + 1);
    }

    // reserve it before we use it
    //   thank you, concurrent Sandbox #start()s
    reservedPortSet.add(port);
    debug(`reserved port ${ port }`);

    return port;
  });
}

/**
 * @private
 * @param {Number} port a previously reserved port
 * @param {Boolean} true if the port was released
 */
function releasePort(port) {
  const hadReserved = reservedPortSet.has(port);
  if (hadReserved) {
    reservedPortSet.delete(port);
  }

  return hadReserved;
}


exports = module.exports = {
  derivePort,
  releasePort,
};
