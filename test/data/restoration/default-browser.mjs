import { writeFile } from '@web/test-runner-commands';

describe('default browser config', () => {
  it('creates DOM content and records execution', async () => {
    const element = document.createElement('p');
    element.textContent = 'ready';
    if (element.textContent !== 'ready') throw new Error('DOM content was not retained');
    const userAgent = navigator.userAgent;
    let product;
    if (userAgent.indexOf('Firefox/') >= 0) product = 'firefox';
    else if (userAgent.indexOf('Chrome/') >= 0) product = 'chromium';
    else if (userAgent.indexOf('AppleWebKit/') >= 0 && userAgent.indexOf('Safari/') >= 0) product = 'webkit';
    else throw new Error(`Unknown browser user agent: ${userAgent}`);
    await writeFile({
      path: `browser-receipts/${product}.json`,
      content: JSON.stringify({ product, userAgent, content: element.textContent }),
    });
  });
});
