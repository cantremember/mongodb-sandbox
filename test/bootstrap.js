const sandbox = require('./sandboxUnderTest');


before(function() {
  // allocate with a Mocha context
  const lifecycle = sandbox.lifecycle(this); // eslint-disable-line no-invalid-this

  // register the other lifecycle listeners
  beforeEach(lifecycle.beforeEach);
  afterEach(lifecycle.afterEach);
  after(lifecycle.afterAll);

  // kick it all off
  return lifecycle.beforeAll();
});
