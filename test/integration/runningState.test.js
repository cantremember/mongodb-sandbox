const { expect } = require('chai');
const path = require('path');

const sandbox = require('../sandboxUnderTest');


describe('examining the running state', () => {
  it('is running', () => {
    expect(sandbox.isRunning).to.equal(true);
  });


  it('connected to the specified database', () => {
    const { database } = sandbox.options;
    expect(database).to.equal('mongodb-sandbox');

    return sandbox.client()
    .then((client) => {
      const db = client.db();
      expect(db.s.databaseName).to.equal(database);
    });
  });


  it('allows us to create a sibling directory for the temporary physical database', () => {
    // layers upon layers
    const { _mongoBins } = sandbox;
    const { mongoDBDownload } = _mongoBins.mongoDBPrebuilt;

    const downloadDir = mongoDBDownload.getDownloadDir();
    const pathSegments = downloadDir.split(path.sep);

    // it('expects `mongodb-download` to create its own download sub-directory')
    expect(pathSegments.pop()).to.equal('mongodb-download');
    const remaining = pathSegments.join(path.sep);
    expect(remaining).to.equal(sandbox.config.downloadDir);
  });
});
