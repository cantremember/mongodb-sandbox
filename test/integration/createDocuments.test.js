const { expect } = require('chai');
const { ObjectId } = require('mongodb');

const sandbox = require('../sandboxUnderTest');

const DOCUMENT_ID = new ObjectId();

/** @private */
function _createOneDocument() {
  let collection;

  return sandbox.hasDocuments()
  .then((hasDocuments) => {
    expect(hasDocuments).to.equal(false);

    return sandbox.newClient();
  })
  .then((client) => {
    return client.db().collection('createDocument');
  })
  .then((_collection) => {
    collection = _collection;

    return collection.insertOne({
      _id: DOCUMENT_ID,
      value: 1,
    });
  })
  .then((commandResult) => {
    expect(commandResult.result).to.deep.equal({ n: 1, ok: 1 });

    return collection.countDocuments();
  })
  .then((count) => {
    expect(count).to.equal(1);

    return collection.findOne({ _id: DOCUMENT_ID });
  })
  .then((doc) => {
    expect(doc).to.not.equal(null);
    expect(doc.value).to.equal(1);
  });
}


describe('within a Lifecycle', () => {
  it('creates a Document in a Test Case', _createOneDocument);
  it('creates the same Document in a subsequent Test Case', _createOneDocument);
});
