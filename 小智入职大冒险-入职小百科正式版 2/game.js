const C = window.GAME_CONTENT;
const $ = (s) => document.querySelector(s);
const screens = [...document.querySelectorAll(".screen")];

const state = {
  name: "", xp: 0, correct: 0, streak: 0, bestStreak: 0,
  currentStation: null, questionIndex: 0, hintsLeft: 1,
  completed: {}, unlockedKnowledge: new Set(), renderedOptions: [],
  finalIndex: 0, finalCorrect: 0
};

const officeEvents = [
  { icon: "📚", title: "在线课程", text: "你从集团OA进入在线学习平台，完成了一节专业课程。", xp: 20 },
  { icon: "🧭", title: "导师便签", text: "导师与你确认了年度带教计划，第一段成长路线被点亮。", xp: 30 },
  { icon: "🏃", title: "社团招新", text: "你通过部门综合办公室联系上了心仪社团的负责人。", xp: 20 },
  { icon: "📖", title: "读书会偶遇", text: "你在睿读悦行书友会认识了一位跨专业伙伴。", xp: 30 },
  { icon: "📸", title: "工程光影", text: "你参加光影学社活动，用镜头记录了一处重点工程。", xp: 40 },
  { icon: "🌆", title: "徐汇漫游", text: "下班后你从宛平南路出发，解锁了徐家汇生活圈。", xp: 20 }
];

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function showScreen(id) {
  screens.forEach(s => s.classList.toggle("active", s.id === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2200);
}

function updateStatus() {
  $("#xpText").textContent = state.xp;
  $("#xpBar").style.width = `${Math.min(100, state.xp / 9)}%`;
  $("#handbookCount").textContent = state.unlockedKnowledge.size;
  $("#streakPill").textContent = `🔥 连击 ${state.streak}`;
  $("#streakPill").classList.toggle("hot", state.streak >= 2);
  $("#badgeCount").textContent = Object.keys(state.completed).length;
  $("#totalCorrect").textContent = state.correct;
  $("#finalBtn").disabled = Object.keys(state.completed).length < C.stations.length;
  $("#finalBtn").textContent = $("#finalBtn").disabled ? "终极入职挑战 🔒" : "终极入职挑战 →";
}

function stationProgress(station) {
  if (state.completed[station.id]) return 3;
  if (state.currentStation?.id === station.id) return state.questionIndex;
  return Number(localStorage.getItem(`progress_${station.id}`) || 0);
}

function renderMap() {
  const grid = $("#mapGrid");
  grid.innerHTML = C.stations.map((s, index) => {
    const progress = stationProgress(s);
    const done = !!state.completed[s.id];
    return `<article class="station-card ${done ? "done" : ""}" data-id="${s.id}" style="--station:${s.color}">
      <span class="route-node">${done ? "✓" : index + 1}</span>
      <div class="station-top">
        <div class="station-emoji">${s.icon}</div>
        <span class="station-state">${done ? "✓ 已通关" : progress ? `${progress}/3` : "等待探索"}</span>
      </div>
      <h3>${s.title}</h3><p>${s.short}</p>
      <div class="station-progress"><i style="width:${done ? 100 : progress / 3 * 100}%"></i></div>
    </article>`;
  }).join("");
  grid.querySelectorAll(".station-card").forEach(card =>
    card.addEventListener("click", () => openStation(card.dataset.id))
  );
  const done = Object.keys(state.completed).length;
  $("#guideMessage").textContent = done === 0
    ? "沿着入职小百科路线出发吧，每一站都是新员工真正会遇到的情景。"
    : done < C.stations.length ? `路线已推进 ${done}/${C.stations.length}，下一张职场奇遇卡在等你。`
      : "六大城区全部点亮，终极工作日模拟已解锁！";
  updateStatus();
}

function openStation(id) {
  state.currentStation = C.stations.find(s => s.id === id);
  state.questionIndex = 0;
  state.hintsLeft = 1;
  renderQuestion();
  showScreen("challengeScreen");
}

function renderQuestion() {
  const s = state.currentStation;
  const q = s.questions[state.questionIndex];
  state.renderedOptions = shuffle(q.options.map((text, originalIndex) => ({
    text, correct: originalIndex === q.answer
  })));
  document.documentElement.style.setProperty("--station-color", s.color);
  $("#stationIcon").textContent = s.icon;
  $("#stationKicker").textContent = s.kicker;
  $("#stationTitle").textContent = s.title;
  $("#stationIntro").textContent = s.intro;
  $("#xiaozhiTip").textContent = s.tip;
  $("#questionType").textContent = q.type;
  $("#questionProgress").textContent = `${state.questionIndex + 1} / ${s.questions.length}`;
  $("#questionText").textContent = q.question;
  $("#stepDots").innerHTML = s.questions.map((_, i) =>
    `<i class="${i < state.questionIndex ? "done" : i === state.questionIndex ? "active" : ""}"></i>`
  ).join("");
  $("#options").innerHTML = state.renderedOptions.map((option, i) =>
    `<button class="option" data-index="${i}" data-correct="${option.correct}">
      <span class="letter">${"ABCD"[i]}</span><span>${option.text}</span>
    </button>`
  ).join("");
  $("#hintCount").textContent = state.hintsLeft;
  $("#hintBtn").disabled = state.hintsLeft < 1;
  $("#feedback").classList.remove("show");
  $("#nextBtn").classList.remove("show");
  $("#options").querySelectorAll(".option").forEach(btn =>
    btn.addEventListener("click", () => answerQuestion(Number(btn.dataset.index)))
  );
}

function answerQuestion(choice) {
  const q = state.currentStation.questions[state.questionIndex];
  const buttons = [...$("#options").children];
  const correctIndex = state.renderedOptions.findIndex(o => o.correct);
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === correctIndex) b.classList.add("correct");
    if (i === choice && choice !== correctIndex) b.classList.add("wrong");
  });
  const correct = choice === correctIndex;
  if (correct) {
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.xp += 30 + Math.min(20, (state.streak - 1) * 5);
    state.correct += 1;
  } else {
    state.streak = 0;
    state.xp += 10;
  }
  state.unlockedKnowledge.add(`${state.currentStation.id}_${state.questionIndex}`);
  $("#feedbackIcon").textContent = correct ? "✓" : "!";
  $("#feedbackIcon").style.background = correct ? "#21744b" : "#e07a2d";
  $("#feedbackTitle").textContent = correct
    ? state.streak >= 2 ? `判断正确！${state.streak} 连击加成` : "判断正确！"
    : "这次还有更稳妥的选择";
  $("#feedbackText").textContent = q.explanation;
  $("#unlockTitle").textContent = q.knowledge.title;
  $("#sourceNote").textContent = `依据：${q.knowledge.source}`;
  $("#feedback").classList.add("show");
  $("#nextBtn").classList.add("show");
  updateStatus();
}

