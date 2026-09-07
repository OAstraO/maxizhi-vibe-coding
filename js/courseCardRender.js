/* ========================================
 * 码知学 - 课程卡片渲染模块（js/courseCardRender.js）
 * 模块边界：对外导出 renderCourseList(courseList)，
 *   接收课程对象数组，复用 cp-card 系列类名把卡片渲染进 .course-page-grid；
 *   不参与分类筛选 / 分页等业务计算（由上游模块负责）。
 * 约束：原生 JS、无第三方库；仅复用现有 class，不新增 class。
 *
 * 课程对象字段：id / title / category / coverType / badgeList / desc / difficulty / lessonCount / studentCount
 * ======================================== */

/* 封面中央图标库：key 对应数据中的 coverType，图标取自原 course.html 静态卡片 */
var COVER_ICON_SVG = {
  python: '<svg viewBox="0 0 72 72" fill="none"><rect width="72" height="72" rx="14" fill="rgba(255,255,255,0.6)"/><path d="M36 18c-7.2 0-11 3.2-11 8v4h11v2H22c-5 0-9 3.5-9 9s4 9 9 9h3v-5c0-5.5 3.5-8 9-8h9c4.5 0-7-2.5 7-7V26c0-4.8-3.8-8-11-8zm-4 6a2 2 0 110 4 2 2 0 010-4z" fill="#2563eb" opacity="0.85"/><path d="M36 54c7.2 0 11-3.2 11-8v-4H36v-2h14c5 0 9-3.5 9-9s-4-9-9-9h-3v5c0 5.5-3.5 8-9 8h-9c-4.5 0 7 2.5-7 7v10c0 4.8 3.8 8 11 8zm4-6a2 2 0 110-4 2 2 0 010 4z" fill="#1d4ed8" opacity="0.7"/></svg>',
  vue: '<svg viewBox="0 0 72 72" fill="none"><rect width="72" height="72" rx="14" fill="rgba(255,255,255,0.6)"/><path d="M36 14L18 46h10l8-14 8 14h10L36 14z" fill="#059669" opacity="0.85"/><path d="M36 24L26 46h20L36 24z" fill="#10b981" opacity="0.7"/></svg>',
  java: '<svg viewBox="0 0 72 72" fill="none"><rect width="72" height="72" rx="14" fill="rgba(255,255,255,0.6)"/><path d="M29 18c0 8-8 10-8 18 0 6 5 10 15 12M43 54c0-8 8-10 8-18 0-6-5-10-15-12" stroke="#d97706" stroke-width="2.5" stroke-linecap="round"/><path d="M26 46s8 3 20 0M28 52s8 3 16 0" stroke="#d97706" stroke-width="2" stroke-linecap="round"/></svg>',
  ai: '<svg viewBox="0 0 72 72" fill="none"><rect width="72" height="72" rx="14" fill="rgba(255,255,255,0.6)"/><circle cx="36" cy="36" r="14" stroke="#7c3aed" stroke-width="2.5"/><path d="M36 22v4M36 46v4M22 36h4M46 36h4" stroke="#7c3aed" stroke-width="2.5" stroke-linecap="round"/><circle cx="36" cy="36" r="5" fill="#7c3aed" opacity="0.8"/></svg>',
  html: '<svg viewBox="0 0 72 72" fill="none"><rect width="72" height="72" rx="14" fill="rgba(255,255,255,0.6)"/><path d="M14 16l4 40 18 5 18-5 4-40H14z" fill="#dc2626" opacity="0.15"/><path d="M18 22l3 32 15 4 15-4 3-32H18z" stroke="#dc2626" stroke-width="2"/><path d="M26 30h20M27 38l17-2-1 8-7 2-7-2-.5-4" stroke="#dc2626" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  db: '<svg viewBox="0 0 72 72" fill="none"><rect width="72" height="72" rx="14" fill="rgba(255,255,255,0.6)"/><ellipse cx="36" cy="24" rx="16" ry="7" stroke="#0369a1" stroke-width="2"/><path d="M20 24v12c0 4 7 7 16 7s16-3 16-7V24" stroke="#0369a1" stroke-width="2"/><path d="M20 36v10c0 4 7 7 16 7s16-3 16-7V36" stroke="#0369a1" stroke-width="2"/></svg>',
  react: '<svg viewBox="0 0 72 72" fill="none"><rect width="72" height="72" rx="14" fill="rgba(255,255,255,0.6)"/><circle cx="36" cy="36" r="5" fill="#0891b2"/><ellipse cx="36" cy="36" rx="22" ry="9" stroke="#0891b2" stroke-width="2" transform="rotate(0 36 36)"/><ellipse cx="36" cy="36" rx="22" ry="9" stroke="#0891b2" stroke-width="2" transform="rotate(60 36 36)"/><ellipse cx="36" cy="36" rx="22" ry="9" stroke="#0891b2" stroke-width="2" transform="rotate(120 36 36)"/></svg>',
  node: '<svg viewBox="0 0 72 72" fill="none"><rect width="72" height="72" rx="14" fill="rgba(255,255,255,0.6)"/><path d="M36 14l20 11v22L36 58 16 47V25L36 14z" stroke="#16a34a" stroke-width="2.2" stroke-linejoin="round"/><path d="M36 28v8l7 4M36 36l-7 4" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ts: '<svg viewBox="0 0 72 72" fill="none"><rect width="72" height="72" rx="14" fill="rgba(255,255,255,0.6)"/><rect x="16" y="16" width="40" height="40" rx="8" fill="#2563eb" opacity="0.12"/><text x="36" y="46" font-size="26" font-weight="800" fill="#1d4ed8" text-anchor="middle" font-family="Arial,sans-serif">TS</text></svg>',
  linux: '<svg viewBox="0 0 72 72" fill="none"><rect width="72" height="72" rx="14" fill="rgba(255,255,255,0.6)"/><rect x="14" y="18" width="44" height="30" rx="5" stroke="#475569" stroke-width="2"/><rect x="26" y="50" width="20" height="4" rx="2" fill="#475569" opacity="0.4"/><path d="M22 30l6 6-6 6M34 42h10" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  docker: '<svg viewBox="0 0 72 72" fill="none"><rect width="72" height="72" rx="14" fill="rgba(255,255,255,0.6)"/><rect x="14" y="28" width="12" height="10" rx="2" stroke="#0284c7" stroke-width="2"/><rect x="30" y="28" width="12" height="10" rx="2" stroke="#0284c7" stroke-width="2"/><rect x="46" y="28" width="12" height="10" rx="2" stroke="#0284c7" stroke-width="2"/><rect x="14" y="18" width="12" height="10" rx="2" stroke="#0284c7" stroke-width="2" opacity="0.6"/><rect x="30" y="18" width="12" height="10" rx="2" stroke="#0284c7" stroke-width="2" opacity="0.6"/><path d="M14 42h44M46 42c4 0 10-2 10-8" stroke="#0284c7" stroke-width="2" stroke-linecap="round"/></svg>',
  go: '<svg viewBox="0 0 72 72" fill="none"><rect width="72" height="72" rx="14" fill="rgba(255,255,255,0.6)"/><path d="M18 36c0-10 8-18 18-18s18 8 18 18" stroke="#0891b2" stroke-width="2.5" stroke-linecap="round"/><path d="M54 36c0 10-8 18-18 18s-18-8-18-18" stroke="#0891b2" stroke-width="2.5" stroke-linecap="round"/><circle cx="44" cy="30" r="3" fill="#0891b2"/><path d="M44 30l4-4" stroke="#0891b2" stroke-width="2" stroke-linecap="round"/></svg>',
  /* 未知 coverType 时的兜底图标 */
  default: '<svg viewBox="0 0 72 72" fill="none"><rect width="72" height="72" rx="14" fill="rgba(255,255,255,0.6)"/><circle cx="36" cy="36" r="12" stroke="#64748b" stroke-width="2"/><path d="M36 28v8l6 4" stroke="#64748b" stroke-width="2" stroke-linecap="round"/></svg>'
};

