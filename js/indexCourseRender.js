/* ========================================
 * 码知学 - 首页「实战课程」渲染模块（js/indexCourseRender.js）
 * 模块边界：对外导出 initHomeCourses()（自动执行）、renderHomeCourseList(list)、buildHomeCourseCard(course)。
 *   负责 fetch('/courses') → 取前 4 门 → 渲染进首页 .course-grid；
 *   只复用 index.css 既有 .course-card 系列 class，不新增 class、不改样式。
 * 约束：原生 JS、无第三方库；课程文本值一律 textContent 直出，不参与 HTML 拼接（XSS 安全）。
 * 课程对象字段：id / title / category / coverType / badgeList / desc / difficulty / lessonCount / studentCount
 * ======================================== */

/* 首页卡片右上角小图标（40×40，视觉与 index.html 原硬编码卡片一致）：
   key 对应课程 coverType；python/vue/java 为原页面内联 svg 原文，
   db/ts/linux 参照 courseCardRender.js 造型简化为同规格；未知类型走 default 兜底 */
var HOME_ICON_SVG = {
  python: '<svg viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="8" fill="#EFF6FF"/><path d="M14 26h12M20 14v12" stroke="#2563eb" stroke-width="2" stroke-linecap="round"/><rect x="10" y="10" width="20" height="20" rx="4" stroke="#2563eb" stroke-width="1.5"/></svg>',
  vue: '<svg viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="8" fill="#EFF6FF"/><path d="M10 12l10 16L30 12h-5l-5 8-5-8z" stroke="#2563eb" stroke-width="1.5" fill="none"/></svg>',
  java: '<svg viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="8" fill="#EFF6FF"/><line x1="10" y1="20" x2="30" y2="20" stroke="#2563eb" stroke-width="2"/><line x1="20" y1="10" x2="20" y2="30" stroke="#2563eb" stroke-width="2"/><circle cx="20" cy="20" r="3" fill="#2563eb"/></svg>',
  ai: '<svg viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="8" fill="#EFF6FF"/><circle cx="20" cy="20" r="8" stroke="#2563eb" stroke-width="1.5"/><path d="M20 12v4M20 24v4M12 20h4M24 20h4" stroke="#2563eb" stroke-width="1.5" stroke-linecap="round"/></svg>',
  db: '<svg viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="8" fill="#EFF6FF"/><ellipse cx="20" cy="13" rx="9" ry="4" stroke="#2563eb" stroke-width="1.5"/><path d="M11 13v15c0 2.5 4 4 9 4s9-1.5 9-4V13" stroke="#2563eb" stroke-width="1.5"/><path d="M11 21c0 2.5 4 4 9 4s9-1.5 9-4" stroke="#2563eb" stroke-width="1.5" opacity="0.7"/></svg>',
  ts: '<svg viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="8" fill="#EFF6FF"/><text x="20" y="27" font-size="16" font-weight="700" fill="#2563eb" text-anchor="middle" font-family="Arial,sans-serif">TS</text></svg>',
  linux: '<svg viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="8" fill="#EFF6FF"/><rect x="9" y="11" width="22" height="17" rx="3" stroke="#2563eb" stroke-width="1.5"/><path d="M15 17l4 4-4 4M22 25h6" stroke="#2563eb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  default: '<svg viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="8" fill="#EFF6FF"/><circle cx="20" cy="20" r="7" stroke="#64748b" stroke-width="1.5"/><circle cx="20" cy="20" r="2.5" fill="#64748b"/></svg>'
};

/* 依据单条课程数据构建一张 .course-card（结构与 index.html 原硬编码卡片一致） */
function buildHomeCourseCard(course) {
  var card = document.createElement('div');
  card.className = 'course-card';

  /* —— 上：左文字列 + 右图标 —— */
  var top = document.createElement('div');
  top.className = 'course-card-top';

  var info = document.createElement('div');

  var name = document.createElement('h3');
  name.className = 'course-name';
  name.textContent = course.title || '';
  info.appendChild(name);

  var meta = document.createElement('div');
  meta.className = 'course-meta';

  /* 元信息三行：难度（无高亮）+ 课时/学员（高亮）—— 与 courseCardRender 的 META_FIELDS 口径一致 */
  var metaRows = [
    { label: '难度：', value: course.difficulty, highlight: false },
    { label: '课时：', value: course.lessonCount, highlight: true },
    { label: '学员：', value: course.studentCount, highlight: true }
  ];
  metaRows.forEach(function (row) {
    var span = document.createElement('span');
    span.appendChild(document.createTextNode(row.label));
    var b = document.createElement('b');
    if (row.highlight) b.className = 'highlight';
    b.textContent = row.value || '';
    span.appendChild(b);
    meta.appendChild(span);
  });
  info.appendChild(meta);

  top.appendChild(info);

  var icon = document.createElement('div');
  icon.className = 'course-icon';
  icon.innerHTML = HOME_ICON_SVG[course.coverType] || HOME_ICON_SVG.default; // 图标为模块内静态 SVG，安全
  top.appendChild(icon);

  card.appendChild(top);

  /* —— 下：查看详情按钮 —— */
  var btn = document.createElement('a');
  btn.className = 'btn-primary btn-block';
  btn.href = '#';
  btn.textContent = '查看详情';
  card.appendChild(btn);

  return card;
}

/* 渲染入口：把课程数组渲染进首页 .course-grid（先清空再渲染，可重复调用） */
function renderHomeCourseList(courseList) {
  if (!Array.isArray(courseList)) return; // 非数组直接忽略

  var grid = document.querySelector('.course-grid');
  if (!grid) return; // 未找到容器时静默退出

  grid.innerHTML = ''; // 清空上一次渲染，避免叠加
  courseList.forEach(function (course) {
    grid.appendChild(buildHomeCourseCard(course));
  });
}

/* 首页展示门数：.course-grid 固定 4 列（index.css），取数据前 4 门保持既有版式 */
var HOME_COURSE_COUNT = 4;

/* 初始化：读取 /courses → 渲染前 4 门。
   /courses 只由 server.js(:8080) 提供：首页无论在 8080 同源、Live Server(5501) 还是 file:// 打开，
   都指向该数据服务（server.js 已开 CORS）；唯一前提是已运行 npm run server。 */
function initHomeCourses() {
  /* API 根地址：仅本地（localhost/127.0.0.1/file://）且不在 :8080 时才回退本机数据服务，
     兼容 Live Server(:5501)/file:// 打开；部署到 Render 等托管域名时页面与接口同源，一律走相对路径。 */
  var API_BASE = (function () {
    var host = window.location.hostname;
    var localHost = host === '' || host === 'localhost' || host === '127.0.0.1';
    return (localHost && window.location.port !== '8080') ? 'http://localhost:8080' : '';
  })();
  fetch(API_BASE + '/courses')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (arr) {
      var list = Array.isArray(arr) ? arr.slice(0, HOME_COURSE_COUNT) : [];
      renderHomeCourseList(list);
    })
    .catch(function (err) {
      console.error('[index] 课程数据加载失败（请确认已运行 npm run server，数据服务在 :8080）：', err);
    });
}

/* 导出：兼容浏览器全局调用与 Node CommonJS 引用 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initHomeCourses: initHomeCourses,
    renderHomeCourseList: renderHomeCourseList,
    buildHomeCourseCard: buildHomeCourseCard
  };
} else {
  window.initHomeCourses = initHomeCourses;
  window.renderHomeCourseList = renderHomeCourseList;
  /* 页面脚本位于 body 底部，DOM 就绪后自动渲染 */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomeCourses);
  } else {
    initHomeCourses();
  }
}
