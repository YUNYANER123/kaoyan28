/* 喵上岸 28考研工作台 — Service Worker（离线缓存 + 安装支持） */
const CACHE = 'kaoyan28-v18';   // v18——①侧边栏仅数学/设置图标保留磨砂背景，其余小猫去掉multiply混合恢复白色显示 ②英语"这个词已计入啦"提示也居中 ③修复toast切换main-center时左右滑动（left不参加过渡） ④计划自定义-每日与停止重复-按次数滑块加-1/+1按钮 ⑤计划设置弹窗打开即滚动到顶部
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