/* 角标标识 → 类名与文案：free免费 / paid付费 / hot热门 / new新课 */
var BADGE_MAP = {
  free:  { cls: 'cp-badge cp-badge-free', text: '免费' },
  paid:  { cls: 'cp-badge cp-badge-paid', text: '付费' },
  hot:   { cls: 'cp-badge-hot',           text: '热门' },
  new:   { cls: 'cp-badge-hot',           text: '新课' }
};

/* 元信息三行的小图标（难度 / 课时 / 学员） */
var META_ICON_SVG = {
  difficulty: '<svg viewBox="0 0 14 14" fill="none"><path d="M7 1l1.5 3 3.5.5-2.5 2.5.5 3.5L7 9 3.5 10.5 4 7 1.5 4.5 5 4z" stroke="#2563eb" stroke-width="1.2" stroke-linejoin="round"/></svg>',
  lessonCount: '<svg viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#64748b" stroke-width="1.2"/><path d="M7 4v3l2 1.5" stroke="#64748b" stroke-width="1.2" stroke-linecap="round"/></svg>',
  studentCount: '<svg viewBox="0 0 14 14" fill="none"><path d="M7 7a3 3 0 100-6 3 3 0 000 6zM1.5 13c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="#64748b" stroke-width="1.2" stroke-linecap="round"/></svg>'
};

