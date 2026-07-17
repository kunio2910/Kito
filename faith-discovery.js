const letters = ["A", "B", "C", "D"];
let faithSets = [];
let activeFaithSetIndex = 0;
let activeFaithQuestions = [];
let activeFaithMasks = [];
let faithCurrentIndex = 0;
let openedPieces = new Set();
let faithModalIndex = null;
let faithModalCloseTimer = null;
let faithCompletionTimer = null;
let faithCompletionPending = false;
let faithCompletionShown = false;
let faithSetPickerPage = 1;
const faithSetPageSize = 12;
const legacyFaithPickerSampleImages = ["/assets/faith-picker-maria.jpg", "assets/faith-picker-maria.jpg"];

function cleanFaithPickerImageUrl(value) {
  const imageUrl = String(value || "").trim();
  return legacyFaithPickerSampleImages.includes(imageUrl) ? "" : imageUrl;
}

function normalizeFaithQuestion(question) {
  if (!question || typeof question !== "object") return null;
  const options = Array.isArray(question.options)
    ? question.options.map((option) => String(option || "").trim()).filter(Boolean)
    : [];
  const answer = Number(question.answer);
  const topic = String(question.topic || "").trim();
  const questionText = String(question.question || "").trim();

  if (!questionText || options.length < 2 || Number.isNaN(answer) || answer < 0 || answer >= options.length) {
    return null;
  }

  return {
    topic: topic || `Câu hỏi ${activeFaithQuestions.length + 1}`,
    question: questionText,
    options,
    answer,
    explanation: String(question.explanation || "").trim(),
  };
}

function normalizeFaithQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.map(normalizeFaithQuestion).filter(Boolean);
}

function normalizeFaithMask(mask) {
  if (!mask || typeof mask !== "object") return null;
  const x = Number(mask.x);
  const y = Number(mask.y);
  const w = Number(mask.w);
  const h = Number(mask.h);
  if ([x, y, w, h].some((value) => Number.isNaN(value))) return null;
  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
    w: Math.max(1, Math.min(100, w)),
    h: Math.max(1, Math.min(100, h)),
  };
}

function normalizeFaithMasks(masks) {
  return Array.isArray(masks) ? masks.map(normalizeFaithMask).filter(Boolean) : [];
}

function escapeFaithHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeFaithSet(set, index) {
  if (!set || typeof set !== "object") return null;
  const questions = normalizeFaithQuestions(set.questions);
  if (!questions.length) return null;

  return {
    id: String(set.id || `faith-set-${index + 1}`).trim(),
    title: String(set.title || `Bộ ${index + 1}`).trim(),

    pickerImageUrl: cleanFaithPickerImageUrl(set.pickerImageUrl),
    bannerImageUrl: String(set.bannerImageUrl || "").trim(),
    infographicUrl: String(set.infographicUrl || "").trim(),
    masks: normalizeFaithMasks(set.masks),
    questions,
  };
}

function settingsToFaithSets(settings) {
  const configuredSets = Array.isArray(settings?.sets)
    ? settings.sets.map(normalizeFaithSet).filter(Boolean)
    : [];

  if (configuredSets.length) return configuredSets;

  const legacyQuestions = normalizeFaithQuestions(settings?.questions);
  if (legacyQuestions.length) {
    return [
      {
        id: "legacy-faith-set",
        title: String(settings?.title || "Khám Phá Đức Tin").trim() || "Khám Phá Đức Tin",

        pickerImageUrl: cleanFaithPickerImageUrl(settings?.pickerImageUrl),
        bannerImageUrl: String(settings?.bannerImageUrl || "").trim(),
        infographicUrl: String(settings?.infographicUrl || "").trim(),
        masks: normalizeFaithMasks(settings?.masks),
        questions: legacyQuestions,
      },
    ];
  }

  return [];
}

async function loadFaithDiscoverySettings() {
  if (typeof getFaithDiscoverySettings !== "function") return;

  try {
    const settings = await getFaithDiscoverySettings();
    faithSets = settingsToFaithSets(settings);
    const activeIndex = faithSets.findIndex((set) => set.id === settings?.activeSetId);
    activeFaithSetIndex = activeIndex >= 0 ? activeIndex : 0;
    applyFaithSet(activeFaithSetIndex, { reset: false });
  } catch (error) {
    console.warn("Không thể tải cấu hình Khám Phá Đức Tin.", error);
  }
}

