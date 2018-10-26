const path = require('path');

const { createSandbox } = require('../index');

const version = '3.6.8';
const downloadDir = path.normalize(
  path.join(__dirname, '..', 'build', `mongodb-${ version }`)
);

const singleton = createSandbox({
  version,
  downloadDir,
});


exports = module.exports = singleton;
