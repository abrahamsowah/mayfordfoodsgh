'use strict';

const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const openingScript = /<script\b([^>]*)>/gi;
const inlineScripts = [];
let match;

while ((match = openingScript.exec(html))) {
  const contentStart = openingScript.lastIndex;
  const closeStart = html.toLowerCase().indexOf('</script>', contentStart);
  if (closeStart < 0) throw new Error('An HTML script element is missing its closing tag.');
  if (!/(?:^|\s)src\s*=/.test(match[1])) inlineScripts.push(html.slice(contentStart, closeStart));
  openingScript.lastIndex = closeStart + '</script>'.length;
}

if (inlineScripts.length !== 1) {
  throw new Error(`Expected one inline dashboard script; found ${inlineScripts.length}.`);
}

new vm.Script(inlineScripts[0], { filename: htmlPath });
console.log('Dashboard inline JavaScript syntax is valid.');