function renderFaithSetSwitcher() {
  const switcher = document.getElementById("faithSetSwitcher");
  if (!switcher) return;

  if (faithSets.length <= 1) {
    switcher.innerHTML = "";
    switcher.hidden = true;
    return;
  }

  switcher.hidden = false;
  switcher.innerHTML = faithSets
    .map(
      (set, index) => `
        <button class="${index === activeFaithSetIndex ? "active" : ""}" type="button" data-index="${index}">
          ${escapeFaithHtml(set.title)}
        </button>
      `
    )
    .join("");

  switcher.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => applyFaithSet(Number(button.dataset.index)));
  });
}

function setFaithHeroBanner(imageUrl) {
  const hero = document.querySelector(".faith-hero-panel");
  if (!hero) return;

  const bannerUrl = String(imageUrl || "").trim();
  if (!bannerUrl) {
    hero.classList.remove("has-banner-image");
    hero.style.removeProperty("--faith-banner-image");
    return;
  }

  const safeUrl = bannerUrl.replace(/"/g, "%22");
  hero.style.setProperty("--faith-banner-image", `url("${safeUrl}")`);
  hero.classList.add("has-banner-image");
}

function visibleFaithSets() {
  const searchInput = document.getElementById("faithSetSearch");
  const sortSelect = document.getElementById("faithSetSort");
  const keyword = String(searchInput?.value || "").trim().toLowerCase();
  const sortValue = sortSelect?.value || "default";
  const collator = new Intl.Collator("vi", { sensitivity: "base", numeric: true });

  const filtered = faithSets
    .map((set, index) => ({ set, index }))
    .filter(({ set }) => {
      if (!keyword) return true;
      return `${set.title || ""} ${set.questions?.length || 0}`.toLowerCase().includes(keyword);
    });

  if (sortValue === "title-asc") {
    filtered.sort((a, b) => collator.compare(a.set.title || "", b.set.title || ""));
  } else if (sortValue === "title-desc") {
    filtered.sort((a, b) => collator.compare(b.set.title || "", a.set.title || ""));
  } else if (sortValue === "questions-desc") {
    filtered.sort((a, b) => (b.set.questions?.length || 0) - (a.set.questions?.length || 0));
  } else if (sortValue === "questions-asc") {
    filtered.sort((a, b) => (a.set.questions?.length || 0) - (b.set.questions?.length || 0));
  }

  return filtered;
}

function renderFaithSetPagination(totalItems) {
  const pagination = document.getElementById("faithSetPagination");
  if (!pagination) return;
  const pageCount = Math.ceil(totalItems / faithSetPageSize);
  if (pageCount <= 1) {
    pagination.innerHTML = "";
    pagination.hidden = true;
    return;
  }

  pagination.hidden = false;
  pagination.innerHTML = Array.from({ length: pageCount }, (_, index) => {
    const page = index + 1;
    return `<button class="${page === faithSetPickerPage ? "active" : ""}" type="button" data-page="${page}">${page}</button>`;
  }).join("");

  pagination.querySelectorAll("button[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      faithSetPickerPage = Number(button.dataset.page) || 1;
      renderSetPicker();
    });
  });
}

function renderSetPicker() {
  const grid = document.getElementById("faithSetPickerGrid");
  if (!grid) return;

  if (!faithSets.length) {
    grid.innerHTML = `<p class="admin-empty-note">Chưa có bộ câu hỏi để chọn.</p>`;
    return;
  }

  const visibleSets = visibleFaithSets();
  const pageCount = Math.max(1, Math.ceil(visibleSets.length / faithSetPageSize));
  faithSetPickerPage = Math.min(Math.max(1, faithSetPickerPage), pageCount);
  const start = (faithSetPickerPage - 1) * faithSetPageSize;
  const pageItems = visibleSets.slice(start, start + faithSetPageSize);

  if (!pageItems.length) {
    grid.innerHTML = `<p class="admin-empty-note">Không tìm thấy chủ đề phù hợp.</p>`;
    renderFaithSetPagination(visibleSets.length);
    return;
  }

  grid.innerHTML = pageItems
    .map(({ set, index }) => `
      <button class="faith-picker-item" type="button" data-index="${index}">
        <span>${set.questions.length} câu hỏi</span>
        <strong>${escapeFaithHtml(set.title || `Bộ ${index + 1}`)}</strong>
      </button>
    `)
    .join("");

  grid.querySelectorAll("button[data-index]").forEach((button) => {
    const set = faithSets[Number(button.dataset.index)];
    const pickerImageUrl = cleanFaithPickerImageUrl(set?.pickerImageUrl);

    if (pickerImageUrl) {
      const image = document.createElement("img");
      image.className = "faith-picker-item-image";
      image.src = pickerImageUrl;
      image.alt = "";
      image.decoding = "async";
      image.loading = "eager";
      button.classList.add("has-image");
      button.prepend(image);
      button.querySelector("span")?.remove();
      button.querySelector("strong")?.remove();
      button.setAttribute("aria-label", set?.title || "Bộ câu hỏi");
    }

    button.addEventListener("click", () => startFaithSet(Number(button.dataset.index)));
  });
  renderFaithSetPagination(visibleSets.length);
}