function useHint() {
  if (state.hintsLeft < 1) return;
  const wrong = [...document.querySelectorAll("#options .option")]
    .filter(btn => btn.dataset.correct !== "true" && !btn.disabled);
  shuffle(wrong).slice(0, 2).forEach(btn => {
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
  const s = state.currentStation;
  state.questionIndex += 1;
  localStorage.setItem(`progress_${s.id}`, state.questionIndex);
  if (state.questionIndex < s.questions.length) return renderQuestion();
  state.completed[s.id] = true;
  state.xp += 50;
  localStorage.removeItem(`progress_${s.id}`);
  toast(`获得徽章：${s.badge} +50 XP`);
  showOfficeEvent();
}

function showOfficeEvent() {
  const cards = shuffle(officeEvents).slice(0, 3);
  $("#mysteryCards").innerHTML = cards.map((event, i) =>
    `<button class="mystery-card" data-index="${i}"><span>?</span><b>奇遇卡 ${i + 1}</b><small>点击翻开</small></button>`
  ).join("");
  $("#eventReveal").classList.remove("show");
  $("#mysteryCards").classList.remove("picked");
  $("#mysteryCards").querySelectorAll("button").forEach(btn => btn.addEventListener("click", () => {
    const event = cards[Number(btn.dataset.index)];
    $("#mysteryCards").classList.add("picked");
    $("#mysteryCards").querySelectorAll("button").forEach(card => {
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
  }));
  $("#eventDialog").showModal();
}

function allKnowledge() {
  return C.stations.flatMap(s => s.questions.map((q, i) => ({
    key: `${s.id}_${i}`, station: s, ...q.knowledge
  })));
}

function renderHandbook(filter = "all") {
  const filters = [{ id: "all", title: "全部" }, ...C.stations.map(s => ({ id: s.id, title: s.title }))];
  $("#handbookFilter").innerHTML = filters.map(f =>
    `<button class="filter-chip ${f.id === filter ? "active" : ""}" data-filter="${f.id}">${f.title}</button>`
  ).join("");
  $("#handbookFilter").querySelectorAll("button").forEach(btn =>
    btn.addEventListener("click", () => renderHandbook(btn.dataset.filter))
  );
  $("#handbookList").innerHTML = allKnowledge()
    .filter(k => filter === "all" || k.station.id === filter)
    .map(k => {
      const unlocked = state.unlockedKnowledge.has(k.key);
      return `<article class="knowledge-card ${unlocked ? "" : "locked"}">
        <div class="k-icon">${unlocked ? k.station.icon : "🔒"}</div>
        <div><h4>${unlocked ? k.title : "尚未解锁"}</h4>
        <p>${unlocked ? k.text : `完成“${k.station.title}”任务后解锁`}</p>
        ${unlocked ? `<small>${k.source}</small>` : ""}</div>
      </article>`;
    }).join("");
}

function showHandbook() {
  renderHandbook();
  $("#handbookDialog").showModal();
}

function renderFinal() {
  const q = C.finalQuestions[state.finalIndex];
  state.renderedOptions = shuffle(q.options.map((text, originalIndex) => ({
    text, correct: originalIndex === q.answer
  })));
  $("#finalScenario").innerHTML = `<article class="final-card">
    <div class="question-meta"><span>综合情景</span><b>${state.finalIndex + 1} / ${C.finalQuestions.length}</b></div>
    <h3>${q.question}</h3>
    <div class="options">${state.renderedOptions.map((o, i) =>
      `<button class="option" data-index="${i}"><span class="letter">${"ABCD"[i]}</span><span>${o.text}</span></button>`
    ).join("")}</div>
    <div class="feedback" id="finalFeedback"><div class="feedback-icon" id="finalFeedbackIcon"></div>
    <div><b id="finalFeedbackTitle"></b><p id="finalFeedbackText"></p></div></div>
    <button class="primary-btn next-btn" id="finalNext">继续 <span>→</span></button>
  </article>`;
  $("#finalScenario").querySelectorAll(".option").forEach(btn =>
    btn.addEventListener("click", () => answerFinal(Number(btn.dataset.index)))
  );
}

function answerFinal(choice) {
  const q = C.finalQuestions[state.finalIndex];
  const buttons = [...$("#finalScenario .options").children];
  const correctIndex = state.renderedOptions.findIndex(o => o.correct);
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === correctIndex) b.classList.add("correct");
    if (i === choice && choice !== correctIndex) b.classList.add("wrong");
  });
  const correct = choice === correctIndex;
  if (correct) { state.finalCorrect += 1; state.xp += 50; } else state.xp += 15;
  $("#finalFeedbackIcon").textContent = correct ? "✓" : "!";
  $("#finalFeedbackIcon").style.background = correct ? "#21744b" : "#e07a2d";
  $("#finalFeedbackTitle").textContent = correct ? "综合判断正确！" : "再稳妥一点";
  $("#finalFeedbackText").textContent = q.explanation;
  $("#finalFeedback").classList.add("show");
  $("#finalNext").classList.add("show");
  $("#finalNext").onclick = () => {
    state.finalIndex += 1;
    if (state.finalIndex < C.finalQuestions.length) renderFinal(); else showResult();
  };
  updateStatus();
}

function showResult() {
  $("#resultName").textContent = state.name;
  $("#resultCopy").textContent = `你完成了入职小百科探索，最高连续答对 ${state.bestStreak} 题。带着正确渠道、清晰流程和成长地图，开启建科新旅程吧。`;
  $("#resultXp").textContent = state.xp;
  $("#resultBadges").textContent = Object.keys(state.completed).length;
  $("#resultKnowledge").textContent = state.unlockedKnowledge.size;
  $("#badgeRack").innerHTML = C.stations.map(s =>
    `<div class="earned-badge"><i>${s.icon}</i><span>${s.badge}</span></div>`
  ).join("");
  showScreen("resultScreen");
}

function resetGame() {
  Object.assign(state, {
    name: "", xp: 0, correct: 0, streak: 0, bestStreak: 0,
    currentStation: null, questionIndex: 0, hintsLeft: 1,
    completed: {}, unlockedKnowledge: new Set(), renderedOptions: [],
    finalIndex: 0, finalCorrect: 0
  });
  C.stations.forEach(s => localStorage.removeItem(`progress_${s.id}`));
  $("#playerName").value = "";
  updateStatus();
  showScreen("welcomeScreen");
}

$("#startBtn").addEventListener("click", () => {
  state.name = $("#playerName").value.trim() || "新同事";
  $("#playerLabel").textContent = state.name;
  renderMap();
  showScreen("mapScreen");
});
$("#playerName").addEventListener("keydown", e => { if (e.key === "Enter") $("#startBtn").click(); });
$("#backToMap").addEventListener("click", () => { renderMap(); showScreen("mapScreen"); });
$("#nextBtn").addEventListener("click", nextQuestion);
$("#hintBtn").addEventListener("click", useHint);
$("#handbookBtn").addEventListener("click", showHandbook);
$("#closeHandbook").addEventListener("click", () => $("#handbookDialog").close());
$("#reviewBtn").addEventListener("click", showHandbook);
$("#restartBtn").addEventListener("click", resetGame);
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

updateStatus();
