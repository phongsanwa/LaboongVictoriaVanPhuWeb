#!/usr/bin/env node
/**
 * build-zma-demo.js — Build Mini App ở chế độ DEMO (browser preview, không phải Zalo deploy).
 *
 * Khác build:zma (prod):
 *   - Dùng `environment.demo.ts` (production: false) -> code đi nhánh
 *     `grantPermissionAndLoginLocal$()` với fakeZalo token từ env.const.
 *   - apiUrl trỏ BE có whitelist `local_dev` (default: BE dev) hoặc BE prod (lưu ý:
 *     prod BE thường không có whitelist -> login sẽ fail).
 *   - Output: `dist/_preview/<template>/` (KHÔNG có prefix businessId — demo là neutral).
 *   - Không sinh app-config.json / .env (không deploy lên Zalo).
 *
 * Usage:
 *   npm run build:zma:demo -- --webAppId=5
 *   npm run build:zma:demo -- --env=local --webAppId=5
 *   npm run build:zma:demo -- --env=prod  --webAppId=5,6
 *   npm run build:zma:demo -- --apiUrl=https://custom-be --webAppId=5
 *
 * Args:
 *   --webAppId=<id>[,<id>...]     Bắt buộc. ID app trong DB (1 hoặc nhiều, comma-separated).
 *   --env=local|prod              Optional, default: local.
 *                                   local -> https://tunglxbe.webapp.nhanhdev.com
 *                                   prod  -> https://api.webapp.nhanh.vn
 *   --apiUrl=<url>                Optional, override --env.
 *
 * Output: dist/_preview/<template>/ (1 folder/template).
 *
 * SPA fallback / token: được BE handle qua route /demo/<template>. Mini app dist không
 * cần biết gì về BE route — chỉ cần production=false + apiUrl đúng.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const ENV_API_URL_MAP = {
  local: 'https://tunglxbe.webapp.nhanhdev.com',
  prod:  'https://api.webapp.nhanh.vn',
};

function log(msg)  { console.log(`[build-zma-demo] ${msg}`); }
function warn(msg) { console.warn(`[build-zma-demo] WARN: ${msg}`); }
function fail(msg) { console.error(`[build-zma-demo] ERROR: ${msg}`); process.exit(1); }

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const [k, ...rest] = arg.replace(/^--/, '').split('=');
    args[k] = rest.length ? rest.join('=') : true;
  }
  return args;
}

function replaceAll(content, placeholder, value) {
  return content.split(placeholder).join(value);
}
function fillPlaceholders(content, map) {
  let r = content;
  for (const [k, v] of Object.entries(map)) r = replaceAll(r, k, v);
  return r;
}

function fetchRemoteConfig(apiUrl, webAppId) {
  return new Promise((resolve) => {
    const url = `${apiUrl.replace(/\/+$/, '')}/webapptpl/zma-config/config?webAppId=${encodeURIComponent(webAppId)}`;
    log(`Fetching config: ${url}`);
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.code === 1 && json.data) {
            const d = json.data;
            resolve({
              webAppId  : d.webAppId   || webAppId,
              businessId: d.businessId,
              template  : d.template   || null,
              apiUrl    : d.apiUrl     || apiUrl,
              zaloOaId  : d.zaloOaId   || '',
            });
          } else {
            warn(`API non-success: ${body.slice(0, 200)}`);
            resolve(null);
          }
        } catch (e) {
          warn(`Parse failed: ${e.message}`);
          resolve(null);
        }
      });
    });
    req.on('error', e => { warn(`Request failed: ${e.message}`); resolve(null); });
    req.on('timeout', () => { warn('Timeout'); req.destroy(); resolve(null); });
  });
}

/**
 * Build 1 template ở chế độ demo.
 * Trả { ok: boolean, template?: string, error?: string }
 */
