const { expect } = require('chai');

const Lifecycle = require('../../lib/lifecycle');
const sandbox = require('../sandboxUnderTest');


it('purges Documents between a #stop and subsequent #start', () => {
  // to be sure that it has no Documents

  // a new Lifecycle wrapping the same Sandbox
  //   and it's amazing pre-bound methods
  const {
    afterAll,
  } = new Lifecycle(sandbox);

  return sandbox.hasDocuments()
  .then((hasDocuments) => {
    // not yet it doesn't
    expect(hasDocuments).to.equal(false);

    return sandbox.newClient()
    .then((client) => client.db().collection('purgesAcrossRestart'))
    .then((collection) => collection.insertOne({
      value: 1,
    }))
    .then(sandbox.hasDocuments);
  })
  .then((hasDocuments) => {
    // and now it does
    expect(hasDocuments).to.equal(true);

    return afterAll();
  })
  .then(() => {
    // we stopped the Sandbox under test
    expect(sandbox.isRunning).to.equal(false);

    // we're sure not gonna leave it that way
    return sandbox.start()
    .then(sandbox.hasDocuments);
  })
  .then((hasDocuments) => {
    // and ... they're gone!
    expect(hasDocuments).to.equal(false);
  });
});
