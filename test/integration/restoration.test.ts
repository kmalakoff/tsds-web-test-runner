// Native fixtures acquire real packages over the network into a private child home.
import assert from 'assert';
import { type ChildProcessWithoutNullStreams, execFile, spawn } from 'child_process';
import fs from 'fs';
import { safeRmSync } from 'fs-remove-compat';
import path from 'path';
import workerSource, { acquisitionSource } from '../lib/restoration-worker.ts';

const scratch = path.resolve('.tmp');
const modulePath = path.resolve('.');
let sequence = 0;

function run(scenario: string, done: Mocha.Done): void {
  const root = path.join(scratch, `browser-restoration-${process.pid}-${Date.now()}-${++sequence}`);
  let owned = false;
  let original: fs.Stats | undefined;
  let failure: Error | undefined;
  let child: ChildProcessWithoutNullStreams;
  function addFailure(error: unknown, stage: string): void {
    if (!failure) {
      failure = error as Error;
      return;
    }
    const combined: Error & { errors?: unknown[] } = new Error(`${failure.message}; ${stage}`);
    combined.errors = [failure, error];
    failure = combined;
  }
  function remove(): void {
    if (!owned) return;
    try {
      const current = fs.lstatSync(root);
      if (original) {
        assert.strictEqual(current.dev, original.dev);
        assert.strictEqual(current.ino, original.ino);
      }
      assert.ok(current.isDirectory() && !current.isSymbolicLink());
      safeRmSync(root);
      owned = false;
    } catch (error) {
      addFailure(error, 'fixture cleanup failed');
    }
  }
  try {
    if (!fs.existsSync(scratch)) fs.mkdirSync(scratch);
    assert.ok(fs.lstatSync(scratch).isDirectory() && !fs.lstatSync(scratch).isSymbolicLink());
    fs.mkdirSync(root);
    owned = true;
    original = fs.lstatSync(root);
    const home = path.join(root, 'home');
    fs.mkdirSync(home);
    const worker = path.join(root, 'worker.cjs');
    fs.writeFileSync(worker, workerSource);
    fs.writeFileSync(path.join(root, 'acquisition.cjs'), acquisitionSource);
    const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, USERPROFILE: home };
    // The child owns its native caches; the browser path remains the real installed Playwright path.
    delete env.NODE_OPTIONS;
    child = spawn(process.execPath, [worker, root, scenario, modulePath], { env, detached: process.platform !== 'win32', stdio: 'pipe' });
  } catch (error) {
    addFailure(error, 'fixture setup failed');
    remove();
    done(failure);
    return;
  }
  let stdout = '';
  let stderr = '';
  let closed = false;
  let terminating = false;
  let status: number | null = null;
  child.stdout.on('data', (data) => {
    stdout += String(data);
  });
  child.stderr.on('data', (data) => {
    stderr += String(data);
  });
  child.on('error', (error) => {
    addFailure(error, 'child process failed');
  });
  const timer = setTimeout(() => {
    failure = new Error(`Restoration child exceeded deadline\n${stdout}\n${stderr}`);
    if (child.pid === undefined) return;
    if (process.platform === 'win32') {
      terminating = true;
      execFile('taskkill', ['/pid', String(child.pid), '/T', '/F'], (error) => {
        if (error) addFailure(error, 'taskkill failed');
        terminating = false;
        complete();
      });
    } else {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch (error) {
        addFailure(error, 'process group termination failed');
      }
    }
  }, 180000);
  function complete(): void {
    if (!closed || terminating) return;
    clearTimeout(timer);
    try {
      if (failure) throw failure;
      assert.strictEqual(status, 0, `${stdout}\n${stderr}`);
      assert.ok(stdout.indexOf(`RESTORATION_OK ${process.versions.node} ${scenario}`) >= 0, stdout);
    } catch (error) {
      failure = error as Error;
    }
    remove();
    done(failure);
  }
  child.on('close', (code) => {
    status = code;
    closed = true;
    complete();
  });
}

describe('browser link restoration', () => {
  it('restores the exact target after synchronous setup failure', (done) => run('setup', done));
  it('preserves a sole operation error and restores the exact target', (done) => run('operation', done));
  it('reports a sole cleanup error after a real successful browser test', (done) => run('cleanup', done));
  it('preserves operation and cleanup errors in order', (done) => run('combined', done));
});

describe('browser default configuration', () => {
  it('runs all configured browsers in a CommonJS consumer', (done) => run('commonjs', done));
  it('runs all configured browsers in an ESM consumer', (done) => run('module', done));
});
