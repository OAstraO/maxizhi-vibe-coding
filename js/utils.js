/* ========================================
 * 码知学 - 公共工具脚本（js/utils.js）
 * 模块边界：提供表单校验 + 消息提示 + 简单 XSS 过滤工具，
 *   供 auth.html 等页面引入调用；不依赖第三方库。
 *
 * ⚠️ 安全说明：
 *   1. 本文件内的前端校验仅用于提升用户体验（快速反馈），
 *      真实项目必须在【后端】对提交数据做完整、严格的二次校验，
 *      永远不要信任来自前端的任何数据。
 *   2. 登录失败统一提示“账号或密码错误”，不区分账号不存在 / 密码错误，
 *      避免被攻击者用于账号枚举探测。
 *   3. 后端必须对密码进行加盐哈希（如 bcrypt / argon2）后存储，
 *      严禁明文 / 可逆加密保存密码。
 *   4. 禁止在控制台输出明文密码、手机号等敏感信息（本文件无任何 console 输出）。
 * ======================================== */

var Utils = (function () {
  /* ---------- 常量 ---------- */
  var MIN_PWD_LEN = 6;                  // 密码最小长度
  var MAX_PWD_LEN = 20;                 // 密码最大长度
  /* 中国大陆手机号：1 开头，第二位 3~9，共 11 位数字 */
  var PHONE_REG = /^1[3-9]\d{9}$/;

  /* HTML 特殊字符 → 实体（基础 XSS 过滤用） */
  var HTML_ENTITIES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  /* ---------- 内部工具 ---------- */
  /* 去除首尾空白 */
  function trim(value) {
    return value === null || value === undefined ? '' : String(value).trim();
  }

  /* 是否为空（去空格后） */
  function isBlank(value) {
    return trim(value) === '';
  }

  /* 过滤 HTML 特殊字符：把 < > & " ' 替换为实体字符，
     用于提交前的基础防御，配合“不把用户输入作为 HTML 拼接”一起使用 */
  function sanitize(str) {
    return trim(str).replace(/[&<>"']/g, function (ch) {
      return HTML_ENTITIES[ch];
    });
  }

  /* ---------- 单项校验（均返回错误文案，通过则返回空串） ---------- */

  /* 必填项校验：value 为空时返回 msg */
  function required(value, msg) {
    return isBlank(value) ? msg : '';
  }

  /* 手机号校验 */
  function phone(value) {
    if (isBlank(value)) return '请输入手机号';
    if (!PHONE_REG.test(trim(value))) return '请输入正确的 11 位大陆手机号';
    return '';
  }

  /* 密码长度校验（空值提示“请输入密码”，长度不足提示区间） */
  function password(value) {
    if (isBlank(value)) return '请输入密码';
    var len = trim(value).length;
    if (len < MIN_PWD_LEN || len > MAX_PWD_LEN) {
      return '密码长度需为 ' + MIN_PWD_LEN + '~' + MAX_PWD_LEN + ' 位';
    }
    return '';
  }

  /* 确认密码一致性校验 */
  function confirmPassword(pwd, again) {
    if (isBlank(again)) return '请再次输入确认密码';
    if (!isBlank(pwd) && trim(pwd) !== trim(again)) return '两次输入的密码不一致';
    return '';
  }

  /* ---------- 组合校验：返回各字段错误 + 是否通过 ---------- */

  /**
   * 登录表单校验
   * @param {Object} data { account, password }
   * @return {{account:String, password:String, ok:Boolean}}
   */
  function validateLogin(data) {
    data = data || {};
    var res = { account: '', password: '', ok: true };

    res.account = required(data.account, '请输入账号');
    res.password = password(data.password);

    if (res.account || res.password) res.ok = false;
    return res;
  }

  /**
   * 注册表单校验
   * @param {Object} data { account, phone, password, confirmPassword }
   * @return {{account:String, phone:String, password:String, confirmPassword:String, ok:Boolean}}
   */
  function validateRegister(data) {
    data = data || {};
    var res = {
      account: '',
      phone: '',
      password: '',
      confirmPassword: '',
      ok: true
    };

    res.account = required(data.account, '请输入账号');
    res.phone = required(data.phone, '请输入手机号') || phone(data.phone);
    res.password = password(data.password);
    res.confirmPassword = confirmPassword(data.password, data.confirmPassword);

    if (res.account || res.phone || res.password || res.confirmPassword) res.ok = false;
    return res;
  }

  /* ---------- 消息提示 ---------- */

  /**
   * 页面顶部轻提示（toast），自动消失
   * @param {String} message 提示文案
   * @param {String} type    success / error / info，默认 info
   */
  function toast(message, type) {
    type = type || 'info';

    /* 同一时刻只保留一条提示，先移除旧的 */
    var old = document.querySelector('.toast');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var tip = document.createElement('div');
    tip.className = 'toast toast-' + type;
    tip.setAttribute('role', 'status');
    /* 使用 textContent 渲染，避免把消息内容当作 HTML 解析（XSS 防御） */
    tip.textContent = message;
    document.body.appendChild(tip);

    /* 双帧后再加类名，确保过渡动画生效 */
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        tip.classList.add('show');
      });
    });

    /* 停留后淡出并移除节点 */
    window.setTimeout(function () {
      tip.classList.remove('show');
      window.setTimeout(function () {
        if (tip.parentNode) tip.parentNode.removeChild(tip);
      }, 350);
    }, 2600);
  }

  /* ---------- 对外导出 ---------- */
  return {
    sanitize: sanitize,
    required: required,
    phone: phone,
    password: password,
    confirmPassword: confirmPassword,
    validateLogin: validateLogin,
    validateRegister: validateRegister,
    toast: toast
  };
})();

/* 导出：兼容浏览器全局调用与 Node CommonJS 引用 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
} else {
  window.Utils = Utils;
}
