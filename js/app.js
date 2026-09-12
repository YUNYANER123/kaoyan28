/* =====================================================================
   喵上岸 · 28考研工作台  —  主逻辑
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- 工具 ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const $m = (s) => document.getElementById('modalMask').querySelector(s);
  const $$m = (s) => Array.from(document.getElementById('modalMask').querySelectorAll(s));
  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  // 确定性随机（按日期选当天题目）
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function dailyPick(arr, n, seed) {
    const rng = mulberry32(hashStr(seed));
    const pool = arr.slice();
    const out = [];
    while (out.length < n && pool.length) {
      const i = Math.floor(rng() * pool.length);
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }

  /* ---------- 存储 ---------- */
  const KEY = 'kaoyan28_v1';
  let store = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return migrate(JSON.parse(raw));
    } catch (e) { }
    return defaults();
  }
  function defaults() {
    return {
      version: 1,
      mode: 'easy',                 // easy | hard
      examDate: EXAM_DATE,
      goals: { word: 50 },
      checkins: {},                 // {date:true}
      dailyStudy: {},               // {date:{en,math,major}}
      words: { idx: 0, learned: [], favs: [], rounds: [[], [], []], ultimate: [], revealed: [] },
      plan: {},                     // {date:[{id,text,pri,cat,done,carry,note}]} 直接任务
      planTpl: [],                  // 定时/重复任务模板 [{id,text,pri,cat,date,dateEnd,timeMode,time,timeEnd,repeat,note}]
      planDone: {},                 // {tplId@date:true} 模板实例完成状态
      planHide: {},                 // {tplId@date:true} 仅隐藏某天实例
      customCats: [],               // [{id,name}] 用户手动新建的分类
      life: {},                     // {date:{wake,sleep,meals,exercise,water,period,mood,note,bowel}}
      periods: [],                  // [{start,end}]
      mathWrong: [],                // 错题本（索引集合记录题面）
      majorWrong: [],
      weekReviews: [],
      monthReviews: [],
    };
  }
  function migrate(s) {
    const d = defaults();
    const merged = Object.assign(d, s, {
      goals: Object.assign(d.goals, s.goals || {}),
      words: Object.assign(d.words, s.words || {}),
      checkins: s.checkins || {}, dailyStudy: s.dailyStudy || {},
      plan: s.plan || {}, planTpl: s.planTpl || [], planDone: s.planDone || {}, planHide: s.planHide || {},
      life: s.life || {}, periods: s.periods || {},
      mathWrong: s.mathWrong || [], majorWrong: s.majorWrong || {},
      weekReviews: s.weekReviews || [], monthReviews: s.monthReviews || {},
    });
    if (merged.examDate && merged.examDate.length >= 10) {
      merged.examDate = merged.examDate.slice(0, 10) + 'T00:00:00';
    }
    return merged;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { toast('保存失败：存储空间不足'); }
  }

  // 当日学习数据结构
  function day(d) {
    if (!store.dailyStudy[d]) store.dailyStudy[d] = {
      en: { min: 0, count: 0, wordCount: 0 },
      math: { min: 0, count: 0, qDone: 0 },
      major: { min: 0, count: 0, qDone: 0 },
    };
    return store.dailyStudy[d];
  }
  function lifeDay(d) {
    if (!store.life[d]) store.life[d] = {
      wake: '', sleep: '', meals: { bf: false, lunch: false, dinner: false },
      exercise: false, water: 0, period: { state: null }, mood: '', note: '', bowel: 0
    };
    return store.life[d];
  }

  /* ---------- Toast ---------- */
  let toastT;
  function toast(msg, area) {
    const el = $('#toast'); el.textContent = msg; el.classList.toggle('main-center', area === 'main'); el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 1800);
  }

  /* ---------- 图标 ---------- */
  // 返回 <img> 标签（透明背景的小猫 PNG），由调用方在 .nav-ico / .st-ico 上贴 pastel 渐变底
  function icon(id, c1, c2) {
    return `<img src="icons/cat-${id}.png" alt="" loading="lazy" decoding="async" draggable="false">`;
  }
  const HERO_CAT = `<img src="icons/cat-splash.png" alt="" draggable="false">`;
  const SPLASH_CAT = `<img src="icons/cat-splash.png" class="splash-cat-img" alt="" draggable="false">`;

  /* ================= 开屏页 ================= */
  function initSplash() {
    $('#splashCat').innerHTML = SPLASH_CAT;
    const now = new Date();
    const wk = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
    $('#spDate').textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日  周${wk}`;
    $('#spLunar').textContent = '考研倒计时 · 猫猫陪你上岸';
    $('#spQuote').textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    tickCountdown();
    setInterval(tickCountdown, 1000);

    // PWA 安装提示
    let deferred = null;
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; $('#pwaTip').textContent = '💡 点「进入工作台」后可安装到主屏幕像 App 使用'; });
    window._pwaDefer = deferred;

    $('#enterBtn').addEventListener('click', () => {
      const sp = $('#splash');
      sp.classList.add('out');
      setTimeout(() => { sp.classList.add('hidden'); $('#app').classList.remove('hidden'); renderAll(); }, 480);
    });
  }
  function tickCountdown() {
    const ex = new Date(store.examDate);
    const now = new Date();
    let diff = Math.floor((ex - now) / 1000);
    if (diff < 0) diff = 0;
    const d = Math.floor(diff / 86400);
    const h = Math.floor((diff % 86400) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    $('#cdDays').textContent = d;
    $('#cdTime').textContent = `${h} 时 ${m} 分 ${s} 秒`;
    // 进度条：以 365 天为满
    const pct = clamp(100 - (d / 365) * 100, 0, 100);
    $('#cdBar').style.width = pct + '%';
    $('#cdFoot').textContent = d > 0 ? '稳住心态，今天也要好好努力呀 🐱' : '考试日到了，加油！';
    const tb = $('#tbDays'); if (tb) tb.textContent = d;
  }

  /* ================= 导航 ================= */
  function buildSidebar() {
    const sb = $('#sidebar');
    sb.innerHTML = NAV_ITEMS.map((n) =>
      `<button class="nav-item" data-nav="${n.id}">
        <div class="nav-ico${n.id === 'math' || n.id === 'setting' ? ' frost' : ''}" style="background:linear-gradient(135deg,${n.grad[0]},${n.grad[1]})">${icon(n.icon, n.grad[0], n.grad[1])}</div>
        <div class="nav-name">${n.name}</div>
      </button>`).join('');
    sb.addEventListener('click', (e) => {
      const b = e.target.closest('[data-nav]'); if (!b) return;
      goPage(b.dataset.nav);
    });
  }
  let curPage = 'home';
  function goPage(id) {
    curPage = id;
    $$('.nav-item').forEach((b) => b.classList.toggle('on', b.dataset.nav === id));
    $$('.page').forEach((p) => p.classList.toggle('hidden', p.dataset.page !== id));
    const nav = NAV_ITEMS.find((n) => n.id === id);
    $('#pageTitle').textContent = nav.name;
    $('#pageSub').textContent = nav.sub;
    $('#scroll').scrollTop = 0;
    renderPage(id);
  }

  function refreshModeChip() {
    const hard = store.mode === 'hard';
    const chip = $('#modeChip');
    chip.classList.toggle('hard', hard);
    $('#modeText').textContent = hard ? '高强度版' : '轻松版';
  }

  /* ================= 1. 首页 ================= */
  function renderHome() {
    const t = todayStr();
    const d = day(t);
    $('#heroDate').textContent = `${new Date().getFullYear()}年${new Date().getMonth() + 1}月${new Date().getDate()}日`;
    $('#heroCat').innerHTML = HERO_CAT;
    $('#heroHi').textContent = pickHi();

    // 连续打卡
    const streak = calcStreak();
    $('#streakDays').textContent = streak.cur;
    $('#totalCheck').textContent = Object.keys(store.checkins).length;
    $('#maxStreak').textContent = streak.max;
    const done = !!store.checkins[t];
    const cb = $('#checkinBtn');
    cb.textContent = done ? '今日已打卡 ✓' : '今日打卡';
    cb.classList.toggle('done', done);
    cb.onclick = () => {
      if (store.checkins[t]) { toast('今天已经打过卡啦'); return; }
      store.checkins[t] = true; save();
      toast('打卡成功，连续 ' + calcStreak().cur + ' 天 🎉');
      renderHome();
    };
    // 周视图
    const wk = [];
    const wd = ['日', '一', '二', '三', '四', '五', '六'];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(); dt.setDate(dt.getDate() - i);
      const k = dateKey(dt);
      wk.push({ lb: wd[dt.getDay()], on: !!store.checkins[k], today: i === 0 });
    }
    $('#streakWeek').innerHTML = wk.map((w) =>
      `<div class="sw-day"><div class="sw-dot ${w.on ? 'on' : ''} ${w.today ? 'today' : ''}">${w.on ? '✓' : ''}</div><div class="sw-lb">${w.lb}</div></div>`).join('');

    // 累计统计
    let wTotal = 0, mTotal = 0, majTotal = 0;
    Object.values(store.dailyStudy).forEach((x) => {
      wTotal += x.en.wordCount || 0; mTotal += x.math.qDone || 0; majTotal += x.major.qDone || 0;
    });
    const checkinN = Object.keys(store.checkins).length;

    // 今日学习统计（仅统计：单词个数 / 高数题数 / 专业课题数 / 连续打卡天数）
    $('#todayTotal').textContent = '';
    const cards = [
      { name: '英语单词', ico: 'english', icoC: ['#B9F0E1', '#8FD9F5'], main: d.en.wordCount || 0, unit: '个', sub: `累计 ${wTotal} 个` },
      { name: '高数学习', ico: 'math', icoC: ['#C9C2FF', '#A5C8FF'], main: d.math.qDone || 0, unit: '题', sub: `累计 ${mTotal} 题` },
      { name: '专业课', ico: 'major', icoC: ['#FFC9DE', '#D8B8FF'], main: d.major.qDone || 0, unit: '题', sub: `累计 ${majTotal} 题` },
      { name: '连续打卡', ico: 'home', icoC: ['#A7D8FF', '#7FB8FF'], main: streak.cur, unit: '天', sub: `累计 ${checkinN} 天` },
    ];
    $('#statGrid').innerHTML = cards.map((c) =>
      `<div class="stat-card" style="background:linear-gradient(135deg,${c.icoC[0]}55,${c.icoC[1]}55)">
        <div class="st-ico" style="background:linear-gradient(135deg,${c.icoC[0]},${c.icoC[1]})">${icon(c.ico, c.icoC[0], c.icoC[1])}</div>
        <div class="st-name">${c.name}</div>
        <div class="st-main">${c.main}<span>${c.unit}</span></div>
        <div class="st-sub">${c.sub}</div>
      </div>`).join('');

    // 累计成果（不再统计学习分钟）
    $('#totalGrid').innerHTML = `
      <div class="tot-item"><div class="tot-n">${wTotal}<small>个</small></div><div class="tot-l">累计背词</div></div>
      <div class="tot-item"><div class="tot-n">${mTotal}<small>题</small></div><div class="tot-l">数学累计作答</div></div>
      <div class="tot-item"><div class="tot-n">${majTotal}<small>题</small></div><div class="tot-l">专业课累计作答</div></div>
      <div class="tot-item"><div class="tot-n">${checkinN}<small>天</small></div><div class="tot-l">累计打卡天数</div></div>`;
  }
  function pickHi() {
    const hs = ['今天也要加油鸭 🐱', '上岸的路一步一步走', '动起来就赢了一半', '今天的你也很棒', '稳住，我们能赢', '猫猫陪你一起卷'];
    return hs[Math.floor(Math.random() * hs.length)];
  }
  function calcStreak() {
    let cur = 0, max = 0;
    const dt = new Date();
    // 从今天往前数连续
    while (store.checkins[dateKey(dt)]) { cur++; dt.setDate(dt.getDate() - 1); }
    // 最大连续
    const ks = Object.keys(store.checkins).sort();
    let run = 0; let prev = null;
    for (const k of ks) {
      if (prev && dayDiff(prev, k) === 1) run++; else run = 1;
      max = Math.max(max, run); prev = k;
    }
    return { cur, max };
  }
  function dayDiff(a, b) {
    const da = new Date(a), db = new Date(b);
    return Math.round((db - da) / 86400000);
  }

  /* ================= 2. 每日计划 ================= */
  let planDate = todayStr();
  let lifeViewDate = todayStr();        // 生活页当前查看日期
  let periodCalYM = (() => { const d = new Date(); return d.getFullYear() * 12 + d.getMonth(); })();
  let bowelCalYM = periodCalYM;
  let pickCalYM = periodCalYM;
  let periodEdit = null;           // 经期日历编辑态：{mode:'new'|'end', start, per}
  let weekViewAnchor = null;        // 周/月复盘查看锚点（Date | null=当前）
  let monthViewAnchor = null;
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function addMonths(d, n) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }
  const PRI_LABEL = { p0: '重要且紧急', p1: '重要不紧急', p2: '紧急不重要', p3: '不重要不紧急' };
  function catLabel(c) {
    const m = { study: '学习', work: '工作', life: '生活' };
    if (m[c]) return m[c];
    const f = store.customCats.find((x) => x.id === c);
    return f ? f.name : c;
  }
  function renderPlan() {
    if (!planDate) planDate = todayStr();
    if (planDate === todayStr() && !store.plan[planDate]) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yk = dateKey(y);
      const yp = store.plan[yk] || [];
      const carried = yp.filter((x) => !x.done).map((x) => ({ ...x, id: uid(), carry: true }));
      store.plan[planDate] = carried; save();
    }
    const list = effTasks(planDate);

    const dp = $('#planDatePick');
    dp.value = planDate;
    dp.onchange = () => { planDate = dp.value || todayStr(); renderPlan(); };
    const wd = '日一二三四五六'[new Date(planDate + 'T00:00:00').getDay()];
    const pd = $('#planDate');
    pd.innerHTML = `<button class="pd-arrow" data-pd="prev">◀</button><span class="pd-text">${planDate.slice(5).replace('-', '/')} · 周${wd}</span><button class="pd-arrow" data-pd="next">▶</button>${planDate === todayStr() ? '' : '<button class="pd-today" data-pd="today">回到今日</button>'}`;
    pd.querySelector('[data-pd="prev"]').onclick = () => { planDate = shiftDay(planDate, -1); renderPlan(); };
    pd.querySelector('[data-pd="next"]').onclick = () => { planDate = shiftDay(planDate, 1); renderPlan(); };
    const pdToday = pd.querySelector('[data-pd="today"]'); if (pdToday) pdToday.onclick = () => { planDate = todayStr(); renderPlan(); };

    let filter = 'all';
    const sumEl = $('#planSum');
    const draw = (f) => {
      filter = f;
      $$('#planFilter .chip').forEach((c) => c.classList.toggle('on', c.dataset.f === f));
      const shown = list.filter((x) => f === 'all' || (f === 'done' ? x.done : !x.done));
      const doneN = list.filter((x) => x.done).length;
      sumEl.textContent = list.length ? `已完成 ${doneN}/${list.length}` : (planDate === todayStr() ? '还没有计划，添加一个吧' : '这一天还没有计划');
      const pct = list.length ? Math.round(doneN / list.length * 100) : 0;
      $('#planRing').style.strokeDashoffset = (100.5 * (1 - pct / 100)).toFixed(1);
      $('#planPct').textContent = pct + '%';

      const box = $('#taskList');
      if (!shown.length) {
        box.innerHTML = `<div class="empty"><div class="e-cat">🐾</div>${f === 'done' ? '还没有完成的任务' : '暂无任务，上方添加计划'}</div>`;
      } else {
        box.innerHTML = shown.map((x) => taskHTML(x)).join('');
        bindTasks(shown);
      }
    };
    $('#planFilter').onclick = (e) => { const c = e.target.closest('.chip'); if (c) draw(c.dataset.f); };
    $('#addTask').onclick = addTask;
    $('#addPlanTimer').onclick = () => openPlanModal({ text: $('#taskInput').value.trim(), date: planDate });
    $('#planUnfin').onclick = openUnfinPage;
    $('#addCat').onclick = () => {
      const name = prompt('新建分类名称（例如：复试、科研、运动）');
      if (!name) return;
      const n = name.trim(); if (!n) return;
      const id = 'c_' + Date.now();
      store.customCats.push({ id, name: n }); save();
      toast('已新建分类：' + n);
    };
    $('#taskInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
    draw('all');

    const carry = list.filter((x) => x.carry && !x.done);
    $('#carryBox').innerHTML = carry.length
      ? `<div class="carry-t">⚠ 昨日未完成的 ${carry.length} 项已顺延到今天</div>` +
      carry.map((x) => `<div class="task ${x.done ? 'done' : ''} ${x.pri}"><div class="tk-body"><div class="tk-text">${esc(x.text)}</div><div class="tk-meta"><span class="tk-tag carry">顺延</span></div></div></div>`).join('')
      : '';
  }

  /* —— ⚠ 以往未完成的计划（不含当天，可点击跳转到对应日期） —— */
  const UNFIN_LOOKBACK = 180;                       // 最多回溯 180 天，避免极端数据下卡顿
  function pastUnfinished() {
    const t = todayStr();
    const limit = shiftDay(t, -UNFIN_LOOKBACK);
    let start = '';
    Object.keys(store.plan || {}).forEach((k) => { if (k < t && (!start || k < start)) start = k; });
    (store.planTpl || []).forEach((tp) => { if (tp.date && tp.date < t && (!start || tp.date < start)) start = tp.date; });
    if (!start) return [];
    if (start < limit) start = limit;
    const groups = [];
    let cur = start, guard = 0;
    while (cur < t && guard++ <= UNFIN_LOOKBACK + 2) {
      const items = effTasks(cur).filter((x) => !x.done);
      if (items.length) groups.push({ ds: cur, items });
      cur = shiftDay(cur, 1);
    }
    return groups.reverse();                        // 最近的日期排在前面
  }
  function openUnfinPage() {
    const groups = pastUnfinished();
    const total = groups.reduce((s, g) => s + g.items.length, 0);
    const body = total
      ? `<div class="unfin-tip">共 <b>${total}</b> 项以往未完成的计划（不含今天）· 点击任意一项可跳转到当天的计划页</div>` +
        groups.map((g) => `<div class="unfin-day">
          <div class="unfin-date">${g.ds.slice(5).replace('-', '/')} · 周${WD_CN[new Date(g.ds + 'T00:00:00').getDay()]}<span>${g.items.length} 项未完成</span></div>
          ${g.items.map((x) => `<div class="unfin-item" data-unfin="${g.ds}"><div class="ui-t">${esc(x.text)}</div>${x.carry ? '<span class="ui-tag">顺延</span>' : ''}</div>`).join('')}
        </div>`).join('')
      : `<div class="empty"><div class="e-cat">🎉</div>以往没有未完成的计划，太棒啦</div>`;
    openModal('⚠ 以往未完成的计划', body);
    const mask = document.getElementById('modalMask');
    if (!mask) return;
    Array.from(mask.querySelectorAll('[data-unfin]')).forEach((el) => {
      el.onclick = () => {
        mask.classList.add('hidden');
        planDate = el.dataset.unfin;                // 跳到该计划所在的那一天
        goPage('plan');
      };
    });
  }

  /* —— 定时/重复 任务 —— */
  function effTasks(ds) {
    const out = [];
    (store.plan[ds] || []).forEach((t) => out.push({
      id: t.id, text: t.text, pri: t.pri, cat: t.cat, done: !!t.done, carry: !!t.carry,
      tplId: null, date: ds, note: t.note || '', timeMode: 'none', time: '', timeEnd: '', repeat: null
    }));
    (store.planTpl || []).forEach((tpl) => {
      if (!matchRepeat(tpl, ds)) return;
      const key = tpl.id + '@' + ds;
      if (store.planHide && store.planHide[key]) return;
      out.push({
        id: key, text: tpl.text, pri: tpl.pri, cat: tpl.cat, done: !!(store.planDone && store.planDone[key]),
        carry: false, tplId: tpl.id, date: ds, note: tpl.note || '',
        timeMode: tpl.timeMode || 'none', time: tpl.time || '', timeEnd: tpl.timeEnd || '', repeat: tpl.repeat || null
      });
    });
    // 按时间排序：无具体时间的排在前面；有时间的按开始时间升序
    out.sort((a, b) => {
      const hasA = a.timeMode !== 'none' && (a.time || a.timeEnd);
      const hasB = b.timeMode !== 'none' && (b.time || b.timeEnd);
      if (!hasA && !hasB) return 0;
      if (!hasA) return -1;
      if (!hasB) return 1;
      const ta = a.time || a.timeEnd || '';
      const tb = b.time || b.timeEnd || '';
      return ta.localeCompare(tb);
    });
    return out;
  }
  const WD_CN = ['日', '一', '二', '三', '四', '五', '六'];
  function baseMatch(tpl, ds) {
    const d = new Date(ds + 'T00:00:00');
    if (!tpl.repeat) {
      if (tpl.dateEnd) return ds >= tpl.date && ds <= tpl.dateEnd;   // 跨天区间（含首尾每天各一条）
      return ds === tpl.date;                                        // 单天：只出现在这天
    }
    if (ds < tpl.date) return false;
    const r = tpl.repeat;
    switch (r.type) {
      case 'daily': return true;
      case 'workday': { const w = d.getDay(); return w >= 1 && w <= 5; }
      case 'weekly': return r.dow.includes(d.getDay());
      case 'monthly': return d.getDate() === r.day;
      case 'yearly': return (d.getMonth() + 1) === r.m && d.getDate() === r.d;
      case 'lunar': { const L = solarToLunar(d); return L.month === r.m && L.day === r.d; }
      case 'custom':
        if (r.sub.kind === 'daily') return dayDiff(tpl.date, ds) % r.sub.step === 0;
        if (r.sub.kind === 'weekly') return r.sub.dow.includes(d.getDay());
        if (r.sub.kind === 'monthly') {
          if (r.sub.mode === 'date') return d.getDate() === r.sub.day;
          const ord = Math.floor((d.getDate() - 1) / 7);
          const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
          const isLast = d.getDate() > last - 7;
          const want = r.sub.ord === 5 ? isLast : ord === r.sub.ord;
          return want && d.getDay() === r.sub.dow;
        }
        return false;
      default: return false;
    }
  }
  function matchRepeat(tpl, ds) {
    if (!baseMatch(tpl, ds)) return false;
    const r = tpl.repeat;
    if (!r || !r.stop || r.stop.type === 'none') return true;
    if (r.stop.type === 'date') return ds <= r.stop.date;            // 含当天仍执行
    if (r.stop.type === 'count') {                                    // 累计出现次数超过即停止
      let cnt = 0;
      let cur = tpl.date;
      let guard = 0;
      while (cur <= ds && guard++ < 4000) {
        if (baseMatch(tpl, cur)) { cnt++; if (cnt > r.stop.n) return false; }
        cur = shiftDay(cur, 1);
      }
      return cnt <= r.stop.n;
    }
    return true;
  }
  function repeatLabel(r) {
    if (!r || r.type === 'none') return '单次';
    if (r.type === 'daily') return '每天';
    if (r.type === 'workday') return '法定工作日';
    if (r.type === 'weekly') return '每周' + r.dow.map((x) => '周' + WD_CN[x]).join('');
    if (r.type === 'monthly') return '每月' + r.day + '号';
    if (r.type === 'yearly') return '每年' + r.m + '月' + r.d + '号';
    if (r.type === 'lunar') return '农历' + r.m + '月' + r.d + '号';
    if (r.type === 'custom') {
      if (r.sub.kind === 'daily') return '每' + r.sub.step + '天';
      if (r.sub.kind === 'weekly') return '每' + r.sub.dow.map((x) => '周' + WD_CN[x]).join('');
      if (r.sub.kind === 'monthly') return r.sub.mode === 'date' ? '每月' + r.sub.day + '号' : '每月第' + (r.sub.ord === 5 ? '最后' : (r.sub.ord + 1)) + '个周' + WD_CN[r.sub.dow];
    }
    let s = '重复';
    if (r.stop && r.stop.type === 'date') s = (s === '重复' ? '' : s + '，') + '至 ' + r.stop.date + ' 止';
    else if (r.stop && r.stop.type === 'count') s = (s === '重复' ? '' : s + '，') + '共 ' + r.stop.n + ' 次';
    return s;
  }
  function catOptionsHTML(sel) {
    const opts = [['study', '📚 学习'], ['work', '💼 工作'], ['life', '🌿 生活']].concat(store.customCats.map((c) => [c.id, '🏷 ' + c.name]));
    return opts.map(([v, l]) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${esc(l)}</option>`).join('');
  }
  function taskHTML(x) {
    const pri = x.pri;
    // Build time display string
    let timeStr = '';
    if (x.tplId) {
      if (x.timeMode === 'point' && x.time) {
        const d = new Date(x.date + 'T00:00:00');
        const today = todayStr();
        if (x.date === today) timeStr = '今天' + x.time;
        else timeStr = x.date.slice(5).replace('-', '/') + ' ' + x.time;
      } else if (x.timeMode === 'period' && x.time && x.timeEnd) {
        const d = new Date(x.date + 'T00:00:00');
        const today = todayStr();
        const prefix = x.date === today ? '今天' : x.date.slice(5).replace('-', '/');
        timeStr = prefix + ' ' + x.time + '-' + x.timeEnd;
      }
    }
    // Fallback: show date
    if (!timeStr) {
      const d = new Date(x.date + 'T00:00:00');
      const today = todayStr();
      timeStr = x.date === today ? '今天' : (d.getMonth()+1)+'/'+d.getDate();
    }

    let meta = `<span class="tk-tag tm">${timeStr}</span>`;
    if (x.carry) meta += '<span class="tk-tag carry">顺延</span>';
    if (x.note) meta += `<span class="tk-tag note" title="${esc(x.note)}">📝</span>`;
    return `<div class="task ${x.done ? 'done' : ''} ${pri}" data-id="${x.id}">
      <div class="tk-check ${x.done ? 'on' : ''}" data-act="check">${x.done ? '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 6"/></svg>' : ''}</div>
      <div class="tk-body" data-act="detail">
        <div class="tk-text">${esc(x.text)}</div>
        <div class="tk-meta">${meta}</div>
      </div>
      <div class="tk-act">
        <button data-act="edit" title="详情/编辑">✎</button>
        <button data-act="del" title="删除">✕</button>
      </div>
    </div>`;
  }
  function bindTasks(list) {
    $$('#taskList .task').forEach((el) => {
      const id = el.dataset.id;
      const item = list.find((x) => x.id === id);
      if (!item) return;
      el.querySelector('[data-act="check"]').onclick = (e) => { e.stopPropagation(); toggleDone(item); };
      el.querySelector('[data-act="del"]').onclick = (e) => { e.stopPropagation(); delTask(item); };
      el.querySelector('[data-act="edit"]').onclick = (e) => { e.stopPropagation(); openTaskDetail(item); };
      el.querySelector('[data-act="detail"]').onclick = () => openTaskDetail(item);
    });
  }
  function toggleDone(item) {
    if (item.tplId) { store.planDone[item.id] = !item.done; }
    else { const arr = store.plan[item.date] || []; const t = arr.find((x) => x.id === item.id); if (t) t.done = !t.done; }
    save(); renderPlan();
  }
  function delTask(item) {
    if (item.tplId) {
      if (!confirm('删除该定时任务（含所有重复）？')) return;
      store.planTpl = store.planTpl.filter((t) => t.id !== item.tplId);
      Object.keys(store.planDone).forEach((k) => { if (k.indexOf(item.tplId + '@') === 0) delete store.planDone[k]; });
    } else {
      store.plan[item.date] = (store.plan[item.date] || []).filter((x) => x.id !== item.id);
    }
    save(); renderPlan();
  }
  function addTask() {
    const inp = $('#taskInput');
    const text = inp.value.trim();
    if (!text) { toast('先写点什么吧'); return; }
    if (!store.plan[planDate]) store.plan[planDate] = [];
    store.plan[planDate].unshift({ id: uid(), text, pri: 'p1', cat: 'study', done: false, carry: false, note: '' });
    inp.value = ''; save(); renderPlan();
  }

  /* —— 添加定时/重复任务 弹窗 —— */
  function openPlanModal(pf) {
    pf = pf || {};
    const iniDate = pf.date || todayStr();
    const priKeys = Object.keys(PRI_LABEL);
    // Build category list with delete for custom
    const catList = [
      ['study', '📚 学习'],
      ['work', '💼 工作'],
      ['life', '🌿 生活']
    ].concat(store.customCats.map((c) => [c.id, '🏷 ' + c.name, true])); // 3rd = isCustom

    openModal('⏰ 添加定时计划', `
      <div class="pm">
        <label class="pm-l">内容</label>
        <input type="text" id="pmText" class="pm-input" placeholder="计划内容" value="${esc(pf.text || '')}" maxlength="60">
        <label class="pm-l">日期（结束留空＝单天）</label>
        <div class="pm-row">
          <input type="date" id="pmDate" value="${iniDate}">
          <span class="pm-tilde">~</span>
          <input type="date" id="pmDateEnd" value="${pf.dateEnd || ''}">
        </div>
        <div class="pm-hint">结束日期留空＝单天；填写＝跨天（含首尾每天各一条）</div>
        <label class="pm-l">时间</label>
        <div class="pm-row">
          <select id="pmTimeMode">
            <option value="none">不设置</option>
            <option value="point">时间点</option>
            <option value="period">时间段</option>
          </select>
          <input type="time" id="pmTime" class="pm-time" value="${pf.time || ''}">
          <input type="time" id="pmTimeEnd" class="pm-time" value="${pf.timeEnd || ''}">
        </div>
        <label class="pm-l">重复</label>
        <div class="pm-repeat" id="pmRepeat">
          ${['none', 'daily', 'weekly', 'monthly', 'yearly', 'lunar', 'workday', 'custom'].map((r) => `<button data-r="${r}" class="pmr ${r === 'none' ? 'on' : ''}">${({ none: '不重复', daily: '每天', weekly: '每周', monthly: '每月', yearly: '每年', lunar: '农历每年', workday: '法定工作日', custom: '自定义' })[r]}</button>`).join('')}
        </div>
        <div id="pmWeek" class="pm-sub hidden"><div class="pm-hint">选择星期（可多选）</div><div class="pm-dows" id="pmDows">${WD_CN.map((d, i) => `<button data-d="${i}" class="pmd">周${d}</button>`).join('')}</div></div>
        <div id="pmMonthDay" class="pm-sub hidden">
          <div class="pmm-date-grid" id="pmMonGrid">${Array.from({length:31},(_,i)=>`<button data-md="${i+1}" class="pmd-btn">${i+1}</button>`).join('')}<button data-md="-1" class="pmd-btn last">最后一天</button></div>
        </div>
        <div id="pmYear" class="pm-sub hidden"><label class="pm-l">月 / 日</label><div class="pm-row"><input type="number" id="pmYM" min="1" max="12" value="1"><input type="number" id="pmYD" min="1" max="31" value="1"></div></div>
        <div id="pmCustom" class="pm-sub hidden">
          每 <select id="pmCk" class="pm-ck"><option value="daily">日</option><option value="weekly">周</option><option value="monthly">月</option></select>
          <div id="pmCdaily" class="pm-sub2"><div class="pm-hint">每 <span id="pmStepV">1</span> 天</div><div class="cslider-row"><button type="button" class="cslider-btn" data-slider="pmStep" data-step="-1">−</button><div class="cslider-wrap"><input type="range" id="pmStep" min="1" max="99" value="1" class="cslider"></div><button type="button" class="cslider-btn" data-slider="pmStep" data-step="1">+</button></div></div>
          <div id="pmCweekly" class="pm-sub2 hidden"><div class="pm-dows" id="pmCDows">${WD_CN.map((d, i) => `<button data-d="${i}" class="pmd">周${d}</button>`).join('')}</div></div>
          <div id="pmCmonthly" class="pm-sub2 hidden">
            <div class="pmm-tabs" id="pmCmdTabs"><button data-pmm="date" class="pmm-tab on">按日期</button><button data-pmm="week" class="pmm-tab">按星期</button></div>
            <div id="pmCmdDatePanel" class="pmm-panel">
              <div class="pmm-date-grid" id="pmCmdGrid">${Array.from({length:31},(_,i)=>`<button data-md="${i+1}" class="pmd-btn">${i+1}</button>`).join('')}<button data-md="-1" class="pmd-btn last">最后一天</button></div>
            </div>
            <div id="pmCmdWeekPanel" class="pmm-panel hidden">
              <div class="pm-ord-row">
                <select id="pmCmdOrd"><option value="0">第一个</option><option value="1">第二个</option><option value="2">第三个</option><option value="3">第四个</option><option value="4">第五个</option><option value="5">最后一个</option></select>
                <select id="pmCmdWk"><option value="0">星期一</option><option value="1">星期二</option><option value="2">星期三</option><option value="3">星期四</option><option value="4">星期五</option><option value="5">星期六</option><option value="6">星期日</option></select>
              </div>
            </div>
          </div>
        </div>
        <div class="pm-sep"></div>
        <div id="pmStopWrap" class="pm-stopwrap hidden">
          <label class="pm-l">停止重复</label>
          <div class="pm-stop" id="pmStop">
            <button data-s="none" class="pmr-stop on">无</button>
            <button data-s="date" class="pmr-stop">按日期</button>
            <button data-s="count" class="pmr-stop">按次数</button>
          </div>
          <div id="pmStopDate" class="pm-sub hidden">
            <div class="pm-hint">选择重复终止日期（含当天仍会执行）</div>
            <div id="pmStopCal"></div>
          </div>
          <div id="pmStopCount" class="pm-sub hidden">
            <div class="pm-hint">重复 <span id="pmStopStepV">1</span> 次后停止</div>
            <div class="cslider-row"><button type="button" class="cslider-btn" data-slider="pmStopStep" data-step="-1">−</button><div class="cslider-wrap"><input type="range" id="pmStopStep" min="1" max="99" value="1" class="cslider"></div><button type="button" class="cslider-btn" data-slider="pmStopStep" data-step="1">+</button></div>
          </div>
        </div>
        <label class="pm-l">优先级</label>
        <div class="pm-pri-btns" id="pmPriBtns">${priKeys.map((v) => `<button data-pri="${v}" class="ppri ${v === (pf.pri||'p1') ? 'on' : ''}">${PRI_LABEL[v]}</button>`).join('')}</div>
        <label class="pm-l">分类</label>
        <div class="pm-cat-btns" id="pmCatBtns">${catList.map(([v,l,isC]) => `<button data-cat="${v}" class="pcat ${v === (pf.cat||'study') ? 'on' : ''}${isC ? ' custom-cat' : ''}">${l}${isC ? '<span class="pcat-del" data-cdel="' + v + '">✕</span>' : ''}</button>`).join('')}</div>
        <label class="pm-l">备注</label>
        <textarea id="pmNote" rows="2" placeholder="可选备注…">${esc(pf.note || '')}</textarea>
        <div class="pm-actions">
          <button class="pm-cancel" id="pmCancel">取消</button>
          <button class="pm-save" id="pmSave">确定</button>
        </div>
      </div>`);
    const mask = document.getElementById('modalMask');

    // ---- 优先级按钮 ----
    let selPri = pf.pri || 'p1';
    $m('#pmPriBtns').onclick = (e) => { const b = e.target.closest('.ppri'); if (!b) return; selPri = b.dataset.pri; $$m('#pmPriBtns .ppri').forEach((x) => x.classList.toggle('on', x.dataset.pri === selPri)); };

    // ---- 分类按钮 + 删除自定义分类 ----
    let selCat = pf.cat || 'study';
    $m('#pmCatBtns').onclick = (e) => {
      const b = e.target.closest('.pcat');
      if (!b) return;
      // 点击删除
      if (e.target.classList.contains('pcat-del')) {
        const delId = e.target.dataset.cdel;
        if (!confirm('删除该分类？')) return;
        store.customCats = store.customCats.filter((c) => c.id !== delId); save();
        // 如果当前选中的是被删的，切回学习
        if (selCat === delId) { selCat = 'study'; }
        e.target.closest('.pcat').remove();
        toast('已删除分类');
        return;
      }
      selCat = b.dataset.cat;
      $$m('#pmCatBtns .pcat').forEach((x) => x.classList.toggle('on', x.dataset.cat === selCat));
    };

    // 初始时间模式
    if (pf.timeMode) $('#pmTimeMode').value = pf.timeMode;
    const syncTime = () => { const m = $('#pmTimeMode').value; $('#pmTime').disabled = (m === 'none'); $('#pmTimeEnd').disabled = (m !== 'period'); };
    syncTime(); $('#pmTimeMode').onchange = syncTime;
    $('#pmDate').onchange = syncRepeatFromDate;   // 日期变更 → 重复选项随日期自动改变

    // ---- 重复逻辑 ----
    let monDay = pf.repeat && pf.repeat.type === 'monthly' ? (pf.repeat.day || 1) : null; // 重复-每月 选中日(-1=最后一天)
    let cmMode = 'date';   // 自定义-每月: date | week
    let cmDay = null;      // 自定义-每月 按日期选中
    let cmOrd = null, cmDow = null; // 自定义-每月 按星期

    // 重复-每月：31 个日期按钮
    $m('#pmMonGrid').onclick = (e) => {
      const b = e.target.closest('[data-md]');
      if (!b) return;
      const d = +b.dataset.md;
      monDay = d === -1 ? -1 : d;
      $$m('#pmMonGrid .pmd-btn').forEach((x) => x.classList.toggle('on', +x.dataset.md === d));
    };

    // 自定义-每月：按日期 / 按星期 tab
    $m('#pmCmdTabs').onclick = (e) => {
      const t = e.target.closest('.pmm-tab'); if (!t) return;
      cmMode = t.dataset.pmm;
      $$m('#pmCmdTabs .pmm-tab').forEach((x) => x.classList.toggle('on', x.dataset.pmm === cmMode));
      $m('#pmCmdDatePanel').classList.toggle('hidden', cmMode !== 'date');
      $m('#pmCmdWeekPanel').classList.toggle('hidden', cmMode !== 'week');
      if (cmMode === 'week') cmDow = $m('#pmCmdWk').value;
    };
    $m('#pmCmdGrid').onclick = (e) => {
      const b = e.target.closest('[data-md]');
      if (!b) return;
      const d = +b.dataset.md;
      cmMode = 'date'; cmDay = d === -1 ? -1 : d;
      $$m('#pmCmdGrid .pmd-btn').forEach((x) => x.classList.toggle('on', +x.dataset.md === d));
    };
    $m('#pmCmdOrd').onchange = () => { cmOrd = $m('#pmCmdOrd').value; };
    $m('#pmCmdWk').onchange = () => { cmDow = $m('#pmCmdWk').value; };

    const setRepeatUI = (r) => {
      $$('#pmRepeat .pmr').forEach((b) => b.classList.toggle('on', b.dataset.r === r));
      $('#pmWeek').classList.toggle('hidden', r !== 'weekly');
      $('#pmMonthDay').classList.toggle('hidden', r !== 'monthly');
      $('#pmYear').classList.toggle('hidden', !(r === 'yearly' || r === 'lunar'));
      $('#pmCustom').classList.toggle('hidden', r !== 'custom');
      setStopUI();
    };

    // ---- 停止重复逻辑 ----
    const sD0 = (pf.repeat && pf.repeat.stop && pf.repeat.stop.type === 'date' && pf.repeat.stop.date) ? pf.repeat.stop.date : null;
    let stopType = (pf.repeat && pf.repeat.stop) ? pf.repeat.stop.type : 'none';
    let stopDate = sD0;
    let stopCount = (stopType === 'count' && pf.repeat.stop.n) ? pf.repeat.stop.n : 1;
    const sd0 = stopDate ? new Date(stopDate + 'T00:00:00') : new Date(iniDate + 'T00:00:00');
    let stopYM = sd0.getFullYear() * 12 + sd0.getMonth();
    const renderStopCal = () => {
      const y = Math.floor(stopYM / 12), m = stopYM % 12;
      const host = $m('#pmStopCal'); if (!host) return;
      host.innerHTML = miniCal(y, m, (ds) => ds === stopDate ? 'pink' : '', stopDate);
      host.querySelector('[data-mc="-1"]').onclick = () => { stopYM--; renderStopCal(); };
      host.querySelector('[data-mc="1"]').onclick = () => { stopYM++; renderStopCal(); };
      host.querySelectorAll('.mc-cell[data-ds]').forEach((c) => c.onclick = () => { stopDate = c.dataset.ds; renderStopCal(); });
    };
    const setStopUI = () => {
      $m('#pmStopWrap').classList.toggle('hidden', $('#pmRepeat .pmr.on').dataset.r === 'none');
      $$m('#pmStop .pmr-stop').forEach((b) => b.classList.toggle('on', b.dataset.s === stopType));
      $m('#pmStopDate').classList.toggle('hidden', stopType !== 'date');
      $m('#pmStopCount').classList.toggle('hidden', stopType !== 'count');
      if (stopType === 'date') renderStopCal();
      else if (stopType === 'count') $m('#pmStopStepV').textContent = stopCount;
    };
    // 重复选项随计划日期自动变化：每周→当日星期；每月→当日日期；每年/农历每年→当日月日/农历月日
    function syncRepeatFromDate() {
      const dv = $('#pmDate').value || iniDate;
      const dd = new Date(dv + 'T00:00:00');
      const wd = dd.getDay();
      const dayN = dd.getDate();
      const mon = dd.getMonth() + 1;
      if (!$m('#pmWeek').classList.contains('hidden')) {
        $$m('#pmDows .pmd').forEach((b) => b.classList.toggle('on', +b.dataset.d === wd));
      }
      if (!$m('#pmMonthDay').classList.contains('hidden')) {
        monDay = dayN;
        $$m('#pmMonGrid .pmd-btn').forEach((x) => x.classList.toggle('on', +x.dataset.md === dayN));
      }
      if (!$m('#pmYear').classList.contains('hidden')) {
        const isLunar = $('#pmRepeat .pmr.on').dataset.r === 'lunar';
        if (isLunar) { const L = solarToLunar(dd); $('#pmYM').value = L.month; $('#pmYD').value = L.day; }
        else { $('#pmYM').value = mon; $('#pmYD').value = dayN; }
      }
    }
    $m('#pmStop').onclick = (e) => { const b = e.target.closest('.pmr-stop'); if (!b) return; stopType = b.dataset.s; if (stopType === 'count' && !stopCount) stopCount = 1; setStopUI(); };
    $('#pmStopStep').oninput = () => { stopCount = +$('#pmStopStep').value; $m('#pmStopStepV').textContent = stopCount; };
    if (pf.repeat) {
      const r = pf.repeat;
      if (r.type === 'weekly') { setRepeatUI('weekly'); (r.dow || []).forEach((d) => { const b = $m('#pmDows [data-d="' + d + '"]'); if (b) b.classList.add('on'); }); }
      else if (r.type === 'monthly') {
        setRepeatUI('monthly');
        if (r.day != null) { monDay = r.day; $$m('#pmMonGrid .pmd-btn').forEach((x) => x.classList.toggle('on', +x.dataset.md === r.day)); }
      }
      else if (r.type === 'yearly' || r.type === 'lunar') { setRepeatUI(r.type); $('#pmYM').value = r.m; $('#pmYD').value = r.d; }
      else if (r.type === 'custom') {
        setRepeatUI('custom');
        $('#pmCk').value = r.sub.kind;
        if (r.sub.kind === 'daily') { $('#pmStep').value = r.sub.step; $('#pmStepV').textContent = r.sub.step; }
        if (r.sub.kind === 'weekly') { (r.sub.dow || []).forEach((d) => { const b = $m('#pmCDows [data-d="' + d + '"]'); if (b) b.classList.add('on'); }); }
        if (r.sub.kind === 'monthly') {
          if (r.sub.mode === 'date') { cmMode = 'date'; cmDay = r.sub.day; $$m('#pmCmdGrid .pmd-btn').forEach((x) => x.classList.toggle('on', +x.dataset.md === r.sub.day)); }
          else { cmMode = 'week'; cmOrd = r.sub.ord; cmDow = Array.isArray(r.sub.dow) ? r.sub.dow[0] : r.sub.dow; $m('#pmCmdOrd').value = cmOrd; $m('#pmCmdWk').value = cmDow; $m('#pmCmdTabs .pmm-tab[data-pmm=week]').click(); }
        }
      } else setRepeatUI('none');
      setStopUI();
    } else setRepeatUI('none');

    $('#pmRepeat').onclick = (e) => { const b = e.target.closest('.pmr'); if (b) { setRepeatUI(b.dataset.r); syncRepeatFromDate(); } };
    $m('#pmDows').onclick = (e) => { const b = e.target.closest('.pmd'); if (b) b.classList.toggle('on'); };
    $m('#pmCDows').onclick = (e) => { const b = e.target.closest('.pmd'); if (b) b.classList.toggle('on'); };
    $('#pmCk').onchange = () => { const k = $('#pmCk').value;$m('#pmCdaily').classList.toggle('hidden', k !== 'daily');$m('#pmCweekly').classList.toggle('hidden', k !== 'weekly');$m('#pmCmonthly').classList.toggle('hidden', k !== 'monthly'); };
    $('#pmStep').oninput = () => { $('#pmStepV').textContent = $('#pmStep').value; };
    // 滑块 ±1 按钮：点按微调数字（与拖动滑块等效）
    $$m('.cslider-btn').forEach((b) => {
      b.onclick = () => {
        const sl = document.getElementById(b.dataset.slider);
        if (!sl) return;
        let v = (+sl.value) + (+b.dataset.step);
        v = Math.max(+sl.min, Math.min(+sl.max, v));
        sl.value = v;
        sl.dispatchEvent(new Event('input'));   // 触发 oninput 同步文案
      };
    });

    const selDows = (sel) => Array.from(mask.querySelectorAll(sel + ' .pmd.on')).map((b) => +b.dataset.d);
    const buildRepeat = () => {
      const r = $('#pmRepeat .pmr.on').dataset.r;
      if (r === 'none') return null;
      let base;
      if (r === 'daily' || r === 'workday') base = { type: r };
      else if (r === 'weekly') { const d = selDows('#pmDows'); base = { type: 'weekly', dow: d.length ? d : [new Date(iniDate + 'T00:00:00').getDay()] }; }
      else if (r === 'monthly') base = { type: 'monthly', day: monDay != null ? monDay : 1 };
      else if (r === 'yearly' || r === 'lunar') base = { type: r, m: +$('#pmYM').value || 1, d: +$('#pmYD').value || 1 };
      else if (r === 'custom') {
        const k = $('#pmCk').value;
        if (k === 'daily') base = { type: 'custom', sub: { kind: 'daily', step: +$('#pmStep').value || 1 } };
        else if (k === 'weekly') { const d = selDows('#pmCDows'); base = { type: 'custom', sub: { kind: 'weekly', dow: d.length ? d : [new Date(iniDate + 'T00:00:00').getDay()] } }; }
        else {
          if (cmMode === 'date') base = { type: 'custom', sub: { kind: 'monthly', mode: 'date', day: cmDay != null ? cmDay : 1 } };
          else { const wd = cmDow != null ? +cmDow : 0; base = { type: 'custom', sub: { kind: 'monthly', mode: 'week', ord: cmOrd != null ? +cmOrd : 0, dow: wd } }; }
        }
      } else base = { type: r };
      let stop = { type: 'none' };
      if (stopType === 'date' && stopDate) stop = { type: 'date', date: stopDate };
      else if (stopType === 'count') stop = { type: 'count', n: stopCount };
      return Object.assign(base, { stop });
    };
    $('#pmCancel').onclick = () => mask.classList.add('hidden');
    $('#pmSave').onclick = () => {
      const text = $('#pmText').value.trim();
      if (!text) { toast('请填写内容'); return; }
      const date = $('#pmDate').value || todayStr();
      const dateEnd = $('#pmDateEnd').value || null;
      const timeMode = $('#pmTimeMode').value;
      const time = timeMode !== 'none' ? $('#pmTime').value : '';
      const timeEnd = timeMode === 'period' ? $('#pmTimeEnd').value : '';
      const data = { text, pri: selPri, cat: selCat, date, dateEnd, timeMode, time, timeEnd, repeat: buildRepeat(), note: $('#pmNote').value.trim() };
      if (pf.tplId) { const t = store.planTpl.find((x) => x.id === pf.tplId); if (t) Object.assign(t, data); }
      else store.planTpl.push(Object.assign({ id: uid() }, data));
      save(); mask.classList.add('hidden'); renderPlan(); toast('已保存定时计划 ⏰');
    };
  }

  /* —— 任务详情 / 编辑 —— */
  function openTaskDetail(item) {
    const tpl = item.tplId ? (store.planTpl.find((t) => t.id === item.tplId) || {}) : (store.plan[item.date] || []).find((t) => t.id === item.id) || {};
    // Build time/repeat display
    let timeInfo = '';
    if (item.timeMode === 'point' && item.time) timeInfo = '⏰ 时间：' + item.time;
    else if (item.timeMode === 'period' && item.time && item.timeEnd) timeInfo = '⏰ 时间：' + item.time + ' ~ ' + item.timeEnd;
    if (item.repeat) timeInfo += (timeInfo ? '\n' : '') + '🔁 重复：' + repeatLabel(item.repeat);
    const hasTimeInfo = !!timeInfo;

    // Category list with custom delete
    const catList = [
      ['study', '📚 学习'],
      ['work', '💼 工作'],
      ['life', '🌿 生活']
    ].concat(store.customCats.map((c) => [c.id, '🏷 ' + c.name, true]));

    openModal('📋 任务详情', `
      <div class="pm">
        <label class="pm-l">内容</label>
        <input type="text" id="dtText" class="pm-input" value="${esc(item.text)}" maxlength="60">
        ${hasTimeInfo ? `<div class="pm-hint">${esc(timeInfo)}</div>` : '<div class="pm-hint">' + (item.tplId ? ('🔁 ' + repeatLabel(item.repeat)) : '单天任务') + '</div>'}
        <label class="pm-l">优先级</label>
        <div class="pm-pri-btns" id="dtPriBtns">${Object.entries(PRI_LABEL).map(([v,l])=>`<button data-pri="${v}" class="ppri ${v===item.pri?'on':''}">${l}</button>`).join('')}</div>
        <label class="pm-l">分类</label>
        <div class="pm-cat-btns" id="dtCatBtns">${catList.map(([v,l,isC])=>`<button data-cat="${v}" class="pcat ${v===item.cat?'on':''}${isC?' custom-cat':''}">${l}${isC?`<span class="pcat-del" data-cdel="${v}">✕</span>`:''}</button>`).join('')}</div>
        ${item.tplId ? '<button class="pm-save2" id="dtTime">⏰ 修改时间 / 重复</button>' : ''}
        <label class="pm-l">备注</label>
        <textarea id="dtNote" rows="2" placeholder="可选备注…">${esc(item.note || '')}</textarea>
        <div class="pm-actions">
          <button class="pm-cancel" id="dtCancel">取消</button>
          ${item.tplId ? '<button class="pm-hide" id="dtHide">仅隐藏今天</button>' : ''}
          <button class="pm-del" id="dtDel">删除</button>
          <button class="pm-save" id="dtSave">保存</button>
        </div>
      </div>`);
    const mask = document.getElementById('modalMask');
    let dtPri = item.pri;
    $m('#dtPriBtns').onclick = (e) => { const b = e.target.closest('.ppri'); if (!b) return; dtPri = b.dataset.pri; $$m('#dtPriBtns .ppri').forEach((x)=>x.classList.toggle('on',x.dataset.pri===dtPri)); };
    let dtCat = item.cat;
    $m('#dtCatBtns').onclick = (e) => {
      const b = e.target.closest('.pcat'); if (!b) return;
      if (e.target.classList.contains('pcat-del')) {
        const delId = e.target.dataset.cdel;
        if (!confirm('删除该分类？')) return;
        store.customCats = store.customCats.filter((c) => c.id !== delId); save();
        if (dtCat === delId) dtCat = 'study';
        e.target.closest('.pcat').remove();
        toast('已删除分类');
        return;
      }
      dtCat = b.dataset.cat;
      $$m('#dtCatBtns .pcat').forEach((x)=>x.classList.toggle('on',x.dataset.cat===dtCat));
    };
    $('#dtCancel').onclick = () => mask.classList.add('hidden');
    $('#dtSave').onclick = () => {
      const text = $('#dtText').value.trim(); if (!text) { toast('请填写内容'); return; }
      tpl.text = text; tpl.pri = dtPri; tpl.cat = dtCat; tpl.note = $('#dtNote').value.trim();
      save(); mask.classList.add('hidden'); renderPlan(); toast('已保存');
    };
    const dtDel = $('#dtDel'); if (dtDel) dtDel.onclick = () => { mask.classList.add('hidden'); delTask(item); };
    const dtHide = $('#dtHide'); if (dtHide) dtHide.onclick = () => { store.planHide[item.id] = true; save(); mask.classList.add('hidden'); renderPlan(); toast('已隐藏今天该任务'); };
    const dtTime = $('#dtTime'); if (dtTime) dtTime.onclick = () => { mask.classList.add('hidden'); openPlanModal({ tplId: item.tplId, text: tpl.text, date: tpl.date, dateEnd: tpl.dateEnd, timeMode: tpl.timeMode, time: tpl.time, timeEnd: tpl.timeEnd, repeat: tpl.repeat, pri: tpl.pri, cat: tpl.cat, note: tpl.note }); };
  }

  /* —— 农历转换（1900-2099） —— */
  const LUNAR_RAW = '04bd8 04ae0 0a570 054d5 0d260 0d950 16554 056a0 09ad0 055d2 04ae0 0a5b6 0a4d0 0d250 1d255 0b540 0d6a0 0ada2 095b0 14977 04970 0a4b0 0b4b5 06a50 06d40 1ab54 02b60 09570 052f2 04970 06566 0d4a0 0ea50 06e95 05ad0 02b60 186e3 092e0 1c8d7 0c950 0d4a0 1d8a6 0b550 056a0 1a5b4 025d0 092d0 0d2b2 0a950 0b557 06ca0 0b550 15355 04da0 0a5b0 14573 052b0 0a9a8 0e950 06aa0 0aea6 0ab50 04b60 0aae4 0a570 05260 0f263 0d950 05b57 056a0 096d0 04dd5 04ad0 0a4d0 0d4d4 0d250 0d558 0b540 0b5a0 195a6 095b0 049b0 0a974 0a4b0 0b27a 06a50 06d40 0af46 0ab60 09570 04af5 04970 064b0 074a3 0ea50 06b58 055c0 0ab60 096d5 092e0 0c960 0d954 0d4a0 0da50 07552 056a0 0abb7 025d0 092d0 0cab5 0a950 0b4a0 0baa4 0ad50 055d9 04ba0 0a5b0 15176 052b0 0a930 07954 06aa0 0ad50 05b52 04b60 0a6e6 0a4e0 0d260 0ea65 0d530 05aa0 076a0 096d5 04af0 04ad0 0a4d0 1d0b6 0d250 0d520 0dd45 0b5a0 056d0 055b2 049b0 0a577 0a4b0 0aa50 1b255 06d20 0ada0 14b63 09370 049f8 04970 064b0 168a6 0ea50 06b20 1a6c4 0aae0 092e0 0d2e0 0c960 0d550 0d4a0 0da50 05b52 056a0 0a6d0 055a2 04ad0 0a4d0 1d4d4 0d250 0d550 0dd40 0b5a0 056d0 055b0 049b0 0a577 0a4b0 0aa50 1b255 06d20 0ada0 14b63 09370 049f8 04970 064b0 168a6 0ea50 06b20 1a6c4 0aae0 092e0 0d2e0 0c960 0d550 0d4a0 0da50 05b52 056a0 0a6d0 055a2 04ad0 0a4d0 1d4d4 0d250 0d550 0dd40 0b5a0 056d0 055b0 049b0 0a577 0a4b0 0aa50 1b255 06d20 0ada0 14b63 09370 049f8 04970 064b0 168a6 0ea50 06b20 1a6c4 0aae0 092e0 0d2e0 0c960 0d550 0d4a0 0da50 05b52 056a0 0a6d0 055a2 04ad0 0a4d0';
  const LUNAR_INFO = LUNAR_RAW.split(' ').map((s) => parseInt(s, 16));
  function lLeapMonth(y) { return LUNAR_INFO[y - 1900] & 0xf; }
  function lLeapDays(y) { return lLeapMonth(y) ? (LUNAR_INFO[y - 1900] & 0x10000 ? 30 : 29) : 0; }
  function lMonthDays(y, m) { return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29; }
  function daysInLunarMonth(y, m, isLeap) { return isLeap ? lLeapDays(y) : lMonthDays(y, m); }
  function advanceLunar(y, m, isLeap) {
    const leap = lLeapMonth(y);
    if (!isLeap && leap > 0 && m === leap) return { y, m, isLeap: true };
    let nm = m + 1, ny = y; if (nm > 12) { nm = 1; ny = y + 1; }
    return { y: ny, m: nm, isLeap: false };
  }
  function solarToLunar(date) {
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    let y = 1900, m = 1, d = 1, isLeap = false;
    const cur = new Date(1900, 0, 31);
    if (cur.getTime() === target.getTime()) return { year: y, month: m, day: 1 };
    while (cur < target) {
      const dim = daysInLunarMonth(y, m, isLeap);
      if (d < dim) { d++; } else { const n = advanceLunar(y, m, isLeap); y = n.y; m = n.m; isLeap = n.isLeap; d = 1; }
      cur.setDate(cur.getDate() + 1);
    }
    return { year: y, month: m, day: d };
  }

  /* ================= 3. 英语 ================= */
  /* 通用弹窗（查看阅读/精翻/真题例文全文） */
  function openModal(title, bodyHTML) {
    let mask = $('#modalMask');
    if (!mask) {
      mask = document.createElement('div');
      mask.id = 'modalMask'; mask.className = 'modal-mask hidden';
      mask.innerHTML = `<div class="modal"><div class="modal-top"><div class="modal-title"></div><button class="modal-x">✕</button></div><div class="modal-body"></div></div>`;
      document.body.appendChild(mask);
      mask.onclick = (e) => { if (e.target === mask) { const sp = $('#sentencePop'); if (sp) sp.classList.add('hidden'); mask.classList.add('hidden'); } };
      mask.querySelector('.modal-x').onclick = () => {
        const sp = $('#sentencePop'); if (sp) sp.classList.add('hidden');
        mask.classList.add('hidden');
      };
    }
    mask.querySelector('.modal-title').textContent = title;
    mask.querySelector('.modal-body').innerHTML = bodyHTML;
    const _mb = mask.querySelector('.modal-body'); if (_mb) { _mb.scrollTop = 0; }
    mask.classList.remove('hidden');
    if (_mb) requestAnimationFrame(() => { _mb.scrollTop = 0; });  // 打开即定位到顶部（首行“内容”可见）
  }

  function renderEnglish() {
    tabSwitch('en', {
      word: renderEnWord, read: renderEnRead, trans: renderEnTrans, write: renderEnWrite, zhenti: renderEnZhenti
    });
  }
  // 取单词例句/翻译：优先用全量 EN_WORD_EX，回退到内置 w.e
  function wordEx(i) {
    if (typeof EN_WORD_EX !== 'undefined' && EN_WORD_EX[i]) {
      const x = EN_WORD_EX[i];
      return { e: x.e || (EN_WORDS[i] && EN_WORDS[i].e) || '', et: x.et || '' };
    }
    const w = EN_WORDS[i] || {};
    return { e: w.e || '', et: '' };
  }
  let enRevealed = false;   // 当前单词释义是否已揭示：仅在当前单词有效，离开（上一个/下一个/跳转/滑条）即重置，不跨单词持久化
  function renderEnWord() {
    const host = $('#enWord');
    const ws = store.words;
    const idx = clamp(ws.idx, 0, EN_WORDS.length - 1);
    const w = EN_WORDS[idx];
    const ex = wordEx(idx);
    const learned = ws.learned.includes(idx);
    const fav = ws.favs.includes(idx);
    const revealed = enRevealed;
    const todayCnt = day(todayStr()).en.wordCount || 0;
    const rN = [ws.rounds[0].length, ws.rounds[1].length, ws.rounds[2].length];
    const allDone = ws.learned.length >= EN_WORDS.length && (rN[0] + rN[1] + rN[2]) === 0;
    host.innerHTML = `
      <div class="word-search">
        <input id="wordSearch" class="ws-input" placeholder="🔍 搜索单词查释义 / 例句 / 翻译">
        <button class="ws-btn" data-wsearch>搜索</button>
      </div>
      <div id="searchResult" class="search-result hidden"></div>

      <div class="word-card">
        <div class="wc-idx">${idx + 1} / ${EN_WORDS.length}</div>
        <div class="wc-fav ${fav ? 'on' : ''}" data-fav>★</div>
        <div class="wc-w">${esc(w.w)}</div>
        ${w.p ? `<div class="wc-p">${esc(w.p)}</div>` : ''}
        <div class="wc-m ${revealed ? '' : 'wc-hide'}" data-mean>${esc(w.m)}</div>
        ${ex.e ? `<div class="wc-e ${revealed ? '' : 'wc-hide'}" data-eg>${esc(ex.e)}</div>` : ''}
        ${ex.et ? `<div class="wc-et ${revealed ? '' : 'wc-hide'}" data-egt>${esc(ex.et)}</div>` : ''}
        <div class="wc-tip">${revealed ? '🐾 已显示 · 试试造句巩固记忆' : '点「显示释义」查看中文' + (ex.e ? '、例句与翻译' : '')}</div>
      </div>
      <div class="wslider">
        <input type="range" id="wordSlider" class="wslider-range" min="0" max="${EN_WORDS.length - 1}" value="${idx}">
        <button class="ws-jump" data-w="jumpcur">↺ 回到当前</button>
      </div>
      <div class="wc-today">📅 今日已背 <b>${todayCnt}</b> 个 · 累计已学 <b>${ws.learned.length}</b> 个${store.goals.word ? ` · 目标 <b>${store.goals.word}</b> 个` : ''}</div>
      <div class="word-nav">
        <button data-w="prev">上一个</button>
        <button class="main ${revealed ? 'on' : ''}" data-w="reveal">${revealed ? '隐藏释义' : '显示释义'}</button>
        <button data-w="next">下一个</button>
      </div>
      <button class="ans-btn" data-w="learned" style="margin-top:9px">✓ 标记已背（${learned ? '已计入' : '点击计入今日'}）</button>
      <button class="drill-enter" data-drillpage>🌀 三轮强化记忆</button>
      <button class="drill-enter spell-enter" data-spellpage>✍️ 随机拼写</button>
      ${allDone ? `<button class="refresh-btn" data-w="refresh">🔄 全部背完啦！一键从头再背</button>` : ''}`;

    // 搜索栏
    const sInp = host.querySelector('#wordSearch');
    const doSearch = () => {
      const q = sInp.value.trim().toLowerCase();
      const res = host.querySelector('#searchResult');
      if (!q) { res.classList.add('hidden'); res.innerHTML = ''; return; }
      const si = EN_WORDS.findIndex((x) => x.w.toLowerCase() === q);
      if (si < 0) { res.classList.remove('hidden'); res.innerHTML = `<div class="empty"><div class="e-cat">🔍</div>没找到「${esc(q)}」，请输入完整单词</div>`; return; }
      const sw = EN_WORDS[si], sex = wordEx(si);
      const sfav = ws.favs.includes(si);
      res.classList.remove('hidden');
      res.innerHTML = `
        <div class="sr-idx">第 <b>${si + 1}</b> / ${EN_WORDS.length} 个单词</div>
        <div class="sr-w">${esc(sw.w)} ${sw.p ? `<span class="sr-p">${esc(sw.p)}</span>` : ''}</div>
        <div class="sr-m">${esc(sw.m)}</div>
        ${sex.e ? `<div class="sr-e">${esc(sex.e)}</div>` : ''}
        ${sex.et ? `<div class="sr-et">${esc(sex.et)}</div>` : ''}
        <button class="sr-fav ${sfav ? 'on' : ''}" data-srfav="${si}">${sfav ? '★ 已标星' : '☆ 标星（入一轮强化）'}</button>`;
      res.querySelector('[data-srfav]').onclick = () => {
        const i = +res.querySelector('[data-srfav]').dataset.srfav;
        if (ws.favs.includes(i)) { toast('这个单词已经标过星啦', 'main'); return; }
        ws.favs.push(i);
        if (!ws.rounds.flat().includes(i)) ws.rounds[0].push(i);
        save(); renderEnWord();
      };
    };
    sInp.onkeydown = (e) => { if (e.key === 'Enter') doSearch(); };
    host.querySelector('[data-wsearch]').onclick = doSearch;

    // 滑动条跳转
    const slider = host.querySelector('#wordSlider');
    slider.oninput = () => { host.querySelector('.wc-idx').textContent = `${(+slider.value) + 1} / ${EN_WORDS.length}`; };
    slider.onchange = () => { enRevealed = false; ws.idx = +slider.value; save(); renderEnWord(); };

    host.querySelector('[data-w="prev"]').onclick = () => { enRevealed = false; ws.idx = (idx - 1 + EN_WORDS.length) % EN_WORDS.length; save(); renderEnWord(); };
    host.querySelector('[data-w="next"]').onclick = () => { enRevealed = false; ws.idx = (idx + 1) % EN_WORDS.length; save(); renderEnWord(); };
    host.querySelector('[data-w="jumpcur"]').onclick = () => {
      // 回到「第一个未背单词」：取编号最小的未背单词（不是已背单词的个数位置）
      const learnedSet = new Set(ws.learned);
      let firstUnlearned = -1;
      for (let i = 0; i < EN_WORDS.length; i++) { if (!learnedSet.has(i)) { firstUnlearned = i; break; } }
      if (firstUnlearned < 0) { toast('全部单词已背完啦！', 'main'); return; }
      ws.idx = firstUnlearned; slider.value = ws.idx; enRevealed = false; save(); renderEnWord();
      toast('已回到第 ' + (firstUnlearned + 1) + ' 个单词（首个未背）', 'main');
    };
    host.querySelector('[data-w="reveal"]').onclick = () => { enRevealed = !enRevealed; renderEnWord(); };
    host.querySelector('[data-w="learned"]').onclick = () => {
      if (!learned) {
        ws.learned.push(idx);
        const d = day(todayStr());
        d.en.wordCount = (d.en.wordCount || 0) + 1; save();
        toast('已背 +1，累计 ' + totalWords() + ' 个 🎉', 'main');
        if (store.goals.word && d.en.wordCount >= store.goals.word && !d.en.wordGoalDone) {
          d.en.wordGoalDone = true; save();
          toast('已完成今日背诵单词目标~ 🎉', 'main');
        }
      } else toast('这个词已计入啦', 'main');
      renderEnWord();
    };
    host.querySelector('[data-fav]').onclick = () => {
      const i = ws.favs.indexOf(idx);
      if (i >= 0) { ws.favs.splice(i, 1); removeFromRound(0, idx); }
      else { ws.favs.push(idx); if (!ws.rounds.flat().includes(idx)) ws.rounds[0].push(idx); }
      save(); renderEnWord();
    };
    host.querySelector('[data-drillpage]').onclick = () => openDrillPage();
    const spBtn = host.querySelector('[data-spellpage]');
    if (spBtn) spBtn.onclick = () => openSpellPage();
    const rfb = host.querySelector('[data-w="refresh"]');
    if (rfb) rfb.onclick = () => { ws.idx = 0; ws.learned = []; save(); renderEnWord(); toast('已重置，从头开始背 🐱', 'main'); };
  }
  function totalWords() { return Object.values(store.dailyStudy).reduce((s, x) => s + (x.en.wordCount || 0), 0); }

  /* ===== 随机拼写 ===== */
  function openSpellPage() {
    let cur = -1;
    const pickNext = () => { cur = Math.floor(Math.random() * EN_WORDS.length); };
    const render = () => {
      const w = EN_WORDS[cur];
      const ex = wordEx(cur);
      openModal('✍️ 随机拼写', `
        <div class="spell">
          <div class="spell-m">${esc(w.m)}</div>
          <input id="spellInp" class="spell-input" placeholder="请输入英文拼写" autocomplete="off" spellcheck="false">
          <div id="spellRes" class="spell-res"></div>
          <button class="spell-submit" id="spellSubmit">提交</button>
          <button class="spell-next hidden" id="spellNext">继续 →</button>
        </div>`);
      const mask = document.getElementById('modalMask');
      const inp = mask.querySelector('#spellInp');
      const res = mask.querySelector('#spellRes');
      const submit = mask.querySelector('#spellSubmit');
      const nxt = mask.querySelector('#spellNext');
      const check = () => {
        const ans = inp.value.trim();
        if (!ans) { toast('先输入拼写哦'); return; }
        if (ans.toLowerCase() === w.w.toLowerCase()) {
          res.innerHTML = `<div class="spell-ok">✅ 正确！<b>${esc(w.w)}</b></div>`;
        } else {
          res.innerHTML = `<div class="spell-bad">❌ 你的答案：<b>${esc(ans)}</b><br>正确答案：<b class="spell-correct">${esc(w.w)}</b></div>`;
        }
        inp.disabled = true; submit.classList.add('hidden'); nxt.classList.remove('hidden');
      };
      submit.onclick = check;
      inp.onkeydown = (e) => { if (e.key === 'Enter') check(); };
      nxt.onclick = () => { pickNext(); render(); };
      setTimeout(() => inp.focus(), 60);
    };
    pickNext(); render();
  }

  /* ===== 三轮强化记忆引擎 ===== */
  function addToRound(r, idx) {
    if (!store.words.rounds[r].includes(idx)) store.words.rounds[r].push(idx);
    if (r === 2 && !store.words.ultimate.includes(idx)) store.words.ultimate.push(idx); // 进入三轮 → 进终极池
  }
  function removeFromRound(r, idx) { store.words.rounds[r] = store.words.rounds[r].filter((x) => x !== idx); }
  function removeFromUltimate(idx) { store.words.ultimate = store.words.ultimate.filter((x) => x !== idx); }
  function drillOptions(idx) {
    const correct = EN_WORDS[idx].m;
    const pool = EN_WORDS.map((ww) => ww.m).filter((m) => m && m !== correct);
    const seen = new Set([correct]); const dist = [];
    let guard = 0;
    while (dist.length < 3 && guard++ < 5000) {
      const m = pool[Math.floor(Math.random() * pool.length)];
      if (!seen.has(m)) { seen.add(m); dist.push(m); }
    }
    let opts = [correct, ...dist];
    for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
    return { opts, k: opts.indexOf(correct) };
  }
  function openDrillPage() {
    const ws = store.words;
    const rN = [ws.rounds[0].length, ws.rounds[1].length, ws.rounds[2].length];
    openModal('🌀 三轮强化记忆', `
      <div class="dz-row">
        <button class="round-btn" data-dround="1"><span class="rb-ico">🥉</span><span class="rb-t">一轮强化</span><span class="rb-n">${rN[0]}</span></button>
        <button class="round-btn" data-dround="2"><span class="rb-ico">🥈</span><span class="rb-t">二轮强化</span><span class="rb-n">${rN[1]}</span></button>
        <button class="round-btn" data-dround="3"><span class="rb-ico">🥇</span><span class="rb-t">三轮强化</span><span class="rb-n">${rN[2]}</span></button>
      </div>
      <div class="dz-hint">标★单词自动进入「一轮」；答错或猜对进入下一轮，答对（非猜对）移出本轮。三轮均可反复刷直到清空。</div>
      <div id="drillArea"></div>
      <button class="ultimate-btn hidden" id="ultimateBtn">💎 终极强化（${ws.ultimate.length}）</button>
    `);
    const mask = $('#modalMask');
    mask.querySelectorAll('[data-dround]').forEach((b) => b.onclick = () => {
      const r = +b.dataset.dround;
      const ub = $('#ultimateBtn');
      if (ub) { if (r === 3) ub.classList.remove('hidden'); else ub.classList.add('hidden'); }
      startDrill(r, $('#drillArea'));
    });
    const ub = $('#ultimateBtn');
    if (ub) ub.onclick = () => startUltimate($('#drillArea'));
  }
  function startDrill(round, host) {
    host = host || $('#drillHost');
    const r = round - 1;
    const pool = store.words.rounds[r];
    if (!pool.length) { host.innerHTML = `<div class="empty"><div class="e-cat">🎉</div>第 ${round} 轮单词池已清空！</div>`; return; }
    const idx = pool[0];
    const w = EN_WORDS[idx];
    const ex = wordEx(idx);
    const { opts, k } = drillOptions(idx);
    host.innerHTML = `
      <div class="drill-card">
        <div class="dc-h">第 ${round} 轮强化 · 剩余 ${pool.length} 个</div>
        <div class="dc-w">${esc(w.w)}</div>
        ${w.p ? `<div class="dc-p">${esc(w.p)}</div>` : ''}
        <div class="dc-sub">选出正确的中文释义</div>
        <div class="dc-opts">
          ${opts.map((o, i) => `<button class="dc-opt" data-oi="${i}">${esc(o)}</button>`).join('')}
        </div>
        <div class="dc-after hidden">
          <button class="dc-act cont" data-act="cont">继续</button>
          <button class="dc-act guess" data-act="guess">猜对的</button>
        </div>
      </div>`;
    let answered = false;
    host.querySelectorAll('.dc-opt').forEach((ob) => ob.onclick = () => {
      if (answered) return; answered = true;
      const oi = +ob.dataset.oi;
      host.querySelectorAll('.dc-opt').forEach((x) => x.disabled = true);
      if (oi === k) {
        ob.classList.add('right');
        const after = host.querySelector('.dc-after'); if (after) after.classList.remove('hidden');
      } else {
        ob.classList.add('wrong');
        host.querySelectorAll('.dc-opt')[k].classList.add('right');
        handleDrillResult(round, idx, false, false);
        toast('答错了，看讲解巩固一下~');
        showExplain(round, idx, host);
      }
    });
    const cont = host.querySelector('[data-act="cont"]'); if (cont) cont.onclick = () => { handleDrillResult(round, idx, true, false); showExplain(round, idx, host); };
    const guess = host.querySelector('[data-act="guess"]'); if (guess) guess.onclick = () => { handleDrillResult(round, idx, true, true); showExplain(round, idx, host); };
  }
  function handleDrillResult(round, idx, correct, guessed) {
    const r = round - 1;
    if (round < 3) {
      if (!correct || guessed) addToRound(r + 1, idx);   // 答错或猜对 → 进入下一轮
      removeFromRound(r, idx);                            // 本轮移出
    } else {
      if (correct && !guessed) removeFromRound(r, idx);   // 三轮仅答对（非猜对）才移出
    }
    save();
  }
  function showExplain(round, idx, host) {
    host = host || $('#drillHost');
    const w = EN_WORDS[idx];
    const ex = wordEx(idx);
    const D = (typeof EN_WORD_DETAIL !== 'undefined' && EN_WORD_DETAIL[idx]) ? EN_WORD_DETAIL[idx] : {};
    let html = `<div class="explain-card">
      <div class="ec-h">讲解 · 第 ${round} 轮</div>
      <div class="ec-w">${esc(w.w)} ${w.p ? `<span class="ec-p">${esc(w.p)}</span>` : ''}</div>
      <div class="ec-sec">翻译（各种词性）</div>
      <div class="ec-m">${esc(w.m)}</div>`;
    if (ex.e) {
      html += `<div class="ec-sec">例句</div><div class="ec-e">${esc(ex.e)}</div>`;
      if (ex.et) html += `<div class="ec-et">${esc(ex.et)}</div>`;
    }
    if (D.zs) {
      html += `<div class="ec-sec">考研真题句</div><div class="ec-zs">${esc(D.zs)}</div>`;
      if (D.zsm) html += `<div class="ec-et">${esc(D.zsm)}</div>`;
    }
    if (D.phr && D.phr.length) {
      html += `<div class="ec-sec">词组搭配</div>` + D.phr.map((p) => `<div class="ec-phr"><b>${esc(p.p)}</b> — ${esc(p.m)}</div>`).join('');
    }
    html += `<button class="ec-cont" data-next>继续 →</button></div>`;
    host.innerHTML = html;
    host.querySelector('[data-next]').onclick = () => startDrill(round, host);
  }
  function startUltimate(host) {
    host = host || $('#drillArea');
    const pool = store.words.ultimate;
    if (!pool.length) { host.innerHTML = `<div class="empty"><div class="e-cat">💎</div>终极强化单词池已清空！全部拿下啦 🎉</div>`; return; }
    const idx = pool[Math.floor(Math.random() * pool.length)];
    const w = EN_WORDS[idx];
    host.innerHTML = `
      <div class="drill-card ult">
        <div class="dc-h">💎 终极强化 · 共 ${pool.length} 词</div>
        <div class="dc-sub">根据完整中文释义，拼写英文单词</div>
        <div class="dc-m">${esc(w.m)}</div>
        <input class="ult-input" data-ult-inp placeholder="输入英文拼写…" autocomplete="off" spellcheck="false">
        <button class="ult-check" data-ult-chk>检查</button>
        <div class="ult-fb hidden" data-ult-fb></div>
        <button class="dc-act cont hidden" data-next>下一个 →</button>
      </div>`;
    const inp = host.querySelector('[data-ult-inp]');
    const chk = host.querySelector('[data-ult-chk]');
    const fb = host.querySelector('[data-ult-fb]');
    const next = host.querySelector('[data-next]');
    const check = () => {
      if (inp.value.trim().toLowerCase() === w.w.toLowerCase()) {
        fb.textContent = '✅ 正确！已移出终极强化';
        fb.className = 'ult-fb ok'; fb.classList.remove('hidden');
        removeFromUltimate(idx); save();
        const ub = $('#ultimateBtn'); if (ub) ub.textContent = `💎 终极强化（${store.words.ultimate.length}）`;
      } else {
        fb.textContent = `❌ 正确答案：${w.w}（错误会再次随机出现）`;
        fb.className = 'ult-fb no'; fb.classList.remove('hidden');
      }
      next.classList.remove('hidden');
    };
    chk.onclick = check;
    inp.onkeydown = (e) => { if (e.key === 'Enter') check(); };
    inp.focus();
    next.onclick = () => startUltimate(host);
  }

  function showSentencePopup(el, en, zh) {
    let pop = $('#sentencePop');
    if (!pop) {
      pop = document.createElement('div');
      pop.id = 'sentencePop'; pop.className = 'sentence-pop hidden';
      document.body.appendChild(pop);
    }
    pop.innerHTML = `<div class="sp-en">${esc(en)}</div><div class="sp-zh">${esc(zh)}</div>`;
    pop.classList.remove('hidden');
    const r = el.getBoundingClientRect();
    pop.style.visibility = 'hidden';
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let top = r.bottom + 6, left = r.left;
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
    if (left < 8) left = 8;
    if (top + ph > window.innerHeight - 8) top = r.top - ph - 6;
    if (top < 8) top = 8;
    pop.style.top = top + 'px'; pop.style.left = left + 'px';
    pop.style.visibility = 'visible';
    clearTimeout(pop._t);
    pop._t = setTimeout(() => pop.classList.add('hidden'), 4500);
    pop.onclick = () => pop.classList.add('hidden');
  }
  function renderEnRead() {
    const host = $('#enRead');
    const t = todayStr();
    const n = store.mode === 'hard' ? 5 : 2;
    const list = dailyPick(EN_READINGS, n, 'enread' + t + store.mode);
    const readCount = day(t).en.readCount || 0;
    host.innerHTML = `
      <div class="hint">${store.mode === 'hard' ? '高强度版：今日 5 篇（英语一阅读真题）' : '轻松版：今日 2 篇（英语一阅读真题）'} · 点开查看原文 + 5 道四选一真题</div>
      <div class="sec-title">今日阅读（${list.length} 篇）<i>已精读 ${readCount} 篇</i></div>
      <div class="rl-list">
        ${list.map((r, i) => `<div class="item rl-item" data-ri="${i}">
          <div class="it-h"><span class="badge g">${esc(r.src)}</span></div>
          <div class="it-body">${esc(r.title)}</div>
          <div class="it-key">${r.questions.length} 道四选一真题 · 点击查看原文与解析 →</div>
        </div>`).join('')}
      </div>`;
    list.forEach((r, i) => {
      host.querySelector(`[data-ri="${i}"]`).onclick = () => {
        const ri = EN_READINGS.indexOf(r);
        const dEn = day(t).en;
        dEn.readDone = dEn.readDone || [];
        if (!dEn.readDone.includes(ri)) { dEn.readDone.push(ri); dEn.readCount = (dEn.readCount || 0) + 1; save(); }
        const qHTML = r.questions.map((q, qi) => `
          <div class="mb-qblk">
            <div class="mb-qt">${qi + 1}. ${esc(q.q)}</div>
            <div class="mb-opts">${q.options.map((o, j) => `<div class="mb-opt" data-q="${qi}" data-o="${j}">${esc(o)}</div>`).join('')}</div>
            <div class="mb-ansbox hidden" data-ansbox="${qi}"><div class="mb-ans"><b>答案：${'ABCD'[q.k]}</b><br>${esc(q.ans)}</div></div>
          </div>`).join('');
        const sentences = (typeof EN_READ_SENTENCES !== 'undefined' && EN_READ_SENTENCES[ri]) ? EN_READ_SENTENCES[ri] : [r.passage];
        const transArr = (typeof EN_READ_TRANS !== 'undefined' && EN_READ_TRANS[ri]) ? EN_READ_TRANS[ri] : [];
        const passageHTML = sentences.map((s, si) => `<span class="rs" data-si="${si}">${esc(s)} </span>`).join('');
        openModal('📖 ' + r.title, `
          <div class="mb-src">题源：${esc(r.src)} · ${esc(r.year || '')} ${esc(r.text || '')}</div>
          <div class="mb-sec">原文（点击任意句子看译文）</div>
          <div class="mb-pass rs-pass">${passageHTML}</div>
          <div class="mb-sec">真题题目（点击选项核对答案）</div>
          ${qHTML}
        `);
        const mask = document.getElementById('modalMask');
        if (mask) {
          mask.querySelectorAll('.rs').forEach((sp) => {
            sp.onclick = () => { const si = +sp.dataset.si; showSentencePopup(sp, sentences[si], transArr[si] || '（暂无译文）'); };
          });
          r.questions.forEach((q, qi) => {
            mask.querySelectorAll(`[data-q="${qi}"][data-o]`).forEach((optEl) => {
              optEl.onclick = () => {
                const j = +optEl.dataset.o;
                mask.querySelectorAll(`[data-q="${qi}"][data-o]`).forEach((e) => e.classList.remove('corr', 'wrong'));
                if (j === q.k) optEl.classList.add('corr');
                else { optEl.classList.add('wrong'); const corr = mask.querySelector(`[data-q="${qi}"][data-o="${q.k}"]`); if (corr) corr.classList.add('corr'); }
                const box = mask.querySelector(`[data-ansbox="${qi}"]`); if (box) box.classList.remove('hidden');
              };
            });
          });
        }
        renderEnRead();
      };
    });
  }
  function renderEnTrans() {
    const host = $('#enTrans');
    const t = todayStr();
    const mats = dailyPick(EN_TRANSLATIONS, 3, 'entrans' + t + store.mode);
    const exams = dailyPick(EN_TRANSLATE_EXAM, 3, 'entransE' + t + store.mode);
    host.innerHTML = `
      <div class="hint">每日 3 篇网络精翻材料 + 3 句英一翻译真题 · 点开查看全文 / 标准答案</div>
      <div class="sec-title">📚 每日精翻材料（3 篇）</div>
      <div class="rl-list">${mats.map((m, i) => `<div class="item rl-item" data-ti="${i}"><div class="it-h"><span class="badge g">${esc(m.src)}</span></div><div class="it-body">${esc(m.title)}</div><div class="it-key">点击查看全文与译文 →</div></div>`).join('')}</div>
      <div class="sec-title">📝 英一翻译真题（3 句 · 点击看标准答案）</div>
      <div class="rl-list">${exams.map((m, i) => `<div class="item rl-item exam" data-ei="${i}"><div class="it-h"><span class="badge p">${m.y} 英一翻译</span></div><div class="it-body">${esc(m.text.slice(0, 42))}${m.text.length > 42 ? '…' : ''}</div><div class="it-key">点击查看标准答案 →</div></div>`).join('')}</div>`;
    mats.forEach((m, i) => {
      host.querySelector(`[data-ti="${i}"]`).onclick = () => {
        openModal('✍ ' + m.title, `<div class="mb-src">${esc(m.src)}</div>
          <div class="mb-sec">原文</div><div class="mb-pass">${esc(m.text).replace(/\n/g, '<br>')}</div>
          <div class="mb-sec">参考译文</div><div class="mb-pass zh">${esc(m.zh).replace(/\n/g, '<br>')}</div>`);
      };
    });
    exams.forEach((m, i) => {
      host.querySelector(`[data-ei="${i}"]`).onclick = () => {
        openModal('📝 ' + m.y + ' 英一翻译真题', `
          <div class="mb-sec">原文</div><div class="mb-pass en">${esc(m.text).replace(/\n/g, '<br>')}</div>
          <div class="mb-sec">标准答案</div><div class="mb-pass zh">${esc(m.zh).replace(/\n/g, '<br>')}</div>`);
      };
    });
  }
  function renderEnWrite() {
    const host = $('#enWrite');
    const t = todayStr();
    const daily = dailyPick(EN_SENTENCES, 3, 'ensent' + t + store.mode);
    const cats = {};
    EN_SENTENCES.forEach((s) => { (cats[s.cat] = cats[s.cat] || []).push(s); });
    const themeHTML = Object.entries(cats).map(([c, arr]) => {
      const pick = dailyPick(arr, 1, 'ensent_' + c + t + store.mode)[0];
      return `<div class="acc"><div class="acc-h">${esc(c)}<span class="ar">▾</span></div><div class="acc-b"><div class="it-en">${esc(pick.en)}</div><div class="it-zh">${esc(pick.zh)}</div></div></div>`;
    }).join('');
    host.innerHTML = `
      <div class="hint">作文语句每日更新（今日精选 3 句，不重复）· 下方按主题每日轮换一句 · 长难句常驻可仿写</div>
      <div class="sec-title">今日精选句型</div>
      ${daily.map((s) => `<div class="item"><div class="it-en">${esc(s.en)}</div><div class="it-zh">${esc(s.zh)}</div></div>`).join('')}
      <div class="sec-title">优质句型（按主题分类 · 每日轮换）</div>
      ${themeHTML}
      <div class="sec-title">长难句拆解（仿写素材）</div>
      ${EN_LONG_SENTENCES.map((s) => `<div class="item"><div class="it-en">${esc(s.en)}</div><div class="it-zh">${esc(s.zh)}</div><div class="it-key">拆解：${esc(s.key)}<br><span style="opacity:.7">题源：${esc(s.src)}</span></div></div>`).join('')}`;
    bindAcc(host);
  }
  function renderEnZhenti() {
    const host = $('#enZhenti');
    const t = todayStr();
    const zhenN = store.mode === 'hard' ? 3 : 1;
    const list = dailyPick(EN_ZHENTI, zhenN, 'enzhen' + t + store.mode);
    host.innerHTML = `<div class="hint">真题库每日 ${zhenN} 篇 · 点开查看范文例文</div>
      <div class="rl-list">${list.map((e, i) => `<div class="item rl-item" data-zi="${i}"><div class="it-h"><span class="badge p">${e.y}</span></div><div class="it-body">${esc(e.t)}</div><div class="it-key">点击查看例文 →</div></div>`).join('')}</div>`;
    list.forEach((e, i) => {
      host.querySelector(`[data-zi="${i}"]`).onclick = () => {
        openModal('📝 ' + e.y + ' 真题范文', `<div class="mb-sec">题目</div><div class="mb-pass">${esc(e.t)}</div><div class="mb-sec">例文</div><div class="mb-pass en">${esc(e.essay).replace(/\n/g, '<br>')}</div>`);
      };
    });
  }

  /* ================= 4. 数学 ================= */
  function renderMath() {
    tabSwitch('math', { q: renderMathQ, f: renderMathFormulas, r: renderMathWrong });
  }
  function renderMathQ() {
    const host = $('#mathQ');
    const hard = store.mode === 'hard';
    const t = todayStr();
    const seed = 'math' + t + store.mode;
    const pick = hard
      ? [...dailyPick(MATH_GD, 3, seed + 'g'), ...dailyPick(MATH_XD, 3, seed + 'x'), ...dailyPick(MATH_GL, 3, seed + 'l')]
      : [dailyPick(MATH_GD, 1, seed + 'g')[0], dailyPick(MATH_XD, 1, seed + 'x')[0], dailyPick(MATH_GL, 1, seed + 'l')[0]];
    const typeName = (q) => MATH_GD.includes(q) ? '高数' : MATH_XD.includes(q) ? '线代' : '概率';
    host.innerHTML = `<div class="hint">${hard ? '高强度版：今日 3 高数 + 3 线代 + 3 概率' : '轻松版：今日各 1 题'} · 题源已标注，做完看解析</div>` +
      pick.map((q, i) => {
        const tn = typeName(q);
        const cls = tn === '高数' ? 'g' : tn === '线代' ? 'o' : 'p';
        return `<div class="item" data-mi="${i}">
          <div class="it-h"><span class="badge ${cls}">${tn}</span><span class="it-t">第 ${i + 1} 题</span></div>
          <div class="it-body">${esc(q.q)}</div>
          <div class="it-src">题源：${esc(q.src)}</div>
          <button class="ans-btn" data-a="show">显示答案与解析</button>
          <div class="ans-box hidden" data-ans>
            <div class="ans-l">答案</div><div class="ans-v">${esc(q.a)}</div>
            <div class="ans-l">解析</div><div class="ans-s">${esc(q.s)}</div>
            <div class="sb-btns" style="margin-top:8px">
              <button data-a="ok" style="background:linear-gradient(135deg,#43C9A0,#7FE0C0);color:#fff">我会了 ✓</button>
              <button data-a="wrong" style="background:rgba(255,123,146,.16);color:#E5476A">加入错题本</button>
            </div>
          </div>
        </div>`;
      }).join('');
    $$('#mathQ .item').forEach((el) => {
      const i = +el.dataset.mi; const q = pick[i];
      el.querySelector('[data-a="show"]').onclick = () => { el.querySelector('[data-ans]').classList.remove('hidden'); el.querySelector('[data-a="show"]').classList.add('hidden'); };
      el.querySelector('[data-a="ok"]').onclick = () => { bumpMath(q); toast('棒！已记录'); };
      el.querySelector('[data-a="wrong"]').onclick = () => { bumpMath(q); if (!store.mathWrong.find((x) => x.q === q.q)) { store.mathWrong.push({ q: q.q, a: q.a, s: q.s, src: q.src, type: typeName(q) }); save(); } toast('已加入错题本'); renderMathWrong(); };
    });
  }
  function bumpMath(q) {
    const d = day(todayStr()); d.math.qDone = (d.math.qDone || 0) + 1; save();
  }
  function renderMathFormulas() {
    const host = $('#mathF');
    const hard = store.mode === 'hard';
    const t = todayStr();
    const per = hard ? 5 : 2;
    // 按学科归类全部公式条目
    const subjMap = { '高数': [], '线代': [], '概率': [] };
    MATH_FORMULAS.forEach((ch) => {
      const subj = ch.ch.startsWith('高数') ? '高数' : ch.ch.startsWith('线代') ? '线代' : ch.ch.startsWith('概率') ? '概率' : '高数';
      ch.items.forEach((it) => subjMap[subj].push({ ch: ch.ch, it }));
    });
    const seed = 'mathf' + t;
    const picks = {};
    ['高数', '线代', '概率'].forEach((s) => { picks[s] = dailyPick(subjMap[s], Math.min(per, subjMap[s].length), seed + s); });
    const itemHTML = (o) => `<li class="blur"><span class="fi-ch">${esc(o.ch)}</span><span class="fi-t">${esc(o.it)}</span></li>`;
    const subjHTML = (s) => `<div class="mf-subj"><div class="mf-sh">📐 ${s} · 今日 ${picks[s].length} 条</div><ul class="mf-list">${picks[s].map(itemHTML).join('')}</ul></div>`;
    host.innerHTML =
      `<div class="hint">公式回忆每日更新（${hard ? '高强度版：每科 5 条' : '轻松版：每科 2 条'}）· 点击条目可切换「遮盖 / 显示」对照记忆</div>` +
      ['高数', '线代', '概率'].map(subjHTML).join('');
    $$('#mathF .mf-list li').forEach((li) => { li.onclick = () => li.classList.toggle('blur'); });
  }
  function renderMathWrong() {
    const host = $('#mathR');
    if (!store.mathWrong.length) { host.innerHTML = `<div class="empty"><div class="e-cat">🌟</div>还没有错题，继续保持！</div>`; return; }
    host.innerHTML = `<div class="sec-title">我的错题本（${store.mathWrong.length}）</div>` + store.mathWrong.map((q, i) =>
      `<div class="item"><div class="it-h"><span class="badge r">${esc(q.type)}</span><span class="it-t">${esc(q.q)}</span></div>
       <div class="it-src">题源：${esc(q.src)}</div>
       <div class="it-key">答案：${esc(q.a)}<br>${esc(q.s)}</div>
       <button class="ans-btn" data-del="${i}" style="background:rgba(255,123,146,.12);color:#E5476A;margin-top:8px">移除该题</button></div>`).join('');
    $$('#mathR [data-del]').forEach((b) => b.onclick = () => { store.mathWrong.splice(+b.dataset.del, 1); save(); renderMathWrong(); });
  }

  /* ================= 5. 专业课 ================= */
  function renderMajor() {
    const easy = store.mode !== 'hard';
    // 轻松版隐藏选择题/简答题
    $$('[data-tabs="major"] .tab').forEach((t) => { if (t.dataset.t !== 'p') t.classList.toggle('hidden', easy); });
    tabSwitch('major', { p: easy ? renderMajorLight : renderMajorPoints, c: renderMajorChoice, s: renderMajorShort });
  }
  function icBooksHTML() {
    return '';
  }
  function majorFormulaHTML(focusCh) {
    const chHTML = (ch, open) => `<div class="acc ${open ? 'open' : ''}"><div class="acc-h">${esc(ch.ch)}<span class="ar">▾</span></div><div class="acc-b">${ch.items.map((it) => `<li class="blur">${esc(it)}</li>`).join('')}</div></div>`;
    if (!focusCh) return `<div class="acc-list">${IC_FORMULAS.map((ch) => chHTML(ch)).join('')}</div>`;
    const first = IC_FORMULAS.find((ch) => ch.ch === focusCh);
    const rest = IC_FORMULAS.filter((ch) => ch.ch !== focusCh);
    return `<div class="acc-list">${(first ? [first, ...rest] : rest).map((ch) => chHTML(ch, ch.ch === focusCh)).join('')}</div>`;
  }
  function bindMajorFormula(host) {
    bindAcc(host);
    $$('#majP .acc-b li').forEach((li) => li.onclick = () => li.classList.toggle('blur'));
  }
  function renderMajorLight() {
    const host = $('#majP');
    const t = todayStr();
    const seed = 'iclight' + t;
    const day3 = dailyPick(IC_LIGHT_POINTS, 3, seed);
    const focus = dailyPick(IC_FORMULAS, 1, 'icfocus' + t)[0];
    const focusCh = focus ? focus.ch : '';
    host.innerHTML = `<div class="hint">轻松版：每日 3 个数模电知识点，理解为主，无需做题 🐾</div>` +
      day3.map((p) => `<div class="item"><div class="it-h"><span class="badge g">${esc(p.tag)}</span></div><div class="it-body" style="font-weight:800">${esc(p.t)}</div><div class="it-zh">${esc(p.c)}</div></div>`).join('') +
      `<div class="hint">公式速记 · 今日聚焦「${esc(focusCh)}」· 每日轮换一章（点击下方章节可展开 / 收起）</div>` +
      `<div class="sec-title">公式速记 · 全部 ${IC_FORMULAS.length} 章</div>` +
      majorFormulaHTML(focusCh) +
      `<div class="hint">点击条目可切换「遮盖 / 显示」对照记忆。</div>`;
    bindMajorFormula(host);
  }
  function renderMajorPoints() {
    const host = $('#majP');
    const t = todayStr();
    const focus = dailyPick(IC_FORMULAS, 1, 'icfocus' + t)[0];
    const focusCh = focus ? focus.ch : '';
    host.innerHTML =
      `<div class="hint">公式速记 · 今日聚焦「${esc(focusCh)}」· 每日轮换一章（点击下方章节可展开 / 收起）</div>` +
      `<div class="sec-title">模电 · 数电 公式与知识点 · 全部 ${IC_FORMULAS.length} 章</div>` +
      majorFormulaHTML(focusCh) +
      `<div class="hint">点击条目切换遮盖 / 显示，配合默写效果更好。</div>`;
    bindMajorFormula(host);
  }
  function renderMajorChoice() {
    const host = $('#majC');
    const hard = store.mode === 'hard';
    if (!hard) { host.innerHTML = `<div class="empty"><div class="e-cat">🐱</div>当前为轻松版，不布置选择题。<br>切换到高强度版即可练习真题选择题。</div>`; return; }
    const t = todayStr();
    const seed = 'icc' + t;
    const qs = dailyPick(IC_CHOICE, 10, seed);
    host.innerHTML = `<div class="hint">高强度版：今日 10 道选择题（往年真题考点）</div>` + qs.map((q, i) => `
      <div class="item" data-ci="${i}">
        <div class="qmeta"><span>第 ${i + 1} 题</span><b>模电/数电</b></div>
        <div class="it-body">${esc(q.q)}</div>
        <div class="opts">
          ${q.o.map((o, j) => `<button class="opt" data-oj="${j}"><b>${'ABCD'[j]}</b><span>${esc(o)}</span></button>`).join('')}
        </div>
        <div class="ans-box hidden" data-cans>
          <div class="ans-l">正确答案</div><div class="ans-v">${'ABCD'[q.k]} · ${esc(q.o[q.k])}</div>
          <div class="ans-l">解析</div><div class="ans-s">${esc(q.s)}</div>
          <div class="it-src" style="margin-top:6px">题源：${esc(q.src)}</div>
          <button class="ans-btn" data-cwrong style="background:rgba(255,123,146,.12);color:#E5476A;margin-top:8px">记到错题本</button>
        </div>
      </div>`).join('');
    $$('#majC .item').forEach((el) => {
      const i = +el.dataset.ci; const q = qs[i];
      $$('.opt', el).forEach((ob) => ob.onclick = () => {
        const j = +ob.dataset.oj;
        $$('.opt', el).forEach((x) => x.classList.remove('right', 'wrong'));
        ob.classList.add(j === q.k ? 'right' : 'wrong');
        if (j === q.k) $$('.opt', el)[q.k].classList.add('right');
        el.querySelector('[data-cans]').classList.remove('hidden');
        bumpMajor();
      });
      el.querySelector('[data-cwrong]').onclick = () => {
        if (!store.majorWrong.find((x) => x.q === q.q)) { store.majorWrong.push({ q: q.q, o: q.o, k: q.k, s: q.s, src: q.src }); save(); }
        toast('已记入错题本');
      };
    });
  }
  function bumpMajor() { const d = day(todayStr()); d.major.qDone = (d.major.qDone || 0) + 1; save(); }
  function renderMajorShort() {
    const host = $('#majS');
    const hard = store.mode === 'hard';
    if (!hard) { host.innerHTML = `<div class="empty"><div class="e-cat">🐱</div>当前为轻松版，不布置简答题。</div>`; return; }
    const t = todayStr();
    const qs = dailyPick(IC_SHORT, 3, 'ics' + t);
    host.innerHTML = `<div class="hint">高强度版：今日 3 道简答题（往年真题考点）</div>` +
      qs.map((q, i) => `<div class="acc"><div class="acc-h">Q${i + 1}：${esc(q.q)}<span class="ar">▾</span></div><div class="acc-b"><div class="it-zh" style="font-weight:600">${esc(q.a)}</div><div class="it-src" style="margin-top:7px">题源：${esc(q.src)}</div></div></div>`).join('');
    bindAcc(host);
  }

  /* ================= 6. 生活 ================= */
  /* ============ 生活页：日期切换 + 日历 ============ */
  function shiftDay(ds, n) { const d = new Date(ds + 'T00:00:00'); d.setDate(d.getDate() + n); return dateKey(d); }
  function calGrid(y, m, markFn) {
    const fd = new Date(y, m, 1).getDay();
    const dim = new Date(y, m + 1, 0).getDate();
    let cells = '';
    for (let i = 0; i < fd; i++) cells += '<span class="cal-cell empty"></span>';
    for (let d = 1; d <= dim; d++) {
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const mk = markFn ? markFn(ds) : '';
      cells += `<span class="cal-cell ${mk}" data-ds="${ds}">${d}</span>`;
    }
    return cells;
  }
  function calShellHTML(y, m, markFn, kind) {
    const names = ['日', '一', '二', '三', '四', '五', '六'];
    const dow = names.map((n) => `<span class="cal-dow">${n}</span>`).join('');
    const now = new Date();
    const isCur = (y === now.getFullYear() && m === now.getMonth());
    const back = isCur ? '' : `<button class="cal-today" data-calback="${kind}">本月</button>`;
    return `<div class="cal-head"><button class="cal-arrow" data-cal="${kind}" data-d="-1">◀</button><span class="cal-ym" data-calym="${kind}">${y}年${m + 1}月</span><button class="cal-arrow" data-cal="${kind}" data-d="1">▶</button>${back}</div><div class="cal-dows">${dow}</div><div class="cal-grid">${calGrid(y, m, markFn)}</div>`;
  }
  // 独立迷你日历（不依赖全局状态），用于"停止重复-按日期"选终止日
  function miniCal(y, m, markFn, selDs) {
    const names = ['日', '一', '二', '三', '四', '五', '六'];
    const fd = new Date(y, m, 1).getDay();
    const dim = new Date(y, m + 1, 0).getDate();
    const dow = names.map((n) => `<span class="cal-dow">${n}</span>`).join('');
    let cells = '';
    for (let i = 0; i < fd; i++) cells += '<span class="cal-cell empty"></span>';
    for (let d = 1; d <= dim; d++) {
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const mk = markFn ? markFn(ds) : '';
      cells += `<span class="cal-cell mc-cell ${mk} ${selDs === ds ? 'on-sel' : ''}" data-ds="${ds}">${d}</span>`;
    }
    return `<div class="cal-head"><button class="cal-arrow" data-mc="-1">◀</button><span class="cal-ym">${y}年${m + 1}月</span><button class="cal-arrow" data-mc="1">▶</button></div><div class="cal-dows">${dow}</div><div class="cal-grid mc-grid">${cells}</div>`;
  }
  function bindSwipe(el, onLeft, onRight) {
    if (!el) return;
    let sx = 0, sy = 0, t0 = 0;
    el.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; t0 = Date.now(); }, { passive: true });
    el.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0]; const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) && Date.now() - t0 < 800) { if (dx < 0) onLeft(); else onRight(); }
    }, { passive: true });
  }
  function wireCal(host, kind, rerender) {
    host.querySelectorAll(`.cal-arrow[data-cal="${kind}"]`).forEach((b) => b.onclick = () => {
      const d = +b.dataset.d;
      if (kind === 'period') periodCalYM += d; else if (kind === 'bowel') bowelCalYM += d; else pickCalYM += d;
      rerender();
    });
    host.querySelectorAll(`.cal-today[data-calback="${kind}"]`).forEach((b) => b.onclick = () => {
      const cur = new Date();
      if (kind === 'period') periodCalYM = cur.getFullYear() * 12 + cur.getMonth();
      else if (kind === 'bowel') bowelCalYM = cur.getFullYear() * 12 + cur.getMonth();
      else pickCalYM = cur.getFullYear() * 12 + cur.getMonth();
      rerender();
    });
    host.querySelectorAll(`.cal-ym[data-calym="${kind}"]`).forEach((b) => b.onclick = () => {
      const ym = kind === 'period' ? periodCalYM : kind === 'bowel' ? bowelCalYM : pickCalYM;
      const cy = Math.floor(ym / 12), cm = ym % 12;
      openDatePicker(`${cy}-${String(cm + 1).padStart(2, '0')}-01`, (ds) => {
        const yy = +ds.split('-')[0], mm = +ds.split('-')[1] - 1;
        if (kind === 'period') periodCalYM = yy * 12 + mm;
        else if (kind === 'bowel') bowelCalYM = yy * 12 + mm;
        else pickCalYM = yy * 12 + mm;
        rerender();
      });
    });
    bindSwipe(host.querySelector('.cal-grid'),
      () => { if (kind === 'period') periodCalYM++; else if (kind === 'bowel') bowelCalYM++; else pickCalYM++; rerender(); },
      () => { if (kind === 'period') periodCalYM--; else if (kind === 'bowel') bowelCalYM--; else pickCalYM--; rerender(); });
  }
  function isPeriodDay(ds) {
    return store.periods.some((p) => ds >= p.start && (p.end ? ds <= p.end : ds <= todayStr()));
  }
  function openDatePicker(initDS, onPick) {
    const [iy, im] = initDS.split('-').map(Number);
    pickCalYM = iy * 12 + (im - 1);
    openModal('📅 选择日期', `<div id="pickCal"></div><div class="hint">拖动日历或点箭头切换月份，点日期查看 / 修改那天的数据</div>`);
    const render = () => {
      const y = Math.floor(pickCalYM / 12), m = pickCalYM % 12;
      const mark = (ds) => ds === todayStr() ? 'today' : '';
      const host = $('#pickCal');
      host.innerHTML = calShellHTML(y, m, mark, 'pick');
      wireCal(host, 'pick', render);
      host.querySelectorAll('.cal-cell[data-ds]').forEach((c) => c.onclick = () => {
        onPick(c.dataset.ds);
        const mask = $('#modalMask'); if (mask) mask.classList.add('hidden');
      });
    };
    render();
  }
  function yearWeeks(Y) {
    const jan1 = new Date(Y, 0, 1);
    let d = new Date(jan1);
    const back = d.getDay() === 0 ? 6 : d.getDay() - 1;
    d.setDate(d.getDate() - back);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const out = [];
    while (true) {
      const k = weekKey(d);
      if (k.startsWith(Y + ' 第')) {
        if (d > today) break;            // 不显示尚未到达的周
        out.push(new Date(d));
      } else if (d.getFullYear() > Y) break;
      d = addDays(d, 7);
      if (out.length > 60) break;
    }
    return out;
  }
  function openWeekPicker() {
    const initY = weekViewAnchor ? weekViewAnchor.getFullYear() : new Date().getFullYear();
    let y = initY;
    openModal('📅 选择周', `<div id="wkPick"><div class="yp-head"><button class="cal-arrow" data-yp="-1">◀</button><span class="yp-y">${y}</span><button class="cal-arrow" data-yp="1">▶</button></div><div class="wk-grid" id="wkGrid"></div></div>`);
    const render = () => {
      const host = $('#wkGrid');
      const mondays = yearWeeks(y);
      const curK = weekKey(weekViewAnchor || new Date());
      host.innerHTML = mondays.map((d) => {
        const k = weekKey(d);
        const on = k === curK;
        return `<button class="wk-cell ${on ? 'on' : ''}" data-wk="${dateKey(d)}">${k.replace(y + ' ', '')}</button>`;
      }).join('');
      host.querySelectorAll('.wk-cell').forEach((b) => b.onclick = () => {
        weekViewAnchor = new Date(b.dataset.wk + 'T00:00:00');
        const mask = $('#modalMask'); if (mask) mask.classList.add('hidden');
        renderWeek();
      });
    };
    render();
    const head = $('#wkPick');
    head.querySelector('[data-yp="-1"]').onclick = () => { y--; head.querySelector('.yp-y').textContent = y; render(); };
    head.querySelector('[data-yp="1"]').onclick = () => { y++; head.querySelector('.yp-y').textContent = y; render(); };
  }
  function openMonthPicker() {
    const initY = monthViewAnchor ? monthViewAnchor.getFullYear() : new Date().getFullYear();
    let y = initY;
    openModal('📅 选择月', `<div id="moPick"><div class="yp-head"><button class="cal-arrow" data-yp="-1">◀</button><span class="yp-y">${y}</span><button class="cal-arrow" data-yp="1">▶</button></div><div class="mo-grid" id="moGrid"></div></div>`);
    const render = () => {
      const host = $('#moGrid');
      const cur = new Date();
      const maxM = (y === cur.getFullYear()) ? cur.getMonth() + 1 : 12;
      const onK = monthKey(monthViewAnchor || new Date());
      host.innerHTML = Array.from({ length: maxM }, (_, i) => {
        const m = i + 1; const k = y + '年' + m + '月'; const on = k === onK;
        return `<button class="mo-cell ${on ? 'on' : ''}" data-m="${m}">${m}月</button>`;
      }).join('');
      host.querySelectorAll('.mo-cell').forEach((b) => b.onclick = () => {
        monthViewAnchor = new Date(y, (+b.dataset.m) - 1, 15);
        const mask = $('#modalMask'); if (mask) mask.classList.add('hidden');
        renderMonth();
      });
    };
    render();
    const head = $('#moPick');
    head.querySelector('[data-yp="-1"]').onclick = () => { y--; head.querySelector('.yp-y').textContent = y; render(); };
    head.querySelector('[data-yp="1"]').onclick = () => { y++; head.querySelector('.yp-y').textContent = y; render(); };
  }
  function renderLife() {
    const t = todayStr();
    const vd = lifeViewDate;
    const vdObj = new Date(vd + 'T00:00:00');
    const wd = '周' + '日一二三四五六'[vdObj.getDay()];
    const ld = $('#lifeDate');
    ld.innerHTML = `<button class="ld-arrow" data-ld="prev">◀</button><span class="ld-text" data-ldpick>${vd.slice(5).replace('-', '/')} ${wd}${vd === t ? ' · 今天' : ''}</span><button class="ld-arrow" data-ld="next">▶</button>${vd === t ? '' : '<button class="ld-today" data-ld="today">回到今日</button>'}`;
    ld.querySelector('[data-ld="prev"]').onclick = () => { lifeViewDate = shiftDay(vd, -1); renderLife(); };
    ld.querySelector('[data-ld="next"]').onclick = () => { lifeViewDate = shiftDay(vd, 1); renderLife(); };
    ld.querySelector('[data-ldpick]').onclick = () => openDatePicker(vd, (ds) => { lifeViewDate = ds; renderLife(); });
    const tdB = ld.querySelector('[data-ld="today"]'); if (tdB) tdB.onclick = () => { lifeViewDate = t; renderLife(); };

    const L = lifeDay(vd);
    const wt = $('#wakeTime'), st = $('#sleepTime');
    wt.value = L.wake || ''; st.value = L.sleep || '';
    const recalc = () => {
      L.wake = wt.value; L.sleep = st.value; save();
      if (L.wake && L.sleep) {
        const [wh, wm] = L.wake.split(':').map(Number);
        const [sh, sm] = L.sleep.split(':').map(Number);
        let mins = (wh * 60 + wm) - (sh * 60 + sm);
        if (mins <= 0) mins += 24 * 60;       // 跨零点
        const h = Math.floor(mins / 60), mm = mins % 60;
        $('#sleepRes').textContent = `睡眠时长约 ${h} 小时 ${mm} 分 😴`;
      } else $('#sleepRes').textContent = '填写后自动计算睡眠时长';
    };
    wt.onchange = recalc; st.onchange = recalc; recalc();

    // 三餐 & 运动
    const meals = [['bf', '🍳 早餐'], ['lunch', '🍱 午餐'], ['dinner', '🍲 晚餐'], ['exercise', '🏃 运动']];
    $('#mealGrid').innerHTML = meals.map(([k, label]) =>
      `<button class="tg ${L.meals[k] ? 'on' : ''}" data-meal="${k}">${label}</button>`).join('');
    $$('#mealGrid .tg').forEach((b) => b.onclick = () => { const k = b.dataset.meal; L.meals[k] = !L.meals[k]; save(); renderLife(); });

    // 饮水
    $('#waterN').textContent = L.water + ' 杯';
    let cups = '';
    for (let i = 0; i < 8; i++) cups += `<button class="wcup ${i < L.water ? 'on' : ''}" data-cup="${i + 1}">💧</button>`;
    $('#waterRow').innerHTML = cups;
    $$('#waterRow .wcup').forEach((b) => b.onclick = () => { L.water = +b.dataset.cup; save(); renderLife(); });

    // 经期（含日历）
    renderPeriod();

    // 大便日历（任意日期可标记：点空白=记录，点已记录=删除）
    {
      const ym = bowelCalYM, y = Math.floor(ym / 12), m = ym % 12;
      const mark = (ds) => { const x = store.life[ds]; return (x && x.bowel) ? 'bowel-on' : ''; };
      const host = $('#bowelRow');
      host.innerHTML = calShellHTML(y, m, mark, 'bowel');
      host.querySelectorAll('.cal-cell[data-ds]').forEach((c) => c.onclick = () => {
        const ds = c.dataset.ds;
        const LD = lifeDay(ds); LD.bowel = !LD.bowel; save(); renderLife();
      });
      wireCal(host, 'bowel', () => renderLife());
    }
    // 今日大便快捷按钮
    {
      const bq = $('#bowelQuick');
      if (bq) { bq.classList.toggle('on', !!(lifeDay(t).bowel)); bq.onclick = () => { const L = lifeDay(t); L.bowel = !L.bowel; save(); renderLife(); }; }
    }

    // 心情
    const moods = [['😀', '开心'], ['😌', '平静'], ['😟', '焦虑'], ['😴', '疲惫'], ['🤩', '充实'], ['😤', '烦躁']];
    $('#moodRow').innerHTML = moods.map(([e, l]) => `<button class="mood ${L.mood === e ? 'on' : ''}" data-mood="${e}" title="${l}">${e}</button>`).join('');
    $$('#moodRow .mood').forEach((b) => b.onclick = () => { L.mood = b.dataset.mood; save(); renderLife(); });
    const note = $('#lifeNote'); note.value = L.note || ''; note.oninput = () => { L.note = note.value; save(); };

    // 本周作息（最近 7 个自然日）
    let rows = '';
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(); dt.setDate(dt.getDate() - i); const k = dateKey(dt);
      const x = store.life[k]; let mins = 0;
      if (x && x.wake && x.sleep) { let a = (x.wake.split(':').map(Number)[0] * 60 + x.wake.split(':').map(Number)[1]) - (x.sleep.split(':').map(Number)[0] * 60 + x.sleep.split(':').map(Number)[1]); if (a <= 0) a += 1440; mins = a; }
      rows += `<div class="ws-row"><span class="ws-d">${'日一二三四五六'[dt.getDay()]}</span><div class="ws-bar"><i style="width:${clamp(mins / 600 * 100, 0, 100)}%"></i></div><span class="ws-v">${mins ? (Math.floor(mins / 60) + 'h' + (mins % 60) + 'm') : '—'}</span></div>`;
    }
    $('#weekSleep').innerHTML = rows;
  }
  function renderPeriod() {
    const t = todayStr();
    let open = store.periods.find((p) => !p.end);
    const info = $('#periodInfo');
    if (open) {
      const days = dayDiff(open.start, t) + 1;
      info.innerHTML = `🌸 经期进行中：第 <b>${days}</b> 天（始于 ${open.start}）<br>多喝温水、注意保暖，记录结束点完成本次周期。`;
    } else {
      const last = store.periods.filter((p) => p.end).slice(-1)[0];
      if (last) {
        const len = dayDiff(last.start, last.end) + 1;
        const since = dayDiff(last.end, t);
        info.innerHTML = `上次经期 ${len} 天（${last.start} ~ ${last.end}）<br>距上次结束已 <b>${since}</b> 天。点击「记录经期开始」开启新一轮。`;
      } else info.innerHTML = '点击下方按钮记录经期开始。';
    }
    $('#pStart').onclick = () => { if (open) { toast('已在进行中'); return; } store.periods.push({ start: t, end: null }); save(); renderLife(); };
    $('#pEnd').onclick = () => { if (!open) { toast('请先记录开始'); return; } open.end = t; save(); renderLife(); };
    // 经期日期列表已按需求移除（日期只在日历上用粉色标注体现，避免与日历重复）
    // 经期日历（粉色标注 + 左右滑动看其他月 + 点格子编辑）
    const ym = periodCalYM, y = Math.floor(ym / 12), m = ym % 12;
    const mark = (ds) => isPeriodDay(ds) ? 'pink' : '';
    const host = $('#periodCal');
    host.innerHTML = calShellHTML(y, m, mark, 'period');
    wireCal(host, 'period', () => renderLife());
    host.querySelectorAll('.cal-cell[data-ds]').forEach((c) => c.onclick = () => periodCellClick(c.dataset.ds));
  }
  // 经期日历交互：①改结束日 ②新增 ③删开始日
  function periodCellClick(ds) {
    if (periodEdit && periodEdit.mode === 'end') {           // ① 续：设新结束日
      if (ds > periodEdit.per.start) { periodEdit.per.end = ds; periodEdit = null; save(); toast('已更新结束日'); }
      else toast('结束日需晚于开始日');
      renderLife(); return;
    }
    if (periodEdit && periodEdit.mode === 'new') {           // ② 续：设结束日 / 重选 / 取消
      if (ds === periodEdit.start) { periodEdit = null; toast('已取消'); renderLife(); return; }
      if (ds > periodEdit.start) { store.periods.push({ start: periodEdit.start, end: ds }); periodEdit = null; save(); toast('已新增经期'); }
      else { periodEdit.start = ds; toast('已重选开始日，再点选结束日'); }
      renderLife(); return;
    }
    const isP = isPeriodDay(ds);
    if (isP) {
      const per = store.periods.find((p) => ds >= p.start && (p.end ? ds <= p.end : ds >= p.start));
      if (!per) { renderLife(); return; }
      if (per.end && ds === per.end) {                       // ① 点结束日→缩短到第一天，待选新结束日
        per.end = per.start; save(); periodEdit = { mode: 'end', per };
        toast('已缩短至第一天，再点选新的结束日'); renderLife(); return;
      }
      if (ds === per.start) {                                // ③ 点开始日→删除
        store.periods = store.periods.filter((x) => x !== per); save(); periodEdit = null; toast('已删除该经期'); renderLife(); return;
      }
      toast('经期中间日期不可直接修改：点结束日可改结束日，点开始日可删除'); renderLife(); return;
    }
    periodEdit = { mode: 'new', start: ds };                 // 空闲非经期→选开始日
    toast('已选开始日 ' + ds + '，再点选结束日（再点此日取消）'); renderLife();
  }

  /* ================= 7/8. 复盘 ================= */
  const WEEK_FIELDS = [
    { k: 'work', em: '📌', l: '本周工作总结' },
    { k: 'study', em: '📚', l: '学习进度' },
    { k: 'life', em: '🌿', l: '生活统计' },
    { k: 'prob', em: '⚠', l: '存在问题' },
    { k: 'fix', em: '💡', l: '下周改进计划' },
    { k: 'goal', em: '🎯', l: '下周核心目标' },
  ];
  const MONTH_FIELDS = [
    { k: 'result', em: '🏆', l: '月度工作成果' },
    { k: 'skill', em: '🛠', l: '技能学习进度' },
    { k: 'grow', em: '🌟', l: '个人成长亮点' },
    { k: 'lack', em: '📉', l: '月度不足' },
    { k: 'period', em: '🌸', l: '经期统计' },
    { k: 'plan', em: '🗺', l: '下月规划与目标' },
  ];
  function renderWeek() {
    const now = new Date();
    const anchor = weekViewAnchor || now;
    const k = weekKey(anchor);
    const curK = weekKey(now);
    const isCur = k === curK;
    const ttl = $('#weekTitle');
    ttl.innerHTML = `<button class="rv-arrow" data-rv="wprev">◀</button><span class="rv-ttxt" data-rvpick>${k}</span><button class="rv-arrow" data-rv="wnext">▶</button>${isCur ? '' : '<button class="rv-today" data-rv="wtoday">本周</button>'}`;
    ttl.querySelector('[data-rv="wprev"]').onclick = () => { weekViewAnchor = addDays(weekViewAnchor || now, -7); renderWeek(); };
    ttl.querySelector('[data-rv="wnext"]').onclick = () => {
      const nd = addDays(weekViewAnchor || now, 7);
      weekViewAnchor = (weekKey(nd) === curK) ? null : ((dateKey(nd) > todayStr()) ? null : nd);
      renderWeek();
    };
    ttl.querySelector('[data-rvpick]').onclick = () => openWeekPicker();
    const wtB = ttl.querySelector('[data-rv="wtoday"]'); if (wtB) wtB.onclick = () => { weekViewAnchor = null; renderWeek(); };
    tabSwitch('wkrv', { auto: () => renderWeekAuto(anchor), manual: () => renderReview('week', anchor) });
  }
  function renderMonth() {
    const now = new Date();
    const anchor = monthViewAnchor || now;
    const k = monthKey(anchor);
    const curK = monthKey(now);
    const isCur = k === curK;
    const ttl = $('#monthTitle');
    ttl.innerHTML = `<button class="rv-arrow" data-rv="mprev">◀</button><span class="rv-ttxt" data-rvpick>${k}</span><button class="rv-arrow" data-rv="mnext">▶</button>${isCur ? '' : '<button class="rv-today" data-rv="mtoday">本月</button>'}`;
    ttl.querySelector('[data-rv="mprev"]').onclick = () => { monthViewAnchor = addMonths(monthViewAnchor || now, -1); renderMonth(); };
    ttl.querySelector('[data-rv="mnext"]').onclick = () => {
      const nd = addMonths(monthViewAnchor || now, 1);
      monthViewAnchor = (monthKey(nd) === curK) ? null : nd;
      renderMonth();
    };
    ttl.querySelector('[data-rvpick]').onclick = () => openMonthPicker();
    const mtB = ttl.querySelector('[data-rv="mtoday"]'); if (mtB) mtB.onclick = () => { monthViewAnchor = null; renderMonth(); };
    tabSwitch('monrv', { auto: () => renderMonthAuto(anchor), manual: () => renderReview('month', anchor) });
  }

  // —— 日期范围与数据聚合（供自动复盘使用）——
  // 周范围：以 base 所在周的周一为起点共 7 天；clampToday=true 时只到今天（不把未来日期算进统计）
  function weekDates(base, clampToday) {
    const d = base ? new Date(base) : new Date();
    const dow = d.getDay(); const diff = (dow === 0 ? 6 : dow - 1);
    const mon = new Date(d); mon.setDate(d.getDate() - diff);
    const today = todayStr();
    const out = [];
    for (let i = 0; i < 7; i++) {
      const x = new Date(mon); x.setDate(mon.getDate() + i);
      const k = dateKey(x);
      if (clampToday && k > today) break;
      out.push(k);
    }
    return out;
  }
  function rangeDates(kind, anchor) {
    const d = anchor ? new Date(anchor) : new Date();
    if (kind === 'week') return weekDates(d, true);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const isCurMonth = (d.getFullYear() === new Date().getFullYear() && d.getMonth() === new Date().getMonth());
    const end = isCurMonth ? new Date() : new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const out = [];
    for (let x = new Date(start); x <= end; x.setDate(x.getDate() + 1)) out.push(dateKey(new Date(x)));
    return out;
  }
  // 某天的计划统计：必须用 effTasks（含定时/重复模板实例），否则模板任务永远统计为 0/0
  function planStats(ds) {
    const list = effTasks(ds);
    return { total: list.length, done: list.filter((x) => x.done).length };
  }
  // 某天是否算「有学习」：有英语（背词/阅读精读）、数学、专业课任一记录才算
  function studiedOn(ds) {
    const d = store.dailyStudy[ds]; if (!d) return false;
    const en = d.en || {}, mt = d.math || {}, mj = d.major || {};
    return !!(en.wordCount || en.readCount || mt.qDone || mj.qDone);
  }
  function countPeriodDays(dates) {
    if (!store.periods.length) return 0;
    let n = 0;
    dates.forEach((k) => { if (store.periods.some((p) => p.start <= k && (!p.end || p.end >= k))) n++; });
    return n;
  }
  function countCycles(dates) {
    if (!store.periods.length) return 0;
    const first = dates[0], last = dates[dates.length - 1];
    return store.periods.filter((p) => p.start <= last && (!p.end || p.end >= first)).length;
  }
  function aggregate(dates) {
    let words = 0, math = 0, major = 0, readCount = 0, studyDays = 0, checkinDays = 0;
    let exerciseDays = 0, waterSum = 0, waterDays = 0, sleepSum = 0, sleepDays = 0, bowel = 0;
    let planDone = 0, planTotal = 0;
    const noStudy = [];   // 没有任何学习记录的日期
    dates.forEach((k) => {
      const ds = store.dailyStudy[k];
      if (ds) {
        const w = (ds.en && ds.en.wordCount) || 0, m = (ds.math && ds.math.qDone) || 0, ma = (ds.major && ds.major.qDone) || 0;
        words += w; math += m; major += ma; readCount += (ds.en && ds.en.readCount) || 0;
      }
      if (studiedOn(k)) studyDays++; else noStudy.push(k);
      if (store.checkins[k]) checkinDays++;
      const lf = store.life[k];
      if (lf) {
        if (lf.meals && lf.meals.exercise) exerciseDays++;
        waterSum += lf.water || 0; if (lf.water) waterDays++;
        if (lf.wake && lf.sleep) {
          let a = (lf.wake.split(':').map(Number)[0] * 60 + lf.wake.split(':').map(Number)[1]) - (lf.sleep.split(':').map(Number)[0] * 60 + lf.sleep.split(':').map(Number)[1]);
          if (a <= 0) a += 1440; sleepSum += a; sleepDays++;
        }
        bowel += lf.bowel || 0;
      }
      const ps = planStats(k);            // 含直接任务 + 定时/重复模板实例
      planTotal += ps.total; planDone += ps.done;
    });
    return { words, math, major, readCount, studyDays, checkinDays, exerciseDays,
      avgWater: waterDays ? (waterSum / waterDays).toFixed(1) : '—',
      avgSleep: sleepDays ? (sleepSum / sleepDays / 60).toFixed(1) : '—',
      bowel, planDone, planTotal, noStudy, noStudyDays: noStudy.length,
      periodDays: countPeriodDays(dates), days: dates.length,
      cycleCount: countCycles(dates) };
  }
  function genWeekAuto(anchor) {
    const dates = rangeDates('week', anchor);
    const a = aggregate(dates);
    const missC = a.days - a.checkinDays, gap = a.noStudyDays;
    const probs = [];
    if (missC > 0) probs.push(`有 ${missC} 天未打卡，建议坚持每日打卡保持连续状态`);
    if (gap > 0) probs.push(`有 ${gap} 天没有学习记录（${a.noStudy.slice(-5).map((k) => k.slice(5).replace('-', '/')).join('、')}），注意学习的连贯性`);
    if (!probs.length) probs.push('整体保持良好，学习节奏稳定，继续保持 💪');
    // 下周计划总数（下周一~周日，含未来日期，按模板与直接任务计算）
    const nwDates = weekDates(addDays(anchor ? new Date(anchor) : new Date(), 7), false);
    let nwTotal = 0; nwDates.forEach((k) => { nwTotal += planStats(k).total; });
    return {
      work: `本周（${dates[0]} ~ ${dates[dates.length - 1]}）共学习 ${a.studyDays} 天、打卡 ${a.checkinDays} 天，完成计划 ${a.planDone}/${a.planTotal} 项。`,
      study: `累计背词 ${a.words} 个、数学作答 ${a.math} 题、专业课题 ${a.major} 题、阅读精读 ${a.readCount} 篇。`,
      life: `运动 ${a.exerciseDays} 天、平均饮水 ${a.avgWater} 杯、平均睡眠 ${a.avgSleep} 小时、大便 ${a.bowel} 次、经期 ${a.periodDays} 天。`,
      prob: probs.join('；') + '。',
      fix: `① 保持每日打卡；② 针对薄弱项增加专项训练；③ 规律作息，保证约 ${a.avgSleep !== '—' ? a.avgSleep : '7.5'} 小时睡眠。`,
      goal: `完成本周未完成计划 ${Math.max(0, a.planTotal - a.planDone)} 项；完成下周计划 ${nwTotal} 项；每日背词≥目标，数学 / 专业课保持题量，阅读不中断。`,
    };
  }
  function genMonthAuto(anchor) {
    const dates = rangeDates('month', anchor);
    const a = aggregate(dates);
    const missC = a.days - a.checkinDays, gap = a.noStudyDays;
    const probs = [];
    if (missC > 0) probs.push(`当月有 ${missC} 天未打卡`);
    if (gap > 0) probs.push(`有 ${gap} 天没有学习记录（${a.noStudy.slice(-6).map((k) => k.slice(5).replace('-', '/')).join('、')}）`);
    if (!probs.length) probs.push('当月学习节奏稳定，值得肯定 🌟');
    let wTotal = 0, mTotal = 0, majTotal = 0;
    Object.values(store.dailyStudy).forEach((x) => { wTotal += (x.en && x.en.wordCount) || 0; mTotal += (x.math && x.math.qDone) || 0; majTotal += (x.major && x.major.qDone) || 0; });
    const checkinN = Object.keys(store.checkins).length;
    const streak = calcStreak();
    return {
      result: `本月共学习 ${a.studyDays} 天、打卡 ${a.checkinDays} 天；累计背词 ${a.words} 个、数学习题 ${a.math} 题、专业课题 ${a.major} 题、阅读精读 ${a.readCount} 篇。`,
      skill: `本月新增背词 ${a.words} 个（累计 ${wTotal} 个）、数学练习 ${a.math} 题（累计 ${mTotal}）、专业课 ${a.major} 题（累计 ${majTotal}），公式回忆卡每日复习。`,
      grow: `连续打卡最长 ${streak.max} 天、当前连续 ${streak.cur} 天；累计打卡 ${checkinN} 天，长期成长轨迹持续累积。`,
      lack: probs.join('；') + '。',
      period: a.periodDays > 0 ? `本月经期共 ${a.periodDays} 天（${a.cycleCount} 个周期），注意规律作息与保暖。` : '本月暂无经期记录。',
      plan: `下月目标：保持每日打卡、背词进度稳步推进、数学与专业课题量不中断，针对本月薄弱项集中突破。`,
    };
  }
  function autoCardHTML(fields) {
    return `<div class="auto-card">
      <div class="auto-tip">🤖 软件已根据你在本工作台记录的数据，自动生成本期复盘（可一键保存到归档）</div>
      ${fields.map((f) => `<div class="rv-field"><div class="rv-lb"><em>${f.em}</em>${f.l}</div><div class="rv-v">${esc(f.v)}</div></div>`).join('')}
      <button class="rv-save" id="autoSave">保存为归档（自动复盘）</button>
    </div>`;
  }
  function renderWeekAuto(anchor) {
    const host = $('#weekAuto'); const k = weekKey(anchor); const a = genWeekAuto(anchor);
    const fields = WEEK_FIELDS.map((f) => ({ em: f.em, l: f.l, v: a[f.k] || '' }));
    host.innerHTML = `<div class="rv-title-inline">自动复盘 · ${k}${anchor ? '（历史周）' : ''}</div>` + autoCardHTML(fields);
    $('#autoSave').onclick = () => saveAuto('week', k, fields);
  }
  function renderMonthAuto(anchor) {
    const host = $('#monthAuto'); const k = monthKey(anchor); const a = genMonthAuto(anchor);
    const fields = MONTH_FIELDS.map((f) => ({ em: f.em, l: f.l, v: a[f.k] || '' }));
    host.innerHTML = `<div class="rv-title-inline">自动复盘 · ${k}${anchor ? '（历史月）' : ''}</div>` + autoCardHTML(fields);
    $('#autoSave').onclick = () => saveAuto('month', k, fields);
  }
  function saveAuto(type, k, fields) {
    const reviews = type === 'week' ? store.weekReviews : store.monthReviews;
    const data = {}; fields.forEach((f) => data[f.k] = f.v);
    const existing = reviews.find((r) => r.key === k && r.src === 'auto');
    if (existing) Object.assign(existing, data); else reviews.push({ id: uid(), key: k, date: todayStr(), src: 'auto', ...data });
    save(); toast(type === 'week' ? '自动复盘已保存到归档 🎉' : '自动月复盘已保存到归档 🎉');
  }

  function renderReview(type, anchor) {
    const isWeek = type === 'week';
    const fields = isWeek ? WEEK_FIELDS : MONTH_FIELDS;
    const reviews = isWeek ? store.weekReviews : store.monthReviews;
    const newBtn = isWeek ? $('#weekNew') : $('#monthNew');
    const editor = isWeek ? $('#weekEditor') : $('#monthEditor');
    const archive = isWeek ? $('#weekArchive') : $('#monthArchive');
    const k = isWeek ? weekKey(anchor) : monthKey(anchor);

    newBtn.onclick = () => {
      if (editor.classList.contains('hidden')) {
        editor.classList.remove('hidden');
        editor.innerHTML = `<div class="hint">手动填写本期复盘（${k}）</div>` + fields.map((f) =>
          `<div class="rv-field"><div class="rv-lb"><em>${f.em}</em>${f.l}</div><textarea data-f="${f.k}" placeholder="写下你的${f.l}…"></textarea></div>`).join('') +
          `<button class="rv-save" data-save>保存${isWeek ? '本周' : '本月'}复盘</button>`;
        editor.querySelector('[data-save]').onclick = () => {
          const data = {}; fields.forEach((f) => data[f.k] = editor.querySelector(`[data-f="${f.k}"]`).value.trim());
          const existing = reviews.find((r) => r.key === k);
          if (existing) Object.assign(existing, data); else reviews.push({ id: uid(), key: k, date: todayStr(), src: 'manual', ...data });
          save(); editor.classList.add('hidden'); renderReview(type, anchor); toast('已保存 🎉');
        };
      } else editor.classList.add('hidden');
    };

    const list = anchor ? reviews.filter((r) => r.key === k) : reviews;
    if (!list.length) { archive.innerHTML = `<div class="empty"><div class="e-cat">📝</div>${anchor ? '这一期还没有复盘记录，点上方按钮新建或去「自动复盘」生成' : '还没有复盘记录，可在「自动复盘」一键生成，或点上方按钮手动新建'}</div>`; return; }
    archive.innerHTML = list.slice().reverse().map((r) => {
      const body = fields.map((f) => r[f.k] ? `<div class="f"><div class="fl">${f.em} ${f.l}</div><div class="fv">${esc(r[f.k])}</div></div>` : '').join('');
      const srcTxt = r.src === 'auto' ? '自动' : '手动';
      return `<div class="arc" data-id="${r.id}"><div class="arc-h"><div class="arc-hl"><span class="arc-key">${r.key}</span><span class="src-tag ${r.src}">${srcTxt}</span></div><div class="ops"><button data-edit="${r.id}" title="编辑">✎</button><button data-del="${r.id}" title="删除">✕</button></div></div><div class="arc-b">${body}</div></div>`;
    }).join('');
    $$('#' + (isWeek ? 'week' : 'month') + 'Archive .arc').forEach((el) => {
      el.querySelector('.arc-h').onclick = (e) => { if (e.target.dataset.edit || e.target.dataset.del) return; el.classList.toggle('open'); };
      const id = el.dataset.id;
      const r = reviews.find((x) => x.id === id);
      el.querySelector('[data-del]').onclick = () => { if (confirm('确定删除该复盘？')) { if (isWeek) store.weekReviews = reviews.filter((x) => x.id !== id); else store.monthReviews = reviews.filter((x) => x.id !== id); save(); renderReview(type, anchor); } };
      el.querySelector('[data-edit]').onclick = () => {
        newBtn.click();
        setTimeout(() => fields.forEach((f) => { const ta = editor.querySelector(`[data-f="${f.k}"]`); if (ta) ta.value = r[f.k] || ''; }), 0);
      };
    });
  }
  function weekKey(d) {
    d = d || new Date();
    // 用「该周周四」所在年份作为周年，保证跨年首周归属正确（修复首周丢失）
    const thu = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const wd = thu.getDay();
    thu.setDate(thu.getDate() + (4 - (wd === 0 ? 7 : wd)));
    const onejan = new Date(thu.getFullYear(), 0, 1);
    const wk = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    return thu.getFullYear() + ' 第' + wk + '周';
  }
  function monthKey(d) { d = d || new Date(); return d.getFullYear() + '年' + (d.getMonth() + 1) + '月'; }

  /* ================= 9. 设置 ================= */
  function renderSetting() {
    const cards = [
      { id: 'easy', t: '前期轻松版', d: store.mode === 'easy' ? '当前' : '英语：背单词+作文语句；数学：各 1 题；专业课：知识点卡片（不布置题目）', on: store.mode === 'easy',
        full: '英语：每天背单词 / 积累作文语句 <b>数学：1 高数 + 1 线代 + 1 概率</b> <b>专业课：每天展示数模电知识点，无需做题</b>' },
      { id: 'hard', t: '高强度备考版', d: store.mode === 'hard' ? '当前' : '按完整要求：英语单词/阅读/作文；数学 3+3+3；专业课 10 选择 + 3 简答', on: store.mode === 'hard',
        full: '<b>英语一</b> 单词 + 阅读精翻 + 作文积累 <b>数学一</b> 每日 3 高数 + 3 线代 + 3 概率 <b>专业课</b> 每日 10 选择 + 3 简答（往年真题）' },
    ];
    $('#modeCards').innerHTML = cards.map((c) => `<div class="mcard ${c.id} ${c.on ? 'on' : ''}" data-mode="${c.id}"><div class="mc-t">${c.t} ${c.on ? '' : ''}</div><div class="mc-d">${c.full}</div></div>`).join('');
    $$('#modeCards .mcard').forEach((el) => el.onclick = () => setMode(el.dataset.mode));

    const ed = $('#examDateInput'); ed.value = store.examDate.slice(0, 10);
    ed.onchange = () => { store.examDate = ed.value + 'T00:00:00'; save(); tickCountdown(); toast('考试日期已更新'); };
    $('#goalWord').value = store.goals.word;
    $('#goalWord').onchange = () => { store.goals.word = +$('#goalWord').value || 0; save(); };

    // PWA 安装按钮
    const ib = $('#installBtn');
    if (window._pwaDefer) { ib.classList.remove('hidden'); ib.onclick = () => { window._pwaDefer.prompt(); }; }
    else ib.classList.add('hidden');

    $('#exportBtn').onclick = exportData;
    $('#importBtn').onclick = () => $('#importFile').click();
    $('#importFile').onchange = importData;
    $('#resetBtn').onclick = () => { if (confirm('确定清空所有数据？此操作不可恢复！')) { localStorage.removeItem(KEY); store = defaults(); save(); toast('已清空'); buildSidebar(); goPage('home'); } };
  }
  function setMode(m) {
    store.mode = m; save(); refreshModeChip();
    toast(m === 'hard' ? '已切换到高强度备考版 💪' : '已切换到前期轻松版 🐱');
    renderSetting();
    if (['math', 'major', 'english'].includes(curPage)) renderPage(curPage);
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kaoyan28_backup_' + todayStr() + '.json';
    a.click(); toast('备份已导出');
  }
  function importData(e) {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { const d = JSON.parse(r.result); store = migrate(d); save(); toast('导入成功，已恢复数据'); buildSidebar(); goPage(curPage); } catch (err) { toast('文件格式错误'); } };
    r.readAsText(f);
  }

  /* ================= Tab 切换 ================= */
  const TAB_HOSTS = {
    en: { word: 'enWord', read: 'enRead', trans: 'enTrans', write: 'enWrite', zhenti: 'enZhenti' },
    math: { q: 'mathQ', f: 'mathF', r: 'mathR' },
    major: { p: 'majP', c: 'majC', s: 'majS' },
    wkrv: { auto: 'weekAuto', manual: 'weekManual' },
    monrv: { auto: 'monthAuto', manual: 'monthManual' },
  };
  function tabSwitch(prefix, map) {
    const tabs = $$(`[data-tabs="${prefix}"] .tab`);
    const hosts = TAB_HOSTS[prefix];
    const cur = (tabs.find((t) => !t.classList.contains('hidden') && t.classList.contains('on')) || tabs.find((t) => !t.classList.contains('hidden')) || tabs[0]);
    tabs.forEach((t) => {
      if (t.classList.contains('hidden')) return;
      t.onclick = () => {
        tabs.forEach((x) => x.classList.remove('on'));
        t.classList.add('on');
        Object.values(hosts).forEach((id) => $('#' + id).classList.add('hidden'));
        const hostId = hosts[t.dataset.t];
        $('#' + hostId).classList.remove('hidden');
        map[t.dataset.t]();
      };
    });
    // 初始渲染当前 tab
    if (cur && !cur.classList.contains('hidden')) map[cur.dataset.t]();
  }

  function bindAcc(host) {
    $$('.acc', host).forEach((a) => a.querySelector('.acc-h').onclick = () => a.classList.toggle('open'));
  }

  /* ================= 渲染入口 ================= */
  function renderPage(id) {
    ({
      home: renderHome, plan: renderPlan, english: renderEnglish, math: renderMath,
      major: renderMajor, life: renderLife, week: renderWeek,
      month: renderMonth, setting: renderSetting
    })[id]();
  }
  function renderAll() {
    buildSidebar(); refreshModeChip(); tickCountdown();
    // 顶部模式 chip 点击
    $('#modeChip').onclick = () => { goPage('setting'); };
    renderPage(curPage);
  }

  /* ================= 启动 ================= */
  initSplash();
    if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { });
    });
  }
})();
