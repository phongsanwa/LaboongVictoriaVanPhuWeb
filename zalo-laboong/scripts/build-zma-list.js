#!/usr/bin/env node
'use strict';

/**
 * build-zma-list.js — Hiển thị danh sách Zalo Mini App dưới dạng bảng.
 *
 * Usage:
 *   node scripts/build-zma-list.js --apiUrl=https://tunglxbe.webapp.nhanhdev.com
 *   npm run build:zma:list -- --apiUrl=https://tunglxbe.webapp.nhanhdev.com
 *
 * Output:
 *   Bảng unicode box-drawing với: miniAppId, app name, businessId, template, last built
 */

const { fetchApps, filterApps, enrichApps } = require('./lib/zma-apps');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    args[key] = rest.length > 0 ? rest.join('=') : true;
  }
  return args;
}

function log(msg)  { console.log(`[build-zma] ${msg}`); }
function fail(msg) { console.error(`[build-zma] ERROR: ${msg}`); process.exit(1); }

/**
 * Định dạng khoảng thời gian dạng "3h ago", "5 days ago", "just now".
 * @param {string|null} isoStr
 * @returns {string}
 */
function formatRelativeTime(isoStr) {
  if (!isoStr) return 'never built';
  const diff = Date.now() - new Date(isoStr).getTime();
  if (diff < 0 || isNaN(diff)) return 'never built';

  const secs  = Math.floor(diff / 1000);
  const mins  = Math.floor(secs  / 60);
  const hours = Math.floor(mins  / 60);
  const days  = Math.floor(hours / 24);

  if (secs  < 60)  return 'just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 30)  return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/**
 * Pad / truncate chuỗi về đúng width (unicode-safe cho ASCII).
 */
function cell(str, width) {
  const s = String(str ?? '');
  if (s.length >= width) return s.slice(0, width - 1) + '…';
  return s.padEnd(width);
}

/**
 * Vẽ bảng box-drawing từ mảng rows và config cột.
 * cols: [{ header, key, width }]
 */
function renderTable(rows, cols) {
  const totalInner = cols.reduce((sum, c) => sum + c.width + 3, 0) - 1;

  const TOP    = '┌' + cols.map(c => '─'.repeat(c.width + 2)).join('┬') + '┐';
  const HDRBOT = '├' + cols.map(c => '─'.repeat(c.width + 2)).join('┼') + '┤';
  const BOT    = '└' + cols.map(c => '─'.repeat(c.width + 2)).join('┴') + '┘';
  const DIV    = '├' + '─'.repeat(totalInner + cols.length - 1) + '┤';

  // Title row
  const appCount = `${rows.length} app(s)`;
  const title    = `ZMA App List`;
  const innerW   = totalInner + cols.length - 1;
  const titlePad = innerW - title.length - appCount.length;
  const TITLE    = '│ ' + title + ' '.repeat(Math.max(0, titlePad - 2)) + appCount + ' │';

  // Header row
  const HDR = '│' + cols.map(c => ` ${cell(c.header, c.width)} `).join('│') + '│';

  const lines = [TOP, TITLE, DIV, HDR, HDRBOT];

  for (const row of rows) {
    const ROW = '│' + cols.map(c => ` ${cell(row[c.key], c.width)} `).join('│') + '│';
    lines.push(ROW);
  }

  lines.push(BOT);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async function main() {
  const args   = parseArgs();
  const apiUrl = (args['apiUrl'] || '').trim();

  if (!apiUrl) {
    fail(
      '--apiUrl is required.\n' +
      'Example: node scripts/build-zma-list.js --apiUrl=https://tunglxbe.webapp.nhanhdev.com'
    );
  }

  log(`Fetching from ${apiUrl}...`);

  let apps;
  try {
    apps = await fetchApps(apiUrl);
  } catch (e) {
    fail(`Không lấy được danh sách app: ${e.message}`);
  }

  apps = filterApps(apps);
  apps = enrichApps(apps);   // gắn lastBuiltAt + outputPath từ build-manifest.json

  if (apps.length === 0) {
    log('Không có app nào (response trả về mảng rỗng).');
    return;
  }

  // Chuẩn bị rows hiển thị
  const rows = apps.map((app, i) => ({
    no:          String(i + 1),
    miniAppId:   app.miniAppId   || '-',
    appName:     app.appName     || '-',
    businessId:  String(app.businessId ?? '-'),
    template:    app.template    || '-',
    lastBuilt:   formatRelativeTime(app.lastBuiltAt),
  }));

  const cols = [
    { header: '#',          key: 'no',         width: 3  },
    { header: 'miniAppId',  key: 'miniAppId',  width: 22 },
    { header: 'App name',   key: 'appName',    width: 22 },
    { header: 'Business',   key: 'businessId', width: 10 },
    { header: 'Template',   key: 'template',   width: 12 },
    { header: 'Last built', key: 'lastBuilt',  width: 13 },
  ];

  console.log('');
  console.log(renderTable(rows, cols));
  console.log('');
  log(`Total: ${apps.length} app(s) | API: ${apiUrl}`);
})();
