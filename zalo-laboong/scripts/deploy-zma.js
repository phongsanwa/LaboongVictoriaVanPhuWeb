#!/usr/bin/env node
/**
 * deploy-zma.js — ZMA Deploy Script
 *
 * Đọc dist/build-manifest.json, cho dev chọn app đã build, đảm bảo root .env có
 * ZMP_TOKEN hợp lệ cho ĐÚNG app đó (qua `zmp login` nếu cần), GUARD appId===miniAppId,
 * rồi copy app-config.json + chạy `zmp deploy`. Không dùng kho token riêng.
 *
 * Usage:
 *   node scripts/deploy-zma.js
 *   npm run zma:deploy
 *
 * Flow:
 *   1. Đọc dist/build-manifest.json
 *   2. Hiển thị danh sách nhóm theo miniAppId (kèm tên app + thời gian build)
 *   3. Dev chọn số thứ tự bản build → biết miniAppId đích
 *   4. Token trong root .env còn hợp lệ cho miniAppId? (decode OK & appId===miniAppId & còn hạn)
 *   5. Nếu chưa → ghi APP_ID=miniAppId vào root .env, chạy `zmp login` (Zalo cấp token mới đúng app)
 *   6. GUARD lại token; pass → chuẩn hoá root .env + copy app-config.json → root
 *   7. Chạy zmp deploy (interactive)
 */

'use strict';

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const {
  validateToken,
  parseJwtAppId,
} = require('./lib/zma-token');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');

function log(msg)  { console.log(`[deploy-zma] ${msg}`); }
function fail(msg) { console.error(`[deploy-zma] ERROR: ${msg}`); process.exit(1); }

