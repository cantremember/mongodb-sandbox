const { expect } = require('chai');
const sinon = require('sinon');

const index = require('../index');
const  {
  createSandbox,
  installSandbox,

  Sandbox,
} = index;

const OPTIONS = Object.freeze({});


describe('index', () => {
  const sinonSandbox = sinon.createSandbox(); // to avoid confusion

  afterEach(() => {
    sinonSandbox.restore();
  });


  it('exports the module components', () => {
    expect(index).to.have.all.keys([
      'createSandbox',
      'installSandbox',

      'Sandbox',
      'Lifecycle',
    ]);
  });


  describe('createSandbox', () => {
    it('returns a new Sandbox', () => {
      const sandbox = createSandbox(OPTIONS);

      expect(sandbox).to.be.instanceOf(Sandbox);
      expect(sandbox.options).to.equal(OPTIONS);
    });
  });


  describe('installSandbox', () => {
    it('installs a new Sandbox', () => {
      sinonSandbox.stub(Sandbox.prototype, 'install').callsFake(function() {
        return Promise.resolve(this); // eslint-disable-line no-invalid-this
      });

      return installSandbox(OPTIONS)
      .then((sandbox) => {
        expect(sandbox).to.be.instanceOf(Sandbox);
        expect(sandbox.options).to.equal(OPTIONS);

        expect(sandbox.install.callCount).to.equal(undefined); // because of pre-binding
        expect(Sandbox.prototype.install.callCount).to.equal(1);
      });
    });
  });
});
