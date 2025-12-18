import spawn from 'cross-spawn-cb';
import getopts from 'getopts-compat';
import { installSync, removeSync } from 'install-optional';
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
const __dirname = path.dirname(typeof __filename === 'undefined' ? url.fileURLToPath(import.meta.url) : __filename);
const dist = path.join(__dirname, '..');
const config = path.join(dist, 'esm', 'wtr.config.js');

const installSyncRollup = debounce(installSync, 300, { leading: true, trailing: false });
const installSynESBuild = debounce(installSync, 300, { leading: true, trailing: false });

function run(args: string[], options: CommandOptions, callback: CommandCallback) {
  const cwd: string = (options.cwd as string) || process.cwd();
  const { _, ...opts } = getopts(args, { stopEarly: true, alias: { config: 'c', 'dry-run': 'd' }, boolean: ['dry-run'] });
  const filteredArgs = args.filter((arg) => arg !== '--dry-run' && arg !== '-d');

  if (opts['dry-run']) {
    console.log('Dry-run: would run browser tests with @web/test-runner');
    return callback();
  }

  link(cwd, installPath(options), (err, restore) => {
    if (err) return callback(err);

    try {
      installSyncRollup('rollup', `${process.platform}-${process.arch}`, { cwd });
      removeSync('esbuild', '@esbuild/', { cwd });
      installSynESBuild('esbuild', `${process.platform}-${process.arch}`, { cwd });

      const wtr = resolveBin('@web/test-runner', 'wtr');
      const spawnArgs = [];
      if (!opts.config) Array.prototype.push.apply(spawnArgs, ['--config', config]);
      Array.prototype.push.apply(spawnArgs, filteredArgs);
      if (_.length === 0) Array.prototype.push.apply(spawnArgs, ['test/**/*.test.{ts,tsx,jsx,mjs}']);

      const queue = new Queue(1);
      queue.defer(spawn.bind(null, wtr, spawnArgs, options));
      queue.await((err) => unlink(restore, callback.bind(null, err)));
    } catch (err) {
      callback(err);
    }
  });
}

const worker = major >= 20 ? run : bind('>=20', path.join(dist, 'cjs', 'command.js'), { callbacks: true });

export default function testBrowser(args: string[], options: CommandOptions, callback: CommandCallback): void {
  worker(args, options, callback);
}