function showSetPicker() {
  const picker = document.getElementById("faithSetPicker");
  const game = document.querySelector(".faith-game");
  document.body.classList.add("faith-choosing-set");
  if (picker) picker.hidden = false;
  if (game) game.hidden = true;
  setFaithHeroBanner("");
  renderSetPicker();
}

function startFaithSet(index) {
  applyFaithSet(index, { reset: false });
  faithCurrentIndex = 0;
  openedPieces = new Set();
  document.querySelectorAll(".faith-mask-tile").forEach((tile) => tile.classList.remove("is-open"));
  buildFaithMasks();
  updateFaithProgress();
  const picker = document.getElementById("faithSetPicker");
  const game = document.querySelector(".faith-game");
  document.body.classList.remove("faith-choosing-set");
  if (picker) picker.hidden = true;
  if (game) game.hidden = false;
  renderFaithQuestion();
}
function applyFaithSet(index, options = {}) {
  const selectedSet = faithSets[index] || faithSets[0];
  if (!selectedSet) {
    renderEmptyFaithState();
    return;
  }

  activeFaithSetIndex = faithSets[index] ? index : 0;
  activeFaithQuestions = selectedSet.questions;
  activeFaithMasks = normalizeFaithMasks(selectedSet.masks);
  const title = document.getElementById("faithPageTitle");
  const subtitle = document.getElementById("faithPageSubtitle");
  if (title) title.textContent = "Khám Phá Đức Tin";
  if (subtitle) subtitle.textContent = "Trả lời đúng từng câu hỏi để mở các mảnh hình trong infographic đã được chuẩn bị.";
  setFaithHeroBanner(selectedSet.bannerImageUrl);
  const image = document.getElementById("faithInfographicImage");
  if (image) {
    image.onload = () => buildFaithMasks();
    if (selectedSet.infographicUrl) {
      image.src = selectedSet.infographicUrl;
      image.hidden = false;
    } else {
      image.removeAttribute("src");
      image.hidden = true;
    }
  }
  if (options.reset !== false) {
    buildFaithMasks();
    restartFaithGame();
  }
  renderFaithSetSwitcher();
}

function renderEmptyFaithState() {
  activeFaithQuestions = [];
  const step = document.getElementById("faithStep");
  const topic = document.getElementById("faithTopic");
  const badge = document.getElementById("faithQuestionBadge");
  const question = document.getElementById("faithQuestion");
  const options = document.getElementById("faithOptions");
  const feedback = document.getElementById("faithFeedback");
  const progressText = document.getElementById("faithProgressText");
  const progressBar = document.getElementById("faithProgressBar");
  const score = document.getElementById("faithScore");
  const title = document.getElementById("faithPageTitle");
  const subtitle = document.getElementById("faithPageSubtitle");
  const maskGrid = document.getElementById("faithMaskGrid");
  const image = document.getElementById("faithInfographicImage");
  const nextButton = document.getElementById("faithNextButton");
  const restartButton = document.getElementById("faithRestartButton");

  if (step) step.textContent = "Chưa có bộ";
  if (topic) topic.textContent = "Cần cấu hình";
  if (badge) badge.textContent = "Chưa có câu hỏi";
  if (question) question.textContent = "Chưa có bộ câu hỏi Khám Phá Đức Tin. Vui lòng thêm trong trang quản lý.";
  if (options) options.innerHTML = "";
  if (feedback) {
    feedback.textContent = "";
    feedback.className = "faith-feedback";
  }
  if (progressText) progressText.textContent = "Đã mở 0/0 mảnh";
  if (progressBar) progressBar.style.width = "0%";
  if (score) score.textContent = "0";
  if (title) title.textContent = "Khám Phá Đức Tin";
  if (subtitle) subtitle.textContent = "Vui lòng thêm bộ câu hỏi và infographic trong trang quản lý.";
  setFaithHeroBanner("");
  if (maskGrid) maskGrid.innerHTML = "";
  if (image) {
    image.removeAttribute("src");
    image.hidden = true;
  }
  if (nextButton) nextButton.disabled = true;
  if (restartButton) restartButton.hidden = true;
  renderFaithSetSwitcher();
}

