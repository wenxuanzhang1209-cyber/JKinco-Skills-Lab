/*
 * 小智入职大冒险｜游戏逻辑
 * ------------------------------------------------------------
 * 特性：站点题数自适应、进度自动存档与续玩、键盘操作、错题本与错题重练、
 *       手册关键词搜索、无障碍提示。所有存储访问均做降级处理，
 *       在禁用 localStorage 的环境（如沙箱内嵌页面）中同样可以正常游玩。
 */
const C = window.GAME_CONTENT;
const $ = (s) => document.querySelector(s);
const screens = [...document.querySelectorAll(".screen")];

const SAVE_KEY = "jkec_quest_2026_08";
const XP_GOAL = 1800;
const DRILL_ID = "__drill__";

/* ---------------------------- 安全存储 ---------------------------- */
const store = (() => {
  try {
    const probe = "__jkec_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch (err) {
    const memory = new Map();
    return {
      getItem: (k) => (memory.has(k) ? memory.get(k) : null),
      setItem: (k, v) => memory.set(k, String(v)),
      removeItem: (k) => memory.delete(k)
    };
  }
})();

/* ---------------------------- 游戏状态 ---------------------------- */
const blankState = () => ({
  name: "",
  xp: 0,
  correct: 0,
  answered: 0,
  streak: 0,
  bestStreak: 0,
  stationId: null,
  questionIndex: 0,
  hintsLeft: 1,
  completed: {},
  progress: {},
  unlocked: [],
  mistakes: [],
  finalIndex: 0,
  finalCorrect: 0,
  finalDone: false
});

let state = blankState();
let renderedOptions = [];
let drillStation = null;

const totalQuestions = () => C.stations.reduce((sum, s) => sum + s.questions.length, 0);
const isDrill = () => state.stationId === DRILL_ID;
const currentStation = () => (isDrill() ? drillStation : C.stations.find((s) => s.id === state.stationId));
const mistakeKey = (sid, index) => `${sid}#${index}`;

function questionByKey(key) {
  const [sid, index] = key.split("#");
  if (sid === "final") return { question: C.finalQuestions[Number(index)], station: null };
  const station = C.stations.find((s) => s.id === sid);
  if (!station) return null;
  return { question: station.questions[Number(index)], station };
}

/* ---------------------------- 存档与读档 ---------------------------- */
function save() {
  try {
    store.setItem(SAVE_KEY, JSON.stringify({ ...state, stationId: null, questionIndex: 0 }));
  } catch (err) {
    /* 存储不可用时忽略，游戏仍可继续 */
  }
}

function loadSave() {
  try {
    const raw = store.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return { ...blankState(), ...data, stationId: null, questionIndex: 0 };
  } catch (err) {
    return null;
  }
}

function hasMeaningfulProgress(data) {
  if (!data) return false;
  return Object.keys(data.completed || {}).length > 0 ||
    (data.unlocked || []).length > 0 ||
    Object.values(data.progress || {}).some((n) => n > 0);
}

