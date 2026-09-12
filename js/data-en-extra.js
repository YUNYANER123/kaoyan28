/* =====================================================================
   喵上岸 · 英语扩展数据（英二阅读 / 英二翻译 / 英一图画作文 / 英二图表作文）
   - 英语二用户：阅读 / 精翻 在英二真题基础上，额外包含英一真题
   - 真题库：英一=图画作文，英二=图表作文
   说明：本文件为离线内置示例题源，题量有限，仅供每日轮换练习使用。
   ===================================================================== */

/* ---------- 英语二 阅读真题（自带逐句原文 sentences + 译文 trans） ---------- */
const EN_READINGS_2 = [
  {
    src: '英语二 2021 阅读 Text 1', title: '不文明行为如何相互影响',
    sentences: [
      'Researchers studying kindness and cruelty suggest that both are contagious.',
      'In a study, people who watched a video of someone helping another were more likely to help next.',
      'The opposite is also true: witnessing rude behavior makes observers more likely to be rude.',
      'This ripple effect means small acts can shape the tone of an entire community.',
      'The practical lesson is simple: model the behavior you want to see around you.'
    ],
    trans: [
      '研究友善与残忍的学者指出，两者都会传染。',
      '一项研究中，观看了助人视频的人，之后更可能去帮助他人。',
      '反之亦然：目睹粗鲁行为会让旁观者更易变得粗鲁。',
      '这种涟漪效应意味着，微小的举动可以塑造整个社区的氛围。',
      '实用启示很简单：以身作则，展现你希望身边出现的行为。'
    ],
    questions: [
      { q: 'What does the passage say about kindness and cruelty?', options: ['They are rare.', 'Both are contagious.', 'Only kindness spreads.', 'Neither can be learned.'], k: 1, ans: '首句点明两者都会传染（contagious）。' },
      { q: 'What did the helping video study find?', options: ['People ignored others.', 'Viewers became more helpful.', 'Viewers felt sad.', 'No change occurred.'], k: 1, ans: '观看助人视频的被试之后更愿助人。' },
      { q: 'The "ripple effect" refers to ______.', options: ['a single big act', 'how small acts spread', 'ocean waves', 'a type of cruelty'], k: 1, ans: '指小举动能扩散、影响整体氛围。' },
      { q: 'What is the practical lesson?', options: ['Punish rudeness.', 'Model good behavior.', 'Avoid crowds.', 'Watch more videos.'], k: 1, ans: '以身作则，展现期望的行为。' }
    ]
  },
  {
    src: '英语二 2020 阅读 Text 2', title: '白领工作的重新分配',
    sentences: [
      'Some jobs have disappeared forever, while others have merely moved online.',
      'The pandemic accelerated a shift that was already underway in many offices.',
      'Workers who can perform tasks remotely have gained flexibility but also blurrier boundaries.',
      'Companies now rethink how much office space they truly need.',
      'The result may be a more distributed, less centralized way of working.'
    ],
    trans: [
      '一些岗位永远消失了，另一些只是转移到了线上。',
      '疫情加速了众多办公室本已开始的变化。',
      '能远程完成任务的人获得了灵活性，但工作与生活的边界也更模糊。',
      '企业开始重新思考自己究竟需要多少办公空间。',
      '结果可能是一种更分散、更不集中的工作方式。'
    ],
    questions: [
      { q: 'According to the passage, some jobs have ______.', options: ['moved online', 'become easier', 'paid more', 'been promoted'], k: 0, ans: '有的岗位转到线上，而非消失。' },
      { q: 'The pandemic ______.', options: ['stopped change', 'reversed trends', 'sped up a shift', 'hurt only retail'], k: 2, ans: '加速了既有的转变。' },
      { q: 'Remote workers face ______.', options: ['no change', 'blurrier boundaries', 'higher pay', 'shorter hours'], k: 1, ans: '远程工作者边界更模糊。' },
      { q: 'Companies reconsider ______.', options: ['hiring', 'office space needs', 'salaries', 'vacations'], k: 1, ans: '重新思考办公空间需求。' }
    ]
  },
  {
    src: '英语二 2019 阅读 Text 3', title: '评级机构的角色',
    sentences: [
      'Credit rating agencies influence where vast sums of money flow.',
      'Their judgments can raise or lower the cost of borrowing for entire nations.',
      'Critics argue the agencies suffer conflicts of interest.',
      'After the financial crisis, calls for tighter oversight grew louder.',
      'Yet their central role in markets remains hard to replace.'
    ],
    trans: [
      '信用评级机构影响着巨额资金的流向。',
      '它们的判断能抬高或压低整个国家的借贷成本。',
      '批评者认为这些机构存在利益冲突。',
      '金融危机后，加强监管的呼声日益高涨。',
      '然而它们在市场中的核心角色仍难以被替代。'
    ],
    questions: [
      { q: 'Rating agencies influence ______.', options: ['weather', 'money flows', 'elections', 'schools'], k: 1, ans: '影响资金流向。' },
      { q: 'Their judgments affect ______.', options: ['borrowing costs', 'tax rates', 'stock colors', 'laws'], k: 0, ans: '影响借贷成本。' },
      { q: 'Critics mention ______.', options: ['conflicts of interest', 'low pay', 'old age', 'bad weather'], k: 0, ans: '利益冲突问题。' },
      { q: 'After the crisis, people wanted ______.', options: ['less oversight', 'tighter oversight', 'no agencies', 'more debt'], k: 1, ans: '更严格的监管。' }
    ]
  },
  {
    src: '英语二 2018 阅读 Text 4', title: '城市绿地的价值',
    sentences: [
      'Urban green spaces do more than beautify a city.',
      'They cool streets, absorb rainwater, and support mental health.',
      'Studies link nearby parks to lower stress and better sleep.',
      'Planners increasingly treat trees as infrastructure, not decoration.',
      'Protecting such spaces is a public-health investment.'
    ],
    trans: [
      '城市绿地不只是美化城市。',
      '它们能降温、吸收雨水，并有益心理健康。',
      '研究显示，邻近公园与更低的压力、更好的睡眠相关。',
      '规划者越来越把树木视为基础设施，而非装饰。',
      '保护这类空间是一种公共健康投资。'
    ],
    questions: [
      { q: 'Green spaces do more than ______.', options: ['exist', 'beautify', 'grow', 'cost'], k: 1, ans: '不只是美化。' },
      { q: 'They help with ______.', options: ['mental health', 'traffic', 'taxes', 'wifi'], k: 0, ans: '有益心理健康。' },
      { q: 'Nearby parks relate to ______.', options: ['higher stress', 'lower stress', 'more noise', 'less sleep'], k: 1, ans: '更低压力。' },
      { q: 'Planners see trees as ______.', options: ['decoration', 'infrastructure', 'waste', 'furniture'], k: 1, ans: '视为基础设施。' }
    ]
  }
];

