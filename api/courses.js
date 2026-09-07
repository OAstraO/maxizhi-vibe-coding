/* ========================================
 * Vercel Serverless Function —— GET /courses
 * vercel.json 把前端同源请求 /courses rewrite 到 /api/courses,
 * 实际逻辑复用 lib/api.js 的 routesApi(与 server.js 同源同行为)。
 * 说明:只读 db.json(Vercel 上直接读随包种子;注册等写操作不经过本函数)。
 * ======================================== */

'use strict';

const { routesApi, send, canonicalApiPath } = require('../lib/api.js');

module.exports = function (req, res) {
  const pathname = canonicalApiPath(req.url); // 剥 /api 前缀,归一到契约路径
  if (pathname === null) {
    send(res, 400, 'Bad Request', 'text/plain; charset=utf-8');
    return;
  }
  /* 命中 GET /courses 由 routesApi 返回课程数组;否则 404 兜底 */
  if (!routesApi(req.method, pathname, req, res)) {
    send(res, 404, 'Not Found', 'text/plain; charset=utf-8');
  }
};