/** Đọc ZMP_TOKEN từ 1 file .env (strip quote nếu có). Trả về string | null. */
function readEnvToken(envPath) {
  if (!fs.existsSync(envPath)) return null;
  const m = fs.readFileSync(envPath, 'utf8').match(/^\s*ZMP_TOKEN\s*=\s*(.+?)\s*$/m);
  if (!m) return null;
  return m[1].replace(/^["']|["']$/g, '').trim() || null;
}

function formatRelativeTime(isoStr) {
  if (!isoStr) return 'unknown';
  const diff = Date.now() - new Date(isoStr).getTime();
  if (diff < 0 || isNaN(diff)) return 'unknown';

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

/**
 * In bảng các bản build trong một nhóm miniAppId.
 * @param {Array<{idx: number, key: string, entry: object}>} rows
 */
function printGroupTable(rows) {
  const cols = [
    { header: '#',        width: 3  },
    { header: 'Template', width: 12 },
    { header: 'Built',    width: 12 },
    { header: 'apiUrl',   width: 42 },
  ];

  const pad  = '    ';
  const TOP  = pad + '┌' + cols.map(c => '─'.repeat(c.width + 2)).join('┬') + '┐';
  const SEP  = pad + '├' + cols.map(c => '─'.repeat(c.width + 2)).join('┼') + '┤';
  const BOT  = pad + '└' + cols.map(c => '─'.repeat(c.width + 2)).join('┴') + '┘';
  const HDR  = pad + '│' + cols.map(c => ` ${cell(c.header, c.width)} `).join('│') + '│';

  console.log(TOP);
  console.log(HDR);
  console.log(SEP);

  rows.forEach(({ entry }, localIdx) => {
    const ROW = pad + '│' + [
      ` ${cell(localIdx + 1,                     cols[0].width)} `,
      ` ${cell(entry.template,                   cols[1].width)} `,
      ` ${cell(formatRelativeTime(entry.builtAt), cols[2].width)} `,
      ` ${cell(entry.apiUrl,                     cols[3].width)} `,
    ].join('│') + '│';
    console.log(ROW);
  });

  console.log(BOT);
}

/**
 * In toàn bộ danh sách, nhóm theo miniAppId.
 * @param {Map<string, {appName: string, rows: Array}>} groups
 */
function printGroupedList(groups) {
  console.log('');
  log('Danh sách app đã build:\n');

  for (const [miniAppId, { appName, rows }] of groups) {
    const label = appName ? `${appName}  (${miniAppId})` : miniAppId;
    console.log(`  ▸ ${label}`);
    printGroupTable(rows);
    console.log('');
  }
}

/** Hỏi 1 câu, trả về số đã validate. */
function promptNumber(rl, question, min, max) {
  return new Promise((resolve) => {
    const ask = () => {
      rl.question(question, (answer) => {
        const n = parseInt(answer.trim(), 10);
        if (isNaN(n) || n < min || n > max) {
          console.log(`  → Vui lòng nhập số từ ${min} đến ${max}.`);
          ask();
          return;
        }
        resolve(n);
      });
    };
    ask();
  });
}

/**
 * Bước 1: chọn mini app (theo group).
 * Bước 2: chọn bản build trong group đó.
 */
async function promptSelection(groups) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // -- Bước 1: chọn mini app --
  const groupList = [...groups.entries()]; // [[miniAppId, {appName, rows}], ...]

  console.log('Bước 1 — Chọn Mini App:\n');
  groupList.forEach(([miniAppId, { appName }], i) => {
    const label = appName ? `${appName}  (${miniAppId})` : miniAppId;
    console.log(`  ${i + 1}. ${label}`);
  });
  console.log('');

  const appIdx = await promptNumber(
    rl,
    `Nhập số thứ tự Mini App (1–${groupList.length}): `,
    1,
    groupList.length,
  );

  const [selectedMiniAppId, { appName, rows }] = groupList[appIdx - 1];
  const label = appName ? `${appName}  (${selectedMiniAppId})` : selectedMiniAppId;

  // -- Bước 2: chọn bản build --
  console.log(`\nBước 2 — Chọn bản build của "${label}":\n`);
  printGroupTable(rows);
  console.log('');

  const buildIdx = await promptNumber(
    rl,
    `Nhập số thứ tự bản build (1–${rows.length}): `,
    1,
    rows.length,
  );

  rl.close();
  return rows[buildIdx - 1]; // { idx, key, entry }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async function main() {
  // 1. Đọc manifest
  const manifestPath = path.join(ROOT, 'dist', 'build-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    fail('dist/build-manifest.json không tìm thấy. Chạy `npm run zma:build` trước.');
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    fail(`Không đọc được build-manifest.json: ${e.message}`);
  }

  // Flat list, sắp xếp mới nhất lên đầu
  const flatEntries = Object.entries(manifest)
    .map(([key, entry]) => ({ key, entry }))
    .sort((a, b) => {
      const ta = a.entry.builtAt ? new Date(a.entry.builtAt).getTime() : 0;
      const tb = b.entry.builtAt ? new Date(b.entry.builtAt).getTime() : 0;
      return tb - ta;
    });

  if (flatEntries.length === 0) {
    fail('Không có app nào đã build trong dist/build-manifest.json. Chạy `npm run zma:build` trước.');
  }

  // Đánh số thứ tự liên tục và group theo miniAppId
  /** @type {Map<string, {appName: string, rows: Array}>} */
  const groups = new Map();

  flatEntries.forEach(({ key, entry }, i) => {
    const miniAppId = String(entry.miniAppId ?? 'unknown');
    const appName   = entry.appConfig?.title ?? entry.appName ?? '';

    if (!groups.has(miniAppId)) {
      groups.set(miniAppId, { appName, rows: [] });
    }
    groups.get(miniAppId).rows.push({ idx: i + 1, key, entry });
  });

  // 2. Hiển thị
  printGroupedList(groups);

  // 3. Chọn mini app → chọn bản build
  const selected = await promptSelection(groups);
  const { key, entry } = selected;

  console.log('');
  log(`Chuẩn bị deploy: ${key}`);
  log(`appName    : ${entry.appConfig?.title ?? '—'}`);
  log(`miniAppId  : ${entry.miniAppId}`);
  log(`template   : ${entry.template}`);
  log(`apiUrl     : ${entry.apiUrl}`);
  log(`built      : ${entry.builtAt}`);

  // 4. Kiểm tra dist folder tồn tại
  const distDir = path.join(ROOT, 'dist', key);
  if (!fs.existsSync(distDir)) {
    fail(`Dist folder không tìm thấy: dist/${key}/\nThư mục có thể đã bị xoá. Hãy build lại.`);
  }

  // 5. Xác định app đích
  const miniAppId = String(entry.miniAppId ?? '').trim();
  if (!miniAppId) {
    fail(`Manifest entry "${key}" thiếu miniAppId — không xác định được app đích.`);
  }

  const distAppConfig = path.join(distDir, 'app-config.json');
  const rootAppConfig = path.join(ROOT, 'app-config.json');
  const rootDotEnv    = path.join(ROOT, '.env');

  if (!fs.existsSync(distAppConfig)) {
    fail(`app-config.json không tìm thấy trong dist/${key}/`);
  }

  // 5a. Token trong root .env còn dùng được cho đúng app này không?
  let token = readEnvToken(rootDotEnv);
  let guard = validateToken(token, miniAppId);

  // 5b. Chưa hợp lệ (chưa có / hết hạn / sai app) → đăng nhập Zalo để cấp token mới ĐÚNG app.
  if (!guard.ok) {
    log(`Token cho app ${miniAppId} chưa sẵn sàng: ${guard.reason}`);
    log(`→ Đăng nhập Zalo để cấp token mới cho app ${miniAppId}...`);
    // Ghi APP_ID trước để `zmp login` mint token đúng app (bỏ qua prompt "Mini App ID").
    fs.writeFileSync(rootDotEnv, `APP_ID=${miniAppId}\n`, 'utf8');
    try {
      // Tương tác: chọn "Login Via QR Code With Zalo App" rồi quét QR bằng tài khoản collaborator.
      execSync('zmp login', { cwd: ROOT, stdio: 'inherit' });
    } catch (e) {
      fail(`zmp login thất bại/bị huỷ: ${e.message || '(non-zero exit)'}\n  Cần đăng nhập mới deploy được.`);
    }
    // 5c. Đọc lại token zmp vừa ghi vào root .env.
    token = readEnvToken(rootDotEnv);
    guard = validateToken(token, miniAppId);
  }

  // 6. GUARD chốt: token phải đúng app & còn hạn trước khi đẩy.
  if (!guard.ok) {
    fail(
      `GUARD chặn deploy: ${guard.reason}\n` +
      (token ? `  Token hiện thuộc app: ${parseJwtAppId(token) ?? '(không rõ)'}\n` : '') +
      `  → Đảm bảo đăng nhập đúng tài khoản collaborator và chọn ĐÚNG app ${miniAppId}, rồi chạy lại.`
    );
  }
  log(`GUARD ✓ token hợp lệ cho app ${miniAppId}`);

  // Chuẩn hoá root .env (APP_ID=miniAppId + token đúng) + copy app-config.
  fs.writeFileSync(rootDotEnv, `APP_ID=${miniAppId}\nZMP_TOKEN=${token}\n`, 'utf8');
  log(`Root .env sẵn sàng (APP_ID=${miniAppId}, ZMP_TOKEN=••• đúng app)`);

  fs.copyFileSync(distAppConfig, rootAppConfig);
  log('Copied app-config.json → root');

  // 7. Chạy zmp deploy
  log('\nRunning: zmp deploy\n');
  try {
    execSync('zmp deploy', { cwd: ROOT, stdio: 'inherit' });
    log('\n✅ Deploy hoàn tất.');
  } catch (e) {
    fail(`zmp deploy thất bại: ${e.message || '(non-zero exit)'}`);
  }
})();