function getFaithInfographicAspectRatio() {
  const image = document.getElementById("faithInfographicImage");
  if (image?.naturalWidth && image?.naturalHeight) {
    return image.naturalWidth / image.naturalHeight;
  }

  return 3 / 4;
}

function getFaithMaskGridSize(total) {
  const targetAspect = getFaithInfographicAspectRatio();
  if (targetAspect < 1 && total === 12) return { columns: 3, rows: 4 };
  if (targetAspect < 1 && total === 20) return { columns: 4, rows: 5 };
  let best = {
    columns: Math.ceil(Math.sqrt(total)),
    rows: Math.ceil(total / Math.ceil(Math.sqrt(total))),
    score: Number.POSITIVE_INFINITY,
  };

  for (let columns = 1; columns <= total; columns += 1) {
    const rows = Math.ceil(total / columns);
    const cellCount = columns * rows;
    const emptyCells = cellCount - total;
    const gridAspect = columns / rows;
    const aspectScore = Math.abs(gridAspect - targetAspect);
    const emptyPenalty = emptyCells * 0.22;
    const orientationPenalty = targetAspect < 1 && columns > rows ? 0.35 : 0;
    const score = aspectScore + emptyPenalty + orientationPenalty;

    if (score < best.score) {
      best = { columns, rows, score };
    }
  }

  return best;
}

function buildFaithMasks() {
  const maskGrid = document.getElementById("faithMaskGrid");
  if (!maskGrid) return;
  if (!activeFaithQuestions.length) {
    maskGrid.innerHTML = "";
    return;
  }

  const total = activeFaithQuestions.length || 1;
  const { columns, rows } = getFaithMaskGridSize(total);
  const edgeGap = 0;
  const tileGap = 0;
  const tileHeight = (100 - edgeGap * 2 - tileGap * (rows - 1)) / rows;
  const hasManualMasks = activeFaithMasks.length === activeFaithQuestions.length;

  maskGrid.innerHTML = activeFaithQuestions
    .map((_, index) => {
      let left;
      let top;
      let tileWidth;
      let height;

      if (hasManualMasks) {
        const mask = activeFaithMasks[index];
        left = mask.x;
        top = mask.y;
        tileWidth = mask.w;
        height = mask.h;
      } else {
        const row = Math.floor(index / columns);
        const col = index % columns;
        const isLastRow = row === rows - 1;
        const remainingInLastRow = total - row * columns;
        const cellsInRow = isLastRow ? remainingInLastRow : columns;
        tileWidth = (100 - edgeGap * 2 - tileGap * (cellsInRow - 1)) / cellsInRow;
        height = tileHeight;
        left = edgeGap + col * (tileWidth + tileGap);
        top = edgeGap + row * (tileHeight + tileGap);
      }

      return `
        <button
          class="faith-mask-tile ${openedPieces.has(index) ? "is-open" : ""}"
          type="button"
          data-index="${index}"
          aria-label="Mở câu hỏi ${index + 1}"
          style="left:${left}%;top:${top}%;width:${tileWidth}%;height:${height}%"
        >
          <span class="faith-lock-icon" aria-hidden="true"></span>
        </button>
      `;
    })
    .join("");

  maskGrid.querySelectorAll(".faith-mask-tile").forEach((tile) => {
    tile.addEventListener("click", () => openFaithQuestionModal(Number(tile.dataset.index)));
  });
}

function updateFaithProgress() {
  const progressText = document.getElementById("faithProgressText");
  const progressBar = document.getElementById("faithProgressBar");
  const score = document.getElementById("faithScore");
  const opened = openedPieces.size;
  const total = activeFaithQuestions.length || 1;
  const percent = (opened / total) * 100;

  if (progressText) {
    progressText.textContent = `Đã mở ${opened}/${activeFaithQuestions.length} mảnh`;
  }
  if (progressBar) {
    progressBar.style.width = `${percent}%`;
  }
  if (score) {
    score.textContent = String(opened);
  }
}

