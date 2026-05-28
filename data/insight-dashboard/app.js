const deployedInsideCoolhanna =
  window.location.pathname.startsWith("/dashboard/insights") ||
  window.location.pathname.startsWith("/api/dashboard/proxy");
const dataUrl = deployedInsideCoolhanna
  ? `/api/dashboard/proxy/insights-data?ts=${Date.now()}`
  : `./data/dashboard-data.json?ts=${Date.now()}`;

const laneLabels = {
  hanna: "한나 관점",
  source: "외부 근거",
  signal: "반응 신호",
};

const laneOrder = ["hanna", "source", "signal"];

const formatter = new Intl.NumberFormat("ko-KR");
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const state = {
  data: null,
  docMap: new Map(),
  selectedDocId: null,
  readerOpen: false,
};

document.querySelectorAll(".rail-btn").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".rail-btn").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(button.dataset.view).classList.add("active");
  });
});

document.getElementById("refreshNotice").addEventListener("click", () => {
  document.getElementById("refreshDialog").showModal();
});

document.getElementById("closeDialog").addEventListener("click", () => {
  document.getElementById("refreshDialog").close();
});

document.getElementById("workbench").addEventListener("click", (event) => {
  const button = event.target.closest(".copy-output");
  if (!button) return;
  const theme = state.data.workbench[Number(button.dataset.themeIndex)];
  const output = button.dataset.output;
  if (!theme || !output) return;
  writeClipboard(buildOutputPrompt(theme, output))
    .then(() => showToast(`${output} 프롬프트 복사됨`))
    .catch(() => showToast("복사 권한을 확인해 주세요"));
});

document.querySelector("main").addEventListener("click", (event) => {
  const copyIntake = event.target.closest(".copy-intake");
  if (copyIntake) {
    const item = (state.data.intakePlan || []).find((entry) => entry.id === copyIntake.dataset.intakeId);
    if (!item) return;
    writeClipboard(item.prompt)
      .then(() => showToast(`${item.label} 프롬프트 복사됨`))
      .catch(() => showToast("복사 권한을 확인해 주세요"));
    return;
  }

  const copyCommand = event.target.closest(".copy-command");
  if (copyCommand) {
    writeClipboard(copyCommand.dataset.command || "")
      .then(() => showToast("명령어 복사됨"))
      .catch(() => showToast("복사 권한을 확인해 주세요"));
    return;
  }

  const button = event.target.closest(".open-doc");
  if (!button) return;
  event.preventDefault();
  selectDoc(button.dataset.docId, { open: true });
});

document.addEventListener("click", (event) => {
  const copyPrompt = event.target.closest(".copy-reader-prompt");
  if (copyPrompt) {
    const doc = state.docMap.get(copyPrompt.dataset.docId);
    if (!doc) return;
    writeClipboard(buildSingleDocPrompt(doc))
      .then(() => showToast("제작 프롬프트 복사됨"))
      .catch(() => showToast("복사 권한을 확인해 주세요"));
    return;
  }

  const copyPath = event.target.closest(".copy-doc-path");
  if (copyPath) {
    writeClipboard(copyPath.dataset.path || "")
      .then(() => showToast("Obsidian 경로 복사됨"))
      .catch(() => showToast("복사 권한을 확인해 주세요"));
  }
});

document.getElementById("closeReader").addEventListener("click", () => {
  closeReaderDrawer();
});

document.getElementById("globalSearch").addEventListener("input", (event) => {
  renderSearch(String(event.target.value || "").trim());
});