/* 卡片主体元信息行的渲染配置 */
var META_FIELDS = [
  { field: 'difficulty',   label: '难度：', icon: META_ICON_SVG.difficulty },
  { field: 'lessonCount',  label: '课时：', icon: META_ICON_SVG.lessonCount },
  { field: 'studentCount', label: '学员：', icon: META_ICON_SVG.studentCount }
];

/* 依据单条课程数据构建一个 cp-card 卡片节点 */
function buildCourseCard(course) {
  var card = document.createElement('div');
  card.className = 'cp-card';

  /* —— 封面：类型渐变背景 + 中央图标 + 角标 —— */
  var cover = document.createElement('div');
  cover.className = 'cp-cover' + (course.coverType ? ' cp-cover-' + course.coverType : '');

  var iconWrap = document.createElement('div');
  iconWrap.className = 'cp-cover-icon';
  iconWrap.innerHTML = COVER_ICON_SVG[course.coverType] || COVER_ICON_SVG.default;
  cover.appendChild(iconWrap);

  /* 按 badgeList 顺序渲染角标（free/paid 居左，hot/new 居右） */
  (course.badgeList || []).forEach(function(key) {
    var badge = BADGE_MAP[key];
    if (!badge) return;
    var span = document.createElement('span');
    span.className = badge.cls;
    span.textContent = badge.text;
    cover.appendChild(span);
  });
  card.appendChild(cover);

  /* —— 内容区：标题 / 简介 / 元信息 / 报名按钮 —— */
  var body = document.createElement('div');
  body.className = 'cp-body';

  var title = document.createElement('div');
  title.className = 'cp-title';
  title.textContent = course.title || '';
  body.appendChild(title);

  var desc = document.createElement('div');
  desc.className = 'cp-desc';
  desc.textContent = course.desc || '';
  body.appendChild(desc);

  var meta = document.createElement('div');
  meta.className = 'cp-meta';
  META_FIELDS.forEach(function(item) {
    var span = document.createElement('span');
    span.className = 'cp-meta-item';
    span.insertAdjacentHTML('beforeend', item.icon);          // 前置图标
    span.appendChild(document.createTextNode(item.label));     // 行首标签文案
    var value = document.createElement('b');                   // 加粗数值
    value.textContent = course[item.field] || '';
    span.appendChild(value);
    meta.appendChild(span);
  });
  body.appendChild(meta);

  var enroll = document.createElement('a');
  enroll.className = 'cp-enroll-btn';
  enroll.href = '#';
  enroll.textContent = '报名学习';
  body.appendChild(enroll);

  card.appendChild(body);
  return card;
}

/* 渲染入口：把传入的课程数组渲染进 .course-page-grid（先清空再渲染，可重复调用） */
function renderCourseList(courseList) {
  if (!Array.isArray(courseList)) return; // 非数组直接忽略

  var grid = document.querySelector('.course-page-grid');
  if (!grid) return; // 未找到容器时静默退出

  grid.innerHTML = ''; // 清空上一次渲染结果，避免卡片叠加
  courseList.forEach(function(course) {
    grid.appendChild(buildCourseCard(course));
  });
}

/* 导出 renderCourseList：兼容浏览器全局调用与 Node CommonJS 引用；
   额外挂 .buildCourseCard 供 verify.js 等 Node 脚本复用作渲染准确性断言 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = renderCourseList;
  module.exports.buildCourseCard = buildCourseCard;
} else {
  window.renderCourseList = renderCourseList;
}
