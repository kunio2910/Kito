(function () {
  const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (!isLocalhost) {
    window.location.replace("/");
    return;
  }

  const topics = [
    {
      title: "Hành trình theo dấu chân Chúa Giêsu",
      description: "Khám phá những cột mốc chính trong cuộc đời và sứ vụ của Chúa Giêsu.",
      steps: 16,
      label: "Tân Ước",
    },
    {
      title: "Từ Sáng Thế đến Giao Ước",
      description: "Tìm hiểu công trình tạo dựng, tổ phụ Ápraham và hành trình đức tin đầu tiên.",
      steps: 12,
      label: "Cựu Ước",
    },
    {
      title: "Hành trình Xuất Hành",
      description: "Theo chân dân Chúa đi qua Biển Đỏ, sa mạc và giao ước tại núi Sinai.",
      steps: 14,
      label: "Cựu Ước",
    },
    {
      title: "Các ngôn sứ kêu gọi trở về",
      description: "Gặp gỡ các ngôn sứ và lời mời gọi hoán cải, hy vọng, trung thành với Thiên Chúa.",
      steps: 10,
      label: "Ngôn sứ",
    },
    {
      title: "Những dụ ngôn của Chúa",
      description: "Học Tin Mừng qua những câu chuyện gần gũi mà Chúa Giêsu dùng để dạy dân chúng.",
      steps: 12,
      label: "Tin Mừng",
    },
    {
      title: "Hành trình Hội Thánh sơ khai",
      description: "Tìm hiểu các Tông Đồ, Chúa Thánh Thần và những bước đầu loan báo Tin Mừng.",
      steps: 13,
      label: "Công Vụ",
    },
  ];

  const state = {
    search: "",
    sort: "default",
    page: 1,
    pageSize: 12,
  };

  const grid = document.querySelector("#journeyTopicGrid");
  const searchInput = document.querySelector("#journeySearch");
  const sortSelect = document.querySelector("#journeySort");
  const pagination = document.querySelector("#journeyPagination");

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function getFilteredTopics() {
    const keyword = normalizeText(state.search);
    const filtered = topics.filter((topic) =>
      normalizeText(`${topic.title} ${topic.description} ${topic.label}`).includes(keyword)
    );

    if (state.sort === "title-asc") {
      filtered.sort((a, b) => a.title.localeCompare(b.title, "vi"));
    } else if (state.sort === "title-desc") {
      filtered.sort((a, b) => b.title.localeCompare(a.title, "vi"));
    } else if (state.sort === "steps-desc") {
      filtered.sort((a, b) => b.steps - a.steps);
    } else if (state.sort === "steps-asc") {
      filtered.sort((a, b) => a.steps - b.steps);
    }

    return filtered;
  }

  function renderPagination(totalItems) {
    const pageCount = Math.max(1, Math.ceil(totalItems / state.pageSize));
    if (state.page > pageCount) state.page = pageCount;
    if (pageCount <= 1) {
      pagination.innerHTML = "";
      return;
    }

    pagination.innerHTML = Array.from({ length: pageCount }, (_, index) => {
      const page = index + 1;
      return `<button class="${page === state.page ? "active" : ""}" type="button" data-page="${page}">${page}</button>`;
    }).join("");
  }

  function renderTopics() {
    const filtered = getFilteredTopics();
    renderPagination(filtered.length);
    const start = (state.page - 1) * state.pageSize;
    const pageItems = filtered.slice(start, start + state.pageSize);

    grid.innerHTML = pageItems.length
      ? pageItems
          .map(
            (topic, index) => `
              <button class="faith-picker-item journey-topic-card" type="button" data-topic-index="${index}">
                <span>${topic.label}</span>
                <strong>${topic.title}</strong>
                <small>${topic.steps} cột mốc</small>
              </button>
            `
          )
          .join("")
      : `<p class="journey-empty">Không tìm thấy chủ đề phù hợp.</p>`;
  }

  searchInput.addEventListener("input", () => {
    state.search = searchInput.value;
    state.page = 1;
    renderTopics();
  });

  sortSelect.addEventListener("change", () => {
    state.sort = sortSelect.value;
    state.page = 1;
    renderTopics();
  });

  pagination.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page]");
    if (!button) return;
    state.page = Number(button.dataset.page) || 1;
    renderTopics();
  });

  grid.addEventListener("click", (event) => {
    const button = event.target.closest(".journey-topic-card");
    if (!button) return;
    alert("Màn chơi Hành Trình Kinh Thánh đang được xây dựng để test trên localhost.");
  });

  renderTopics();
})();
