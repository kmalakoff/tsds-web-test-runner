const assert = require('assert');

const major = +process.versions.node.split('.')[0];
const minor = +process.versions.node.split('.')[1];
// createConfig loads only in-process from a wtr config, which needs >=22.12 (see src/command.ts)
const supported = major > 22 || (major === 22 && minor >= 12);

describe('exports createConfig.cjs', () => {
  it('defaults', () => {
    if (!supported) return;
    const createConfig = require('tsds-web-test-runner/createConfig.cjs');
    assert.equal(typeof createConfig, 'function');
  });
});