function renderFaithQuestion() {
  const item = activeFaithQuestions[faithCurrentIndex];
  const step = document.getElementById("faithStep");
  const topic = document.getElementById("faithTopic");
  const badge = document.getElementById("faithQuestionBadge");
  const question = document.getElementById("faithQuestion");
  const options = document.getElementById("faithOptions");
  const feedback = document.getElementById("faithFeedback");
  const nextButton = document.getElementById("faithNextButton");
  const restartButton = document.getElementById("faithRestartButton");

  if (!item || !options) {
    renderEmptyFaithState();
    return;
  }

  if (step) step.textContent = `Câu ${faithCurrentIndex + 1}/${activeFaithQuestions.length}`;
  if (badge) badge.textContent = `Câu hỏi ${faithCurrentIndex + 1}/${activeFaithQuestions.length}`;
  if (topic) topic.textContent = item.topic;
  if (question) question.textContent = item.question;
  if (feedback) {
    feedback.textContent = "";
    feedback.className = "faith-feedback";
  }
  if (nextButton) nextButton.disabled = true;
  if (restartButton) restartButton.hidden = true;

  const isAnswered = openedPieces.has(faithCurrentIndex);
  options.innerHTML = item.options
    .map((option, index) => `
      <button class="faith-option ${isAnswered && index === item.answer ? "is-correct" : ""}" type="button" data-index="${index}" ${isAnswered ? "disabled" : ""}>
        <span>${letters[index]}</span>
        ${escapeFaithHtml(option)}
      </button>
    `)
    .join("");

  if (isAnswered && feedback) {
    feedback.textContent = "Câu này đã hoàn thành. Bạn có thể chọn câu khác để tiếp tục.";
    feedback.className = "faith-feedback is-correct";
  }

  options.querySelectorAll(".faith-option").forEach((button) => {
    button.addEventListener("click", () => chooseFaithAnswer(Number(button.dataset.index)));
  });
}

function renderFaithQuestionModal() {
  if (faithModalIndex === null) return;
  const item = activeFaithQuestions[faithModalIndex];
  const badge = document.getElementById("faithModalBadge");
  const step = document.getElementById("faithModalStep");
  const topic = document.getElementById("faithModalTopic");
  const title = document.getElementById("faithModalTitle");
  const options = document.getElementById("faithModalOptions");
  const feedback = document.getElementById("faithModalFeedback");
  const nextButton = document.getElementById("faithModalNextButton");

  if (!item || !options) return;

  const isAnswered = openedPieces.has(faithModalIndex);
  if (badge) badge.textContent = `Câu hỏi ${faithModalIndex + 1}/${activeFaithQuestions.length}`;
  if (step) step.textContent = `Câu ${faithModalIndex + 1}/${activeFaithQuestions.length}`;
  if (topic) topic.textContent = item.topic;
  if (title) title.textContent = item.question;
  if (feedback) {
    feedback.textContent = isAnswered
      ? "Câu này đã hoàn thành. Bạn có thể chọn câu khác để tiếp tục."
      : "";
    feedback.className = isAnswered ? "faith-feedback is-correct" : "faith-feedback";
  }
  if (nextButton) {
    nextButton.hidden = openedPieces.size >= activeFaithQuestions.length;
    nextButton.disabled = !isAnswered && faithModalIndex === faithCurrentIndex;
  }

  options.innerHTML = item.options
    .map((option, index) => `
      <button class="faith-option faith-modal-option ${isAnswered && index === item.answer ? "is-correct" : ""}" type="button" data-index="${index}" ${isAnswered ? "disabled" : ""}>
        <span>${letters[index]}</span>
        ${escapeFaithHtml(option)}
      </button>
    `)
    .join("");

  options.querySelectorAll(".faith-modal-option").forEach((button) => {
    button.addEventListener("click", () => chooseFaithAnswer(Number(button.dataset.index)));
  });
}

function openFaithQuestionModal(index) {
  if (!activeFaithQuestions[index]) return;
  if (faithModalCloseTimer) {
    window.clearTimeout(faithModalCloseTimer);
    faithModalCloseTimer = null;
  }
  faithCurrentIndex = index;
  faithModalIndex = index;
  renderFaithQuestion();
  renderFaithQuestionModal();

  const modal = document.getElementById("faithQuestionModal");
  if (!modal) return;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("faith-modal-open");
  window.setTimeout(() => {
    modal.querySelector(".faith-question-modal-card")?.focus?.();
  }, 0);
}