/* ---------------------------- 通用工具 ---------------------------- */
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function showScreen(id) {
  screens.forEach((s) => s.classList.toggle("active", s.id === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2400);
}

const officeEvents = [
  { icon: "📚", title: "在线课程", text: "你从集团OA进入在线学习平台，完成了一节专业课程，学分账户 +1。", xp: 20 },
  { icon: "🧭", title: "导师便签", text: "导师与你确认了年度带教计划，第一段成长路线被点亮。", xp: 30 },
  { icon: "🏃", title: "社团招新", text: "你通过部门综合办公室联系上了心仪社团的负责人。", xp: 20 },
  { icon: "📖", title: "读书会偶遇", text: "你在睿读悦行书友会认识了一位跨专业伙伴。", xp: 30 },
  { icon: "📸", title: "工程光影", text: "你参加光影学社活动，用镜头记录了一处重点工程。", xp: 40 },
  { icon: "🌆", title: "徐汇漫游", text: "下班后你从宛平南路出发，解锁了徐家汇生活圈。", xp: 20 },
  { icon: "🛡️", title: "信息安全提醒", text: "你收到提醒：账号密码不共用、内部资料不外传，被点名表扬。", xp: 30 },
  { icon: "🏅", title: "青年志愿者", text: "你报名参加了一次志愿服务活动，收获了同伴与好评。", xp: 30 }
];

/* ---------------------------- 顶部状态 ---------------------------- */
function updateStatus() {
  const badges = Object.keys(state.completed).length;
  const percent = Math.min(100, Math.round((state.xp / XP_GOAL) * 100));
  $("#xpText").textContent = state.xp;
  $("#xpBar").style.width = `${percent}%`;
  $(".xp-track").setAttribute("aria-valuenow", String(percent));
  $("#handbookCount").textContent = state.unlocked.length;
  $("#streakPill").textContent = `🔥 连击 ${state.streak}`;
  $("#streakPill").classList.toggle("hot", state.streak >= 2);
  $("#badgeCount").textContent = badges;
  $("#totalCorrect").textContent = state.correct;
  const locked = badges < C.stations.length;
  $("#finalBtn").disabled = locked;
  $("#finalBtn").textContent = locked ? "终极入职挑战 🔒" : "终极入职挑战 →";
}

/* ---------------------------- 地图 ---------------------------- */
function renderMap() {
  const grid = $("#mapGrid");
  grid.innerHTML = C.stations.map((s, index) => {
    const total = s.questions.length;
    const done = !!state.completed[s.id];
    const progress = done ? total : Math.min(state.progress[s.id] || 0, total);
    const label = done ? "✓ 已通关" : progress ? `${progress}/${total}` : `${total} 个情景`;
    return `<article class="station-card ${done ? "done" : ""}" data-id="${s.id}" style="--station:${s.color}"
        tabindex="0" role="button" aria-label="${s.title}，${label}">
      <span class="route-node">${done ? "✓" : index + 1}</span>
      <div class="station-top">
        <div class="station-emoji">${s.icon}</div>
        <span class="station-state">${label}</span>
      </div>
      <h3>${s.title}</h3><p>${s.short}</p>
      <div class="station-progress"><i style="width:${(progress / total) * 100}%"></i></div>
    </article>`;
  }).join("");

  grid.querySelectorAll(".station-card").forEach((card) => {
    const open = () => openStation(card.dataset.id);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
  });

  const done = Object.keys(state.completed).length;
  $("#guideMessage").textContent = done === 0
    ? `沿着《入职小百科》路线出发吧，${C.stations.length} 个站点共 ${totalQuestions()} 道情景题都是新员工真会遇到的问题。`
    : done < C.stations.length
      ? `路线已推进 ${done}/${C.stations.length}，下一张职场奇遇卡在等你。`
      : "六大站点全部点亮，终极综合挑战已解锁！";
  updateStatus();
}

/* ---------------------------- 答题 ---------------------------- */
function openStation(id) {
  state.stationId = id;
  const station = currentStation();
  if (!station || !station.questions.length) return;
  const saved = state.completed[id] ? 0 : (state.progress[id] || 0);
  state.questionIndex = isDrill() ? 0 : Math.min(saved, station.questions.length - 1);
  state.hintsLeft = 1;
  renderQuestion();
  showScreen("challengeScreen");
}

function renderQuestion() {
  const s = currentStation();
  const q = s.questions[state.questionIndex];
  renderedOptions = shuffle(q.options.map((text, originalIndex) => ({
    text, correct: originalIndex === q.answer
  })));
  document.documentElement.style.setProperty("--station-color", s.color);
  $("#stationIcon").textContent = s.icon;
  $("#stationKicker").textContent = s.kicker;
  $("#stationTitle").textContent = s.title;
  $("#stationIntro").textContent = s.intro;
  $("#xiaozhiTip").textContent = s.tip;
  $("#questionType").textContent = q.type || "综合情景";
  $("#questionProgress").textContent = `${state.questionIndex + 1} / ${s.questions.length}`;
  $("#questionText").textContent = q.question;
  $("#stepDots").innerHTML = s.questions.map((_, i) =>
    `<i class="${i < state.questionIndex ? "done" : i === state.questionIndex ? "active" : ""}"></i>`
  ).join("");
  $("#options").innerHTML = renderedOptions.map((option, i) =>
    `<button class="option" data-index="${i}" data-correct="${option.correct}">
      <span class="letter">${i + 1}</span><span>${option.text}</span>
    </button>`
  ).join("");
  $("#hintCount").textContent = state.hintsLeft;
  $("#hintBtn").disabled = state.hintsLeft < 1;
  $("#feedback").classList.remove("show");
  $("#nextBtn").classList.remove("show");
  $("#nextBtn").textContent = "继续 →";
  $("#options").querySelectorAll(".option").forEach((btn) =>
    btn.addEventListener("click", () => answerQuestion(Number(btn.dataset.index)))
  );
}

function answerQuestion(choice) {
  const s = currentStation();
  const q = s.questions[state.questionIndex];
  const buttons = [...$("#options").children];
  if (buttons[0] && buttons[0].disabled) return;
  const correctIndex = renderedOptions.findIndex((o) => o.correct);
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === correctIndex) b.classList.add("correct");
    if (i === choice && choice !== correctIndex) b.classList.add("wrong");
  });

  const correct = choice === correctIndex;
  const key = mistakeKey(q.__sid || s.id, q.__index !== undefined ? q.__index : state.questionIndex);
  state.answered += 1;

  if (correct) {
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.xp += isDrill() ? 10 : 30 + Math.min(20, (state.streak - 1) * 5);
    state.correct += 1;
    state.mistakes = state.mistakes.filter((k) => k !== key);
  } else {
    state.streak = 0;
    state.xp += isDrill() ? 0 : 10;
    if (!state.mistakes.includes(key)) state.mistakes.push(key);
  }

  if (!state.unlocked.includes(key)) state.unlocked.push(key);

  $("#feedbackIcon").textContent = correct ? "✓" : "!";
  $("#feedbackIcon").style.background = correct ? "#21744b" : "#e07a2d";
  $("#feedbackTitle").textContent = correct
    ? (state.streak >= 2 ? `判断正确！${state.streak} 连击加成` : "判断正确！")
    : "这次还有更稳妥的选择";
  $("#feedbackText").textContent = q.explanation;
  $("#unlockTitle").textContent = q.knowledge.title;
  $("#sourceNote").textContent = `依据：${q.knowledge.source}`;
  $("#feedback").classList.add("show");
  const last = state.questionIndex === s.questions.length - 1;
  $("#nextBtn").textContent = last ? (isDrill() ? "完成错题重练 →" : "完成本站 →") : "继续 →";
  $("#nextBtn").classList.add("show");
  $("#nextBtn").focus({ preventScroll: true });
  updateStatus();
  save();
}

