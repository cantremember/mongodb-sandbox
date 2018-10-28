const sandbox = require('./sandboxUnderTest');


before(function() {
  if (process.env.TEST_SCOPE === 'unit') {
    // manual hack
    //   don't spend the time to spin up the Sandbox
    //   and if shit fails, it's your own damn fault
    return undefined;
  }

  // allocate with a Mocha context
  const lifecycle = sandbox.lifecycle(this); // eslint-disable-line no-invalid-this

  // register the other lifecycle listeners
  beforeEach(lifecycle.beforeEach);
  afterEach(lifecycle.afterEach);
  after(lifecycle.afterAll);

  // kick it all off
  return lifecycle.beforeAll();
});