function clearFaithCompletionTimer() {
  if (faithCompletionTimer) {
    window.clearTimeout(faithCompletionTimer);
    faithCompletionTimer = null;
  }
}

function isFaithCompleted() {
  return activeFaithQuestions.length > 0 && openedPieces.size >= activeFaithQuestions.length;
}

function showFaithCompletionModal() {
  if (!isFaithCompleted() || faithCompletionShown) return;
  faithCompletionShown = true;
  faithCompletionPending = false;
  clearFaithCompletionTimer();
  const modal = document.getElementById("faithCompletionModal");
  if (!modal) return;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("faith-completion-open");
  window.setTimeout(() => {
    modal.querySelector(".faith-completion-card")?.focus?.();
  }, 0);
}

function scheduleFaithCompletionModal() {
  if (!isFaithCompleted() || faithCompletionShown) return;
  clearFaithCompletionTimer();
  faithCompletionTimer = window.setTimeout(showFaithCompletionModal, 3000);
}

function closeFaithCompletionModal() {
  clearFaithCompletionTimer();
  const modal = document.getElementById("faithCompletionModal");
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("faith-completion-open");
}

function resetFaithCompletionState() {
  faithCompletionPending = false;
  faithCompletionShown = false;
  clearFaithCompletionTimer();
  closeFaithCompletionModal();
}

function closeFaithQuestionModal() {
  if (faithModalCloseTimer) {
    window.clearTimeout(faithModalCloseTimer);
    faithModalCloseTimer = null;
  }
  const modal = document.getElementById("faithQuestionModal");
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("faith-modal-open");
  faithModalIndex = null;
  if (faithCompletionPending && isFaithCompleted()) {
    scheduleFaithCompletionModal();
  }
}

function syncFaithAnsweredState() {
  renderFaithQuestion();
  if (faithModalIndex !== null) {
    renderFaithQuestionModal();
  }
}

function chooseFaithAnswer(selectedIndex) {
  const item = activeFaithQuestions[faithCurrentIndex];
  const options = document.querySelectorAll(".faith-question-card .faith-option");
  const modalOptions = faithModalIndex === faithCurrentIndex
    ? document.querySelectorAll(".faith-modal-option")
    : [];
  const feedback = document.getElementById("faithFeedback");
  const modalFeedback = document.getElementById("faithModalFeedback");
  const nextButton = document.getElementById("faithNextButton");
  const restartButton = document.getElementById("faithRestartButton");

  if (!item) return;

  if (selectedIndex !== item.answer) {
    const selectedButton = options[selectedIndex];
    const selectedModalButton = modalOptions[selectedIndex];
    if (selectedButton) {
      selectedButton.classList.add("is-wrong");
      selectedButton.disabled = true;
    }
    if (selectedModalButton) {
      selectedModalButton.classList.add("is-wrong");
      selectedModalButton.disabled = true;
    }
    if (feedback) {
      feedback.textContent = "Chưa đúng, bạn thử lại nhé.";
      feedback.className = "faith-feedback is-wrong";
    }
    if (modalFeedback) {
      modalFeedback.textContent = "Chưa đúng, bạn thử lại nhé.";
      modalFeedback.className = "faith-feedback is-wrong";
    }
    return;
  }

  options.forEach((button, index) => {
    button.disabled = true;
    button.classList.toggle("is-correct", index === item.answer);
  });
  modalOptions.forEach((button, index) => {
    button.disabled = true;
    button.classList.toggle("is-correct", index === item.answer);
  });

  openedPieces.add(faithCurrentIndex);
  const maskTile = document.querySelector(`.faith-mask-tile[data-index="${faithCurrentIndex}"]`);
  if (maskTile) maskTile.classList.add("is-open");

  updateFaithProgress();
  renderSetPicker();

  if (feedback) {
    feedback.textContent = `Đúng rồi! ${item.explanation}`;
    feedback.className = "faith-feedback is-correct";
  }
  if (modalFeedback) {
    modalFeedback.textContent = `Đúng rồi! ${item.explanation}`;
    modalFeedback.className = "faith-feedback is-correct";
  }

  if (faithModalIndex === faithCurrentIndex) {
    if (faithModalCloseTimer) window.clearTimeout(faithModalCloseTimer);
    faithModalCloseTimer = window.setTimeout(closeFaithQuestionModal, 3000);
  }

  if (openedPieces.size >= activeFaithQuestions.length) {
    faithCompletionPending = true;
    if (nextButton) nextButton.disabled = true;
    if (restartButton) restartButton.hidden = false;
    if (feedback) {
      feedback.textContent = "Bạn đã mở toàn bộ infographic. Hãy tin và theo Chúa!";
    }
    if (modalFeedback) {
      modalFeedback.textContent = "Bạn đã mở toàn bộ infographic. Hãy tin và theo Chúa!";
    }
    const modal = document.getElementById("faithQuestionModal");
    if (!modal?.classList.contains("show")) {
      scheduleFaithCompletionModal();
    }
    return;
  }

  if (nextButton) nextButton.disabled = false;
  const modalNextButton = document.getElementById("faithModalNextButton");
  if (modalNextButton) modalNextButton.disabled = false;
}

