# tsds-web-test-runner

This package is an internal command adapter for running browser tests through [ts-dev-stack](https://www.npmjs.com/package/ts-dev-stack), not a standalone end-user command.

Install and run the parent CLI:

```bash
npm install --save-dev ts-dev-stack
tsds test:browser
```

Pass the Web Test Runner arguments after `test:browser`, for example `tsds test:browser --config wtr.config.mjs`.

Without an explicit test path, it runs `test/**/*.test.{ts,tsx,jsx,mjs}`. Add
`--dry-run` to check command selection without opening a browser.
