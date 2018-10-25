const { expect } = require('chai');
const sinon = require('sinon');
const assert = require('assert');

const Lifecycle = require('../../lib/lifecycle');
const Sandbox = require('../../lib/sandbox');

const INSTANCE_CONTEXT = {
  timeout() { }, // eslint-disable-line no-empty-function
};
const PASSED_CONTEXT = {
  timeout() { }, // eslint-disable-line no-empty-function
};
const NOW = 1234567890000;

function _noTestNeeded() { } // eslint-disable-line no-empty-function


describe('Lifecycle', () => {
  const sinonSandbox = sinon.createSandbox(); // to avoid confusion
  let sandboxMock;
  let lifecycle;

  beforeEach(() => {
    sandboxMock = sinon.mock(Sandbox.prototype);
    lifecycle = new Lifecycle(sandboxMock.object, INSTANCE_CONTEXT);
  });
  afterEach(() => {
    sandboxMock.verify();

    sinonSandbox.restore();
  });


  describe('constructor', () => {
    it('populates the instance', () => {
      expect(lifecycle.sandbox).to.equal(sandboxMock.object);
      expect(lifecycle.context).to.equal(INSTANCE_CONTEXT);

      expect(lifecycle._isSafe).to.equal(false);
      expect(lifecycle._startedAtMs).to.equal(0);
    });

    it('pre-binds its methods', () => {
      const THAT = Object.freeze({ instance: true });
      sinonSandbox.stub(Lifecycle.prototype, 'beforeAll').callsFake(function() {
        expect(this).to.equal(lifecycle); // eslint-disable-line no-invalid-this
      });
      sinonSandbox.stub(Lifecycle.prototype, 'beforeEach').callsFake(function() {
        expect(this).to.equal(lifecycle); // eslint-disable-line no-invalid-this
      });
      sinonSandbox.stub(Lifecycle.prototype, 'afterEach').callsFake(function() {
        expect(this).to.equal(lifecycle); // eslint-disable-line no-invalid-this
      });
      sinonSandbox.stub(Lifecycle.prototype, 'afterAll').callsFake(function() {
        expect(this).to.equal(lifecycle); // eslint-disable-line no-invalid-this
      });

      // reconstruct after the stubbing
      lifecycle = new Lifecycle(sandboxMock.object, INSTANCE_CONTEXT);

      lifecycle.beforeAll.call(THAT);
      lifecycle.beforeEach.call(THAT);
      lifecycle.afterEach.call(THAT);
      lifecycle.afterAll.call(THAT);
    });
  });


  describe('#beforeAll', () => {
    let clock; // eslint-disable-line no-unused-vars

    beforeEach(() => {
      clock = sinonSandbox.useFakeTimers({
        now: NOW,
        shouldAdvanceTime: true,
      });

      // assume Happy Path
      sandboxMock.expects('start').once().resolves();
      sandboxMock.expects('hasDocuments').once().resolves(false);
    });


    it('resolves the Lifecycle instance', () => {
      const { beforeAll } = lifecycle; // implicit pre-binding test

      return beforeAll()
      .then((resolved) => {
        expect(resolved).to.equal(lifecycle);
      });
    });

    it('uses the Test Framework context passed to it', () => {
      sinonSandbox.stub(INSTANCE_CONTEXT, 'timeout');
      sinonSandbox.stub(PASSED_CONTEXT, 'timeout');

      return lifecycle.beforeAll(PASSED_CONTEXT)
      .then(() => {
        expect(INSTANCE_CONTEXT.timeout.callCount).to.equal(0);
        expect(PASSED_CONTEXT.timeout.callCount).to.equal(1);
      });
    });

    it('uses the Test Framework context from the instance', () => {
      sinonSandbox.stub(INSTANCE_CONTEXT, 'timeout');
      sinonSandbox.stub(PASSED_CONTEXT, 'timeout');

      return lifecycle.beforeAll()
      .then(() => {
        expect(INSTANCE_CONTEXT.timeout.callCount).to.equal(1);
        expect(PASSED_CONTEXT.timeout.callCount).to.equal(0);
      });
    });

    it('is fine without a Test Framework context', () => {
      sinonSandbox.stub(INSTANCE_CONTEXT, 'timeout');
      sinonSandbox.stub(PASSED_CONTEXT, 'timeout');

      lifecycle = new Lifecycle(sandboxMock.object);

      return lifecycle.beforeAll()
      .then(() => {
        expect(INSTANCE_CONTEXT.timeout.callCount).to.equal(0);
        expect(PASSED_CONTEXT.timeout.callCount).to.equal(0);
      });
    });

    it('starts its Sandbox', () => {
      return lifecycle.beforeAll(); // @see sandboxMock.verify();
    });

    it('fails to start its Sandbox', () => {
      sandboxMock.restore();
      sandboxMock = sinon.mock(Sandbox.prototype);
      sandboxMock.expects('start').once().rejects(new Error('BOOM'));

      lifecycle = new Lifecycle(sandboxMock.object);

      return lifecycle.beforeAll()
      .then(assert.fail, (err) => {
        expect(err.message).to.equal('BOOM');
      });
    });

    it('expects there to be no Documents in its Sandbox', () => {
      return lifecycle.beforeAll(); // @see sandboxMock.verify();
    });

    it('halts if there are any Documents in its Sandbox', () => {
      sandboxMock.restore();
      sandboxMock = sinon.mock(Sandbox.prototype);
      sandboxMock.expects('start').once().resolves();
      sandboxMock.expects('hasDocuments').once().resolves(true);

      lifecycle = new Lifecycle(sandboxMock.object);

      return lifecycle.beforeAll()
      .then(assert.fail, (err) => {
        expect(err.message).to.match(/mock database contains Documents/);
      });
    });

    it('updates the Lifecycle instance', () => {
      expect(lifecycle._isSafe).to.equal(false);
      expect(lifecycle._startedAtMs).to.equal(0);

      return lifecycle.beforeAll()
      .then(() => {
        // it('marks the Lifecycle as safe')
        expect(lifecycle._isSafe).to.equal(true);

        // it('tracks the start time')
        expect(lifecycle._startedAtMs).to.equal(NOW);
      });
    });
  });


  describe('#beforeEach', () => {
    it('resolves the Lifecycle instance', () => {
      const { beforeEach } = lifecycle; // implicit pre-binding test

      return beforeEach()
      .then((resolved) => {
        expect(resolved).to.equal(lifecycle);
      });
    });

    it('is a no-op placeholder', _noTestNeeded);
  });


  describe('#afterEach', () => {
    beforeEach(() => {
      sandboxMock.expects('purgeDocuments').never();
    });


    it('resolves the Lifecycle instance', () => {
      const { afterEach } = lifecycle; // implicit pre-binding test

      return afterEach()
      .then((resolved) => {
        expect(resolved).to.equal(lifecycle);
      });
    });

    it('does nothing unless the Lifecycle is safe', () => {
      expect(lifecycle._isSafe).to.equal(false);

      return lifecycle.afterEach()
      .then((resolved) => {
        // it('resolves the Lifecycle instance')
        expect(resolved).to.equal(lifecycle);
      });
    });

    it('purges all Documents from its Sandbox', () => {
      sandboxMock.restore();
      sandboxMock = sinon.mock(Sandbox.prototype);
      sandboxMock.expects('purgeDocuments').once().resolves();

      lifecycle = new Lifecycle(sandboxMock.object);
      lifecycle._isSafe = true;

      return lifecycle.afterEach()
      .then((resolved) => {
        // it('resolves the Lifecycle instance')
        expect(resolved).to.equal(lifecycle);
      });
    });

    it('fails to purges Documents', () => {
      sandboxMock.restore();
      sandboxMock = sinon.mock(Sandbox.prototype);
      sandboxMock.expects('purgeDocuments').once().rejects(new Error('BOOM'));

      lifecycle = new Lifecycle(sandboxMock.object);
      lifecycle._isSafe = true;

      return lifecycle.afterEach()
      .then(assert.fail, (err) => {
        expect(err.message).to.equal('BOOM');
      });
    });
  });


  describe('#afterAll', () => {
    let clock; // eslint-disable-line no-unused-vars

    beforeEach(() => {
      clock = sinonSandbox.useFakeTimers({
        now: NOW,
        shouldAdvanceTime: true,
        advanceTimeDelta: 7, // a good prime number
      });
      lifecycle._startedAtMs = NOW;

      // assume Happy Path
      sandboxMock.expects('stop').once().resolves();
    });


    it('resolves the Lifecycle instance', () => {
      const { afterAll } = lifecycle; // implicit pre-binding test

      return afterAll()
      .then((resolved) => {
        expect(resolved).to.equal(lifecycle);
      });
    });

    it('ensures a minimum runtime', () => {
      sandboxMock.restore();

      // a real instance holding a `config`
      const sandbox = new Sandbox({
        minimumUptimeMs: 50,
      });
      sandboxMock = sinon.mock(sandbox);
      sandboxMock.expects('stop').once().resolves();

      lifecycle = new Lifecycle(sandboxMock.object);
      lifecycle._startedAtMs = NOW;

      return lifecycle.afterAll()
      .then(() => {
        expect(Date.now()).to.equal(NOW + 56); // first multiple of 7 beyond 50
      });
    });

    it('stops its Sandbox', () => {
      expect(sandboxMock.object.config).to.equal(undefined);

      return lifecycle.afterAll() // @see sandboxMock.verify();
      .then(() => {
        expect(Date.now()).to.equal(NOW + 7); // one tick; thank you, Promises
      });
    });

    it('fails to stop its Sandbox', () => {
      sandboxMock.restore();
      sandboxMock = sinon.mock(Sandbox.prototype);
      sandboxMock.expects('stop').once().rejects(new Error('BOOM'));

      lifecycle = new Lifecycle(sandboxMock.object);

      return lifecycle.afterAll()
      .then(assert.fail, (err) => {
        expect(err.message).to.equal('BOOM');
      });
    });
  });
});
