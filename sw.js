/* 喵上岸 28考研工作台 — Service Worker（离线缓存 + 安装支持） */
const CACHE = 'kaoyan28-v25';   // v25——英语/数学/专业课全部接入「AI 题库扩充引擎」：①每个模块底部可一键扩充（+N 条），生成结果永久并入本机题库 ②每日抽题改为「刷完一轮才重复」，同一天多次打开不跳变，每天都换新内容 ③库存快见底时后台自动补货（每次最多 2 个模块）④专业课支持把 AI 条目按书名归档。v24——专业课支持任意书目：内置题库 → 云端共享题库 → 免密钥大模型一键生成专属知识点/选择题/判断题/简答题；AI 内容明确标注需核对。v23——①修复换用其他专业课参考书后整块空白的 bug，新增 data-major-lib.js 通用题库 ②专业课新增「判断题」题型 ③专业课副标题改为所有书目缩写并列
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './js/app.js',
  './js/data-common.js',
  './js/data-en.js',
  './js/data-en-ex.js',
  './js/data-read-trans.js',
  './js/data-read-sentences.js',
  './js/data-math.js',
  './js/data-ic.js',
  './js/data-major-lib.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/cat-splash.png',
  './icons/cat-home.png',
  './icons/cat-plan.png',
  './icons/cat-english.png',
  './icons/cat-math.png',
  './icons/cat-major.png',
  './icons/cat-life.png',
  './icons/cat-week.png',
  './icons/cat-month.png',
  './icons/cat-setting.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const net = fetch(e.request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
