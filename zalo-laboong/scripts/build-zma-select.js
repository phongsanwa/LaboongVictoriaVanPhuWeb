#!/usr/bin/env node
'use strict';

/**
 * build-zma-select.js — Interactive: chọn app từ danh sách rồi build tuần tự.
 *
 * Usage:
 *   node scripts/build-zma-select.js --apiUrl=https://tunglxbe.webapp.nhanhdev.com [--force]
 *   npm run build:zma:select -- --apiUrl=https://tunglxbe.webapp.nhanhdev.com
 *
 * Flow:
 *   1. Fetch danh sách app từ GET {apiUrl}/webapptpl/zma-config/apps
 *   2. Enrich với lastBuiltAt từ dist/build-manifest.json
 *   3. Hiển thị bảng có đánh số
 *   4. Dev nhập số (VD: 1,3 hoặc all)
 *   5. Build tuần tự từng app đã chọn bằng node scripts/build-zma.js
 *   6. In bảng tổng kết
 */

const readline   = require('readline');
const { execSync } = require('child_process');
const path       = require('path');
const { fetchApps, filterApps, enrichApps, getAppStatusLabel } = require('./lib/zma-apps');

const ROOT        = path.resolve(__dirname, '..');
const BUILD_SCRIPT = path.join(__dirname, 'build-zma.js');

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

function cell(str, width) {
  const s = String(str ?? '');
  if (s.length >= width) return s.slice(0, width - 1) + '…';
  return s.padEnd(width);
}

/** In bảng chọn với đánh số và trạng thái. */
function printSelectionTable(apps) {
  const cols = [
    { header: '#',          width: 3  },
    { header: 'miniAppId',  width: 22 },
    { header: 'App name',   width: 22 },
    { header: 'Template',   width: 12 },
    { header: 'Status',     width: 10 },
    { header: 'Last built', width: 14 },
  ];

  const SEP = '├' + cols.map(c => '─'.repeat(c.width + 2)).join('┼') + '┤';
  const TOP = '┌' + cols.map(c => '─'.repeat(c.width + 2)).join('┬') + '┐';
  const BOT = '└' + cols.map(c => '─'.repeat(c.width + 2)).join('┴') + '┘';
  const HDR = '│' + cols.map((c, i) => {
    const headers = ['#', 'miniAppId', 'App name', 'Template', 'Status', 'Last built'];
    return ` ${cell(headers[i], c.width)} `;
  }).join('│') + '│';

  console.log(TOP);
  console.log(HDR);
  console.log(SEP);

  apps.forEach((app, i) => {
    const no  = String(i + 1);
    const ROW = '│' + [
      ` ${cell(no,                                  cols[0].width)} `,
      ` ${cell(app.miniAppId,                       cols[1].width)} `,
      ` ${cell(app.appName || '-',                  cols[2].width)} `,
      ` ${cell(app.template,                        cols[3].width)} `,
      ` ${cell(getAppStatusLabel(app.appStatus),    cols[4].width)} `,
      ` ${cell(formatRelativeTime(app.lastBuiltAt), cols[5].width)} `,
    ].join('│') + '│';

    console.log(ROW);
  });

  console.log(BOT);
}

/** Prompt người dùng nhập lựa chọn, hỏi lại nếu input không hợp lệ. */
function promptSelection(apps) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    const ask = () => {
      rl.question(
        `\nNhập số thứ tự cần build (vd: 1  hoặc  1,3  hoặc  all): `,
        (answer) => {
          const trimmed = answer.trim().toLowerCase();

          if (trimmed === 'all') {
            rl.close();
            resolve(apps);
            return;
          }

          // Parse danh sách số
          const parts = trimmed.split(/[\s,]+/).filter(Boolean);
          if (parts.length === 0) {
            console.log('  → Cần nhập ít nhất 1 số, thử lại.');
            ask();
            return;
          }

          const selected = [];
          let hasError   = false;

          for (const p of parts) {
            const n = parseInt(p, 10);
            if (isNaN(n) || n < 1 || n > apps.length) {
              console.log(`  → "${p}" không hợp lệ (phải từ 1 đến ${apps.length}).`);
              hasError = true;
              break;
            }
            selected.push(apps[n - 1]);
          }

          if (hasError) {
            ask();
            return;
          }

          if (selected.length === 0) {
            console.log('  → Không có app hợp lệ nào được chọn, thử lại.');
            ask();
            return;
          }

          rl.close();
          resolve(selected);
        }
      );
    };

    ask();
  });
}

