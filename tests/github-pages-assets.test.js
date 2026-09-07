const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertLocalFilesExist(htmlPath, references) {
  const baseDirectory = path.dirname(path.join(root, htmlPath));

  references.forEach(reference => {
    const cleanReference = reference.split(/[?#]/, 1)[0];
    const resolvedPath = path.resolve(baseDirectory, cleanReference);

    assert.ok(
      fs.existsSync(resolvedPath),
      `${htmlPath} references a missing asset: ${reference}`
    );
  });
}

const dashboardHtml = read('dashboard.html');
const dashboardAssets = Array.from(
  dashboardHtml.matchAll(/<(?:link|script)\b[^>]*(?:href|src)="([^"]+)"[^>]*>/gi),
  match => match[1]
).filter(reference => reference.startsWith('.'));

assert.deepStrictEqual(dashboardAssets, [
  './safety-dashboard/css/style.css',
  './safety-dashboard/js/config.js',
  './safety-dashboard/js/api.js',
  './safety-dashboard/js/auth.js',
  './safety-dashboard/js/app.js'
]);
assertLocalFilesExist('dashboard.html', dashboardAssets);
assert.doesNotMatch(dashboardHtml, /(?:href|src)="\.\/(?:css|js)\//);

const nestedDashboardHtml = read('safety-dashboard/dashbord.html');
const nestedAssets = Array.from(
  nestedDashboardHtml.matchAll(/<(?:link|script)\b[^>]*(?:href|src)="([^"]+)"[^>]*>/gi),
  match => match[1]
).filter(reference => reference.startsWith('.'));
assertLocalFilesExist('safety-dashboard/dashbord.html', nestedAssets);

const portalHtml = read('index.html');
const portalImages = Array.from(
  portalHtml.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*>/gi),
  match => match[1]
).filter(reference => !/^(?:https?:|data:|\/\/)/i.test(reference));
assertLocalFilesExist('index.html', portalImages);

const apiSources = [
  portalHtml,
  read('safety-dashboard/js/config.js'),
  read('safety-dashboard/js/api.js')
];
const apiUrls = apiSources.map(source => {
  const match = source.match(
    /https:\/\/script\.google\.com\/macros\/s\/[^'"\s]+\/exec/
  );

  assert.ok(match, 'Google Apps Script deployment URL is missing');
  return match[0];
});
assert.strictEqual(
  new Set(apiUrls).size,
  1,
  'All frontend entry points must use the same API deployment URL'
);

assert.match(read('dashbord.html'), /url=\.\/dashboard\.html/);
assert.match(
  read('safety-dashboard/index.html'),
  /url=\.\.\/dashboard\.html/
);

const stylesheet = read('safety-dashboard/css/style.css');
const stylesheetAssets = Array.from(
  stylesheet.matchAll(/url\(\s*['"]?([^'"\)]+)['"]?\s*\)/gi),
  match => match[1].trim()
).filter(reference => !/^(?:https?:|data:|\/\/|#)/i.test(reference));
assertLocalFilesExist('safety-dashboard/css/style.css', stylesheetAssets);

console.log('GitHub Pages asset path tests passed.');
