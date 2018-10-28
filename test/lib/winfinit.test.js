const { expect } = require('chai');
const path = require('path');
const { MongoDBPrebuilt, MongoBins } = require('mongodb-prebuilt');
// TODO:  restore `require('mongodb-download')`
const { MongoDBDownload } = require('@cantremember/mongodb-down-load');

const winfinit = require('../../lib/winfinit');


describe('lib/winfinit', () => {
  describe('deriveMongoBins', () => {
    it('does not mutate the options', () => {
      const OPTIONS = Object.freeze({});

      return winfinit.deriveMongoBins(OPTIONS);
    });

    it('constructs a winfinit component hierarchy', () => {
      const mongoBins = winfinit.deriveMongoBins({});
      expect(mongoBins).to.be.instanceOf(MongoBins);

      const { mongoDBPrebuilt } = mongoBins;
      expect(mongoDBPrebuilt).to.be.instanceOf(MongoDBPrebuilt);

      const { mongoDBDownload } = mongoDBPrebuilt;
      expect(mongoDBDownload).to.be.instanceOf(MongoDBDownload);
    });

    it('leverages configuration', () => {
      const mongoBins = winfinit.deriveMongoBins({
        host: 'HOST',
        basePort: 23,
        version: 'VERSION',
        downloadDir: '/DOWNLOAD/DIR',
      });

      const { mongoDBDownload } = mongoBins.mongoDBPrebuilt;
      expect(mongoDBDownload.getVersion()).to.equal('VERSION');
      expect(mongoDBDownload.getDownloadDir()).to.equal('/DOWNLOAD/DIR/mongodb-download');

      // it('omitted irrelevant configuration')
      const { options } = mongoDBDownload;
      expect(options).to.not.have.any.keys([ 'host', 'basePort' ]);
    });

    it('falls back to defaults', () => {
      const mongoBins = winfinit.deriveMongoBins({});

      const { mongoDBDownload } = mongoBins.mongoDBPrebuilt;
      expect(mongoDBDownload.getVersion()).to.equal('latest');

      // it('expects `mongodb-download` to create its own download sub-directory')
      const downloadDir = mongoDBDownload.getDownloadDir();
      const pathSegments = downloadDir.split(path.sep);
      expect(pathSegments.pop()).to.equal('mongodb-download');

      const useful = pathSegments.slice(pathSegments.length - 3);
      expect(useful).to.deep.equal([ 'mongodb-sandbox', 'build', 'mongodb-latest' ]);
    });
  });
});
