let content = null;
const params = new URLSearchParams(window.location.search);
const type = params.get("type");
const id = params.get("id");
const allowedTypes = ["saints", "churches", "articles", "events", "prayers", "catechism"];
const detailArticle = document.querySelector("#detailArticle");
const lazyImageAttrs = 'loading="lazy" decoding="async"';
let currentItem = null;
let selectedRatings = {
  content: 0,
  layout: 0,
};

function detailLink(nextType, nextId) {
  return `detail.html?type=${encodeURIComponent(nextType)}&id=${encodeURIComponent(nextId)}`;
}

function sanitizeContentHtml(value) {
  const template = document.createElement("template");
  template.innerHTML = String(value || "");
  const allowedTags = new Set([
    "P",
    "BR",
    "STRONG",
    "B",
    "EM",
    "I",
    "U",
    "H2",
    "H3",
    "H4",
    "UL",
    "OL",
    "LI",
    "BLOCKQUOTE",
    "IMG",
    "A",
  ]);
  const allowedAttributes = {
    A: new Set(["href", "title", "target", "rel"]),
    IMG: new Set(["src", "alt", "title"]),
  };

  template.content.querySelectorAll("*").forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      return;
    }

    [...element.attributes].forEach((attribute) => {
      const allowed = allowedAttributes[element.tagName]?.has(attribute.name);
      if (!allowed) element.removeAttribute(attribute.name);
    });

    if (element.tagName === "A") {
      const href = element.getAttribute("href") || "";
      if (!/^https?:\/\//i.test(href) && !href.startsWith("#") && !href.startsWith("mailto:")) {
        element.removeAttribute("href");
      }
      element.setAttribute("rel", "noopener noreferrer");
      if (!element.getAttribute("target")) element.setAttribute("target", "_blank");
    }

    if (element.tagName === "IMG") {
      const src = element.getAttribute("src") || "";
      if (!/^https?:\/\//i.test(src)) element.remove();
      element.setAttribute("loading", "lazy");
      element.setAttribute("decoding", "async");
    }
  });

  return template.innerHTML;
}

function defaultBodyHtml(item) {
  return `
    <p>${item.description}</p>
  `;
}

