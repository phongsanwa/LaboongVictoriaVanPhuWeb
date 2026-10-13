#!/usr/bin/env node
/**
 * update-app-config.js — ĐÃ NGỪNG SỬ DỤNG (deprecated).
 *
 * Script cũ merge apps/{app}/.env ĐÈ LÊN root .env → từng là nguồn gây rò token
 * và đẩy nhầm app. Luồng mới KHÔNG dùng file này.
 *
 * Thay thế:
 *   - Build:  npm run zma:build
 *   - Deploy: npm run zma:deploy   (tự lo token qua zmp login + GUARD appId===miniAppId)
 *
 * Chi tiết: docs/zma-build-deploy-guide.md
 */
'use strict';

console.error(
  '[update-app-config] Script này đã ngừng sử dụng.\n' +
  '  Dùng: npm run zma:build  →  npm run zma:deploy   (deploy tự lo token qua zmp login).\n' +
  '  Xem docs/zma-build-deploy-guide.md'
);
process.exit(1);
