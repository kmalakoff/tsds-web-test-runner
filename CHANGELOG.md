# Changelog

## [1.21.0] - 2026-10-09

### Fixed

Attempt to restore the temporary installation link after browser setup or test
failure. Report restoration failures to the callback, preserving a sole error
and retaining both errors in operation-first order when both fail.

Filter Linux Rollup optional dependencies by the detected libc using the
installer's selection logic.

Load the default Playwright browser configuration correctly in CommonJS
consumer projects.
