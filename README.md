# tsds-web-test-runner

This package is an internal command adapter for running browser tests through [ts-dev-stack](https://www.npmjs.com/package/ts-dev-stack), not a standalone end-user command.

Install the parent CLI and this adapter locally so browser installation uses the
adapter's resolved Playwright version.

The default configuration runs Chromium, Firefox and WebKit. Their matching
Playwright binaries and OS dependencies must be installed before running tests.
The browser installation step below uses the locally installed Playwright CLI.
Provide browser tests using Mocha's `describe` and `it` under
`test/**/*.test.{ts,tsx,jsx,mjs}` before running the test command.

```bash
npm install --save-dev ts-dev-stack tsds-web-test-runner
npm exec --no -- playwright install --with-deps
npm exec --no -- tsds test:browser
```

Repeat browser installation after changing the resolved Playwright version. If
you set `PLAYWRIGHT_BROWSERS_PATH`, use the same absolute path for installation
and execution. See [Playwright browser management](https://playwright.dev/docs/browsers#managing-browser-binaries)
and [repository test setup](CONTRIBUTING.md).

Pass the Web Test Runner arguments after `test:browser`, for example
`npm exec --no -- tsds test:browser --config wtr.config.mjs`.

Without an explicit test path, it runs `test/**/*.test.{ts,tsx,jsx,mjs}`. Add
`--dry-run` to check command selection without opening a browser.

Starting with the planned 1.21.0 release, the adapter attempts to restore its
temporary installation link after setup or test failure. A sole operation or
restoration failure is reported directly. If both fail, the callback
receives an Error whose `errors` array contains the operation error first and the
restoration error second.
