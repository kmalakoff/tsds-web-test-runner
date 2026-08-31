import assert from 'assert';
import testBrowser from 'tsds-web-test-runner';

describe('exports .mjs', () => {
  it('defaults', () => {
    assert.equal(typeof testBrowser, 'function');
  });
});