/* ---------- 英语二 翻译真题（英译中） ---------- */
const EN_TRANSLATE_EXAM_2 = [
  { y: '英语二 2021', text: 'It is curious that while technology has made communication instant, many people feel more isolated than before.', zh: '奇怪的是，尽管科技让沟通变得即时，许多人却比以往更感到孤立。' },
  { y: '英语二 2020', text: 'A good leader does not simply give orders; he or she earns trust by sharing both risks and rewards.', zh: '优秀的领导者不只是下命令；他/她通过共担风险与回报来赢得信任。' },
  { y: '英语二 2019', text: 'The value of a museum lies not in the objects it keeps, but in the questions it inspires.', zh: '博物馆的价值不在于它保存的物件，而在于它激发的问题。' },
  { y: '英语二 2018', text: 'Sustainable development asks us to meet today’s needs without stealing from tomorrow.', zh: '可持续发展要求我们满足今日所需，而不窃取明日之资源。' },
  { y: '英语二 2017', text: 'Reading widely builds not only knowledge but also the empathy to understand others.', zh: '广泛阅读不仅积累知识，也培养理解他人的共情能力。' }
];

/* ---------- 英语一 真题库：图画作文（picture composition） ---------- */
const ZHENTI_PIC = [
  {
    y: '英语一 2018', t: '图画描述：两个路人面对前方地面上的坑，一人绕行，另一人停下将坑填平。\n请以“脚踏实地 / 行动胜于空谈”为主题，写一篇 160–200 词短文。',
    essay: 'The picture contrasts two attitudes toward an obstacle. One passer-by simply walks around the pit, while the other stops to fill it in. The contrast reveals a timeless truth: action beats mere avoidance.\n\nThose who only dodge problems leave them for others to face. By contrast, those who take initiative not only solve their own difficulty but also benefit the community. In study and life, we often meet "pits"—weak subjects, bad habits, tough tasks. Skirting them feels easier, yet they remain. Only by rolling up our sleeves can we truly move forward.\n\nTherefore, let us be the fillers, not merely the walkers-around. Small, concrete actions accumulate into real progress.'
  },
  {
    y: '英语一 2017', t: '图画描述：一群人围坐，每人面前有一只手机，却无人交谈。\n请以“科技时代的相处”为主题，写一篇 160–200 词短文。',
    essay: 'The cartoon portrays a striking scene: people sit together, yet each stares at a phone in silence. It satirizes how technology, meant to connect us, can isolate us.\n\nUndeniably, smart devices bring convenience. But over-reliance erodes face-to-face communication and weakens genuine bonds. We should remember that devices are tools, not substitutes for real presence.\n\nIn conclusion, we must use technology wisely—stay reachable online, but stay reachable in person too. True connection needs eye contact, not just signal.'
  },
  {
    y: '英语一 2016', t: '图画描述：父亲对孩子说“你只管好好学习，其他不用管”，身后母亲在为其洗脚。\n请以“独立与责任”为主题，写一篇 160–200 词短文。',
    essay: 'The drawing shows a boy told to "just study" while his mother washes his feet. It reflects a common but harmful parenting pattern that shelters children from responsibility.\n\nReal growth requires doing things by oneself. If parents do everything, children never learn independence, nor empathy for others’ labor. A capable adult is shaped by both books and life.\n\nHence, families should balance care with expectation. Let young people share chores; only then can they become responsible members of society.'
  },
  {
    y: '英语一 2015', t: '图画描述：一个手机屏幕随着功能增加而越来越大，几乎占满画面。\n请以“手机的便利与束缚”为主题，写一篇 160–200 词短文。',
    essay: 'The image shows a phone ballooning as features multiply, nearly filling the frame. It captures both the power and the trap of modern devices.\n\nOn one hand, phones grant instant information, payment, and contact. On the other, endless functions nibble at our attention and time. Many feel anxious without the screen.\n\nWe should be masters, not servants, of our tools. Use them with purpose, and set them down with ease—that is the real smart life.'
  },
  {
    y: '英语一 2014', t: '图画描述：一群相册里的“相随”字样，体现朋友间长久陪伴。\n请以“友谊的力量”为主题，写一篇 160–200 词短文。',
    essay: 'The picture highlights the word "companionship" among old photos, reminding us of friendship’s quiet strength.\n\nFriendship sustains us through pressure and loneliness. A trusted friend offers both comfort and candid advice, helping us grow. In the grueling journey of exam preparation, peers who encourage each other often go further.\n\nCherish those who walk beside you. A life with true friends is richer, and a goal with shared support is more reachable.'
  }
];

