'use strict';

/**
 * zma-token.js — Tiện ích decode/validate token ZMP (JWT) cho deploy.
 *
 * ZMP_TOKEN là JWT per-mini-app (claim `appId` khoá cứng vào 1 app, có `exp`).
 * Token do `zmp login` cấp và ghi vào root `.env`; deploy đọc lại, GUARD
 * (appId === miniAppId & còn hạn) trước khi `zmp deploy`.
 * (Không còn kho token riêng — bỏ cùng lệnh zma:init.)
 */

/** Decode JWT payload (không verify chữ ký). Trả về object hoặc null. */
function decodeJwtPayload(token) {
  try {
    const part = String(token || '').split('.')[1];
    if (!part) return null;
    return JSON.parse(Buffer.from(part, 'base64url').toString());
  } catch (_) {
    return null;
  }
}

/** Lấy claim `exp` (giây). Trả về null nếu không đọc được. */
function parseJwtExp(token) {
  const payload = decodeJwtPayload(token);
  return payload && typeof payload.exp === 'number' ? payload.exp : null;
}

/** Lấy claim `appId` dạng string. Trả về null nếu không đọc được. */
function parseJwtAppId(token) {
  const payload = decodeJwtPayload(token);
  return payload && payload.appId != null ? String(payload.appId) : null;
}

/** true nếu token là JWT đã hết hạn. */
function isJwtExpired(token) {
  const exp = parseJwtExp(token);
  return exp !== null && exp < Math.floor(Date.now() / 1000);
}

/**
 * GUARD: token có hợp lệ cho miniAppId hay không (decode được, đúng app, còn hạn).
 * @returns {{ ok: boolean, reason?: string }}
 */
function validateToken(token, miniAppId) {
  const id = String(miniAppId).trim();
  if (!token) {
    return { ok: false, reason: `Chưa có token cho app ${id}.` };
  }
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return { ok: false, reason: 'Token không decode được (JWT hỏng).' };
  }
  const appId = parseJwtAppId(token);
  if (appId !== id) {
    return { ok: false, reason: `Token thuộc app ${appId ?? '(không rõ)'}, không phải ${id}.` };
  }
  if (isJwtExpired(token)) {
    const exp = parseJwtExp(token);
    const when = exp ? new Date(exp * 1000).toLocaleString('vi-VN') : '(không rõ)';
    return { ok: false, reason: `Token đã hết hạn lúc ${when}.` };
  }
  return { ok: true };
}

module.exports = {
  decodeJwtPayload,
  parseJwtExp,
  parseJwtAppId,
  isJwtExpired,
  validateToken,
};
