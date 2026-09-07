/* ========================================
 * 码知学 - 共享「数据 + 认证」后端逻辑(lib/api.js)
 * 用途:一份代码同时支撑三条运行路径,保证接口行为处处一致:
 *   1. server.js(本地/Render):常驻进程,静态 + 接口同源;
 *   2. Vercel 云函数 api/courses.js        → GET /courses;
 *   3. Vercel 云函数 api/auth/[action].js  → POST /auth/login|register。
 * 接口(契约与 README 一致):
 *   GET  /courses         读 courses(裸数组,分页/筛选由前端做)
 *   POST /auth/login      校验 {account,password} 是否命中 users(只读)
 *   POST /auth/register   把 {account,phone,password} 追加进 users(写回)
 * 数据文件选址:
 *   - Vercel(process.env.VERCEL):函数文件系统只读,「活数据」放唯一可写目录 /tmp/db.json;
 *     冷启动首次访问把随函数打包的种子 db.json 拷贝到 /tmp,此后读写 /tmp(演示级易失,见 README)。
 *   - 本地/Render:沿用 DB_FILE 环境变量或仓库根 db.json,行为与改版前完全一致。
 * 说明:零第三方依赖,原生 node:fs / node:http;密码与既有用户同样明文存储(教学演示,生产须加盐哈希)。
 * ======================================== */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

/* 仓库根:lib/ 的上一级(本地 = 运行目录;Vercel 函数打包后 = 函数沙箱根,含随包 db.json) */
const REPO_ROOT = path.join(__dirname, '..');

/* 是否运行在 Vercel(Vercel 会注入该变量) */
const IS_VERCEL = !!process.env.VERCEL;

/* 登录失败统一文案:不区分“账号不存在 / 密码错误”,防账号枚举(与前端 LOGIN_FAIL_TEXT 保持一致) */
const LOGIN_FAIL_TEXT = '账号或密码错误，请重试';

/* JSON 响应统一 Content-Type */
const JSON_CT = 'application/json; charset=utf-8';

/* 跨源放行:页面可能在 Live Server(5501)/file:// 等其它源上,须允许其读取本服务数据(CORS 由浏览器强制) */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

/* 统一响应:body 可为 string 或 Buffer;用 Buffer 字节数计算 Content-Length,避免中文长度错误 */
function send(res, code, body, contentType) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body === undefined || body === null ? '' : String(body), 'utf8');
  res.writeHead(code, Object.assign({}, CORS_HEADERS, {
    'Content-Type': contentType,
    'Content-Length': buf.length
  }));
  res.end(buf);
}

/* ================= 数据文件选址 ================= */

/* 「活数据」路径:Vercel 用 /tmp(唯一可写);否则 DB_FILE 环境变量或仓库根 db.json */
function liveDbPath() {
  if (IS_VERCEL) return path.join('/tmp', 'db.json');
  const env = process.env.DB_FILE;
  return env ? path.resolve(env) : path.join(REPO_ROOT, 'db.json');
}

/* 种子路径:Vercel 用随函数打包的仓库 db.json;本地/渲染种子即活文件 */
function seedDbPath() {
  return IS_VERCEL ? path.join(REPO_ROOT, 'db.json') : liveDbPath();
}

/* 读取整个 db 对象。
   Vercel 分支:/tmp/db.json 不存在(冷启动)时,先把种子 db.json 拷贝过去,再读取;此后注册写回也落到 /tmp。 */
function loadDB() {
  if (!IS_VERCEL) return JSON.parse(fs.readFileSync(liveDbPath(), 'utf8'));
  let raw;
  try {
    raw = fs.readFileSync('/tmp/db.json', 'utf8');
  } catch (e) {
    raw = fs.readFileSync(seedDbPath(), 'utf8'); // 随包种子(vercel.json includeFiles 保证在场)
    fs.writeFileSync('/tmp/db.json', raw);       // 铺一次,本次实例后续读写都基于它
  }
  return JSON.parse(raw);
}

/* 把 db 对象整体写回活数据文件(保持 2 空格缩进,与既有 db.json 风格一致) */
function saveDB(db) {
  fs.writeFileSync(liveDbPath(), JSON.stringify(db, null, 2), 'utf8');
}

