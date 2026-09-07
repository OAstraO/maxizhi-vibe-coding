# 码知学 · 前端全栈演示（登录/注册 + 课程列表）

一个用于前端教学的“在线学习平台”演示：登录/注册、课程首页与列表（分类筛选 / 分页）均由一个**零第三方依赖**的 Node 服务（`server.js`）提供——既当静态文件服务器，又读写 `db.json` 提供数据接口。

- 在线地址（Render，冷启动需等约几十秒）：由部署时生成的 `https://<服务名>.onrender.com` 提供
- 数据服务本地默认端口：`http://localhost:8080`

## 本地运行

```bash
npm install        # 有 package-lock.json，可用 npm ci
npm run server     # = node server.js，启动静态 + 数据服务 :8080
```

浏览器打开：

- 首页：`http://localhost:8080/`
- 课程列表：`http://localhost:8080/course.html`
- 登录 / 注册：`http://localhost:8080/auth.html`

> 页面也可以用 Live Server(:5501) 或直接双击 html 打开——前端会自动回退请求本机 `localhost:8080` 的数据服务（已开 CORS `*`）。

## 预置演示账号（db.json 内置，明文仅限教学演示）

| 账号 | 密码 |
| ---- | ---- |
| `student01` | `123456` |
| `admin` | `888888` |
| `tester` | `abc123` |
| `aaa` | `112233445566` |

## 接口一览（server.js）

| 方法 | 路径 | 说明 |
| ---- | ---- | ---- |
| GET | `/courses` | 返回课程裸数组（分页/筛选由前端做） |
| POST | `/auth/login` | 校验账号密码（失败统一提示，防枚举） |
| POST | `/auth/register` | 校验唯一性后写入 `db.json`，注册即可登录 |
| GET | 其它路径 | 静态文件（`/` → `index.html`） |

## 在线部署（Render）

1. 把本仓库推送到 GitHub。
2. [dashboard.render.com](https://dashboard.render.com) → **New → Web Service** → 连接该 GitHub 仓库：
   - Build Command：`npm install --omit=dev`
   - Start Command：`node server.js`
   - Instance Type：Free
   - Render 自动注入 `PORT`，`server.js` 已读取，无需另配环境变量。
3. 部署完成后访问 `https://<服务名>.onrender.com`。
   - 仓库内置 `render.yaml`，也可 **New → Blueprint** 一键生成同名服务。

**注意**

- Render 免费实例约 15 分钟无访问会休眠，再次访问首次偏慢属正常。
- 免费实例磁盘是临时的：运行期注册写入 `db.json` 的数据在实例重启 / 重新部署后会回到仓库里的种子数据；内置 4 个账号始终可登录。
- `db.json` 密码为明文，仅作前端教学演示；生产环境必须加盐哈希（bcrypt/argon2），见 `server.js`、`js/utils.js` 头注释。

## 目录结构（仅发布运行必需文件）

```
.
├── index.html / course.html / auth.html   # 三个页面
├── css/   common.css index.css course.css
├── js/    main.js utils.js courseFilterPage.js courseCardRender.js indexCourseRender.js
├── img/   banner1-3.png
├── server.js   # 静态 + 数据服务（原生 node:http，零依赖）
├── db.json     # 唯一数据源：categories / courses / users
├── package.json
└── render.yaml # Render Blueprint（可选）
```
