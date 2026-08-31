const assert = require('assert');
const testBrowser = require('tsds-web-test-runner');

describe('exports .cjs', () => {
  it('defaults', () => {
    assert.equal(typeof testBrowser, 'function');
  });
});
