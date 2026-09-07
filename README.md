# 码知学 · 前端全栈演示（登录/注册 + 课程列表）

一个用于前端教学的“在线学习平台”演示：登录/注册、课程首页与列表（分类筛选 / 分页）。数据与认证接口由**零第三方依赖**的 Node 代码实现——逻辑集中在 `lib/api.js`（单一事实来源），在本地 / Render（`server.js` 常驻服务）与 Vercel（`api/` 云函数 + 静态托管）三种运行形态下复用同一份接口逻辑；`server.js` 另负责本地静态文件托管并读写 `db.json`。

- 数据服务本地默认端口：`http://localhost:8080`
- 部署可选：Render（`https://<服务名>.onrender.com`）或 Vercel（`https://<project>.vercel.app`），见下方部署章节

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

## 接口一览（lib/api.js 统一实现）

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

## 在线部署（Vercel）

Vercel 是「静态 + 无服务器函数」平台，不常驻运行 `node server.js`，因此本项目拆成两种形态：**仓库根作为静态站点**托管三个页面，`api/` 下两个函数提供数据接口，接口路径由 `vercel.json` 的 `rewrites` 保持为前端同源请求的 `/courses`、`/auth/login`、`/auth/register`——**前端三个页面无需任何改动**。

1. 把本仓库推送到 GitHub。
2. [vercel.com](https://vercel.com) → **Add New → Project** → 连接该 GitHub 仓库导入。项目设置保持默认即可（Build/Install/Output 均不填）：
   - Framework Preset：**Other**（让仓库根直接作为静态目录托管）
   - Root Directory：仓库根（默认）
   - 若项目页有 Node 版本选项，选 ≥18。
3. 部署完成后访问 `https://<project>.vercel.app`，前端自动按同源请求新路径，无需改代码。

**实现说明（给后续维护者）**

- `lib/api.js` 是数据/认证接口的单一事实来源；`server.js`（本地/Render）与 `api/` 云函数都调用它，行为一致。
- 课程列表为只读：云函数直接读随包携带的种子 `db.json`。
- 登录校验种子账号；注册走 `api/auth/[action].js`——`login` 与 `register` 落到**同一个函数单元**，共享 Vercel 唯一可写的 `/tmp/db.json`。

**注意**

- Vercel 函数文件系统只读（`/tmp` 除外）：注册的新账号写入 `/tmp`，**仅在当前热实例内有效**，冷启动 / 重新部署后消失；登录/课程等只读功能不受影响。想长期持久化注册需外接数据库，或改用 Render（免费盘重启即重置，同样是演示口径）。
- 可靠登录演示用内置预置账号：`student01/123456`、`admin/888888` 等，见上方账号表。
- `vercel.json` 用 `functions.includeFiles` 确保种子 `db.json` 打进函数包；若改动了这两个函数文件路径，需同步更新该配置。

## 目录结构（仅发布运行必需文件）

```
.
├── index.html / course.html / auth.html   # 三个页面
├── css/   common.css index.css course.css
├── js/    main.js utils.js courseFilterPage.js courseCardRender.js indexCourseRender.js
├── img/   banner1-3.png
├── lib/api.js       # 数据 + 认证接口核心（server.js 与 Vercel 云函数共用）
├── server.js        # 本地/Render 静态 + 数据服务（原生 node:http，零依赖）
├── api/             # Vercel 云函数（courses.js / auth/[action].js）
├── vercel.json      # Vercel 配置（rewrites 保路径 + includeFiles 带种子 db.json）
├── db.json          # 唯一数据源：categories / courses / users
├── package.json
└── render.yaml      # Render Blueprint（可选）
```