function useHint() {
  if (state.hintsLeft < 1) return;
  const wrong = [...document.querySelectorAll("#options .option")]
    .filter((btn) => btn.dataset.correct !== "true" && !btn.disabled);
  if (!wrong.length) return;
  shuffle(wrong).slice(0, 2).forEach((btn) => {
    btn.disabled = true;
    btn.classList.add("eliminated");
    btn.querySelector(".letter").textContent = "×";
  });
  state.hintsLeft = 0;
  $("#hintCount").textContent = "0";
  $("#hintBtn").disabled = true;
  toast("小智帮你排除了两个不够稳妥的选项");
}

function nextQuestion() {
  const s = currentStation();
  state.questionIndex += 1;

  if (isDrill()) {
    if (state.questionIndex < s.questions.length) return renderQuestion();
    drillStation = null;
    state.stationId = null;
    save();
    toast(state.mistakes.length ? `还剩 ${state.mistakes.length} 道错题，随时可以再练` : "错题已全部攻克，漂亮！");
    return showResult();
  }

  state.progress[s.id] = state.questionIndex;
  if (state.questionIndex < s.questions.length) {
    save();
    return renderQuestion();
  }

  const firstTime = !state.completed[s.id];
  state.completed[s.id] = true;
  state.progress[s.id] = s.questions.length;
  if (firstTime) state.xp += 50;
  save();
  toast(`获得徽章：${s.badge}${firstTime ? " +50 成长值" : ""}`);
  showOfficeEvent();
}

