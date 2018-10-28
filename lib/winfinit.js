const path = require('path');
const { MongoDBPrebuilt, MongoBins } = require('mongodb-prebuilt');
// TODO:  restore `require('mongodb-download')`
const { MongoDBDownload } = require('@cantremember/mongodb-down-load');

const {
  DEFAULT_DOWNLOAD_BASE_DIR,
} = require('./options');


/**
 * @private
 * @returns {Object} an a configured `MongoBins`
 */
function deriveMongoBins(options) {
  const { version } = options;
  const downloadDir = path.join(DEFAULT_DOWNLOAD_BASE_DIR, `mongodb-${ version || 'latest' }`);

  // a configured downloader
  const downloadOptions = Object.assign({
    downloadDir,
  }, options);
  delete downloadOptions.host;
  delete downloadOptions.basePort;

  const mongoDBDownload = (new MongoDBDownload(downloadOptions));

  // binaries coupled to a pre-built backed by the downloader
  //   eg. to propagate { version, downloadDir } etc.
  const mongoBins = new MongoBins('mongod');
  mongoBins.mongoDBPrebuilt = new MongoDBPrebuilt(mongoDBDownload);

  return mongoBins;
}


exports = module.exports = {
  deriveMongoBins,
};
