const dataUrl = `./data/shorts-ops.json?ts=${Date.now()}`;
const progressKey = "coolhanna.shortsOps.progress.v1";
const formatter = new Intl.NumberFormat("ko-KR");
let dashboardData = null;
let activeChannel = "all";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function progress() {
  try {
    return JSON.parse(localStorage.getItem(progressKey) || "{}");
  } catch {
    return {};
  }
}

function setProgress(id, done) {
  const next = { ...progress(), [id]: done };
  localStorage.setItem(progressKey, JSON.stringify(next));
}

function channelLabel(id) {
  if (id === "food") return "먹거리";
  return "가족먹거리";
}

function renderOwnership(data) {
  document.getElementById("ownershipStrip").innerHTML = `
    <div><span>YouTube 분석</span><b>${escapeHtml(data.analyst.youtube)}</b></div>
    <div><span>숏폼 운영실</span><b>${escapeHtml(data.analyst.shortsOps)}</b></div>
    <p>${escapeHtml(data.analyst.rule)}</p>`;
}

function renderBrief(data) {
  document.getElementById("weeklyBrief").innerHTML = `
    <div class="brief-copy">
      <p class="eyebrow">이번 주 한 문장</p>
      <h2 id="briefTitle">${escapeHtml(data.brief.title)}</h2>
      <p>${escapeHtml(data.brief.why)}</p>
    </div>
    <div class="guardrail"><span>섞지 않을 것</span><strong>${escapeHtml(data.brief.guardrail)}</strong></div>`;
}

function renderActions(data) {
  const done = progress();
  document.getElementById("todayActions").innerHTML = data.todayActions
    .map((action, index) => `
      <article class="action-card ${done[action.id] ? "done" : ""}">
        <div class="card-top"><span class="channel-pill ${escapeHtml(action.channelId)}">${escapeHtml(channelLabel(action.channelId))}</span><span>${escapeHtml(action.type)}</span></div>
        <p class="action-order">${escapeHtml(action.slot)} · ${escapeHtml(action.actionSource)}</p>
        <h3>${escapeHtml(action.title)}</h3>
        <p class="evidence"><b>왜 지금?</b>${escapeHtml(action.evidence)}</p>
        <p><b>남길 결과물</b>${escapeHtml(action.deliverable)}</p>
        <button class="check-button" type="button" data-progress-id="${escapeHtml(action.id)}">${done[action.id] ? "완료됨 ✓" : escapeHtml(action.doneWhen)}</button>
      </article>`)
    .join("");
}

function renderChannels(data) {
  document.getElementById("channelBoard").innerHTML = data.channels
    .map((channel) => {
      const ratio = Math.min(100, Math.round((channel.publishedThisWeek / channel.weeklyTarget) * 100));
      return `<article class="channel-card ${escapeHtml(channel.id)}">
        <div class="channel-title"><div><span>${escapeHtml(channel.role)}</span><h3>${escapeHtml(channel.name)}</h3></div><strong>${channel.publishedThisWeek}/${channel.weeklyTarget}</strong></div>
        <div class="progress-track"><span style="width:${ratio}%"></span></div>
        <dl><div><dt>이번 주 성공 기준</dt><dd>${escapeHtml(channel.primaryMetric)}</dd></div><div><dt>판정 상태</dt><dd>${channel.gateEnabled ? `최근 ${channel.sampleSize}편 중앙값 사용` : `표본 ${channel.sampleSize}편 — 8편까지 판정 보류`}</dd></div><div><dt>다음 움직임</dt><dd>${escapeHtml(channel.nextMove)}</dd></div><div><dt>영상 공식</dt><dd>${escapeHtml(channel.rule)}</dd></div></dl>
      </article>`;
    })
    .join("");
}

function renderJudgementQueue(data) {
  const policy = data.queuePolicy;
  document.getElementById("queueLock").innerHTML = `
    <span>${policy.locked ? "새 아이디어 잠금" : "새 아이디어 가능"}</span>
    <strong>${escapeHtml(policy.message)}</strong>`;
  document.getElementById("judgementBoard").innerHTML = data.judgementQueue
    .map((item) => `<article class="judgement-card ${escapeHtml(item.channelId)}">
      <div class="card-top"><span class="channel-pill ${escapeHtml(item.channelId)}">${escapeHtml(channelLabel(item.channelId))}</span><span>${escapeHtml(item.platform)}</span></div>
      <div class="judgement-title"><div><span>${escapeHtml(item.checkpoint)} · ${escapeHtml(item.dueAt)}</span><h3>${escapeHtml(item.title)}</h3></div><em>${escapeHtml(item.status)}</em></div>
      <p class="early-signal">${escapeHtml(item.earlySignal)}</p>
      <dl><div><dt>비교 기준</dt><dd>${escapeHtml(item.baseline)}</dd></div><div><dt>판정 순서</dt><dd>${escapeHtml(item.gateOrder)}</dd></div><div><dt>판정 후 행동</dt><dd>${escapeHtml(item.nextDecision)}</dd></div></dl>
    </article>`)
    .join("");
}

function renderPipeline(data) {
  document.getElementById("pipelineBoard").innerHTML = data.pipeline
    .map((item) => `<article class="pipeline-row">
      <span class="channel-dot ${escapeHtml(item.channelId)}"></span>
      <div><span class="stage">${escapeHtml(item.stage)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.note)}</p></div>
      <div class="next-step"><span>다음</span><strong>${escapeHtml(item.next)}</strong><small>${escapeHtml(item.blocker === "없음" ? "막힘 없음" : item.blocker)}</small></div>
      ${item.sourcePath ? `<button class="copy-path" type="button" data-path="${escapeHtml(item.sourcePath)}">자료 경로 복사</button>` : ""}
    </article>`)
    .join("");
}