/* ---------------------------- 奇遇卡 ---------------------------- */
function showOfficeEvent() {
  const cards = shuffle(officeEvents).slice(0, 3);
  $("#mysteryCards").innerHTML = cards.map((event, i) =>
    `<button class="mystery-card" data-index="${i}"><span>?</span><b>奇遇卡 ${i + 1}</b><small>点击翻开</small></button>`
  ).join("");
  $("#eventReveal").classList.remove("show");
  $("#mysteryCards").classList.remove("picked");
  $("#mysteryCards").querySelectorAll("button").forEach((btn) => btn.addEventListener("click", () => {
    const event = cards[Number(btn.dataset.index)];
    $("#mysteryCards").classList.add("picked");
    $("#mysteryCards").querySelectorAll("button").forEach((card) => {
      card.disabled = true;
      card.classList.toggle("selected", card === btn);
    });
    btn.innerHTML = `<span>${event.icon}</span><b>${event.title}</b><small>+${event.xp} XP</small>`;
    state.xp += event.xp;
    $("#eventIcon").textContent = event.icon;
    $("#eventTitle").textContent = event.title;
    $("#eventText").textContent = event.text;
    $("#eventReward").textContent = `成长值 +${event.xp}`;
    $("#eventReveal").classList.add("show");
    updateStatus();
    save();
  }));
  $("#eventDialog").showModal();
}

/* ---------------------------- 我的小百科 ---------------------------- */
function allKnowledge() {
  return C.stations.flatMap((s) => s.questions.map((q, i) => ({
    key: mistakeKey(s.id, i), station: s, ...q.knowledge
  })));
}

function renderHandbook(filter = renderHandbook.filter || "all") {
  renderHandbook.filter = filter;
  const term = $("#handbookSearch").value.trim().toLowerCase();
  const filters = [{ id: "all", title: "全部" }, ...C.stations.map((s) => ({ id: s.id, title: s.title }))];
  $("#handbookFilter").innerHTML = filters.map((f) =>
    `<button class="filter-chip ${f.id === filter ? "active" : ""}" data-filter="${f.id}">${f.title}</button>`
  ).join("");
  $("#handbookFilter").querySelectorAll("button").forEach((btn) =>
    btn.addEventListener("click", () => renderHandbook(btn.dataset.filter))
  );

  const items = allKnowledge();
  $("#handbookProgress").textContent = `${state.unlocked.filter((k) => !k.startsWith("final#")).length} / ${items.length}`;

  const list = items
    .filter((k) => filter === "all" || k.station.id === filter)
    .filter((k) => {
      if (!term) return true;
      if (!state.unlocked.includes(k.key)) return false;
      return `${k.title}${k.text}${k.source}${k.station.title}`.toLowerCase().includes(term);
    });

  $("#handbookList").innerHTML = list.length
    ? list.map((k) => {
      const unlocked = state.unlocked.includes(k.key);
      return `<article class="knowledge-card ${unlocked ? "" : "locked"}">
        <div class="k-icon">${unlocked ? k.station.icon : "🔒"}</div>
        <div><h4>${unlocked ? k.title : "尚未解锁"}</h4>
        <p>${unlocked ? k.text : `完成“${k.station.title}”的对应任务后解锁`}</p>
        ${unlocked ? `<small>${k.source}</small>` : ""}</div>
      </article>`;
    }).join("")
    : `<div class="empty-hint">没有匹配的已解锁知识卡。换个关键词，或先去闯关解锁更多内容。</div>`;
}

function showHandbook() {
  renderHandbook();
  $("#handbookDialog").showModal();
}