function number(value) {
  return formatter.format(value || 0);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function link(doc) {
  return `<button class="text-link open-doc" type="button" data-doc-id="${escapeHtml(doc.id)}" title="${escapeHtml(`${doc.title} · ${doc.path}`)}">${escapeHtml(displayTitle(doc))}</button>`;
}

function obsidianLink(doc, label = "Obsidian") {
  return `<a class="obsidian-link" href="${doc.url}" title="${escapeHtml(doc.path)}">${escapeHtml(label)}</a>`;
}

function externalLink(url, label) {
  if (!url) return escapeHtml(label || "");
  return `<a class="source-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label || url)}</a>`;
}

function truncate(value, max = 180) {
  const text = String(value || "").trim();
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

function compactReaderText(value, max = 560) {
  return truncate(String(value || "").replace(/\s+/g, " "), max);
}

function longReaderText(doc) {
  return String(doc.body || doc.preview || doc.excerpt || "");
}

function readerParagraphs(value) {
  const text = String(value || "").trim();
  if (!text) return '<p class="empty">본문 미리보기가 없습니다.</p>';
  return text
    .split(/\n{2,}/)
    .flatMap((block) => readableBlocks(block))
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
      const isList = lines.length > 1 && lines.every((line) => /^[-*]\s+/.test(line));
      if (isList) {
        return `<ul class="reader-list">${lines
          .map((line) => `<li>${escapeHtml(line.replace(/^[-*]\s+/, ""))}</li>`)
          .join("")}</ul>`;
      }
      return `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}

function readableBlocks(block) {
  const text = String(block || "").trim();
  if (text.length <= 780) return [text];
  const sentences = text
    .replace(/([.!?。？！]|다\.|요\.|죠\.|니다\.|어요\.|예요\.)\s+/g, "$1\n")
    .split("\n")
    .map((part) => part.trim())
    .filter(Boolean);
  const out = [];
  let current = "";
  for (const sentence of sentences.length ? sentences : [text]) {
    if ((current + " " + sentence).trim().length > 520 && current) {
      out.push(current.trim());
      current = sentence;
    } else {
      current = `${current} ${sentence}`.trim();
    }
  }
  if (current) out.push(current.trim());
  return out;
}

function surface(doc) {
  return doc.surface || {
    typeLabel: doc.groupLabel,
    context: doc.category || doc.intent || "",
    lead: doc.excerpt || doc.preview || "",
    facts: [],
    points: doc.bullets || [],
  };
}

function displayTitle(doc) {
  return surface(doc).shortTitle || doc.title;
}

function render() {
  const data = state.data;
  const generated = new Date(data.generatedAt);
  document.getElementById("generatedAt").textContent = `${dateFormatter.format(generated)} 스캔`;
  document.getElementById("allMarkdown").textContent = number(data.totals.scannedDocs);

  renderWorkbench(data);
  renderLaneBars(data);
  renderTodayFocus(data);
  renderGapBoard(data);
  renderSourceCards(data);
  renderExcludedCards(data);
  renderThemeBoard(data);
  renderHannaClusters(data);
  renderInnerBoard(data);
  renderRecentDocs(data);
  renderLibraryView(data);
  renderIntakeView(data);
  selectDoc(data.focusPicks?.[0]?.id || data.workbench?.[0]?.hannaDocs?.[0]?.id || data.allDocs?.[0]?.id);
}

function firstDoc(docs) {
  return docs && docs.length ? docs[0] : null;
}

function selectedLaneCounts(theme) {
  const counts = { hanna: 0, source: 0, signal: 0 };
  for (const doc of theme.docs || []) counts[doc.lane] = (counts[doc.lane] || 0) + 1;
  return counts;
}

function selectedSourceCounts(theme) {
  const counts = {};
  for (const doc of theme.docs || []) counts[doc.groupLabel] = (counts[doc.groupLabel] || 0) + 1;
  return counts;
}

function compactDoc(doc, fallback) {
  if (!doc) return `<span class="empty">${escapeHtml(fallback)}</span>`;
  const card = surface(doc);
  return `
    ${link(doc)}
    <small><b>${escapeHtml(card.typeLabel)}</b>${escapeHtml(card.context ? ` · ${card.context}` : "")}</small>
    <p>${escapeHtml(truncate(card.lead || doc.excerpt || doc.preview, 104))}</p>
  `;
}

function docBullets(doc, max = 3) {
  const bullets = (surface(doc).points?.length ? surface(doc).points : doc?.bullets || []).slice(0, max);
  if (!bullets.length) return "";
  return `<ul>${bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function docFacts(doc, max = 2) {
  const facts = (surface(doc).facts || []).filter(Boolean).slice(0, max);
  if (!facts.length) return "";
  return `<div class="fact-strip">${facts.map((item) => `<span>${escapeHtml(truncate(item, 72))}</span>`).join("")}</div>`;
}

function readerCoverageNote(doc) {
  const bodyLength = String(doc.body || doc.preview || "").length;
  const likelySourceSummary = bodyLength < 2200 && /유튜브|영상|강의|롱블랙|인사이트/.test(
    `${doc.groupLabel || ""} ${doc.category || ""} ${doc.title || ""}`,
  );
  if (!likelySourceSummary) return "";
  const linkText = doc.sourceUrl
    ? `<a href="${escapeHtml(doc.sourceUrl)}" target="_blank" rel="noreferrer">원본 링크</a>`
    : "";
  return `<p class="reader-coverage-note">현재 vault에 저장된 본문은 요약본 길이입니다. 더 긴 대본/전문을 수집하면 이 자리에서 이어서 읽을 수 있습니다. ${linkText}</p>`;
}

function docPreviewCard(doc, className = "preview-card") {
  const card = surface(doc);
  return `
    <article class="${className} lane-${escapeHtml(doc.lane)} type-${escapeHtml(doc.groupId)}">
      <div class="card-kicker">
        <b>${escapeHtml(card.typeLabel)}</b>
        <span>${escapeHtml(card.context || laneLabels[doc.lane] || "")}</span>
      </div>
      <h3>${link(doc)}</h3>
      <p class="card-lead">${escapeHtml(truncate(card.lead || doc.excerpt || doc.preview, 190))}</p>
      ${docFacts(doc, 2)}
      ${docBullets(doc, 2)}
      <div class="card-actions">
        <button class="ghost-mini open-doc" type="button" data-doc-id="${escapeHtml(doc.id)}">본문 이어보기</button>
      </div>
    </article>
  `;
}

function selectDoc(id, options = {}) {
  if (!id || !state.docMap.has(id)) return;
  state.selectedDocId = id;
  renderReader(state.docMap.get(id));
  if (options.open) openReaderDrawer();
}

function renderReader(doc) {
  const tags = (doc.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  const card = surface(doc);
  const html = `
    <header>
      <div>
        <span>${escapeHtml(card.typeLabel)}${escapeHtml(card.context ? ` · ${card.context}` : "")}</span>
        <h2>${escapeHtml(displayTitle(doc))}</h2>
      </div>
      <div class="reader-actions">
        <button class="ghost-mini copy-reader-prompt" type="button" data-doc-id="${escapeHtml(doc.id)}">제작 프롬프트</button>
        <button class="ghost-mini copy-doc-path" type="button" data-path="${escapeHtml(doc.path)}">경로 복사</button>
        ${doc.sourceUrl ? `<a class="ghost-mini" href="${escapeHtml(doc.sourceUrl)}" target="_blank" rel="noreferrer">원본 링크</a>` : ""}
      </div>
    </header>
    <p class="reader-lead">${escapeHtml(card.lead || doc.excerpt || "요약이 아직 없습니다.")}</p>
    ${docFacts(doc, 4)}
    ${docBullets(doc, 5)}
    <div class="reader-body-label">본문</div>
    <div class="reader-body long-reader">${readerParagraphs(longReaderText(doc) || doc.path)}</div>
    ${readerCoverageNote(doc)}
    ${doc.bodyTruncated ? '<p class="reader-more-note">긴 원문이라 대시보드에는 앞부분을 우선 불러왔습니다. 이어서 더 크게 확장할 수 있어요.</p>' : ""}
    <div class="reader-tags">${tags}</div>
  `;
  document.getElementById("readerPanel").innerHTML = html;
  document.getElementById("readerDrawerPanel").innerHTML = html;
}

function openReaderDrawer() {
  const drawer = document.getElementById("readerDrawer");
  drawer.hidden = false;
  requestAnimationFrame(() => drawer.classList.add("open"));
  state.readerOpen = true;
}

function closeReaderDrawer() {
  const drawer = document.getElementById("readerDrawer");
  drawer.classList.remove("open");
  state.readerOpen = false;
  setTimeout(() => {
    if (!state.readerOpen) drawer.hidden = true;
  }, 180);
}

function buildSingleDocPrompt(doc) {
  const card = surface(doc);
  return [
    `자료: ${doc.title}`,
    `분류: ${card.typeLabel} / ${card.context}`,
    `핵심: ${card.lead || doc.excerpt}`,
    `구분 정보: ${(card.facts || []).join(" / ")}`,
    "",
    `본문 맛보기: ${doc.preview}`,
    "",
    "이 자료를 한나 관점으로 바꿔줘.",
    "1. 핵심 통찰 3개",
    "2. 한나가 말할 수 있는 한 문장",
    "3. 릴스 훅 5개",
    "4. 뉴스레터 도입 1개",
    "5. 지금 사업/콘텐츠에 적용할 행동 3개",
  ].join("\n");
}

function balanceText(theme) {
  const counts = selectedLaneCounts(theme);
  const present = ["hanna", "source", "signal"].filter((lane) => counts[lane] > 0).length;
  if (present === 3) return "선별";
  if (counts.hanna && counts.source) return "반응 보강";
  if (counts.source && counts.signal) return "한나 관점 보강";
  return "재료 보강";
}

function promptDoc(label, doc) {
  if (!doc) return `- ${label}: 아직 없음`;
  return `- ${label}: ${doc.title} / ${doc.groupLabel}\n  ${doc.excerpt || doc.path}`;
}

function buildOutputPrompt(theme, output) {
  const hanna = firstDoc(theme.hannaDocs);
  const source = firstDoc(theme.sourceDocs);
  const signal = firstDoc(theme.signalDocs);
  return [
    `목표: ${output}로 바로 쓸 수 있는 한나식 관점 만들기`,
    `핵심 질문: ${theme.question}`,
    "",
    "재료:",
    promptDoc("한나 관점", hanna),
    promptDoc("외부 근거", source),
    promptDoc("반응 신호", signal),
    "",
    "출력:",
    "1. 한 문장 관점",
    "2. 첫 문장 훅 5개",
    "3. 본문 구조 3단계",
    "4. 바로 쓸 문장 7개",
    "5. 한나 말투로 더 날카롭게 고친 버전",
  ].join("\n");
}

async function writeClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 1800);
}

function renderWorkbench(data) {
  document.getElementById("workbench").innerHTML = (data.workbench || [])
    .map((theme, index) => {
      const hanna = firstDoc(theme.hannaDocs);
      const source = firstDoc(theme.sourceDocs);
      const signal = firstDoc(theme.signalDocs);
      const counts = selectedLaneCounts(theme);
      const mix = laneOrder
        .map((lane) => `<span>${laneLabels[lane]} ${number(counts[lane])}</span>`)
        .join("");
      const outputs = (theme.outputs || [])
        .map(
          (item) =>
            `<button class="copy-output" type="button" data-theme-index="${index}" data-output="${escapeHtml(item)}" title="${escapeHtml(item)} 프롬프트 복사">${escapeHtml(item)}</button>`,
        )
        .join("");
      return `
        <article class="work-card">
          <header>
            <div>
              <b>${escapeHtml(theme.label)}</b>
              <p>${escapeHtml(theme.question || "")}</p>
            </div>
            <strong><span>${escapeHtml(balanceText(theme))}</span>${number(theme.selectedCount || theme.docs.length)}</strong>
          </header>
          <div class="mix-strip">${mix}</div>
          <div class="absorb-row">
            <div class="absorb-lane hanna"><em>내 말</em>${compactDoc(hanna, "한나 관점 없음")}</div>
            <div class="absorb-lane source"><em>받쳐줄 근거</em>${compactDoc(source, "외부 근거 없음")}</div>
            <div class="absorb-lane signal"><em>반응 장면</em>${compactDoc(signal, "반응 신호 없음")}</div>
          </div>
          <div class="output-strip">${outputs}</div>
        </article>
      `;
    })
    .join("");
}

function renderLaneBars(data) {
  const laneTotals = laneOrder.map((lane) => ({
    lane,
    count: data.summaries.filter((item) => item.lane === lane).reduce((sum, item) => sum + item.count, 0),
  }));
  const max = Math.max(...laneTotals.map((item) => item.count), 1);
  document.getElementById("laneBars").innerHTML = laneTotals
    .map(
      (item) => `
        <div class="lane-bar">
          <span>${laneLabels[item.lane]}</span>
          <div class="track"><span class="fill ${item.lane}" style="width:${(item.count / max) * 100}%"></span></div>
          <strong>${number(item.count)}</strong>
        </div>
      `,
    )
    .join("");
}

function renderTodayFocus(data) {
  const picks = data.focusPicks || [];

  document.getElementById("todayCount").textContent = `${picks.length}개`;
  document.getElementById("todayFocus").innerHTML = picks
    .map(
      (doc) => `
        <div class="focus-item">
          <em>${escapeHtml(doc.reason || doc.intent || doc.groupLabel)}</em>
          <strong>${link(doc)}</strong>
          <span>얻을 것: ${escapeHtml(doc.output || doc.excerpt || "")}</span>
        </div>
      `,
    )
    .join("");
}

function renderGapBoard(data) {
  document.getElementById("gapBoard").innerHTML = (data.gapBoard || [])
    .map(
      (item) => `
        <article class="gap-card ${escapeHtml(item.weakLane)}">
          <span>${escapeHtml(item.weakLabel)} ${number(item.weakCount)}</span>
          <strong>${escapeHtml(item.label)}</strong>
          <p>${escapeHtml(item.question)}</p>
          <b>${escapeHtml(item.action)}</b>
        </article>
      `,
    )
    .join("");
}

function renderSourceCards(data) {
  document.getElementById("sourceCards").innerHTML = data.summaries
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .map(
      (item) => `
        <article class="metric-card ${item.lane}">
          <b>${number(item.count)}</b>
          <strong>${escapeHtml(item.label)}</strong>
          <span>${laneLabels[item.lane]}</span>
        </article>
      `,
    )
    .join("");
}

function renderExcludedCards(data) {
  document.getElementById("excludedCards").innerHTML = (data.excluded || [])
    .map(
      (item) => `
        <article class="metric-card muted-card">
          <b>${number(item.count)}</b>
          <strong>${escapeHtml(item.label)}</strong>
          <span>이 화면에서 제외</span>
        </article>
      `,
    )
    .join("");
}

function renderLibraryBars(data) {
  const categories = data.libraryCategories || [];
  const max = Math.max(...categories.map((item) => item.count), 1);
  document.getElementById("libraryBars").innerHTML = categories
    .map(
      (item) => `
        <div class="library-row">
          <span>${escapeHtml(item.label)}</span>
          <div class="track"><span class="fill external" style="width:${(item.count / max) * 100}%"></span></div>
          <strong>${number(item.count)}</strong>
        </div>
      `,
    )
    .join("");
}

function renderLibraryView(data) {
  renderLibraryBars(data);
  document.getElementById("libraryBoard").innerHTML = (data.libraryDocs || [])
    .map((doc) => docPreviewCard(doc, "insight-card library-card"))
    .join("");
}

function renderIntakeView(data) {
  const aiRadarNote = document.getElementById("aiRadarNote");
  if (aiRadarNote) {
    aiRadarNote.textContent = data.aiRadarNote || "X, YouTube, Reels에서 발견한 변화 중 지금 써볼 것만 봅니다.";
    aiRadarNote.classList.toggle("stale-note", Boolean(data.aiRadarIsStale));
  }

  document.getElementById("intakeBoard").innerHTML = (data.intakePlan || [])
    .map(
      (item) => `
        <article class="intake-card">
          <header>
            <div>
              <h3>${escapeHtml(item.label)}</h3>
              <p>${escapeHtml(item.lead)}</p>
            </div>
            <strong>${number(item.count)}</strong>
          </header>
          <button class="ghost-mini copy-intake" type="button" data-intake-id="${escapeHtml(item.id)}">정리 프롬프트 복사</button>
        </article>
      `,
    )
    .join("");

  const plan = data.aiRadarAutomationPlan || {};
  document.getElementById("radarAutomation").innerHTML = `
    <header>
      <div>
        <h3>자동 수집 코드</h3>
        <p>${escapeHtml(plan.saveRule || "YouTube는 자동 수집하고, Reels/X/Instagram은 링크 인박스로 받습니다.")}</p>
      </div>
      <button class="ghost-mini copy-command" type="button" data-command="${escapeHtml(plan.command || "")}">실행 명령 복사</button>
    </header>
    <div class="automation-grid">
      <div>
        <span>저장 위치</span>
        <strong>${escapeHtml(plan.outputRoot || "")}</strong>
      </div>
      <div>
        <span>DM 수집함</span>
        <strong>${escapeHtml(plan.dmOutputRoot || "")}</strong>
      </div>
      <div>
        <span>YouTube 자동</span>
        <strong>${number(plan.autoCount || 0)}개 소스</strong>
        <small>${escapeHtml((plan.autoSources || []).join(", "))}</small>
      </div>
      <div>
        <span>링크 인박스</span>
        <strong>${number(plan.manualCount || 0)}개 소스</strong>
        <small>${escapeHtml((plan.manualSources || []).join(", "))}</small>
      </div>
      <div>
        <span>Instagram 추적</span>
        <strong>Apify + OCR</strong>
        <small>${escapeHtml(plan.instagramTrackCommand || "")}</small>
        <button class="ghost-mini copy-command" type="button" data-command="${escapeHtml(plan.instagramTrackCommand || "")}">복사</button>
      </div>
      <div>
        <span>단일 게시물</span>
        <strong>링크 하나 바로 저장</strong>
        <small>${escapeHtml(plan.instagramSingleCommand || "")}</small>
        <button class="ghost-mini copy-command" type="button" data-command="${escapeHtml(plan.instagramSingleCommand || "")}">복사</button>
      </div>
      <div>
        <span>이미지/OCR</span>
        <strong>게시물 캡처 분석</strong>
        <small>${escapeHtml(plan.ocrCommand || "")}</small>
      </div>
      <div>
        <span>캐러셀 넘기기</span>
        <strong>캡처 + 오른쪽 이동</strong>
        <small>${escapeHtml(plan.carouselCommand || "")}</small>
      </div>
      <div>
        <span>테스트</span>
        <strong>${escapeHtml(plan.dryRunCommand || "")}</strong>
      </div>
      <div>
        <span>DM 목록 미리보기</span>
        <strong>읽음 위험 낮게 분류</strong>
        <small>${escapeHtml(plan.dmInboxCommand || "")}</small>
        <button class="ghost-mini copy-command" type="button" data-command="${escapeHtml(plan.dmInboxCommand || "")}">복사</button>
      </div>
      <div>
        <span>열린 DM 저장</span>
        <strong>답장 전송 없이 사연화</strong>
        <small>${escapeHtml(plan.dmThreadCommand || "")}</small>
        <button class="ghost-mini copy-command" type="button" data-command="${escapeHtml(plan.dmThreadCommand || "")}">복사</button>
      </div>
    </div>
  `;

  document.getElementById("radarLineup").innerHTML = (data.aiRadarLineup || [])
    .map(
      (group) => `
        <section class="radar-group">
          <div class="radar-group-head">
            <div>
              <span>${escapeHtml(group.cadence || "")}</span>
              <h3>${escapeHtml(group.label)}</h3>
              <p>${escapeHtml(group.job || "")}</p>
            </div>
          </div>
          <div class="radar-source-grid">
            ${(group.sources || [])
              .map(
                (source) => `
                  <article class="radar-source-card priority-${escapeHtml(source.priority || "watch")}">
                    <header>
                      <span>${escapeHtml(source.platform || "")}</span>
                      <b>${escapeHtml(source.priority || "watch")}</b>
                    </header>
                    <h4>${externalLink(source.url, source.name)}</h4>
                    <em>${escapeHtml(source.handle || "")}</em>
                    <p>${escapeHtml(source.role || "")}</p>
                    <small>뽑을 것: ${escapeHtml(source.extract || "")}</small>
                    <strong>${escapeHtml(source.fit || "")}</strong>
                  </article>
                `,
              )
              .join("")}
          </div>
        </section>
      `,
    )
    .join("");

  document.getElementById("radarWorkflow").innerHTML = (data.aiRadarWorkflow || [])
    .map(
      (item) => `
        <article class="workflow-card">
          <span>${escapeHtml(item.step)}</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.body)}</p>
        </article>
      `,
    )
    .join("");

  document.getElementById("radarFields").innerHTML = (data.aiRadarOutputFields || [])
    .map((item) => `<span>${escapeHtml(item)}</span>`)
    .join("");

  const radarPrompt = document.getElementById("copyRadarPrompt");
  if (radarPrompt) {
    radarPrompt.onclick = () => {
      writeClipboard(data.aiRadarPrompt || "")
        .then(() => showToast("AI 레이더 프롬프트 복사됨"))
        .catch(() => showToast("복사 권한을 확인해 주세요"));
    };
  }
}

function renderThemeBoard(data) {
  document.getElementById("themeBoard").innerHTML = data.themeBoard
    .filter((theme) => theme.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((theme) => {
      const sources = Object.entries(selectedSourceCounts(theme))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, count]) => `<span class="chip">${escapeHtml(label)} ${number(count)}</span>`)
        .join("");
      const docs = theme.docs.slice(0, 4).map((doc) => docPreviewCard(doc, "theme-doc")).join("");

      return `
        <article class="theme-card">
          <header>
            <h2>${escapeHtml(theme.label)}</h2>
            <strong>${number(theme.selectedCount || theme.docs.length)}</strong>
          </header>
          <p>${escapeHtml(theme.outcome || "")}</p>
          <div class="chips">${sources}</div>
          <div class="theme-docs">${docs}</div>
        </article>
      `;
    })
    .join("");
}

function renderHannaClusters(data) {
  document.getElementById("hannaClusters").innerHTML = (data.hannaClusters || [])
    .map(
      (cluster) => `
        <article class="cluster-card">
          <header>
            <h3>${escapeHtml(cluster.label)}</h3>
            <strong>${number(cluster.count)}</strong>
          </header>
          <div class="mini-list">
            ${cluster.docs
              .slice(0, 4)
              .map(
                (doc) => `
                  <button class="cluster-doc open-doc" type="button" data-doc-id="${escapeHtml(doc.id)}">
                    <b>${escapeHtml(displayTitle(doc))}</b>
                    <span>${escapeHtml(truncate(surface(doc).lead || doc.excerpt || doc.preview, 90))}</span>
                  </button>
                `,
              )
              .join("")}
          </div>
        </article>
      `,
    )
    .join("");
}

function renderInnerBoard(data) {
  document.getElementById("innerBoard").innerHTML = (data.hannaBoard || [])
    .map(
      (doc) => docPreviewCard(doc, "insight-card"),
    )
    .join("");
}

function renderRecentDocs(data) {
  document.getElementById("recentDocs").innerHTML = data.recentDocs
    .map(
      (doc) => `
        <article class="doc-row">
          <strong>${escapeHtml(doc.groupLabel)}</strong>
          <div>
            ${link(doc)}
            <p>${escapeHtml(surface(doc).lead || doc.excerpt || doc.path)}</p>
          </div>
          <button class="ghost-mini open-doc" type="button" data-doc-id="${escapeHtml(doc.id)}">읽기</button>
          <span>${dateFormatter.format(new Date(doc.modified))}</span>
        </article>
      `,
    )
    .join("");
}

function renderSearch(query) {
  const panel = document.getElementById("searchPanel");
  if (!query) {
    panel.hidden = true;
    document.getElementById("searchResults").innerHTML = "";
    return;
  }

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const searchableDocs = state.data.searchDocs || state.data.allDocs || [];
  const results = searchableDocs
    .map((doc) => {
      const fields = {
        title: `${displayTitle(doc)} ${doc.title} ${doc.groupLabel} ${doc.mode} ${doc.intent} ${surface(doc).typeLabel}`.toLowerCase(),
        tags: `${doc.tags?.join(" ") || ""} ${doc.category || ""}`.toLowerCase(),
        excerpt: `${doc.excerpt || ""} ${surface(doc).lead || ""} ${(surface(doc).facts || []).join(" ")}`.toLowerCase(),
        preview: `${doc.preview || ""}`.toLowerCase(),
        path: `${doc.path || ""}`.toLowerCase(),
      };
      const score = terms.reduce((sum, term) => {
        if (fields.title.includes(term)) return sum + 5;
        if (fields.tags.includes(term)) return sum + 3;
        if (fields.excerpt.includes(term)) return sum + 2;
        if (fields.preview.includes(term)) return sum + 1;
        if (fields.path.includes(term)) return sum + 0.2;
        return sum;
      }, 0);
      return { doc, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.doc.modified.localeCompare(a.doc.modified))
    .slice(0, 12)
    .map((item) => item.doc);

  panel.hidden = false;
  document.getElementById("searchSummary").textContent = `${number(results.length)}개 표시 / 전체 ${number(searchableDocs.length)}개에서 검색`;
  document.getElementById("searchResults").innerHTML =
    results.length > 0
      ? results.map((doc) => docPreviewCard(doc, "search-card")).join("")
      : `<p class="empty">검색 결과가 없습니다.</p>`;
}

fetch(dataUrl)
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then((data) => {
    state.data = data;
    const docsForMap = data.searchDocs || data.allDocs || [];
    state.docMap = new Map(docsForMap.map((doc) => [doc.id, doc]));
    render();
  })
  .catch((error) => {
    document.querySelector("main").innerHTML = `
      <section class="signal-panel">
        <h1>데이터를 먼저 만들어야 해요</h1>
        <p>${escapeHtml(error.message)}</p>
        <p><code>node scripts/generate-data.mjs</code> 실행 후 다시 열면 됩니다.</p>
      </section>
    `;
  });