/* ---------- 英语二 真题库：图表作文（chart composition） ---------- */
const ZHENTI_CHART = [
  {
    y: '英语二 2021', t: '图表：某高校学生手机使用时长分布（学习 30%、社交 25%、娱乐 30%、其他 15%）。\n请根据图表写一篇 150–200 词短文，描述数据并给出评论。',
    essay: 'The chart illustrates how students at a university spend time on phones. Learning takes 30%, socializing 25%, entertainment 30%, and other uses 15%.\n\nNotably, entertainment and learning share the largest shares, suggesting phones serve both study and leisure. Social interaction is also significant, reflecting constant connectivity.\n\nIn my view, the key is balance. Phones are powerful study aids, yet excessive entertainment can distract. Students should consciously allocate screen time toward learning and meaningful contact.'
  },
  {
    y: '英语二 2020', t: '图表：2010–2019 我国新能源汽车销量（万辆）逐年上升，从 0.5 增至 120。\n请根据图表写一篇 150–200 词短文，描述趋势并分析原因。',
    essay: 'The graph shows new-energy vehicle sales in China climbing from 0.5 million in 2010 to 120 million in 2019, a striking upward trend.\n\nSeveral factors drive this growth: environmental policies, falling battery costs, and expanding charging networks. Consumers’ green awareness also rises.\n\nThe trend signals a real shift toward sustainable transport. With continued support, clean vehicles will likely become the mainstream choice.'
  },
  {
    y: '英语二 2019', t: '图表：某城市垃圾分类知晓率与执行率（知晓 90%、执行 40%）。\n请根据图表写一篇 150–200 词短文，描述差距并提出建议。',
    essay: 'The chart reveals a gap: 90% of citizens know about garbage sorting, yet only 40% actually practice it.\n\nThe gap suggests awareness alone is insufficient. Habits, convenience, and enforcement all matter. Many support the idea but find execution cumbersome.\n\nTo close the gap, the city should simplify rules, add bins, and reward compliance. Turning knowledge into daily action is the real goal.'
  },
  {
    y: '英语二 2018', t: '图表：不同年龄段人群每周运动时长（青年 3h、中年 2h、老年 4h）。\n请根据图表写一篇 150–200 词短文，描述差异并评论。',
    essay: 'The chart compares weekly exercise: youths 3 hours, middle-aged 2, the elderly 4.\n\nThe elderly lead, perhaps due to more free time and health awareness. Middle-aged people exercise least, squeezed by work and family. Youths sit in the middle.\n\nRegular exercise benefits all ages. Busy as we are, we should protect at least two hours weekly—health is the foundation of everything else.'
  },
  {
    y: '英语二 2017', t: '图表：某书店 2012–2016 年电子书与纸质书销量变化（电子书上升、纸质书略降）。\n请根据图表写一篇 150–200 词短文，描述变化并评论。',
    essay: 'The chart tracks 2012–2016 book sales: e-books rise steadily while paper books dip slightly.\n\nDigital reading grows with smartphones and readers, offering portability. Yet paper books decline only mildly, showing their lasting charm.\n\nRather than rivals, the two formats coexist. Readers may skim on screens yet still savor a printed page. Diversity, not replacement, defines the future of reading.'
  }
];
