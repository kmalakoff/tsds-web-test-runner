import spawn from 'cross-spawn-cb';
import getopts from 'getopts-compat';
import { installSync, matchesLibc, removeSync } from 'install-optional';
import { link, unlink } from 'link-unlink';
import debounce from 'lodash.debounce';
import { bind } from 'node-version-call';
import path from 'path';
import Queue from 'queue-cb';
import resolveBin from 'resolve-bin-sync';
import type { CommandCallback, CommandOptions } from 'tsds-lib';
import { installPath } from 'tsds-lib';
import url from 'url';

const major = +process.versions.node.split('.')[0];
const minor = +process.versions.node.split('.')[1];
// @web/test-runner 1.x require()s ESM (puppeteer-core), unflagged only from 22.12
const supported = major > 22 || (major === 22 && minor >= 12);
const __dirname = path.dirname(typeof __filename === 'undefined' ? url.fileURLToPath(import.meta.url) : __filename);
const dist = path.join(__dirname, '..');
const config = path.join(dist, 'cjs', 'wtr.config.js');

const installSyncRollup = debounce(installSync as unknown as (...args: unknown[]) => void, 300, { leading: true, trailing: false }) as unknown as typeof installSync;
const installSynESBuild = debounce(installSync as unknown as (...args: unknown[]) => void, 300, { leading: true, trailing: false }) as unknown as typeof installSync;

function commandError(failures: unknown[]): Error | undefined {
  if (failures.length === 0) return undefined;
  if (failures.length === 1 && failures[0] instanceof Error) return failures[0];
  const error: Error & { errors?: unknown[] } = new Error('Browser command or restoration failed');
  error.errors = failures;
  return error;
}

function run(args: string[], options: CommandOptions, callback: CommandCallback) {
  const cwd: string = (options.cwd as string) || process.cwd();
  const { _, ...opts } = getopts(args, { stopEarly: true, alias: { config: 'c', 'dry-run': 'd' }, boolean: ['dry-run'] });
  const filteredArgs = args.filter((arg) => arg !== '--dry-run' && arg !== '-d');

  if (opts['dry-run']) {
    console.log('Dry-run: would run browser tests with @web/test-runner');
    return callback();
  }

  link(cwd, installPath(options), (err, restore) => {
    if (err !== undefined && err !== null) return callback(commandError([err]));
    if (!restore) return callback(new Error('link did not return restore path'));
    const acquiredTarget = restore;

    let cleanupStarted = false;
    function finish(operationFailed: boolean, operationError: unknown): void {
      if (cleanupStarted) return;
      cleanupStarted = true;
      let completed = false;
      function complete(cleanupFailed: boolean, cleanupError: unknown): void {
        if (completed) return;
        completed = true;
        const failures: unknown[] = [];
        if (operationFailed) failures.push(operationError);
        if (cleanupFailed) failures.push(cleanupError);
        callback(commandError(failures));
      }
      try {
        unlink(acquiredTarget, (error: unknown) => complete(error !== undefined && error !== null, error));
      } catch (error: unknown) {
        if (completed) throw error;
        complete(true, error);
      }
    }

    try {
      installSyncRollup('rollup', `${process.platform}-${process.arch}`, { cwd, filter: matchesLibc });
      removeSync('esbuild', '@esbuild/', { cwd });
      installSynESBuild('esbuild', `${process.platform}-${process.arch}`, { cwd });

      const wtr = resolveBin('@web/test-runner', 'wtr');
      const spawnArgs: string[] = [];
      if (!opts.config) Array.prototype.push.apply(spawnArgs, ['--config', config]);
      Array.prototype.push.apply(spawnArgs, filteredArgs);
      if (_.length === 0) Array.prototype.push.apply(spawnArgs, ['test/**/*.test.{ts,tsx,jsx,mjs}']);

      const queue = new Queue(1);
      let operationFailed = false;
      let operationError: unknown;
      queue.defer((cb) =>
        spawn(wtr, spawnArgs, options, (error: unknown) => {
          operationFailed = error !== undefined && error !== null;
          operationError = error;
          // Retain the operation error before the queue's truthy classification.
          cb();
        })
      );
      queue.await(() => finish(operationFailed, operationError));
    } catch (error: unknown) {
      if (cleanupStarted) throw error;
      finish(true, error);
    }
  });
}

type commandFunction = (args: string[], options: CommandOptions, callback: CommandCallback) => void;

const worker = (supported ? run : bind('>=22.12', path.join(dist, 'cjs', 'command.js'), { callbacks: true })) as commandFunction;

export default function testBrowser(args: string[], options: CommandOptions, callback: CommandCallback): void {
  worker(args, options, callback);
}