function goToNextFaithQuestion() {
  if (faithCurrentIndex < activeFaithQuestions.length - 1) {
    faithCurrentIndex += 1;
    syncFaithAnsweredState();
  }
}

function goToNextFaithModalQuestion() {
  if (!activeFaithQuestions.length) return;
  const nextIndex = activeFaithQuestions.findIndex((_, index) => index > faithCurrentIndex && !openedPieces.has(index));
  const fallbackIndex = activeFaithQuestions.findIndex((_, index) => !openedPieces.has(index));
  const targetIndex = nextIndex >= 0 ? nextIndex : fallbackIndex;

  if (targetIndex >= 0) {
    faithCurrentIndex = targetIndex;
    faithModalIndex = targetIndex;
    syncFaithAnsweredState();
    return;
  }

  closeFaithQuestionModal();
}


function returnToFaithSetPicker() {
  resetFaithCompletionState();
  faithCurrentIndex = 0;
  openedPieces = new Set();
  document.querySelectorAll(".faith-mask-tile").forEach((tile) => tile.classList.remove("is-open"));
  updateFaithProgress();
  showSetPicker();
}
function restartFaithGame() {
  resetFaithCompletionState();
  faithCurrentIndex = 0;
  openedPieces = new Set();
  document.querySelectorAll(".faith-mask-tile").forEach((tile) => tile.classList.remove("is-open"));
  updateFaithProgress();
  showSetPicker();
}

document.addEventListener("DOMContentLoaded", async () => {
  document.title = "Khám Phá Đức Tin - Bài Giảng Trên Núi";
  if (typeof rememberCurrentPage === "function") {
    rememberCurrentPage("Khám Phá Đức Tin");
  }
  if (typeof setupBackLink === "function") {
    setupBackLink("/", "Trang chủ", { useStored: false });
  }

  await loadFaithDiscoverySettings();
  if (!faithSets.length) {
    renderEmptyFaithState();
    document.dispatchEvent(new CustomEvent("kito:content-rendered"));
    return;
  }
  buildFaithMasks();
  updateFaithProgress();
  showSetPicker();
  document.getElementById("faithNextButton")?.addEventListener("click", goToNextFaithQuestion);
  document.getElementById("faithRestartButton")?.addEventListener("click", restartFaithGame);
  document.getElementById("faithBackToSetsButton")?.addEventListener("click", returnToFaithSetPicker);
  document.getElementById("faithBackToTopicsButton")?.addEventListener("click", returnToFaithSetPicker);
  document.getElementById("faithModalNextButton")?.addEventListener("click", goToNextFaithModalQuestion);
  document.getElementById("faithCompletionBackButton")?.addEventListener("click", returnToFaithSetPicker);
  document.querySelectorAll("[data-faith-completion-close]").forEach((element) => {
    element.addEventListener("click", closeFaithCompletionModal);
  });
  document.getElementById("faithSetSearch")?.addEventListener("input", () => {
    faithSetPickerPage = 1;
    renderSetPicker();
  });
  document.getElementById("faithSetSort")?.addEventListener("change", () => {
    faithSetPickerPage = 1;
    renderSetPicker();
  });
  document.querySelectorAll("[data-faith-modal-close]").forEach((element) => {
    element.addEventListener("click", closeFaithQuestionModal);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeFaithQuestionModal();
      closeFaithCompletionModal();
    }
  });
  document.dispatchEvent(new CustomEvent("kito:content-rendered"));
});