/* ---------------------------- 终极挑战 ---------------------------- */
function renderFinal() {
  const q = C.finalQuestions[state.finalIndex];
  renderedOptions = shuffle(q.options.map((text, originalIndex) => ({
    text, correct: originalIndex === q.answer
  })));
  $("#finalScenario").innerHTML = `<article class="final-card">
    <div class="question-meta"><span>综合情景</span><b>${state.finalIndex + 1} / ${C.finalQuestions.length}</b></div>
    <h3>${q.question}</h3>
    <div class="options" role="group" aria-label="选项">${renderedOptions.map((o, i) =>
      `<button class="option" data-index="${i}"><span class="letter">${i + 1}</span><span>${o.text}</span></button>`
    ).join("")}</div>
    <div class="feedback" id="finalFeedback" role="status" aria-live="polite"><div class="feedback-icon" id="finalFeedbackIcon"></div>
    <div><b id="finalFeedbackTitle"></b><p id="finalFeedbackText"></p></div></div>
    <button class="primary-btn next-btn" id="finalNext">继续 <span aria-hidden="true">→</span></button>
  </article>`;
  $("#finalScenario").querySelectorAll(".option").forEach((btn) =>
    btn.addEventListener("click", () => answerFinal(Number(btn.dataset.index)))
  );
}

function answerFinal(choice) {
  const q = C.finalQuestions[state.finalIndex];
  const buttons = [...$("#finalScenario .options").children];
  if (buttons[0] && buttons[0].disabled) return;
  const correctIndex = renderedOptions.findIndex((o) => o.correct);
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === correctIndex) b.classList.add("correct");
    if (i === choice && choice !== correctIndex) b.classList.add("wrong");
  });
  const correct = choice === correctIndex;
  const key = mistakeKey("final", state.finalIndex);
  state.answered += 1;
  if (correct) {
    state.finalCorrect += 1;
    state.correct += 1;
    state.xp += 50;
    state.mistakes = state.mistakes.filter((k) => k !== key);
  } else {
    state.xp += 15;
    if (!state.mistakes.includes(key)) state.mistakes.push(key);
  }
  $("#finalFeedbackIcon").textContent = correct ? "✓" : "!";
  $("#finalFeedbackIcon").style.background = correct ? "#21744b" : "#e07a2d";
  $("#finalFeedbackTitle").textContent = correct ? "综合判断正确！" : "再稳妥一点";
  $("#finalFeedbackText").textContent = q.explanation;
  $("#finalFeedback").classList.add("show");
  $("#finalNext").classList.add("show");
  $("#finalNext").focus({ preventScroll: true });
  $("#finalNext").onclick = () => {
    state.finalIndex += 1;
    if (state.finalIndex < C.finalQuestions.length) return renderFinal();
    state.finalDone = true;
    save();
    showResult();
  };
  updateStatus();
  save();
}

/* ---------------------------- 结算 ---------------------------- */
function rankOf(accuracy) {
  if (accuracy >= 0.9) return { title: "建科通关大使", desc: "对流程、政策和渠道的把握非常到位，可以去帮下一位新同事了。" };
  if (accuracy >= 0.75) return { title: "入职优等生", desc: "关键规则基本掌握，个别细节再确认一次就更稳。" };
  if (accuracy >= 0.6) return { title: "成长中的新同事", desc: "主线已经清楚，建议重点复习错题里的天数与条件。" };
  return { title: "刚上路的探索者", desc: "别急，先把错题重练一遍，再回到小百科看一遍知识卡。" };
}

function resultSummaryText() {
  const accuracy = state.answered ? Math.round((state.correct / state.answered) * 100) : 0;
  return [
    `【小智入职大冒险 · 成绩单】`,
    `冒险者：${state.name || "新同事"}`,
    `成长值：${state.xp} ｜ 正确率：${accuracy}% ｜ 最高连击：${state.bestStreak}`,
    `徽章：${Object.keys(state.completed).length}/${C.stations.length} ｜ 解锁知识卡：${state.unlocked.filter((k) => !k.startsWith("final#")).length}`,
    `依据：公司《入职小百科》（2026年8月版），实际办理以现行正式文件为准。`
  ].join("\n");
}

