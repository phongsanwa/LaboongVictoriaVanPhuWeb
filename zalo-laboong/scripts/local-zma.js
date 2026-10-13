#!/usr/bin/env node
/**
 * local-zma.js — Local dev setup script
 *
 * Fetch danh sách mini app từ API, cho dev chọn app muốn debug,
 * tự động ghi environment.ts cho template tương ứng, rồi spawn ng serve.
 *
 * Lần đầu: truyền --apiUrl để lưu vào scripts/.local-config.json
 * Các lần sau: dùng lại apiUrl đã lưu (không cần truyền lại)
 *
 * Usage:
 *   node scripts/local-zma.js --apiUrl=https://tunglxbe.webapp.nhanhdev.com
 *   npm run local
 *
 * Flow:
 *   1. Đọc apiUrl (từ arg hoặc .local-config.json)
 *   2. Fetch danh sách mini app từ API
 *   3. Chọn template (zma-0001 … zma-0006)
 *   4. Chọn mini app cần debug
 *   5. Ghi apps/zma-000X/src/environments/environment.ts
 *   6. Spawn: ng serve zma-000X --host zma-tpl.local --port 6204
 */

'use strict';

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');
const { spawn }  = require('child_process');
const { fetchApps, filterApps, getAppStatusLabel } = require('./lib/zma-apps');

const ROOT        = path.resolve(__dirname, '..');
const LOCAL_CFG   = path.join(__dirname, '.local-config.json');

// Local dev constants
const LOCAL_PORT = 6204;
const LOCAL_HOST = 'zma-tpl.local';

// Template list
const TEMPLATES = [
  { name: 'zma-0001' },
  { name: 'zma-0002' },
  { name: 'zma-0003' },
  { name: 'zma-0004' },
  { name: 'zma-0005' },
  { name: 'zma-0006' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg)  { console.log(`[local-zma] ${msg}`); }
function warn(msg) { console.warn(`[local-zma] WARN: ${msg}`); }
function fail(msg) { console.error(`[local-zma] ERROR: ${msg}`); process.exit(1); }

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    args[key] = rest.length > 0 ? rest.join('=') : true;
  }
  return args;
}

function cell(str, width) {
  const s = String(str ?? '');
  if (s.length >= width) return s.slice(0, width - 1) + '…';
  return s.padEnd(width);
}

function readLocalConfig() {
  if (!fs.existsSync(LOCAL_CFG)) return {};
  try { return JSON.parse(fs.readFileSync(LOCAL_CFG, 'utf8')); } catch (_) { return {}; }
}

function saveLocalConfig(data) {
  fs.writeFileSync(LOCAL_CFG, JSON.stringify(data, null, 2), 'utf8');
}

/** Hỏi 1 câu, validate số trong [min, max]. */
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

/** In bảng danh sách app. */
function printAppTable(apps) {
  const cols = [
    { header: '#',         width: 3  },
    { header: 'App name',  width: 24 },
    { header: 'miniAppId', width: 22 },
    { header: 'Template',  width: 12 },
    { header: 'Status',    width: 10 },
    { header: 'Business',  width: 10 },
  ];
  const pad = '    ';
  const TOP = pad + '┌' + cols.map(c => '─'.repeat(c.w + 2)).join('┬') + '┐';
  const SEP = pad + '├' + cols.map(c => '─'.repeat(c.w + 2)).join('┼') + '┤';
  const BOT = pad + '└' + cols.map(c => '─'.repeat(c.w + 2)).join('┴') + '┘';

  // Dùng width thực
  const TOP2 = pad + '┌' + cols.map(c => '─'.repeat(c.width + 2)).join('┬') + '┐';
  const SEP2 = pad + '├' + cols.map(c => '─'.repeat(c.width + 2)).join('┼') + '┤';
  const BOT2 = pad + '└' + cols.map(c => '─'.repeat(c.width + 2)).join('┴') + '┘';
  const HDR  = pad + '│' + cols.map(c => ` ${cell(c.header, c.width)} `).join('│') + '│';

  console.log(TOP2);
  console.log(HDR);
  console.log(SEP2);

  apps.forEach((app, i) => {
    const ROW = pad + '│' + [
      ` ${cell(i + 1,                                cols[0].width)} `,
      ` ${cell(app.appName,                          cols[1].width)} `,
      ` ${cell(app.miniAppId,                        cols[2].width)} `,
      ` ${cell(app.template,                         cols[3].width)} `,
      ` ${cell(getAppStatusLabel(app.appStatus),     cols[4].width)} `,
      ` ${cell(app.businessId,                       cols[5].width)} `,
    ].join('│') + '│';
    console.log(ROW);
  });

  console.log(BOT2);
}

// ---------------------------------------------------------------------------
// Generate environment.ts
// ---------------------------------------------------------------------------

/**
 * Ghi environment.ts cho template chỉ định.
 * @param {string} templateName  — 'zma-0001' …
 * @param {object} app           — app object từ API
 * @param {string} apiUrl        — base API URL
 */
