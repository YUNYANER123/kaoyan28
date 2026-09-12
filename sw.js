/* 喵上岸 28考研工作台 — Service Worker（离线缓存 + 安装支持） */
const CACHE = 'kaoyan28-v19';   // v19——①生活-经期删掉日历上方的日期列表（只保留日历粉色标注）②周/月复盘「完成计划x/x」改按effTasks统计（含定时/重复任务，修掉0/0）③下周核心目标改为「完成本周未完成计划x项；完成下周计划y项」④学习天数只算有英语/数学/专业课记录的日期，未学习天数同步增加并列出日期 ⑤英语-单词「回到当前」跳到编号最小的未背单词，该页提示统一主区居中 ⑥计划页右上新增⚠以往未完成计划入口，点击跳转当天计划
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