async function buildOne(webAppId, apiUrlForBuild) {
  const config = await fetchRemoteConfig(apiUrlForBuild, webAppId);
  if (!config) return { ok: false, error: `Không fetch được config cho webAppId=${webAppId}` };
  const { template, zaloOaId = '' } = config;
  if (!template) return { ok: false, error: `webAppId=${webAppId}: API không trả 'template'` };

  const appDir = path.join(ROOT, 'apps', template);
  if (!fs.existsSync(appDir)) return { ok: false, error: `Template dir not found: ${appDir}` };

  log(`webAppId=${webAppId} template=${template}`);

  const envDemoPath = path.join(appDir, 'src', 'environments', 'environment.demo.ts');
  if (!fs.existsSync(envDemoPath)) return { ok: false, error: `Missing: ${envDemoPath}` };

  // Backup
  const backup = fs.readFileSync(envDemoPath, 'utf8');

  // Demo placeholders:
  //   zaloBaseHref = "/demo/<template>"  -> Angular Router pushes URL dưới prefix này
  //   apiUrl       = từ --env hoặc --apiUrl
  //   webAppId     = từ API response
  //   OAId         = fake fixed (DEMO_OA) — demo không gọi Zalo OA thật
  const placeholderMap = {
    '__ZALO_BASE_HREF__': `/demo/${template}/app`,
    '__API_URL__'       : apiUrlForBuild,
    '__WEB_APP_ID__'    : String(config.webAppId || webAppId),
    '__OA_ID__'         : zaloOaId || 'DEMO_OA',
  };

  try {
    // Fill template
    fs.writeFileSync(envDemoPath, fillPlaceholders(backup, placeholderMap), 'utf8');

    // Build
    const appNumber = parseInt(template.split('-').pop(), 10);
    const appNameEnv = `app${appNumber}`;
    const cmd = `ng build ${template} --configuration=demo`;
    log(`Running: APP_NAME=${appNameEnv} ${cmd}`);
    execSync(cmd, {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, APP_NAME: appNameEnv },
    });

    // Move dist/<template>/ -> dist/_preview/<template>/
    const builtDir = path.join(ROOT, 'dist', template);
    if (!fs.existsSync(builtDir)) {
      return { ok: false, error: `Build output missing: dist/${template}/` };
    }
    const previewRoot = path.join(ROOT, 'dist', '_preview');
    fs.mkdirSync(previewRoot, { recursive: true });
    const dest = path.join(previewRoot, template);
    if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
    fs.renameSync(builtDir, dest);

    // Copy index-pro.html -> index.html cho BE serve dễ
    const indexPro = path.join(dest, 'index-pro.html');
    const indexDefault = path.join(dest, 'index.html');
    if (fs.existsSync(indexPro) && !fs.existsSync(indexDefault)) {
      fs.copyFileSync(indexPro, indexDefault);
    }

    log(`✓ ${template} -> dist/_preview/${template}/`);
    return { ok: true, template };
  } finally {
    // Always restore template
    fs.writeFileSync(envDemoPath, backup, 'utf8');
  }
}

(async function main() {
  const args = parseArgs();
  const env = (args['env'] || 'local').toLowerCase();
  const apiUrl = (args['apiUrl'] || ENV_API_URL_MAP[env] || ENV_API_URL_MAP.local).replace(/\/+$/, '');
  const webAppIdRaw = (args['webAppId'] || '').toString();

  if (!webAppIdRaw) {
    fail('--webAppId required. Vd: --webAppId=5 hoặc --webAppId=5,6,7');
  }
  if (!ENV_API_URL_MAP[env] && !args['apiUrl']) {
    fail(`--env=${env} không hợp lệ. Dùng: local | prod (hoặc truyền --apiUrl=<url>).`);
  }

  const webAppIds = webAppIdRaw.split(',').map(s => s.trim()).filter(Boolean);
  log(`Env       : ${env}`);
  log(`apiUrl    : ${apiUrl}`);
  log(`webAppIds : [${webAppIds.join(', ')}]`);

  const results = [];
  for (const id of webAppIds) {
    log(`---`);
    const r = await buildOne(id, apiUrl);
    if (!r.ok) warn(`FAIL webAppId=${id}: ${r.error}`);
    results.push({ webAppId: id, ...r });
  }

  // Update manifest
  const manifestPath = path.join(ROOT, 'dist', '_preview', 'manifest.json');
  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (_) {}
  }
  const built = results.filter(r => r.ok).map(r => r.template);
  for (const tpl of built) {
    manifest[tpl] = {
      template: tpl,
      env, apiUrl,
      builtAt: new Date().toISOString(),
    };
  }
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  // Summary
  log(`---`);
  const okCount = results.filter(r => r.ok).length;
  const failCount = results.length - okCount;
  log(`Done. Success: ${okCount} / Failed: ${failCount}`);
  if (failCount) {
    results.filter(r => !r.ok).forEach(r => warn(`  - webAppId=${r.webAppId}: ${r.error}`));
    process.exit(1);
  }
})();
