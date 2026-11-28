import path from 'node:path';
import { build } from 'esbuild';

async function main() {
  const root = process.cwd();
  const entryPoint = path.join(root, 'desktop', 'server-entry.ts');
  const outfile = path.join(root, 'desktop', 'server-bundle.cjs');

  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    external: ['vite', 'canvas'],
    define: {
      'process.env.MDPAD_EMBEDDED': '"1"',
      'import.meta.url': '"file:///mdpad-server.cjs"',
    },
    outfile,
    metafile: true,
  });

  const outMeta = Object.values(result.metafile?.outputs ?? {})[0];
  const sizeMb = outMeta ? (outMeta.bytes / (1024 * 1024)).toFixed(2) : '?';
  console.log(`Bundled desktop backend: ${outfile} (${sizeMb} MB)`);
}

main().catch((err) => {
  console.error('Failed to bundle desktop backend:', err);
  process.exit(1);
});
