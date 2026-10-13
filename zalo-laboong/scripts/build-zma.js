#!/usr/bin/env node
/**
 * build-zma.js — ZMA Build Script
 *
 * Builds a Zalo Mini App for a specific miniAppId.
 * Config được fetch từ API (GET {apiUrl}/webapptpl/zma-config/config?webAppId={webAppId}).
 * API là nguồn config DUY nhất (không còn local fallback).
 *
 * Usage:
 *   node scripts/build-zma.js --webAppId=<id> --miniAppId=<zaloId> --apiUrl=<url> [--force]
 *
 * Ví dụ:
 *   node scripts/build-zma.js --webAppId=5 --miniAppId=4514690776835211220 --apiUrl=https://tunglxbe.webapp.nhanhdev.com
 *
 * Steps:
 *   1.  Parse arguments
 *   2.  Fetch config từ API (BE)
 *   3.  Backup template source files (environment.prod.ts, app-config.json, .env)
 *   4.  Fill placeholders in template files with real values
 *   5.  Run: ng build {template} --configuration=production
 *   6.  Rename dist/{template}/ → dist/{businessId}_{miniAppId}_{template}/
 *   7.  Scan dist output, populate listCSS / listSyncJS / listAsyncJS,
 *       write final app-config.json + .env into dist folder
 *   8.  Write/update dist/build-manifest.json
 *   9.  Always restore template source files (apps/zma-000X/*)
 *
 * Root app-config.json và .env KHÔNG bị đụng vào ở bước build.
 * Chạy `npm run zma:deploy` để chọn app và deploy.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const https = require('https');
const http  = require('http');
const { execSync } = require('child_process');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..');

function log(msg)  { console.log(`[build-zma] ${msg}`); }
function warn(msg) { console.warn(`[build-zma] WARN: ${msg}`); }
function fail(msg) { console.error(`[build-zma] ERROR: ${msg}`); process.exit(1); }

/** Parse --key=value and --flag style args from process.argv. */
function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    args[key] = rest.length > 0 ? rest.join('=') : true;
  }
  return args;
}

/** Replace all occurrences of placeholder in content. */
function replacePlaceholder(content, placeholder, value) {
  return content.split(placeholder).join(value);
}

/** Fill all placeholders in a string using a map of { PLACEHOLDER: value }. */
function fillPlaceholders(content, map) {
  let result = content;
  for (const [placeholder, value] of Object.entries(map)) {
    result = replacePlaceholder(result, placeholder, value);
  }
  return result;
}

/**
 * Scan a dist directory and categorise JS/CSS files.
 * Returns { listCSS, listSyncJS, listAsyncJS }
 */
function scanDistFiles(distDir) {
  const files = fs.readdirSync(distDir);
  const runtimeFiles  = files.filter(f => /^runtime.*\.js$/.test(f));
  const polyfillFiles = files.filter(f => /^polyfills.*\.js$/.test(f));
  const vendorFiles   = files.filter(f => /^vendor.*\.js$/.test(f));
  const mainFiles     = files.filter(f => /^main.*\.js$/.test(f));
  const cssFiles      = files.filter(f => /^styles.*\.css$/.test(f));
  const allJsFiles    = files.filter(f => /\.js$/.test(f));
  const syncJsFiles   = [...runtimeFiles, ...polyfillFiles, ...vendorFiles, ...mainFiles];
  const asyncJsFiles  = allJsFiles.filter(f => !syncJsFiles.includes(f));
  return { listCSS: cssFiles, listSyncJS: syncJsFiles, listAsyncJS: asyncJsFiles };
}

/**
 * Fetch mini app config từ BE API: GET {apiUrl}/webapptpl/zma-config/config?webAppId={webAppId}
 */
