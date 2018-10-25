/* eslint max-nested-callbacks: [1, 5] */

const { expect } = require('chai');
const sinon = require('sinon');
const assert = require('assert');
const portfinder = require('portfinder');
const {
  derivePort,
  releasePort,
} = require('../../lib/port');

const BASE_PORT = 5;
const PORT = 23;


describe('lib/port', () => {
  const sinonSandbox = sinon.createSandbox(); // to avoid confusion
  const basePort = portfinder.basePort;

  beforeEach(() => {
    sinonSandbox.stub(portfinder, 'getPortPromise');
  });

  afterEach(() => {
    sinonSandbox.restore();

    portfinder.basePort = basePort;
    releasePort(PORT);
  });


  describe('derivePort', () => {
    it('finds a port', () => {
      portfinder.getPortPromise.resolves(PORT);

      return derivePort(BASE_PORT)
      .then((port) => {
        // it('has to modify the `portfinder` singleton *sigh*')
        expect(portfinder.basePort).to.equal(BASE_PORT);

        expect(portfinder.getPortPromise.callCount).to.equal(1);
        expect(port).to.equal(PORT);
      });
    });

    it('fails to find a port', () => {
      portfinder.getPortPromise.rejects(new Error('BOOM'));

      return derivePort()
      .then(assert.fail, (err) => {
        expect(err.message).to.equal('BOOM');

        expect(portfinder.getPortPromise.callCount).to.equal(1);
      });
    });

    it('assumes a default basePort', () => {
      portfinder.getPortPromise.resolves(PORT);

      return derivePort()
      .then((port) => {
        expect(portfinder.basePort).to.equal(27017);

        expect(portfinder.getPortPromise.callCount).to.equal(1);
        expect(port).to.equal(PORT);
      });
    });

    it('reserves a port that it previously found', () => {
      portfinder.getPortPromise.onCall(0).resolves(PORT);
      portfinder.getPortPromise.onCall(1).resolves(PORT); // duplicate
      portfinder.getPortPromise.onCall(2).resolves(9000); // alternate

      return derivePort(BASE_PORT) // 1st
      .then((port) => {
        expect(portfinder.getPortPromise.callCount).to.equal(1);
        expect(portfinder.basePort).to.equal(BASE_PORT);
        expect(port).to.equal(PORT);

        return derivePort(BASE_PORT); // 2nd
      })
      .then((port) => {
        expect(portfinder.getPortPromise.callCount).to.equal(3);
        expect(portfinder.basePort).to.equal(PORT + 1); // because PORT got reserved
        expect(port).to.equal(9000);
      });
    });
  });


  describe('releasePort', () => {
    it('releases a previously reserved port', () => {
      portfinder.getPortPromise.resolves(PORT);

      return derivePort(BASE_PORT)
      .then((port) => {
        expect(port).to.equal(PORT);

        expect(releasePort(PORT)).to.equal(true);
        expect(releasePort(PORT)).to.equal(false); // already released

        return derivePort(BASE_PORT);
      })
      .then((port) => {
        // it('can reallocate the released port')
        expect(port).to.equal(PORT);
      });
    });
  });
});
