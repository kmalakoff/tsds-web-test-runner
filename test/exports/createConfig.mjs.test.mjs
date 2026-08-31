import assert from 'assert';

const major = +process.versions.node.split('.')[0];
const minor = +process.versions.node.split('.')[1];
// createConfig loads only in-process from a wtr config, which needs >=22.12 (see src/command.ts)
const supported = major > 22 || (major === 22 && minor >= 12);

describe('exports createConfig.mjs', () => {
  it('defaults', (done) => {
    if (!supported) return done();
    import('tsds-web-test-runner/createConfig.mjs').then((mod) => {
      assert.equal(typeof mod.default, 'function');
      done();
    }, done);
  });
});