function fetchRemoteConfig(apiUrl, webAppId) {
  return new Promise((resolve) => {
    const url = `${apiUrl.replace(/\/+$/, '')}/webapptpl/zma-config/config?webAppId=${encodeURIComponent(webAppId)}`;
    log(`Fetching config from: ${url}`);

    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.code === 1 && json.data) {
            const d = json.data;
            resolve({
              webAppId   : d.webAppId   || null,
              businessId : d.businessId,
              template   : d.template   || null,
              apiUrl     : apiUrl,
              zaloOaId   : d.zaloOaId   || '',
              appConfig  : {
                title       : d.appTitle    || '',
                headerTitle : d.headerTitle || d.appTitle || '',
                headerColor : d.headerColor || '#005AE0',
              },
            });
          } else {
            warn(`API returned non-success: ${body}`);
            resolve(null);
          }
        } catch (e) {
          warn(`Failed to parse API response: ${e.message}`);
          resolve(null);
        }
      });
    });

    req.on('error', (e) => { warn(`API request failed: ${e.message}`); resolve(null); });
    req.on('timeout', ()  => { warn('API request timed out');           req.destroy(); resolve(null); });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async function main() {
  const args = parseArgs();

  // 1. Validate required args
  const miniAppId    = (args['miniAppId'] || '').trim();
  const webAppIdArg  = (args['webAppId']  || '').trim();  // DB id dùng để gọi API
  const apiUrlArg    = (args['apiUrl']    || '').trim();

  if (!miniAppId) {
    fail('--miniAppId is required.\nExample: node scripts/build-zma.js --webAppId=5 --miniAppId=1681970105047475776 --apiUrl=https://...');
  }

  const isForce  = args['force']   === true || args['force']   === 'true';

  // 2. Resolve config từ BE API (theo webAppId). API là nguồn DUY nhất.
  if (!apiUrlArg || !webAppIdArg) {
    fail(
      'Thiếu tham số để lấy config từ API.\n' +
      '  Cần: --webAppId=<dbId> --apiUrl=<url> (build-zma-select tự truyền khi chạy npm run zma:build).'
    );
  }

  const config = await fetchRemoteConfig(apiUrlArg, webAppIdArg);
  if (!config) {
    fail(
      `Không lấy được config cho miniAppId=${miniAppId} từ API.\n` +
      `  Kiểm tra --apiUrl=${apiUrlArg} và --webAppId=${webAppIdArg} (BE có thể chưa cấu hình app này).`
    );
  }
  log('Config source: API ✓');
  config.apiUrl = apiUrlArg;

  const { webAppId, businessId, template, zaloOaId = '', apiUrl, appConfig = {} } = config;

  if (!businessId) fail('"businessId" is missing in resolved config.');
  if (!template)   fail('"template" is missing in resolved config.');
  if (!apiUrl)     fail('"apiUrl" is missing — pass --apiUrl=<url>.');

  const appDir = path.join(ROOT, 'apps', template);
  if (!fs.existsSync(appDir)) {
    fail(`Template app directory not found: ${appDir}`);
  }

  log(`webAppId   : ${webAppId ?? '(none)'}`);
  log(`miniAppId  : ${miniAppId}`);
  log(`businessId : ${businessId}`);
  log(`template   : ${template}`);
  log(`apiUrl     : ${apiUrl}`);
  log(`zaloOaId   : ${zaloOaId || '(none)'}`);
  log(`force      : ${isForce}`);

  // Output dir
  const outputDirName = `${businessId}_${miniAppId}_${template}`;
  const outputDir     = path.join(ROOT, 'dist', outputDirName);

  // Paths to template source files
  const envProdPath   = path.join(appDir, 'src', 'environments', 'environment.prod.ts');
  const appConfigPath = path.join(appDir, 'app-config.json');
  const dotEnvPath    = path.join(appDir, '.env');

  // 3. Backup template source files
  const backups = {};
  for (const [key, p] of Object.entries({ envProd: envProdPath, appConfig: appConfigPath, dotEnv: dotEnvPath })) {
    if (fs.existsSync(p)) {
      backups[key] = { path: p, content: fs.readFileSync(p, 'utf8') };
    } else {
      warn(`Template file not found (will skip): ${p}`);
    }
  }

  // ZMP_TOKEN KHÔNG tham gia bước build (token là per-app, xử lý ở deploy).
  // Dist .env giữ ZMP_TOKEN=__ZMP_TOKEN__ (placeholder); deploy-zma lấy token đúng app
  // qua `zmp login` rồi ghi root .env trước khi `zmp deploy`.

  // Placeholder map — APP_ID được fill = miniAppId (suy từ build target),
  // __ZMP_TOKEN__ cố tình KHÔNG có trong map để giữ nguyên placeholder ở dist .env.
  const zaloBaseHref = `/zapps/${miniAppId}/`;
  const placeholderMap = {
    '__WEB_APP_ID__'     : String(webAppId ?? ''),
    '__MINI_APP_ID__'    : miniAppId,
    '__ZALO_BASE_HREF__' : zaloBaseHref,
    '__API_URL__'        : apiUrl,
    '__OA_ID__'          : zaloOaId,
    '__APP_TITLE__'      : appConfig.title       || miniAppId,
    '__HEADER_TITLE__'   : appConfig.headerTitle || appConfig.title || miniAppId,
    '__HEADER_COLOR__'   : appConfig.headerColor || '#005AE0',
  };

  // Pre-compute filled .env content (used in step 8)
  const filledDotEnv = backups.dotEnv
    ? fillPlaceholders(backups.dotEnv.content, placeholderMap)
    : null;

  // App section for final app-config
  const appSection = {
    title:       appConfig.title       || miniAppId,
    headerTitle: appConfig.headerTitle || appConfig.title || miniAppId,
    headerColor: appConfig.headerColor || '#005AE0',
    statusBar:   'transparent',
    actionBarHidden: true,
    hideAndroidBottomNavigationBar: false,
    hideIOSSafeAreaBottom: true,
    selfControlLoading: true,
  };

  try {
    // 4. Fill placeholders in template source files
    log('Filling placeholders in template files...');
    for (const backup of Object.values(backups)) {
      const filled = fillPlaceholders(backup.content, placeholderMap);
      fs.writeFileSync(backup.path, filled, 'utf8');
    }

    // 5. Run ng build
    const appNumber  = parseInt(template.split('-').pop(), 10);
    const appNameEnv = `app${appNumber}`;
    const buildCmd   = `ng build ${template} --configuration=production`;
    log(`Running: APP_NAME=${appNameEnv} ${buildCmd}`);
    execSync(buildCmd, {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, APP_NAME: appNameEnv },
    });

    // 6. Rename dist/{template}/ → dist/{outputDirName}/
    const builtDir = path.join(ROOT, 'dist', template);
    if (!fs.existsSync(builtDir)) {
      fail(`Expected build output not found: dist/${template}/`);
    }
    if (fs.existsSync(outputDir)) {
      log(`Removing existing output dir: dist/${outputDirName}/`);
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.renameSync(builtDir, outputDir);
    log(`Renamed → dist/${outputDirName}/`);

    // 7. Scan output and write final app-config.json + .env into dist folder
    log('Scanning output dir for JS/CSS files...');
    const fileLists = scanDistFiles(outputDir);

    const finalAppConfig = {
      app: { ...appSection },
      listCSS:    fileLists.listCSS,
      listSyncJS: fileLists.listSyncJS,
      listAsyncJS: fileLists.listAsyncJS,
    };
    const finalAppConfigJson = JSON.stringify(finalAppConfig, null, 2) + '\n';

    fs.writeFileSync(path.join(outputDir, 'app-config.json'), finalAppConfigJson, 'utf8');
    log(`Written dist/${outputDirName}/app-config.json (${fileLists.listCSS.length} CSS, ${fileLists.listSyncJS.length} syncJS, ${fileLists.listAsyncJS.length} asyncJS)`);

    if (filledDotEnv !== null) {
      fs.writeFileSync(path.join(outputDir, '.env'), filledDotEnv, 'utf8');
      log(`Written dist/${outputDirName}/.env`);
    }

    // 8. Write/update build manifest
    const manifestPath = path.join(ROOT, 'dist', 'build-manifest.json');
    let manifest = {};
    if (fs.existsSync(manifestPath)) {
      try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch (_) {}
    }
    manifest[outputDirName] = {
      miniAppId,
      businessId,
      template,
      zaloOaId,
      apiUrl,
      appConfig,
      builtAt: new Date().toISOString(),
    };
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    log(`Manifest updated: dist/build-manifest.json`);

    log(`\n✅ Build complete: dist/${outputDirName}/`);
    log(`   Để deploy app này: npm run zma:deploy`);

  } finally {
    // 9. Always restore template source files
    log('Restoring template source files...');
    for (const backup of Object.values(backups)) {
      fs.writeFileSync(backup.path, backup.content, 'utf8');
    }
    log('Template source files restored.');
  }
})();