function sourceLinkHtml(value) {
  const sourceUrl = String(value || "").trim();
  if (!/^https?:\/\//i.test(sourceUrl)) return "";
  return `
    <p class="detail-source">
      Nguá»“n: <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer">${sourceUrl}</a>
    </p>
  `;
}

function renderMissing() {
  document.title = "KhÃ´ng tÃ¬m tháº¥y ná»™i dung - Truyá»n GiÃ¡o KitÃ´";
  detailArticle.innerHTML = `
    <div class="detail-empty">
      <p class="eyebrow">KhÃ´ng tÃ¬m tháº¥y</p>
      <h1>Ná»™i dung nÃ y khÃ´ng cÃ²n tá»“n táº¡i</h1>
      <p>Vui lÃ²ng quay láº¡i trang chá»§ hoáº·c vÃ o trang quáº£n lÃ½ Ä‘á»ƒ kiá»ƒm tra láº¡i dá»¯ liá»‡u.</p>
      <a class="primary-button" href="index.html">Vá» trang chá»§</a>
    </div>
  `;
}

function renderDetail() {
  const currentList = allowedTypes.includes(type) ? content[type].filter((entry) => entry.status !== "unactived") : [];
  const item = currentList.find((entry) => entry.id === id);
  if (!item) {
    renderMissing();
    return;
  }

  currentItem = item;
  const dateInfo = item.date ? formatDateParts(item.date) : null;
  const description = item.description || "";
  document.title = `${item.title} - Truyá»n GiÃ¡o KitÃ´`;
  detailArticle.innerHTML = `
    <figure class="detail-cover">
      <img src="${item.image || fallbackImage}" alt="${item.title}" fetchpriority="high" decoding="async" />
    </figure>
    <header class="detail-heading">
      <h1>${item.title}</h1>
      <div class="detail-meta">
        ${item.meta ? `<span><span class="detail-meta-icon cross-tile-icon" aria-hidden="true"></span>${item.meta}</span>` : ""}
        ${dateInfo ? `<span><span class="detail-meta-icon calendar-clock-icon" aria-hidden="true"></span>${dateInfo.display}</span>` : ""}
      </div>
      ${
        description
          ? `
            <div class="lead-box">
              <span class="lead-icon" aria-hidden="true">â€œ</span>
              <p class="lead">${description}</p>
            </div>
          `
          : ""
      }
    </header>
    <div class="detail-content">
      <div class="detail-body">${sanitizeContentHtml(item.bodyHtml || defaultBodyHtml(item))}</div>
      ${sourceLinkHtml(item.sourceUrl)}
      <section class="rating-panel" aria-label="ÄÃ¡nh giÃ¡ bÃ i viáº¿t">
        <p class="rating-note">*Ná»™i dung nÃ y Ä‘Æ°á»£c xÃ¢y dá»±ng Ä‘á»ƒ há»— trá»£ viá»‡c há»c há»i, cáº§u nguyá»‡n vÃ  chia sáº» Tin Má»«ng. Æ¯á»›c mong má»—i bÃ i viáº¿t, má»—i hÃ¬nh áº£nh vÃ  má»—i sá»± kiá»‡n nÆ¡i Ä‘Ã¢y trá»Ÿ thÃ nh má»™t lá»i má»i gá»i sá»‘ng Ä‘á»©c tin cá»¥ thá»ƒ hÆ¡n trong Ä‘á»i sá»‘ng háº±ng ngÃ y.<br />Trang cÃ³ sá»­ dá»¥ng tÃ i nguyÃªn AI. Báº¡n vui lÃ²ng giÃ nh Ã­t phÃºt Ä‘á»ƒ Ä‘Ã¡nh giÃ¡ vá» bÃ i viáº¿t vÃ  cháº¥t lÆ°á»£ng website.</p>
        <div class="rating-group">
          <strong>ÄÃ¡nh giÃ¡ ná»™i dung</strong>
          <div class="rating-stars" role="radiogroup" aria-label="ÄÃ¡nh giÃ¡ ná»™i dung">
            ${[1, 2, 3, 4, 5]
              .map((value) => `<button type="button" data-rating-kind="content" data-rating="${value}" aria-label="${value} sao">â˜…</button>`)
              .join("")}
          </div>
        </div>
        <div class="rating-group">
          <strong>ÄÃ¡nh giÃ¡ trÃ¬nh bÃ y</strong>
          <div class="rating-stars" role="radiogroup" aria-label="ÄÃ¡nh giÃ¡ trÃ¬nh bÃ y">
            ${[1, 2, 3, 4, 5]
              .map((value) => `<button type="button" data-rating-kind="layout" data-rating="${value}" aria-label="${value} sao">â˜…</button>`)
              .join("")}
          </div>
        </div>
        <div class="rating-row">
          <button class="primary-button" type="button" id="submitRating">Gá»­i</button>
        </div>
        <small id="ratingMessage"></small>
        <div class="feedback-box">
          <label for="feedbackMessage">Ã kiáº¿n Ä‘Ã³ng gÃ³p</label>
          <textarea id="feedbackMessage" rows="4" placeholder="Nháº­p Ã½ kiáº¿n Ä‘Ã³ng gÃ³p cá»§a báº¡n..."></textarea>
          <div class="rating-row">
            <button class="primary-button" type="button" id="submitFeedback">Gá»­i Ã½ kiáº¿n</button>
          </div>
          <small id="feedbackStatus"></small>
        </div>
      </section>
    </div>
  `;
  setupRating();
  setupFeedback();
}

function renderRelated() {
  const currentList = allowedTypes.includes(type) ? content[type].filter((entry) => entry.status !== "unactived") : [];
  const related = currentList.filter((entry) => entry.id !== id).slice(0, 3);
  document.querySelector("#relatedList").innerHTML = related
    .map(
      (entry) => `
        <article class="article-card clickable-card" onclick="window.location.href='${detailLink(type, entry.id)}'">
          <img src="${entry.image || fallbackImage}" alt="${entry.title}" ${lazyImageAttrs} />
          <div>
            <h3>${entry.title}</h3>
            <p>${entry.description}</p>
            <a href="${detailLink(type, entry.id)}" onclick="event.stopPropagation()">Chi ti\u1ebft</a>
          </div>
        </article>
      `
    )
    .join("");
}

function paintStars() {
  detailArticle.querySelectorAll("[data-rating]").forEach((button) => {
    const kind = button.dataset.ratingKind;
    button.classList.toggle("active", Number(button.dataset.rating) <= selectedRatings[kind]);
  });
}

function setupRating() {
  selectedRatings = {
    content: 0,
    layout: 0,
  };
  const message = detailArticle.querySelector("#ratingMessage");
  const submitButton = detailArticle.querySelector("#submitRating");

  detailArticle.querySelectorAll("[data-rating]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedRatings[button.dataset.ratingKind] = Number(button.dataset.rating);
      message.textContent = "";
      paintStars();
    });
  });

  submitButton.addEventListener("click", async () => {
    if (!selectedRatings.content || !selectedRatings.layout) {
      message.textContent = "Vui lÃ²ng chá»n Ä‘á»§ Ä‘Ã¡nh giÃ¡ ná»™i dung vÃ  trÃ¬nh bÃ y.";
      return;
    }

    submitButton.disabled = true;
    message.textContent = "Äang ghi nháº­n Ä‘Ã¡nh giÃ¡...";
    try {
      await submitContentRating(currentItem.id, selectedRatings);
      selectedRatings = {
        content: 0,
        layout: 0,
      };
      paintStars();
      message.textContent = "Cáº£m Æ¡n báº¡n Ä‘Ã£ Ä‘Ã¡nh giÃ¡ bÃ i viáº¿t.";
    } catch (error) {
      message.textContent = error.message;
    } finally {
      submitButton.disabled = false;
    }
  });
}

function setupFeedback() {
  const textarea = detailArticle.querySelector("#feedbackMessage");
  const submitButton = detailArticle.querySelector("#submitFeedback");
  const status = detailArticle.querySelector("#feedbackStatus");

  submitButton.addEventListener("click", async () => {
    const message = textarea.value.trim();
    if (!message) {
      status.textContent = "Vui lÃ²ng nháº­p Ã½ kiáº¿n Ä‘Ã³ng gÃ³p.";
      return;
    }

    submitButton.disabled = true;
    status.textContent = "Äang gá»­i Ã½ kiáº¿n Ä‘Ã³ng gÃ³p...";

    try {
      await submitContentFeedback(
        {
          id: currentItem.id,
          type,
          title: currentItem.title,
        },
        message
      );
      textarea.value = "";
      status.textContent = "Cáº£m Æ¡n báº¡n Ä‘Ã£ gá»­i Ã½ kiáº¿n Ä‘Ã³ng gÃ³p.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      submitButton.disabled = false;
    }
  });
}

async function initDetail() {
  setupBackLink();
  try {
    content = await getContent();
    renderDetail();
    renderRelated();
  } catch (error) {
    content = structuredClone(defaultContent);
    renderDetail();
    renderRelated();
  }
}

initDetail();

