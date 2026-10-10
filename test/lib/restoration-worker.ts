// The generated CJS entry must parse on the actual legacy caller.
export default `// A CJS entry lets the actual old caller assert errors returned by the production bridge.
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var bind = require('node-version-call').bind;
var linkModule = require('module-link-unlink').linkModule;
var unlink = require('link-unlink').unlink;
var resolve = require('resolve');
var Queue = require('queue-cb');
var modulePath = process.argv[4];
var command = require(path.join(modulePath, 'dist/cjs/command.js'));
var root = process.argv[2];
var scenario = process.argv[3];
var defaultConfig = scenario === 'commonjs' || scenario === 'module';
var cwd = path.join(root, 'fixture');
var parent = path.join(cwd, 'links');
var retained = path.join(cwd, 'retained');
var target = path.join(parent, 'target');
var modules = path.join(cwd, 'node_modules');
var receipt = path.join(cwd, 'acquired.json');
var packages = [];
var calls = 0;

assert.strictEqual(fs.realpathSync(process.env.HOME), path.join(root, 'home'));
assert.strictEqual(fs.realpathSync(process.env.USERPROFILE), path.join(root, 'home'));
fs.mkdirSync(cwd);
fs.mkdirSync(parent);
fs.writeFileSync(target, 'original target');
var original = fs.lstatSync(target);
var parentStat = fs.lstatSync(parent);
fs.mkdirSync(modules);

function sameNode(filename, stat) {
  var current = fs.lstatSync(filename);
  assert.strictEqual(current.dev, stat.dev);
  assert.strictEqual(current.ino, stat.ino);
  assert.strictEqual(current.isSymbolicLink(), stat.isSymbolicLink());
}

function restored() {
  sameNode(target, original);
  assert.ok(fs.lstatSync(target).isFile());
  assert.strictEqual(fs.readFileSync(target, 'utf8'), 'original target');
  assert.deepEqual(fs.readdirSync(parent), ['target']);
}

function finish(error) {
  if (error) {
    console.error(error.stack || error);
    if (error.errors) console.error(require('util').inspect(error.errors, false, 5));
    process.exit(1);
  }
  console.log('RESTORATION_OK ' + process.versions.node + ' ' + scenario);
}

function checkNative() {
  packages.forEach(function (pkg) {
    var manifest = resolve.sync(pkg.name + '/package.json', { basedir: cwd });
    var metadata = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    assert.strictEqual(metadata.name, pkg.name);
    assert.strictEqual(metadata.version, pkg.version);
    if (pkg.name !== 'rollup' && pkg.name !== 'esbuild') {
      if (metadata.cpu) assert.ok(metadata.cpu.indexOf(acquired.arch) >= 0);
      if (metadata.os) assert.ok(metadata.os.indexOf(acquired.platform) >= 0);
    }
    var real = fs.realpathSync(path.dirname(manifest));
    if (pkg.name.indexOf('@esbuild/') === 0) {
      assert.strictEqual(real, fs.realpathSync(path.join(root, 'home', '.iml', pkg.name + '@' + pkg.version)));
    } else assert.strictEqual(real, fs.realpathSync(pkg.source));
  });
}

function callback(error) {
  try {
    assert.strictEqual(++calls, 1);
    if (defaultConfig) {
      assert.ifError(error);
      var receipts = path.join(cwd, 'test', 'browser-receipts');
      var filenames = ['chromium.json', 'firefox.json', 'webkit.json'];
      assert.deepEqual(fs.readdirSync(receipts).sort(), filenames);
      filenames.forEach(function (filename) {
        var record = JSON.parse(fs.readFileSync(path.join(receipts, filename), 'utf8'));
        assert.strictEqual(record.product + '.json', filename);
        assert.strictEqual(typeof record.userAgent, 'string');
        if (record.product === 'firefox') assert.ok(record.userAgent.indexOf('Firefox/') >= 0);
        else if (record.product === 'chromium') assert.ok(record.userAgent.indexOf('Chrome/') >= 0);
        else {
          assert.ok(record.userAgent.indexOf('AppleWebKit/') >= 0 && record.userAgent.indexOf('Safari/') >= 0);
          assert.strictEqual(record.userAgent.indexOf('Chrome/'), -1);
          assert.strictEqual(record.userAgent.indexOf('Firefox/'), -1);
        }
        assert.strictEqual(record.content, 'ready');
      });
      checkNative();
      restored();
      return finish();
    }
    assert.ok(error instanceof Error);
    if (scenario === 'setup') {
      assert.strictEqual(error.code, 'ELOOP');
      assert.strictEqual(error.errors, undefined);
      restored();
      return finish();
    }
    checkNative();
    var acquired = JSON.parse(fs.readFileSync(receipt, 'utf8'));
    if (scenario === 'operation') {
      assert.strictEqual(error.errors, undefined);
      assert.ok(error.status > 0);
      assert.ok(String(error.stderr).indexOf('BROWSER_RESTORATION_OPERATION_FAILURE') >= 0);
      restored();
      return finish();
    }
    if (scenario === 'cleanup') {
      assert.strictEqual(error.errors, undefined);
      assert.strictEqual(error.code, 'ENOENT');
      assert.strictEqual(error.path, parent);
    } else {
      assert.ok(Array.isArray(error.errors));
      assert.strictEqual(error.errors.length, 2);
      var operation = error.errors[0];
      var cleanup = error.errors[1];
      assert.ok(operation instanceof Error);
      assert.ok(operation.message.length > 0);
      assert.ok(operation.stack.length > 0);
      assert.ok(operation.status > 0);
      assert.ok(String(operation.stderr).indexOf('BROWSER_RESTORATION_OPERATION_FAILURE') >= 0);
      assert.ok(cleanup instanceof Error);
      assert.ok(cleanup.message.length > 0);
      assert.ok(cleanup.stack.length > 0);
      assert.strictEqual(cleanup.code, 'ENOENT');
      assert.strictEqual(cleanup.path, parent);
    }
    sameNode(retained, parentStat);
    var observed;
    var observationError;
    var observationCalls = 0;
    bind('>=22.12', path.join(root, 'acquisition.cjs'), { spawnOptions: false })(modulePath, path.join(retained, 'target'), function (failure, result) {
      observationCalls++;
      observationError = failure;
      observed = result;
    });
    assert.strictEqual(observationCalls, 1);
    assert.ifError(observationError);
    assert.strictEqual(observed.node, acquired.node);
    assert.strictEqual(observed.platform, acquired.platform);
    assert.strictEqual(observed.arch, acquired.arch);
    assert.strictEqual(observed.dev, acquired.dev);
    assert.strictEqual(observed.ino, acquired.ino);
    assert.strictEqual(observed.symbolic, true);
    assert.strictEqual(observed.real, cwd);
    var backups = fs.readdirSync(retained).filter(function (name) { return name.indexOf('target.') === 0; });
    assert.strictEqual(backups.length, 1);
    assert.deepEqual(fs.readdirSync(retained).sort(), ['target', backups[0]].sort());
    sameNode(path.join(retained, backups[0]), original);
    fs.renameSync(retained, parent);
    unlink(target, function (failure) {
      try {
        assert.ifError(failure);
        restored();
        finish();
      } catch (assertion) { finish(assertion); }
    });
  } catch (failure) {
    failure.errors = [error];
    finish(failure);
  }
}

if (scenario === 'setup') {
  var rollup = path.join(modules, 'rollup');
  fs.symlinkSync(rollup, rollup, 'dir');
  command([], { cwd: cwd, installPath: target }, callback);
} else {
  if (scenario === 'cleanup' || defaultConfig) {
    assert.ok(process.env.PLAYWRIGHT_BROWSERS_PATH, 'Set PLAYWRIGHT_BROWSERS_PATH for both playwright install and tests');
    assert.ok(fs.statSync(process.env.PLAYWRIGHT_BROWSERS_PATH).isDirectory(), 'Install the matching Playwright browser before the cleanup regression');
  }
  var acquired;
  var acquisitionError;
  var acquisitionCalls = 0;
  bind('>=22.12', path.join(root, 'acquisition.cjs'), { spawnOptions: false })(modulePath, function (error, result) {
    acquisitionCalls++;
    acquisitionError = error;
    acquired = result;
  });
  // The binder catches callback throws; assert only after its callback has returned.
  assert.strictEqual(acquisitionCalls, 1);
  assert.ifError(acquisitionError);
  var version = acquired.node.split('.');
  assert.ok(+version[0] > 22 || (+version[0] === 22 && +version[1] >= 12));
  assert.strictEqual(acquired.platform, process.platform);
  packages = acquired.packages;
  var queue = new Queue(1);
  packages.forEach(function (pkg) { queue.defer(function (cb) { linkModule(pkg.source, modules, cb); }); });
  queue.await(function (error) {
    if (error) return finish(error);
    try {
      ['rollup', 'esbuild'].forEach(function (owner) {
        assert.strictEqual(resolve.sync(owner + '/package.json', { basedir: cwd }), path.join(modules, owner, 'package.json'));
      });
      if (defaultConfig) {
        fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({ name: 'browser-default-fixture', version: '1.0.0', type: scenario }));
        fs.mkdirSync(path.join(cwd, 'test'));
        fs.writeFileSync(path.join(cwd, 'test', 'example.test.mjs'), fs.readFileSync(path.join(modulePath, 'test', 'data', 'restoration', 'default-browser.mjs')));
        return command([], { cwd: cwd, installPath: target, stdio: 'inherit' }, callback);
      }
      var config = path.join(cwd, 'restoration.config.mjs');
      fs.writeFileSync(path.join(cwd, 'browser.test.mjs'), "describe('real restoration fixture', () => { it('passes', () => {}); });\\n");
      fs.writeFileSync(config, [
        "import assert from 'node:assert';",
        "import fs from 'node:fs';",
        scenario === 'cleanup' ? "import { playwrightLauncher } from '@web/test-runner-playwright';" : '',
        'const target = ' + JSON.stringify(target) + ';',
        'assert.ok(fs.lstatSync(target).isSymbolicLink());',
        'assert.strictEqual(fs.realpathSync(target), ' + JSON.stringify(cwd) + ');',
        'var acquired = fs.lstatSync(target);',
        'fs.writeFileSync(' + JSON.stringify(receipt) + ', JSON.stringify({ node: process.versions.node, platform: process.platform, arch: process.arch, dev: acquired.dev, ino: acquired.ino }));',
        scenario !== 'operation' ? 'fs.renameSync(' + JSON.stringify(parent) + ', ' + JSON.stringify(retained) + ');' : '',
        scenario === 'cleanup' ? "export default { browsers: [playwrightLauncher({ product: 'chromium' })] };" : "throw new Error('BROWSER_RESTORATION_OPERATION_FAILURE');"
      ].join('\\n'));
      command(['--config', config, 'browser.test.mjs'], { cwd: cwd, installPath: target, stdio: 'pipe', encoding: 'utf8' }, callback);
    } catch (failure) { finish(failure); }
  });
}
`;

