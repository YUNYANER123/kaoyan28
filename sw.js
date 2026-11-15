/* 喵上岸 28考研工作台 — Service Worker（离线缓存 + 安装支持） */
const CACHE = 'kaoyan28-v47';   // v47——v1.53r⑦：①侧栏「计划」猫图标换回 v18 原图(黑白棋盘格+戴耳机小猫捧清单)，根因是 r③ 把它误换成大白猫+音符、r⑤ 只是把错图放大；②备份丢失二次根治：1.75 的 addJavascriptInterface 注册在 super.onCreate() 之后，Capacitor 此时已 loadUrl，window.NativeStore 页面里恒为 undefined，镜像全程空跑 → 改走已 registerPlugin 的 KaoyanBridge 插件 getStore/putStore + 原子写 + .bak，app.js 启动时 hydrateNativeStore() 时间戳比对恢复，设置页新增「💾 数据存档自检」。index.html 与 js/app.js 仍 network-first。

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
