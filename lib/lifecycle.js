const debug = require('./debug');

const DOWNLOAD_TIMEOUT = 90000; // 90s


/**
 * A simple encapsulation of methods for a Test Framework lifecycle.
 *
 * @class
 */
class Lifecycle {
  /**
   * @constructor
   * @params {Sandbox} sandbox
   * @params {Object} [context] an instance of the Test Framework context
   */
  constructor(sandbox, context) {
    /**
     * The Sandbox passed to the constructor.
     *
     * @property {Sandbox}
     */
    this.sandbox = sandbox;

    /**
     * The Test Framework context passed to the constructor.
     *
     * @property {Object}
     */
    this.context = context;


    // @private
    this._isSafe = false;
    this._startedAtMs = 0;

    // pre-bind a context, to allow for easy deconstruction
    [
      'beforeAll', 'beforeEach',
      'afterEach', 'afterAll',
    ].forEach((methodName) => {
      this[methodName] = this[methodName].bind(this);
    });
  }

  /**
   * To be invoked at the **start** of the global Test Framework lifecycle.
   *
   * @params {Object} [context] an instance of the Test Framework context
   * @returns {Promise<Lifecycle>} a Promise resolving `this`
   */
  beforeAll(passedContext=null) { // a fallback value prevents Mocha from passing a callback Function
    const { sandbox, context: thisContext } = this;
    const context = passedContext || thisContext;

    // initial state
    this._isSafe = false;
    this._startedAtMs = 0;

    if (context !== undefined) {
      // *two* things could cause a Test Case timeout here:
      //   the `mongodb-download` process, which happens "the first time"
      //   launching the Topology

      if (context.timeout instanceof Function) {
        // a very `mocha` thing to do
        context.timeout(DOWNLOAD_TIMEOUT);
        debug('Lifecycle: expecting long timeout');
      }
    }

    return sandbox.start()
    .then(() => {
      return sandbox.hasDocuments();
    })
    .then((hasDocuments) => {
      if (hasDocuments) {
        // under mock conditions, we should NEVER find real data;
        //   all Collections should be empty.
        //   if we DO find data, we are probably connected to a real database!
        throw new Error('TestHelper#beforeAll: mock database contains Documents');
      }

      // we are verified as safe
      this._isSafe = true;
      this._startedAtMs = Date.now();
      debug('Lifecycle: started');

      return this;
    });
  }

  /**
   * To be invoked at the **start** of each individual case in the Test Framework lifecycle.
   *
   * @params {Object} [context] an instance of the Test Framework context
   * @returns {Promise<Lifecycle>} a Promise resolving `this`
   */
  beforeEach(/* passedContext=null */) {
    // for completism
    return Promise.resolve(this);
  }

  /**
   * To be invoked at the **end** of each individual case in the Test Framework lifecycle.
   *
   * @params {Object} [context] an instance of the Test Framework context
   * @returns {Promise<Lifecycle>} a Promise resolving `this`
   */
  afterEach(/* passedContext=null */) {
    const { sandbox, _isSafe } = this;
    if (! _isSafe) {
      return Promise.resolve(this);
    }

    // purge all Documents before moving onwards
    return sandbox.purgeDocuments()
    .then(() => {
      debug('Lifecycle: purged Documents after Test Case');

      return this;
    });
  }

  /**
   * To be invoked at the **end** of the global Test Framework lifecycle.
   *
   * @params {Object} [context] an instance of the Test Framework context
   * @returns {Promise<Lifecycle>} a Promise resolving `this`
   */
  afterAll(/* passedContext=null */) {
    const { sandbox, _startedAtMs } = this;
    const { minimumUptimeMs } = (sandbox.options || {});

    // ensure the Topology runs for a minimum amount of time
    //   to avoid it shutting down during `autoIndex` creation
    //   "Unhandled rejection MongoError: topology was destroyed"
    //      "at ensureIndex (/Users/dfoley/src/politear/zignal-models/node_modules/mongodb/lib/db.js:1151:76)"
    return new Promise((resolve) => {
      const unwaited = (_startedAtMs + (minimumUptimeMs || 0)) - Date.now();
      const delay = Math.max(0, unwaited);
      if (delay !== 0) {
        debug(`Lifecycle: ensuring minimum uptime of ${ minimumUptimeMs }ms`);
      }

      setTimeout(resolve, delay);
    })
    .then(() => {
      return sandbox.stop();
    })
    .then(() => {
      debug('Lifecycle: stopped');

      return this;
    });
  }
}


exports = module.exports = Lifecycle;