/** In bảng tổng kết sau khi build xong. */
function printSummary(results) {
  const cols = [
    { header: 'miniAppId',  width: 22 },
    { header: 'App name',   width: 22 },
    { header: 'Status',     width: 12 },
    { header: 'Duration',   width: 10 },
  ];

  const TOP = '┌' + cols.map(c => '─'.repeat(c.width + 2)).join('┬') + '┐';
  const SEP = '├' + cols.map(c => '─'.repeat(c.width + 2)).join('┼') + '┤';
  const BOT = '└' + cols.map(c => '─'.repeat(c.width + 2)).join('┴') + '┘';
  const HDR = '│' + cols.map(c => ` ${cell(c.header, c.width)} `).join('│') + '│';

  console.log('\n[build-zma] ─── Build Summary ───');
  console.log(TOP);
  console.log(HDR);
  console.log(SEP);

  for (const r of results) {
    const status   = r.success ? '✅ success' : '❌ failed';
    const duration = r.durationMs != null ? `${(r.durationMs / 1000).toFixed(1)}s` : '-';
    const ROW = '│' + [
      ` ${cell(r.app.miniAppId, cols[0].width)} `,
      ` ${cell(r.app.appName || '-', cols[1].width)} `,
      ` ${cell(status,          cols[2].width)} `,
      ` ${cell(duration,        cols[3].width)} `,
    ].join('│') + '│';
    console.log(ROW);
  }

  console.log(BOT);

  const succeeded = results.filter(r => r.success).length;
  const failed    = results.filter(r => !r.success).length;
  console.log(`\n  ${succeeded} succeeded, ${failed} failed.\n`);
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
      'Example: node scripts/build-zma-select.js --apiUrl=https://tunglxbe.webapp.nhanhdev.com'
    );
  }

  // 1. Fetch + enrich
  log(`Fetching from ${apiUrl}...`);
  let apps;
  try {
    apps = await fetchApps(apiUrl);
  } catch (e) {
    fail(`Không lấy được danh sách app: ${e.message}`);
  }

  apps = filterApps(apps);
  apps = enrichApps(apps);

  if (apps.length === 0) {
    log('Không có app nào (response trả về mảng rỗng).');
    return;
  }

  // 2. Hiển thị bảng
  console.log('');
  printSelectionTable(apps);

  // 3. Nhận input
  const selected = await promptSelection(apps);

  if (selected.length === 0) {
    log('Không có app nào được chọn. Thoát.');
    return;
  }

  log(`\nSẽ build ${selected.length} app(s): ${selected.map(a => a.miniAppId).join(', ')}`);
  console.log('');

  // 4. Build tuần tự
  const results = [];

  for (const app of selected) {
    const label = `${app.miniAppId} (${app.appName || '-'})`;
    log(`──────────────────────────────────────────`);
    log(`Building: ${label}`);

    const cmd = `node "${BUILD_SCRIPT}" --webAppId=${app.webAppId} --miniAppId=${app.miniAppId} --apiUrl=${apiUrl}`;

    const startMs = Date.now();
    let success   = false;

    try {
      execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
      success = true;
    } catch (e) {
      console.error(`[build-zma] Build failed for ${label}: ${e.message || '(non-zero exit)'}`);
    }

    results.push({ app, success, durationMs: Date.now() - startMs });
  }

  // 5. Tổng kết
  printSummary(results);

  const anyFailed = results.some(r => !r.success);
  if (anyFailed) {
    process.exit(1);
  }
})();
