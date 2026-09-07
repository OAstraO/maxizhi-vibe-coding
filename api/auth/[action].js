/* ========================================
 * Vercel Serverless Function —— POST /auth/login|register(动态段 action)
 * vercel.json 把 /auth/login、/auth/register rewrite 到 /api/auth/login|register,
 * 两路请求落到同一个函数文件 → 共享同一 /tmp 可写目录与热实例,
 * 使「注册后立即登录」在热实例内可直接成功(冷启动后 /tmp 重置,新账号消失,见 README)。
 * 实际校验/写回逻辑复用 lib/api.js 的 handleAuth(与 server.js 同源同行为)。
 * ======================================== */

'use strict';

const { routesApi, send, canonicalApiPath } = require('../../lib/api.js');

/* 解析 action:优先取 Vercel 动态段注入的 req.query.action,兜底取契约路径末段 */
function resolveAction(req) {
  const q = req.query && req.query.action;
  if (q === 'login' || q === 'register') return q;
  const p = canonicalApiPath(req.url); // 剥 /api 前缀,兼容 rewrite 传目标或原始路径
  if (p === null) return null;
  const last = p.split('/').filter(Boolean).pop() || '';
  return last === 'login' || last === 'register' ? last : null;
}

module.exports = function (req, res) {
  const action = resolveAction(req);
  if (!action) {
    send(res, 404, 'Not Found', 'text/plain; charset=utf-8');
    return;
  }
  const pathname = '/auth/' + action;
  if (!routesApi(req.method, pathname, req, res)) {
    send(res, req.method === 'POST' ? 404 : 405, 'Not Found', 'text/plain; charset=utf-8');
  }
};
