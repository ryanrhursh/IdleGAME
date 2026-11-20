// Bundles the game into a single self-contained HTML file at docs/index.html.
import esbuild from 'esbuild';
import fs from 'node:fs';

const result = await esbuild.build({
  entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'none',
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = fs.readFileSync('src/index.html', 'utf8').replace('<!--BUNDLE-->', () => `<script>${js}</script>`);
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/index.html', html);
console.log(`docs/index.html  ${(html.length / 1024).toFixed(0)} KB`);

// Fragment for hosts that supply their own <html>/<head>/<body> wrapper.
const style = /<style>[\s\S]*?<\/style>/.exec(html)[0];
const body = /<body>([\s\S]*)<\/body>/.exec(html)[1];
fs.writeFileSync('docs/fragment.html', `<title>Emberwood</title>\n${style}\n${body}`);
console.log('docs/fragment.html');
