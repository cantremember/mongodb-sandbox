const { expect } = require('chai');
const assert = require('assert');

const Lifecycle = require('../../lib/lifecycle');
const sandbox = require('../sandboxUnderTest');


it('already has Documents, thus is unsafe', () => {
  // the assumption being that you've somehow connected to a *real* MonggoDB Database
  //   and your Test Suite should halt in its tracks

  // a new Lifecycle wrapping the same Sandbox
  //   and it's amazing pre-bound methods
  const {
    beforeAll,
    beforeEach,
    afterEach,
    afterAll,
  } = new Lifecycle(sandbox);

  return sandbox.hasDocuments()
  .then((hasDocuments) => {
    // not yet it doesn't
    expect(hasDocuments).to.equal(false);

    return sandbox.newClient()
    .then((client) => client.db().collection('alreadyHasDocuments'))
    .then((collection) => collection.insertOne({
      value: 1,
    }))
    .then(sandbox.hasDocuments);
  })
  .then((hasDocuments) => {
    // and now it does
    expect(hasDocuments).to.equal(true);

    // and it's gonna hate ALL OVER this
    return beforeAll();
  })
  .then(assert.fail, (err) => {
    expect(err.message).to.match(/mock database contains Documents/);

    return beforeEach()
    .then(sandbox.hasDocuments);
  })
  .then((hasDocuments) => {
    expect(hasDocuments).to.equal(true);

    return afterEach()
    .then(sandbox.hasDocuments);
  })
  .then((hasDocuments) => {
    expect(hasDocuments).to.equal(true);

    return afterAll();
  })
  .then(() => {
    // we stopped the Sandbox under test
    expect(sandbox.isRunning).to.equal(false);

    // we're sure not gonna leave it that way
    return sandbox.start();
  })
  .then(() => {
    expect(sandbox.isRunning).to.equal(true);
  });
});
