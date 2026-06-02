'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Resvg } = require('@resvg/resvg-js');

const appRoot = path.resolve(__dirname, '..');
const resourcesDir = path.join(appRoot, 'resources');
const svgPath = path.join(resourcesDir, 'icon.svg');
const pngPath = path.join(resourcesDir, 'icon.png');

if (!fs.existsSync(svgPath)) {
  console.error(`Missing source icon: ${svgPath}`);
  process.exit(1);
}

const svg = fs.readFileSync(svgPath);
const png = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1024 },
  background: 'rgba(0, 0, 0, 0)',
}).render().asPng();

fs.writeFileSync(pngPath, png);
console.log(`Generated ${path.relative(appRoot, pngPath)}`);

const cli = path.join(
  appRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron-icon-builder.cmd' : 'electron-icon-builder',
);

const result = spawnSync(cli, [`--input=${pngPath}`, `--output=${resourcesDir}`, '--flatten'], {
  cwd: appRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

for (const name of ['icon.ico', 'icon.icns']) {
  const generatedPath = path.join(resourcesDir, 'icons', name);
  const targetPath = path.join(resourcesDir, name);
  if (fs.existsSync(generatedPath)) {
    fs.copyFileSync(generatedPath, targetPath);
    console.log(`Generated ${path.relative(appRoot, targetPath)}`);
  }
}