/* 读取 courses 数组(契约:返回裸数组,分页/筛选由前端客户端做) */
function readCourses() {
  const data = loadDB();
  return data.courses;
}

/* ================= 请求体读取 ================= */

/* 读取请求体 JSON:超 64KB 直接断开防滥用;解析失败/非 JSON 返回 null */
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

/* ================= 业务处理 ================= */

/* 认证接口(login/register 共用):
   login    —— 在 users 中查 account 且密码一致才算通过(只读);
   register —— 后端兜底校验 → 账号/手机号唯一性 → 追加新用户并写回(注册后即可登录)。 */
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
    /* 统一提示:不暴露“账号不存在”与“密码错误”的区别(防枚举) */
    if (!user || user.password !== password) return sendJson(401, { ok: false, message: LOGIN_FAIL_TEXT });
    /* 不回传密码等敏感字段 */
    return sendJson(200, { ok: true, user: { id: user.id, account: user.account, phone: user.phone } });
  }

  /* —— register —— */
  if (!account || !phone || !password) {
    return sendJson(400, { ok: false, message: '账号、手机号、密码均不能为空' });
  }
  /* 后端兜底校验(与 js/utils.js 同规则,防止绕过前端直接调接口) */
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
  saveDB(db); // 持久化:本地/Render 落 db.json;Vercel 落 /tmp(实例易失)
  return sendJson(201, { ok: true, id: newUser.id, account: newUser.account });
}

/* GET /courses:读失败返回 500(与 server.js 历史行为一致) */
function handleCourses(res) {
  try {
    const body = JSON.stringify(readCourses());
    send(res, 200, body, JSON_CT);
  } catch (e) {
    console.error('[api] 读取 db.json 失败：', e.message);
    send(res, 500, '{"error":"db read fail"}', JSON_CT);
  }
}

/* 规范化云函数收到的请求路径:Vercel rewrite 后,函数可能收到目标路径(/api/courses)或
   保留的原始路径(/courses),这里统一剥掉 /api 前缀,归一到契约路径(/courses、/auth/login、/auth/register)。
   返回 null 表示 URL 无法解析。 */
function canonicalApiPath(rawUrl) {
  let p;
  try {
    p = decodeURIComponent(new URL(rawUrl, 'http://localhost').pathname);
  } catch (e) {
    return null;
  }
  if (p.startsWith('/api')) p = p.replace(/^\/api/, '') || '/';
  return p;
}

/* 顶层路由分派:命中数据/认证接口返回 true,否则返回 false 交给调用方兜底。
   - OPTIONS            → 204 放行预检;
   - POST /auth/login|register → handleAuth;
   - GET  /courses      → handleCourses。
   server.js(本地/Render)与 Vercel 云函数都走同一函数,保证行为一致。 */
function routesApi(method, pathname, req, res) {
  if (method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return true;
  }
  if (method === 'POST') {
    if (pathname === '/auth/login' || pathname === '/auth/register') {
      const kind = pathname === '/auth/login' ? 'login' : 'register';
      handleAuth(req, res, kind).catch(function () {
        send(res, 500, JSON.stringify({ ok: false, message: '服务器内部错误' }), JSON_CT);
      });
      return true;
    }
    return false;
  }
  if (method === 'GET' && pathname === '/courses') {
    handleCourses(res);
    return true;
  }
  return false;
}

module.exports = {
  IS_VERCEL: IS_VERCEL,
  REPO_ROOT: REPO_ROOT,
  LOGIN_FAIL_TEXT: LOGIN_FAIL_TEXT,
  JSON_CT: JSON_CT,
  CORS_HEADERS: CORS_HEADERS,
  send: send,
  liveDbPath: liveDbPath,
  seedDbPath: seedDbPath,
  loadDB: loadDB,
  saveDB: saveDB,
  readCourses: readCourses,
  readJsonBody: readJsonBody,
  handleAuth: handleAuth,
  handleCourses: handleCourses,
  routesApi: routesApi,
  canonicalApiPath: canonicalApiPath
};
