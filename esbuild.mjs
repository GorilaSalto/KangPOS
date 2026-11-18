import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const common = {
  bundle: true,
  platform: 'node',
  target: 'node16',
  format: 'cjs',
  sourcemap: true,
  logLevel: 'info'
};

const extensionOptions = {
  ...common,
  entryPoints: { extension: 'src/extension.ts' },
  outdir: 'dist',
  external: ['vscode']
};

const cliOptions = {
  ...common,
  entryPoints: { cli: 'src/cli/cli.ts' },
  outdir: 'dist',
  sourcemap: false,
  banner: { js: '#!/usr/bin/env node' }
};

if (watch) {
  const extCtx = await esbuild.context(extensionOptions);
  const cliCtx = await esbuild.context(cliOptions);
  await Promise.all([extCtx.watch(), cliCtx.watch()]);
} else {
  await esbuild.build(extensionOptions);
  await esbuild.build(cliOptions);
}
