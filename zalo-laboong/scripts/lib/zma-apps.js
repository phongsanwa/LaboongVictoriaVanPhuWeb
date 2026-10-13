'use strict';

/**
 * zma-apps.js — Shared library cho build-zma-list.js và build-zma-select.js
 *
 * Layer 1: fetchApps     — gọi GET /webapptpl/zma-config/apps
 * Layer 2: filterApps    — filter danh sách (hiện tại pass-through)
 *          enrichApps    — gắn thêm buildInfo từ build-manifest.json
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const http  = require('http');

const ROOT = path.resolve(__dirname, '../..');

// ---------------------------------------------------------------------------
// Layer 1 — Data fetching
// ---------------------------------------------------------------------------

/**
 * Gọi GET {apiUrl}/webapptpl/zma-config/apps, trả về array app từ API.
 * Throw Error nếu request thất bại hoặc response không hợp lệ.
 *
 * @param {string} apiUrl
 * @returns {Promise<Array>}
 */
function fetchApps(apiUrl) {
  return new Promise((resolve, reject) => {
    const url = `${apiUrl.replace(/\/+$/, '')}/webapptpl/zma-config/apps`;
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, { timeout: 15000 }, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (json.code === 1 && Array.isArray(json.data)) {
            resolve(json.data);
          } else {
            reject(new Error(`API trả về lỗi: ${body.slice(0, 200)}`));
          }
        } catch (e) {
          reject(new Error(`Không parse được response: ${e.message}`));
        }
      });
    });

    req.on('error',   (e) => reject(new Error(`Request thất bại: ${e.message}`)));
    req.on('timeout', ()  => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

// ---------------------------------------------------------------------------
// Layer 2 — Filter / Transform
// ---------------------------------------------------------------------------

/**
 * App Status — sync với DB zalo_miniapp_configs.appStatus
 *   1 NEW       — chưa lên Zalo Console (KHÔNG cho build)
 *   2 PENDING   — đã lên Zalo Console, đang chờ Zalo duyệt
 *   3 APPROVED  — Zalo đã duyệt
 *   4 REJECTED  — Zalo từ chối (vẫn có miniAppId → dev có thể rebuild để test fix)
 */
const APP_STATUS_NEW = 1;

/**
 * Filter danh sách app cần hiển thị/build.
 *  - Loại app chưa cấu hình template phía server.
 *  - Loại app chưa có miniAppId (chưa được tạo trên Zalo Console).
 *  - Loại app đang ở appStatus = NEW (chưa lên Zalo Console).
 *
 * Lưu ý: BE `/webapptpl/zma-config/apps` đã filter sẵn (skip NEW/null/miniAppId rỗng).
 * Lớp filter này là defensive — phòng khi gọi BE cũ chưa deploy gate appStatus.
 *
 * @param {Array} apps
 * @returns {Array}
 */
function filterApps(apps) {
  return apps.filter(app =>
       Boolean(app.template)
    && Boolean(app.miniAppId)
    && app.appStatus !== APP_STATUS_NEW
  );
}

/**
 * Enrich mỗi app với thông tin build từ dist/build-manifest.json.
 * Gắn thêm: lastBuiltAt (ISO string | null), outputPath (string | null)
 *
 * @param {Array}  apps
 * @param {Object} [manifest]  Nếu không truyền, tự đọc từ file
 * @returns {Array}
 */
function enrichApps(apps, manifest) {
  const mf = manifest ?? loadManifest();
  return apps.map(app => {
    // Tìm entry trong manifest theo miniAppId (key = {businessId}_{miniAppId})
    let lastBuiltAt  = null;
    let outputPath   = null;

    for (const [key, entry] of Object.entries(mf)) {
      if (String(entry.miniAppId) === String(app.miniAppId)) {
        lastBuiltAt = entry.builtAt ?? null;
        outputPath  = `dist/${key}`;
        break;
      }
    }

    return { ...app, lastBuiltAt, outputPath };
  });
}

/**
 * Đọc dist/build-manifest.json, trả về object (rỗng nếu chưa có).
 * @returns {Object}
 */
function loadManifest() {
  const p = path.join(ROOT, 'dist', 'build-manifest.json');
  if (!fs.existsSync(p)) return {};
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (_) {
    return {};
  }
}

/**
 * Trả label ngắn cho appStatus để hiển thị trong CLI table.
 * @param {number|null|undefined} status
 * @returns {string}
 */
function getAppStatusLabel(status) {
  switch (status) {
    case 1: return 'NEW';
    case 2: return 'PENDING';
    case 3: return 'APPROVED';
    case 4: return 'REJECTED';
    default: return '-';
  }
}

module.exports = { fetchApps, filterApps, enrichApps, loadManifest, getAppStatusLabel };
