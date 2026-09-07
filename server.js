/* ========================================
 * 码知学 - 本地静态 + 数据服务（server.js）
 * 用途：npm run server 后数据服务运行在 http://localhost:8080。
 *   页面（index.html / course.html）可经本服务(:8080)打开，也可经 Live Server(:5501)/file:// 打开，
 *   前端统一 fetch 本服务读取课程数据、提交认证请求。已开 CORS(*)，跨源浏览器放行。
 * 接口：
 *   GET  /courses         读 db.json 的 courses（裸数组，分页/筛选由前端做）
 *   POST /auth/login      校验 {account,password} 是否命中 db.json 的 users（只读）
 *   POST /auth/register   把 {account,phone,password} 写入 db.json 的 users（持久化，注册后即可登录）
 * 说明：零第三方依赖，原生 node:http；db.json 每次请求现读，改数据刷新即生效。
 *   注册属教学演示写入：密码按 db.json 现有用户同样以明文存储，生产必须加盐哈希（见 js/utils.js 头注释）。
 * 约束：GET 外仅接受上述两个 POST 与 OPTIONS 预检；其它写操作请交给 json-server（npm run mock，:3000）。
 * ======================================== */

'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;                              // 项目根目录（含中文路径，Node fs 原生支持）
/* 唯一数据源：默认 db.json；支持 DB_FILE 环境变量指向副本（隔离测试/演示用，避免污染真实数据） */
const DB_PATH = process.env.DB_FILE ? path.resolve(process.env.DB_FILE) : path.join(ROOT, 'db.json');
const PORT = Number(process.env.PORT) || 8080;       // 支持 env 覆盖（verify.js 用独立端口拉起）

/* 登录失败统一文案：不区分“账号不存在 / 密码错误”，防账号枚举（与前端 LOGIN_FAIL_TEXT 保持一致） */
const LOGIN_FAIL_TEXT = '账号或密码错误，请重试';

/* JSON 响应统一 Content-Type */
const JSON_CT = 'application/json; charset=utf-8';

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

/* 跨源放行：页面可能在 Live Server(5501)/file:// 等其它源上，须允许其读取本服务数据（CORS 由浏览器强制） */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

/* 统一响应：body 可为 string 或 Buffer；用 Buffer 字节数计算 Content-Length，避免中文长度错误 */
function send(res, code, body, contentType) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body === undefined || body === null ? '' : String(body), 'utf8');
  res.writeHead(code, Object.assign({}, CORS_HEADERS, {
    'Content-Type': contentType,
    'Content-Length': buf.length
  }));
  res.end(buf);
}

/* 读取 db.json 的 courses 数组（契约 §5：返回裸数组，分页/筛选由前端客户端做） */
function readCourses() {
  const raw = fs.readFileSync(DB_PATH, 'utf8');
  const data = JSON.parse(raw);
  return data.courses;
}

/* 读取整个 db 对象（注册需在顶层结构上改 users 后整体写回） */
function loadDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

/* 把 db 对象整体写回数据文件（保持 2 空格缩进，与既有 db.json 风格一致） */
function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

/* 读取请求体 JSON：超 64KB 直接断开防滥用；解析失败/非 JSON 返回 null */
function readJsonBody(req) {
  return new Promise(function (resolve) {
    const chunks = [];
    let size = 0;
    req.on('data', function (chunk) {
      size += chunk.length;
      if (size > 64 * 1024) {
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', function () {
      const raw = Buffer.concat(chunks).toString('utf8');
      let data = null;
      if (raw) {
        try { data = JSON.parse(raw); } catch (e) { data = null; }
      }
      resolve(data);
    });
    req.on('error', function () { resolve(null); });
  });
}

/* 认证接口（login/register 共用）：
   login    —— 在 db.json 的 users 中查 account 且密码一致才算通过；
   register —— 后端兜底校验 → 账号/手机号唯一性 → 追加新用户并写回文件（注册后即可登录）。 */
async function handleAuth(req, res, kind) {
  const body = (await readJsonBody(req)) || {};
  const account = typeof body.account === 'string' ? body.account.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const sendJson = (code, obj) => send(res, code, JSON.stringify(obj), JSON_CT);

  if (kind === 'login') {
    if (!account || !password) return sendJson(400, { ok: false, message: '请输入账号和密码' });
    const db = loadDB();
    const user = (db.users || []).find((u) => u.account === account);
    /* 统一提示：不暴露“账号不存在”与“密码错误”的区别（防枚举） */
    if (!user || user.password !== password) return sendJson(401, { ok: false, message: LOGIN_FAIL_TEXT });
    /* 不回传密码等敏感字段 */
    return sendJson(200, { ok: true, user: { id: user.id, account: user.account, phone: user.phone } });
  }

  /* —— register —— */
  if (!account || !phone || !password) {
    return sendJson(400, { ok: false, message: '账号、手机号、密码均不能为空' });
  }
  /* 后端兜底校验（与 utils.js 同规则，防止绕过前端直接调接口） */
  if (password.length < 6 || password.length > 20) {
    return sendJson(400, { ok: false, message: '密码长度需为 6~20 位' });
  }
  const db = loadDB();
  db.users = db.users || [];
  if (db.users.some((u) => u.account === account)) {
    return sendJson(409, { ok: false, message: '该账号已被注册，请直接登录' });
  }
  if (db.users.some((u) => u.phone === phone)) {
    return sendJson(409, { ok: false, message: '该手机号已被注册，请更换' });
  }
  const maxId = db.users.reduce((m, u) => Math.max(m, parseInt(u.id, 10) || 0), 0);
  const newUser = { id: String(maxId + 1), account: account, phone: phone, password: password };
  db.users.push(newUser);
  saveDB(db); // 持久化：注册成功即落入 db.json，重启服务后仍可登录
  return sendJson(201, { ok: true, id: newUser.id, account: newUser.account });
}

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

  /* —— 认证接口（POST）：登录校验 / 注册写入，均作用于 db.json 的 users —— */
  if (req.method === 'POST') {
    if (pathname === '/auth/login' || pathname === '/auth/register') {
      const kind = pathname === '/auth/login' ? 'login' : 'register';
      handleAuth(req, res, kind).catch(function () {
        send(res, 500, JSON.stringify({ ok: false, message: '服务器内部错误' }), JSON_CT);
      });
      return;
    }
    send(res, 404, 'Not Found', 'text/plain; charset=utf-8');
    return;
  }

  /* —— 其余仅支持 GET（本服务静态 + 数据源） —— */
  if (req.method !== 'GET') {
    send(res, 405, 'Method Not Allowed', 'text/plain; charset=utf-8');
    return;
  }

  /* —— 数据接口：GET /courses —— */
  if (pathname === '/courses') {
    try {
      const body = JSON.stringify(readCourses());
      send(res, 200, body, 'application/json; charset=utf-8');
    } catch (e) {
      console.error('[server] 读取 db.json 失败：', e.message);
      send(res, 500, '{"error":"db read fail"}', 'application/json; charset=utf-8');
    }
    return;
  }

  /* —— favicon 短路：页面无 favicon，屏蔽控制台 404 噪音 —— */
  if (pathname === '/favicon.ico') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  /* —— 静态文件（防路径穿越） —— */
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
