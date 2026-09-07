/* ========================================
 * 码知学 - 本地静态 + 数据服务(server.js)
 * 用途：npm run server 后数据服务运行在 http://localhost:8080。
 *   页面（index.html / course.html）可经本服务(:8080)打开，也可经 Live Server(:5501)/file:// 打开，
 *   前端统一 fetch 本服务读取课程数据、提交认证请求。已开 CORS(*)，跨源浏览器放行。
 * 数据/认证接口逻辑集中在 lib/api.js(单一事实来源)：
 *   GET  /courses         读 db.json 的 courses(裸数组,分页/筛选由前端做)
 *   POST /auth/login      校验 {account,password} 是否命中 db.json 的 users(只读)
 *   POST /auth/register   把 {account,phone,password} 写入 db.json 的 users(写回)
 * 本文件职责：端口监听 + 静态文件托管；Vercel 上不跑本进程，改由 lib/api.js + api/ 云函数提供接口。
 * 说明：零第三方依赖，原生 node:http；db.json 每次请求现读，改数据刷新即生效。
 *   注册属教学演示写入：密码按 db.json 现有用户同样以明文存储，生产必须加盐哈希(见 js/utils.js 头注释)。
 * ======================================== */

'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { send, CORS_HEADERS, routesApi } = require('./lib/api.js');

const ROOT = __dirname;                              // 项目根目录(含中文路径，Node fs 原生支持)
const PORT = Number(process.env.PORT) || 8080;       // 支持 env 覆盖(verify.js 用独立端口拉起)

/* 扩展名 → [Content-Type, 是否文本(追加 charset)] */
const MIME = {
  '.html': ['text/html', true],
  '.js': ['text/javascript', true],
  '.css': ['text/css', true],
  '.json': ['application/json', true],
  '.svg': ['image/svg+xml', true],
  '.png': ['image/png', false],
  '.jpg': ['image/jpeg', false],
  '.jpeg': ['image/jpeg', false],
  '.gif': ['image/gif', false],
  '.ico': ['image/x-icon', false],
  '.webp': ['image/webp', false]
};

const server = http.createServer(function (req, res) {
  /* —— 跨源预检：浏览器跨源 GET/POST 前会发 OPTIONS，直接放行 —— */
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) {
    send(res, 400, 'Bad Request', 'text/plain; charset=utf-8');
    return;
  }

  /* —— 数据与认证接口(OPTIONS/POST auth/GET /courses)由 lib/api.js 统一处理，未命中继续走静态 —— */
  if (routesApi(req.method, pathname, req, res)) return;

  /* —— 其余写方法兜底：POST 未命中任何接口 → 404 —— */
  if (req.method === 'POST') {
    send(res, 404, 'Not Found', 'text/plain; charset=utf-8');
    return;
  }

  /* —— 其余方法(PUT/DELETE…)不支持 —— */
  if (req.method !== 'GET') {
    send(res, 405, 'Method Not Allowed', 'text/plain; charset=utf-8');
    return;
  }

  /* —— favicon 短路：页面无 favicon，屏蔽控制台 404 噪音 —— */
  if (pathname === '/favicon.ico') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  /* —— 静态文件(防路径穿越) —— */
  let rel = (pathname === '/' ? '/index.html' : pathname).replace(/^[/\\]+/, '');
  if (/\/$/.test(rel)) rel += 'index.html'; // 目录请求落到其 index.html

  const filePath = path.normalize(path.join(ROOT, rel));
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    send(res, 403, 'Forbidden', 'text/plain; charset=utf-8');
    return;
  }

  fs.readFile(filePath, function (err, data) {
    if (err) {
      if (err.code === 'ENOENT') {
        send(res, 404, 'Not Found', 'text/plain; charset=utf-8');
      } else {
        console.error('[server] 读取文件失败：', filePath, err.message);
        send(res, 500, 'Internal Server Error', 'text/plain; charset=utf-8');
      }
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const pair = MIME[ext] || ['application/octet-stream', false];
    const contentType = pair[1] ? pair[0] + '; charset=utf-8' : pair[0];
    send(res, 200, data, contentType);
  });
});

server.on('error', function (e) {
  if (e.code === 'EADDRINUSE') {
    console.error('[server] 端口 ' + PORT + ' 已被占用，请换 PORT 环境变量或关闭占用进程后重试。');
  } else {
    console.error('[server] 启动失败：', e);
  }
  process.exit(1);
});

server.listen(PORT, function () {
  console.log('[server] running at http://localhost:' + PORT);
});
