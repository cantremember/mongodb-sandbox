const path = require('path');

const { createSandbox } = require('../index');


const downloadDir = path.normalize(
  path.join(__dirname, '..', 'build', 'mongodb')
);
const singleton = createSandbox({
  version: '3.6.8',
  downloadDir,
});


exports = module.exports = singleton;