// Native selection and retained-link observation use the production worker runtime range.
export const acquisitionSource = `module.exports = function acquire(modulePath, retainedTarget) {
  var assert = require('assert');
  var fs = require('fs');
  var path = require('path');
  if (retainedTarget) {
    var stat = fs.lstatSync(retainedTarget);
    return { node: process.versions.node, platform: process.platform, arch: process.arch, dev: stat.dev, ino: stat.ino, symbolic: stat.isSymbolicLink(), real: fs.realpathSync(retainedTarget) };
  }
  var resolve = require('resolve');
  var optional = require('install-optional');
  var packages = [];
  ['rollup', 'esbuild'].forEach(function (owner) {
    var manifest = resolve.sync(owner + '/package.json', { basedir: modulePath });
    var metadata = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    var selected = Object.keys(metadata.optionalDependencies || {}).filter(function (name) {
      return name.indexOf(process.platform + '-' + process.arch) >= 0 && optional.matchesLibc(name);
    });
    assert.ok(selected.length > 0, 'Missing compatible native metadata for ' + owner);
    [owner].concat(selected).forEach(function (name) {
      var filename = resolve.sync(name + '/package.json', { basedir: path.dirname(manifest) });
      var pkg = JSON.parse(fs.readFileSync(filename, 'utf8'));
      assert.strictEqual(pkg.name, name);
      if (name !== owner) assert.strictEqual(pkg.version, metadata.optionalDependencies[name]);
      packages.push({ name: name, version: pkg.version, source: path.dirname(filename) });
    });
  });
  return { node: process.versions.node, platform: process.platform, arch: process.arch, packages: packages };
};
`;