function renderEditing(data) {
  const item = data.editingTraining;
  const ratio = Math.round((item.reviewed / item.target) * 100);
  document.getElementById("editingBoard").innerHTML = `
    <div class="editing-score"><span>학습 완료</span><strong>${item.reviewed}/${item.target}</strong><div><i style="width:${ratio}%"></i></div></div>
    <div><span>대본형</span><strong>${escapeHtml(item.scripted)}</strong></div>
    <div><span>대본 없는 먹거리형</span><strong>${escapeHtml(item.unscripted)}</strong></div>
    <p><span>다음 녹화</span><b>${escapeHtml(item.next)}</b></p>`;
}

function renderLearning(data) {
  const videos = activeChannel === "all" ? data.ownVideos : data.ownVideos.filter((video) => video.channelId === activeChannel);
  document.getElementById("learningBoard").innerHTML = videos
    .map((video) => `<article class="learning-card">
      <div class="card-top"><span class="channel-pill ${escapeHtml(video.channelId)}">${escapeHtml(channelLabel(video.channelId))}</span><span>${escapeHtml(video.publishedAt)}</span></div>
      <a href="${escapeHtml(video.url)}" target="_blank" rel="noreferrer"><h3>${escapeHtml(video.title)}</h3></a>
      <div class="metric-row"><strong>${formatter.format(video.viewCount)}회</strong><span>${escapeHtml(video.metric)}</span></div>
      <p><b>배운 것</b>${escapeHtml(video.learning)}</p><p class="next-use"><b>다음 적용</b>${escapeHtml(video.nextUse)}</p>
    </article>`)
    .join("");
}

function renderWatch(data) {
  const done = progress();
  document.getElementById("watchBoard").innerHTML = data.watchToday
    .map((video, index) => `<article class="watch-card ${done[video.id] ? "done" : ""}">
      <div class="watch-index">0${index + 1}</div>
      <span class="lane-label">${escapeHtml(video.lane)}</span>
      <h3>${escapeHtml(video.title)}</h3><p class="creator">${escapeHtml(video.creator)} · ${escapeHtml(video.signal)}</p>
      <dl><div><dt>여기만 보기</dt><dd>${escapeHtml(video.watchFor)}</dd></div><div><dt>한나식 적용</dt><dd>${escapeHtml(video.hannaMove)}</dd></div><div><dt>버릴 것</dt><dd>${escapeHtml(video.avoid)}</dd></div></dl>
      <div class="watch-actions"><a href="${escapeHtml(video.url)}" target="_blank" rel="noreferrer">영상 열기 ↗</a><button class="check-button compact" type="button" data-progress-id="${escapeHtml(video.id)}">${done[video.id] ? "봤어요 ✓" : "보고 장치 채택"}</button></div>
    </article>`)
    .join("");
}

function renderExperiments(data) {
  document.getElementById("experimentBoard").innerHTML = data.experiments
    .map((experiment) => `<article class="experiment-card ${escapeHtml(experiment.channelId)}">
      <span>${escapeHtml(channelLabel(experiment.channelId))}</span><h3>${escapeHtml(experiment.title)}</h3>
      <p><b>가설</b>${escapeHtml(experiment.hypothesis)}</p><p><b>성공선</b>${escapeHtml(experiment.successMetric)}</p><p><b>그다음 결정</b>${escapeHtml(experiment.decisionRule)}</p>
      <div class="checkpoint-row">${experiment.checkpoints.map((item) => `<em>${escapeHtml(item)}</em>`).join("")}</div>
    </article>`)
    .join("");
  document.getElementById("decisionRules").innerHTML = data.decisionRules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("");
}

function renderDashboard(data) {
  dashboardData = data;
  document.getElementById("generatedAt").textContent = `${new Date(data.generatedAt).toLocaleString("ko-KR")} 갱신`;
  renderOwnership(data);
  renderBrief(data);
  renderActions(data);
  renderJudgementQueue(data);
  renderChannels(data);
  renderPipeline(data);
  renderEditing(data);
  renderLearning(data);
  renderWatch(data);
  renderExperiments(data);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 1800);
}

document.addEventListener("click", async (event) => {
  const check = event.target.closest("[data-progress-id]");
  if (check) {
    const id = check.dataset.progressId;
    setProgress(id, !progress()[id]);
    renderActions(dashboardData);
    renderWatch(dashboardData);
    return;
  }
  const filter = event.target.closest("[data-channel]");
  if (filter) {
    activeChannel = filter.dataset.channel;
    document.querySelectorAll(".filter-button").forEach((button) => button.classList.toggle("active", button === filter));
    renderLearning(dashboardData);
    return;
  }
  const copy = event.target.closest(".copy-path");
  if (copy) {
    await navigator.clipboard.writeText(copy.dataset.path);
    showToast("옵시디언 자료 경로를 복사했어요");
  }
});

document.getElementById("resetProgress").addEventListener("click", () => {
  localStorage.removeItem(progressKey);
  renderActions(dashboardData);
  renderWatch(dashboardData);
  showToast("오늘 체크를 초기화했어요");
});

fetch(dataUrl)
  .then((response) => {
    if (!response.ok) throw new Error(`데이터를 불러오지 못했습니다 (${response.status})`);
    return response.json();
  })
  .then(renderDashboard)
  .catch((error) => {
    document.querySelector("main").innerHTML = `<section class="load-error"><h2>숏폼 운영실을 열지 못했어요</h2><p>${escapeHtml(error.message)}</p><code>node scripts/generate-shorts-ops.mjs</code></section>`;
  });
