/* ========================================
   码知学 - 公共脚本
======================================== */

/* ===== 导航栏滚动阴影效果 ===== */
window.addEventListener('scroll', function() {
  var navbar = document.querySelector('.navbar');
  if (window.scrollY > 10) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

/* ===== Hero 横幅轮播（仅首页） ===== */
(function() {
  var slides = document.querySelectorAll('.hero-slide');
  if (slides.length === 0) return; // 非首页时跳过

  var dots   = document.querySelectorAll('.hero-dots .dot');
  var total  = slides.length;
  var current = 0;
  var timer;

  function goTo(index) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (index + total) % total;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function startAuto() {
    stopAuto();
    timer = setInterval(next, 4000);
  }
  function stopAuto() { clearInterval(timer); }

  // 指示点点击
  dots.forEach(function(dot) {
    dot.addEventListener('click', function() {
      goTo(Number(this.dataset.index));
      startAuto();
    });
  });

  // 左右箭头
  document.querySelector('.hero-arrow-left').addEventListener('click', function() { prev(); startAuto(); });
  document.querySelector('.hero-arrow-right').addEventListener('click', function() { next(); startAuto(); });

  // 鼠标悬停暂停
  var hero = document.querySelector('.hero');
  hero.addEventListener('mouseenter', stopAuto);
  hero.addEventListener('mouseleave', startAuto);

  startAuto();
})();

/* ===== 课程分类筛选按钮（仅课程页） ===== */
(function() {
  var filterBtns = document.querySelectorAll('.filter-btn');
  if (filterBtns.length === 0) return; // 非课程页时跳过

  filterBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      filterBtns.forEach(function(b) {
        b.classList.remove('active');
      });
      this.classList.add('active');
    });
  });
})();
