// Bundles the game into a single self-contained HTML file at docs/index.html.
import esbuild from 'esbuild';
import fs from 'node:fs';

const result = await esbuild.build({
  entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'none',
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const base = fs.readFileSync('src/index.html', 'utf8').replace('<!--BUNDLE-->', () => `<script>${js}</script>`);
const links = '<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icon.svg" type="image/svg+xml">\n<link rel="apple-touch-icon" href="apple-touch-icon.png">\n';
const html = base.replace('</head>', () => links + '</head>');
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/index.html', html);
console.log(`docs/index.html  ${(html.length / 1024).toFixed(0)} KB`);

// Fragment for hosts that supply their own <html>/<head>/<body> wrapper.
const style = /<style>[\s\S]*?<\/style>/.exec(base)[0];
const body = /<body>([\s\S]*)<\/body>/.exec(base)[1];
fs.writeFileSync('docs/fragment.html', `<title>The Marigold Line</title>\n${style}\n${body}`);
console.log('docs/fragment.html');
