const { createSandbox } = require('../index');

const singleton = createSandbox({
  version: '3.6.8',
});


exports = module.exports = singleton;
