/* 喵上岸 28考研工作台 — Service Worker（离线缓存 + 安装支持） */
const CACHE = 'kaoyan28-v49';   // v49——v1.53r⑨：按用户录屏实证，备份 JSON 约 480KB，r⑥/r⑦/r⑧ 都把整份 store 一次性跨 JS↔原生通道传（插件参数 / evaluateJavascript 返回值），Android WebView bridge 对单次大字符串会截断或返回 null，写入全部静默失败、原生文件从未生成。r⑨ 改为分片：所有跨 bridge 字符串 <=12000 字符，逐片串行读写；WebView 改为遍历 View 树获取（不再依赖 getBridge()）；轮询 2s→250ms，保证「导入后立刻清后台」也来得及写第一份存档。index.html 与 js/app.js 仍 network-first。

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
  const url = new URL(e.request.url);
  const isNav = e.request.mode === 'navigate';
  const isAppJs = /\/js\/app\.js($|\?)/.test(url.pathname);
  // index.html / js/app.js：network-first——先试网络，失败再回退缓存。
  // 这样每次重新部署后，手机端（已安装 PWA）刷新一次即可拿到新版，不再被旧缓存卡住。
  if (isNav || isAppJs) {
    e.respondWith(
      fetch(e.request).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // 其余静态资源（css/图标/数据等）：cache-first，保留离线能力
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
