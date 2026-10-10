# Testing

Install dependencies and build with `npm ci` and `npm run build`. Install the
matching Playwright browsers into an absolute path and use that same path for
tests. For example, from the repository root on POSIX:

```sh
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.tmp/playwright-browsers"
npm exec --no -- playwright install --with-deps
npm test
```

In PowerShell, set `$env:PLAYWRIGHT_BROWSERS_PATH` to
`Join-Path $PWD '.tmp/playwright-browsers'` before the same install and test
commands. CI supplies this path for installation and execution. The normal
browser integration covers Chromium, Firefox and WebKit. The restoration suite
uses a real Chromium test for successful operation with failed cleanup; its
failure scenarios do not launch a browser. Native fixture packages are acquired
over the network into an owned child home, independently of the user's caches.