function renderMistakes() {
  const box = $("#mistakeReview");
  if (!state.mistakes.length) {
    box.innerHTML = `<div class="mistake-empty">🎉 本轮没有留下错题，稳！</div>`;
    return;
  }
  const rows = state.mistakes.map((key) => {
    const found = questionByKey(key);
    if (!found || !found.question) return "";
    const q = found.question;
    const answer = q.options[q.answer];
    const source = q.knowledge ? q.knowledge.source : "终极综合挑战";
    return `<article class="mistake-card">
      <h5>${q.question}</h5>
      <p class="mistake-answer">✓ ${answer}</p>
      <p class="mistake-why">${q.explanation}</p>
      <small>${source}</small>
    </article>`;
  }).join("");
  box.innerHTML = `<div class="mistake-head">
      <h4>错题回顾 <em>${state.mistakes.length} 题</em></h4>
      <button class="ghost-btn" id="drillBtn">重练错题</button>
    </div>${rows}`;
  $("#drillBtn").addEventListener("click", startDrill);
}

function startDrill() {
  const questions = state.mistakes.map((key) => {
    const found = questionByKey(key);
    if (!found || !found.question) return null;
    const [sid, index] = key.split("#");
    return {
      ...found.question,
      type: found.station ? `错题重练 · ${found.station.title}` : "错题重练 · 终极挑战",
      knowledge: found.question.knowledge || {
        title: "终极综合挑战",
        text: found.question.explanation,
        source: `${C.sourceDocument}${C.sourceEdition} · 综合情景`
      },
      __sid: sid,
      __index: Number(index)
    };
  }).filter(Boolean);

  if (!questions.length) return;
  drillStation = {
    id: DRILL_ID,
    icon: "🧩",
    color: "#e2612f",
    kicker: "MISTAKE DRILL",
    title: "错题重练",
    short: "把没记牢的再过一遍",
    intro: "这里只放你答错过的题。答对一题，它就会从错题本里消失。",
    tip: "记不住的往往是天数、条件和经办渠道。先记住“谁来办”，再记住“几天”。",
    badge: "错题清道夫",
    questions
  };
  state.stationId = DRILL_ID;
  state.questionIndex = 0;
  state.hintsLeft = 1;
  renderQuestion();
  showScreen("challengeScreen");
}

function showResult() {
  const accuracy = state.answered ? state.correct / state.answered : 0;
  const rank = rankOf(accuracy);
  $("#resultName").textContent = state.name || "新同事";
  $("#resultCopy").textContent = `你完成了《入职小百科》探索，最高连续答对 ${state.bestStreak} 题。带着正确渠道、清晰流程和成长地图，开启建科新旅程吧。`;
  $("#resultRank").innerHTML = `<b>${rank.title}</b><span>${rank.desc}</span>`;
  $("#resultXp").textContent = state.xp;
  $("#resultAccuracy").textContent = `${Math.round(accuracy * 100)}%`;
  $("#resultBadges").textContent = Object.keys(state.completed).length;
  $("#resultKnowledge").textContent = state.unlocked.filter((k) => !k.startsWith("final#")).length;
  $("#badgeRack").innerHTML = C.stations.map((s) => {
    const earned = !!state.completed[s.id];
    return `<div class="earned-badge ${earned ? "" : "dim"}"><i>${earned ? s.icon : "🔒"}</i><span>${s.badge}</span></div>`;
  }).join("");
  renderMistakes();
  showScreen("resultScreen");
  save();
}

async function copySummary() {
  const text = resultSummaryText();
  try {
    await navigator.clipboard.writeText(text);
    toast("成绩单已复制到剪贴板");
    return;
  } catch (err) {
    /* 继续走降级方案 */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
    toast("成绩单已复制到剪贴板");
  } catch (err) {
    toast("当前环境不支持复制，可截图保存成绩单");
  }
}

/* ---------------------------- 重置与启动 ---------------------------- */
function resetGame(silent) {
  state = blankState();
  drillStation = null;
  try { store.removeItem(SAVE_KEY); } catch (err) { /* 忽略 */ }
  $("#playerName").value = "";
  $("#resumeBtn").hidden = true;
  updateStatus();
  showScreen("welcomeScreen");
  if (!silent) toast("进度已清空，可以从头开始");
}