function writeEnvironment(templateName, app, apiUrl) {
  const envDir  = path.join(ROOT, 'apps', templateName, 'src', 'environments');
  const envFile = path.join(envDir, 'environment.ts');

  if (!fs.existsSync(envDir)) {
    fail(`Không tìm thấy thư mục environments: ${envDir}`);
  }

  const content = `import {envbase} from './env.const';

/**
 * Auto-generated by scripts/local-zma.js — KHÔNG COMMIT file này.
 * App: ${app.appName || app.miniAppId}
 * miniAppId: ${app.miniAppId}
 * businessId: ${app.businessId}
 * Generated: ${new Date().toISOString()}
 */
export const environment = {
  ...envbase,
  production: false,
  zaloBaseHref: '/',
  apiUrl: '${apiUrl}',
  OAId: '${app.zaloOaId || ''}',
  apiConfig: {
    webAppId: '${app.webAppId ?? ''}'
  }
};
`;

  fs.writeFileSync(envFile, content, 'utf8');
  log(`Đã ghi: apps/${templateName}/src/environments/environment.ts`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async function main() {
  const args = parseArgs();

  // 1. Xác định apiUrl
  const localCfg = readLocalConfig();
  let apiUrl = (args['apiUrl'] || '').trim() || localCfg.apiUrl || '';

  if (!apiUrl) {
    fail(
      '--apiUrl chưa được cấu hình.\n' +
      'Lần đầu chạy: node scripts/local-zma.js --apiUrl=https://tunglxbe.webapp.nhanhdev.com\n' +
      'Các lần sau apiUrl sẽ được nhớ tự động.'
    );
  }

  // Lưu apiUrl nếu mới
  if (apiUrl !== localCfg.apiUrl) {
    saveLocalConfig({ ...localCfg, apiUrl });
    log(`Đã lưu apiUrl → scripts/.local-config.json`);
  }

  // 2. Fetch danh sách app
  log(`Fetching danh sách app từ ${apiUrl}...`);
  let apps;
  try {
    apps = await fetchApps(apiUrl);
  } catch (e) {
    fail(`Không lấy được danh sách app: ${e.message}`);
  }

  // Defensive filter — chỉ giữ app có template + miniAppId + appStatus ≥ PENDING
  apps = filterApps(apps);

  if (!apps || apps.length === 0) {
    fail('Không có app nào đủ điều kiện để run local (app phải đã được tạo trên Zalo Console).');
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  // 3. Chọn template
  console.log('\nBước 1 — Chọn template:\n');
  TEMPLATES.forEach((t, i) => {
    const count = apps.filter(a => a.template === t.name).length;
    console.log(`  ${i + 1}. ${t.name} — ${count} app`);
  });
  console.log('');

  const tmplIdx = await promptNumber(
    rl,
    `Nhập số thứ tự template (1–${TEMPLATES.length}): `,
    1,
    TEMPLATES.length,
  );
  const selectedTemplate = TEMPLATES[tmplIdx - 1];

  // Filter app theo template
  const filteredApps = apps.filter(a => a.template === selectedTemplate.name);

  if (filteredApps.length === 0) {
    rl.close();
    fail(`Template ${selectedTemplate.name} chưa được cấu hình phía server.`);
  }

  let selectedApp;

  {
    // 4. Chọn mini app
    console.log(`\nBước 2 — Chọn Mini App (template: ${selectedTemplate.name}):\n`);
    printAppTable(filteredApps);
    console.log('');

    if (filteredApps.length === 1) {
      // Chỉ có 1 app — tự động chọn
      selectedApp = filteredApps[0];
      console.log(`  → Chỉ có 1 app, tự động chọn: ${selectedApp.appName || selectedApp.miniAppId}\n`);
    } else {
      const appIdx = await promptNumber(
        rl,
        `Nhập số thứ tự Mini App (1–${filteredApps.length}): `,
        1,
        filteredApps.length,
      );
      selectedApp = filteredApps[appIdx - 1];
    }
  }

  rl.close();

  // 5. Ghi environment.ts
  console.log('');
  log(`App      : ${selectedApp.appName || selectedApp.miniAppId}`);
  log(`miniAppId: ${selectedApp.miniAppId}`);
  log(`webAppId : ${selectedApp.webAppId ?? '⚠️  MISSING — cần deploy BE mới nhất'}`);
  log(`template : ${selectedTemplate.name}  →  https://${LOCAL_HOST}:${LOCAL_PORT}`);
  console.log('');

  if (!selectedApp.webAppId) {
    warn('webAppId không có trong response API.');
    warn('API /webapptpl/zma-config/apps chưa trả về field webAppId — deploy BE trước rồi chạy lại npm run local.');
    warn('environment.ts sẽ được ghi nhưng webAppId sẽ rỗng → mọi API call sẽ thiếu ?webAppId=');
    console.log('');
  }

  writeEnvironment(selectedTemplate.name, selectedApp, apiUrl);

  // 6. Spawn ng serve
  log(`Starting: ng serve ${selectedTemplate.name} --host ${LOCAL_HOST} --port ${LOCAL_PORT}\n`);

  const ng = spawn(
    'ng',
    ['serve', selectedTemplate.name, '--host', LOCAL_HOST, '--port', String(LOCAL_PORT)],
    { cwd: ROOT, stdio: 'inherit', shell: true }
  );

  ng.on('error', (e) => fail(`ng serve thất bại: ${e.message}`));
  ng.on('close', (code) => {
    if (code !== 0) process.exit(code);
  });
})();
