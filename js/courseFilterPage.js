/* ========================================
 * 码知学 - 课程筛选分页模块（js/courseFilterPage.js）
 * 模块边界：对外导出 getFilterPageData(allData, categoryKey, page, pageSize)，
 *   仅负责「分类过滤 + 分页切片」的数据计算，返回 { list, totalPage }；
 *   纯数据处理，禁止操作 DOM、不负责渲染。
 * 约束：原生 JS、无第三方库。
 *
 * 参数约定：
 *   categoryKey = '全部'（或缺省）→ 不过滤返回全量；其余按数据 category 精确匹配。
 *   page       从 1 开始；pageSize 缺省时每页 6 条（3 列 × 2 行）。
 * ======================================== */

/* 默认每页条数 */
var DEFAULT_PAGE_SIZE = 6;

/**
 * 筛选 + 分页
 * @param {Array}  allData     课程全量数组（courseData）
 * @param {String} categoryKey 分类关键字（与分类按钮文案对应，'全部' 表示不过滤）
 * @param {Number} page        页码，从 1 开始
 * @param {Number} pageSize    每页条数
 * @return {{list: Array, totalPage: Number}} 当前页数据切片 + 总页数
 */
function getFilterPageData(allData, categoryKey, page, pageSize) {
  var source = Array.isArray(allData) ? allData : []; // 非数组视为空数据

  /* —— 第一步：分类过滤（'全部' 或缺省时不筛选） —— */
  var filtered;
  if (!categoryKey || categoryKey === '全部') {
    filtered = source.slice(); // 拷贝副本，避免影响原数组
  } else {
    filtered = source.filter(function(item) {
      return item.category === categoryKey;
    });
  }

  /* —— 第二步：分页参数归一化（容错非法入参） —— */
  page = parseInt(page, 10);
  if (isNaN(page) || page < 1) page = 1; // 默认第一页

  pageSize = parseInt(pageSize, 10);
  if (isNaN(pageSize) || pageSize < 1) pageSize = DEFAULT_PAGE_SIZE;

  /* —— 第三步：计算总页数（空数据时总页数为 0） —— */
  var totalPage = Math.ceil(filtered.length / pageSize);

  /* —— 第四步：页码越界时回退到最后一页，避免取到空页 —— */
  if (totalPage > 0 && page > totalPage) page = totalPage;

  /* —— 第五步：按当前页做切片 —— */
  var start = (page - 1) * pageSize;
  var list = filtered.slice(start, start + pageSize);

  return { list: list, totalPage: totalPage };
}

/* 导出 getFilterPageData：兼容浏览器全局调用与 Node CommonJS 引用 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = getFilterPageData;
} else {
  window.getFilterPageData = getFilterPageData;
}