function startGame(name) {
  state.name = name || state.name || "新同事";
  $("#playerLabel").textContent = state.name;
  save();
  renderMap();
  showScreen("mapScreen");
}

function fillFacts() {
  const stationQuestions = totalQuestions();
  const total = stationQuestions + C.finalQuestions.length;
  $("#factMinutes").textContent = Math.max(10, Math.round(total * 0.7));
  $("#factBadges").textContent = C.stations.length;
  $("#factKnowledge").textContent = stationQuestions;
  $("#factQuestions").textContent = total;
  if (C.sourceEdition) $("#brandEdition").textContent = C.sourceEdition;
}

/* ---------------------------- 事件绑定 ---------------------------- */
$("#startBtn").addEventListener("click", () => {
  const typed = $("#playerName").value.trim();
  if (!typed && hasMeaningfulProgress(state)) {
    // 已有存档但未输入姓名时，直接沿用存档中的名字
    return startGame(state.name);
  }
  startGame(typed);
});
$("#playerName").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#startBtn").click(); });
$("#resumeBtn").addEventListener("click", () => {
  if (state.finalDone) return showResult();
  startGame(state.name);
});
$("#backToMap").addEventListener("click", () => {
  if (isDrill()) { drillStation = null; state.stationId = null; }
  renderMap();
  showScreen("mapScreen");
});
$("#nextBtn").addEventListener("click", nextQuestion);
$("#hintBtn").addEventListener("click", useHint);
$("#handbookBtn").addEventListener("click", showHandbook);
$("#closeHandbook").addEventListener("click", () => $("#handbookDialog").close());
$("#handbookSearch").addEventListener("input", () => renderHandbook());
$("#reviewBtn").addEventListener("click", showHandbook);
$("#copyBtn").addEventListener("click", copySummary);
$("#restartBtn").addEventListener("click", () => resetGame(true));
let resetArmed = false;
$("#resetBtn").addEventListener("click", () => {
  let ok = null;
  try { ok = window.confirm("确定清空本机保存的闯关进度吗？"); } catch (err) { ok = null; }
  if (ok === true) return resetGame();
  if (ok === false) return;
  // 部分内嵌环境禁用了确认弹窗，退化为“连点两次”确认
  if (!resetArmed) {
    resetArmed = true;
    toast("再点一次“清空进度”即可确认");
    setTimeout(() => { resetArmed = false; }, 4000);
    return;
  }
  resetArmed = false;
  resetGame();
});
$("#eventContinue").addEventListener("click", () => {
  $("#eventDialog").close();
  renderMap();
  showScreen("mapScreen");
});
$("#finalBtn").addEventListener("click", () => {
  if ($("#finalBtn").disabled) return;
  state.finalIndex = 0;
  state.finalCorrect = 0;
  renderFinal();
  showScreen("finalScreen");
});

document.addEventListener("keydown", (e) => {
  if (e.target.matches("input, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
  const onChallenge = $("#challengeScreen").classList.contains("active");
  const onFinal = $("#finalScreen").classList.contains("active");
  if (!onChallenge && !onFinal) return;

  const scope = onChallenge ? "#options" : "#finalScenario .options";
  const numeric = "1234".indexOf(e.key);
  const alpha = "abcd".indexOf(e.key.toLowerCase());
  const index = numeric >= 0 ? numeric : alpha;
  if (index >= 0) {
    const btn = document.querySelectorAll(`${scope} .option`)[index];
    if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
    return;
  }
  if (e.key === "Enter") {
    const next = onChallenge ? $("#nextBtn") : $("#finalNext");
    if (next && next.classList.contains("show")) { e.preventDefault(); next.click(); }
    return;
  }
  if (onChallenge && e.key.toLowerCase() === "h" && !$("#hintBtn").disabled) {
    e.preventDefault();
    useHint();
  }
});

/* ---------------------------- 初始化 ---------------------------- */
(function init() {
  fillFacts();
  const saved = loadSave();
  if (hasMeaningfulProgress(saved)) {
    state = saved;
    $("#resumeBtn").hidden = false;
    if (state.name) $("#playerName").value = state.name;
  }
  updateStatus();
})();
