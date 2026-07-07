let content = null;
let currentImage = "";
let currentImagePath = "";
let canManageContent = false;

const typeLabels = {
  saints: "Các thánh",
  churches: "Nhà thờ",
  articles: "Bài viết",
  events: "Sự kiện",
  daily: "Lời Chúa mỗi ngày",
  banners: "Banner chính",
};

const form = document.querySelector("#contentForm");
const itemId = document.querySelector("#itemId");
const itemType = document.querySelector("#itemType");
const itemTitle = document.querySelector("#itemTitle");
const itemDescription = document.querySelector("#itemDescription");
const itemBodyHtml = document.querySelector("#itemBodyHtml");
const itemMeta = document.querySelector("#itemMeta");
const itemDate = document.querySelector("#itemDate");
const itemImageUrl = document.querySelector("#itemImageUrl");
const imagePreview = document.querySelector("#imagePreview");
const filterType = document.querySelector("#filterType");
const adminList = document.querySelector("#adminList");
const loginPanel = document.querySelector("#loginPanel");
const protectedPanel = document.querySelector("#adminProtected");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const contentMessage = document.querySelector("#contentMessage");
let draggedItem = null;

function detailLink(type, id) {
  return `detail.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
}

function summarizeText(text, maxLength = 120) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}

function getItemsForAdmin() {
  if (!content) return [];
  const selected = filterType.value;
  const types = selected === "all" ? CONTENT_TYPES : [selected];
  return types.flatMap((type) => (content[type] || []).map((item) => ({ ...item, type })));
}

function renderAdminList() {
  const items = getItemsForAdmin();
  const canReorder = canManageContent && filterType.value !== "all";
  adminList.innerHTML = items
    .map(
      (item) => `
        <article class="admin-item ${canReorder ? "is-draggable" : ""}" data-id="${item.id}" data-type="${item.type}" draggable="${canReorder}">
          <img src="${item.image || fallbackImage}" alt="${item.title}" />
          <div>
            <span>${typeLabels[item.type]}</span>
            <h3>${item.title || item.ref || item.meta || ""}</h3>
            <p>${summarizeText(item.description || item.quote, 130)}</p>
            <small>${item.meta || ""}</small>
          </div>
          ${
            canManageContent
              ? `
                <div class="row-actions">
                  <button type="button" data-action="edit" data-type="${item.type}" data-id="${item.id}">Sửa</button>
                  <button type="button" data-action="delete" data-type="${item.type}" data-id="${item.id}">Xóa</button>
                </div>
              `
              : `<div class="permission-badge">Chỉ xem</div>`
          }
        </article>
      `
    )
    .join("");
}

function clearForm() {
  form.reset();
  itemId.value = "";
  currentImage = "";
  currentImagePath = "";
  itemImageUrl.value = "";
  imagePreview.removeAttribute("src");
  imagePreview.classList.remove("show");
  contentMessage.textContent = "";
}

function editItem(type, id) {
  if (!canManageContent) return;
  const item = content[type].find((entry) => entry.id === id);
  if (!item) return;

  itemId.value = item.id;
  itemType.value = type;
  itemTitle.value = item.title || item.ref || item.meta || "";
  itemDescription.value = item.description || item.quote || "";
  itemBodyHtml.value = item.bodyHtml || "";
  itemMeta.value = item.meta || "";
  itemDate.value = item.date || "";
  currentImage = item.image || "";
  currentImagePath = item.imagePath || "";
  itemImageUrl.value = currentImage;

  if (currentImage) {
    imagePreview.src = currentImage;
    imagePreview.classList.add("show");
  }

  itemTitle.focus();
}

async function deleteItem(type, id) {
  if (!canManageContent) return;
  const item = content[type].find((entry) => entry.id === id);
  if (!item) return;
  const confirmed = confirm(`Xóa "${item.title}"?`);
  if (!confirmed) return;

  try {
    await deleteContentItem(id);
    content = await getContent();
    renderAdminList();
    clearForm();
  } catch (error) {
    alert(error.message);
  }
}

function moveItemInType(type, draggedId, targetId, placeAfter) {
  const items = content[type] || [];
  const fromIndex = items.findIndex((item) => item.id === draggedId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (fromIndex < 0 || targetIndex < 0 || draggedId === targetId) return false;

  const [moved] = items.splice(fromIndex, 1);
  const adjustedTargetIndex = items.findIndex((item) => item.id === targetId);
  items.splice(adjustedTargetIndex + (placeAfter ? 1 : 0), 0, moved);
  items.forEach((item, index) => {
    item.sortOrder = index;
  });
  return true;
}

async function persistCurrentOrder(type) {
  const ids = (content[type] || []).map((item) => item.id);
  await updateContentOrder(type, ids);
}

itemImageUrl.addEventListener("input", () => {
  if (!canManageContent) return;
  const imageUrl = itemImageUrl.value.trim();

  if (!imageUrl) {
    imagePreview.removeAttribute("src");
    imagePreview.classList.remove("show");
    contentMessage.textContent = "";
    return;
  }

  imagePreview.src = imageUrl;
  imagePreview.classList.add("show");
  contentMessage.textContent = "Đã nhập URL ảnh.";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!canManageContent) {
    alert("Chỉ tài khoản admin mới có quyền thêm, sửa, xóa nội dung.");
    return;
  }
  const type = itemType.value;
  const id = itemId.value || `${type}-${Date.now()}`;
  const submitButton = form.querySelector("button[type='submit']");
  submitButton.disabled = true;
  contentMessage.textContent = "Đang lưu nội dung...";

  try {
    const imageUrl = itemImageUrl.value.trim() || currentImage || fallbackImage;

    await saveContentItem(type, {
      id,
      title: itemTitle.value.trim(),
      description: itemDescription.value.trim(),
      quote: type === "daily" ? itemDescription.value.trim() : "",
      ref: type === "daily" ? itemMeta.value.trim() : "",
      bodyHtml: itemBodyHtml.value.trim(),
      meta: itemMeta.value.trim(),
      date: itemDate.value,
      image: imageUrl,
      imagePath: "",
    });

    content = await getContent();
    renderAdminList();
    clearForm();
    contentMessage.textContent = "Đã lưu nội dung và URL hình ảnh.";
  } catch (error) {
    contentMessage.textContent = error.message;
    alert(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

adminList.addEventListener("dragstart", (event) => {
  const item = event.target.closest(".admin-item");
  if (!item || !canManageContent || filterType.value === "all" || event.target.closest("button")) {
    event.preventDefault();
    return;
  }

  draggedItem = {
    id: item.dataset.id,
    type: item.dataset.type,
  };
  item.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedItem.id);
});

adminList.addEventListener("dragover", (event) => {
  const target = event.target.closest(".admin-item");
  if (!draggedItem || !target || target.dataset.type !== draggedItem.type || target.dataset.id === draggedItem.id) return;
  event.preventDefault();
  target.classList.add("drag-over");
});

adminList.addEventListener("dragleave", (event) => {
  const target = event.target.closest(".admin-item");
  if (target) target.classList.remove("drag-over");
});

adminList.addEventListener("drop", async (event) => {
  const target = event.target.closest(".admin-item");
  if (!draggedItem || !target || target.dataset.type !== draggedItem.type) return;
  event.preventDefault();

  const rect = target.getBoundingClientRect();
  const placeAfter = event.clientY > rect.top + rect.height / 2;
  const moved = moveItemInType(draggedItem.type, draggedItem.id, target.dataset.id, placeAfter);
  if (!moved) return;

  try {
    renderAdminList();
    contentMessage.textContent = "Đang lưu thứ tự nội dung...";
    await persistCurrentOrder(draggedItem.type);
    contentMessage.textContent = "Đã cập nhật thứ tự nội dung.";
  } catch (error) {
    contentMessage.textContent = error.message;
    alert(error.message);
    content = await getContent();
    renderAdminList();
  } finally {
    draggedItem = null;
  }
});

adminList.addEventListener("dragend", () => {
  draggedItem = null;
  adminList.querySelectorAll(".dragging, .drag-over").forEach((item) => {
    item.classList.remove("dragging", "drag-over");
  });
});

adminList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const { action, type, id } = button.dataset;
  if (action === "edit") editItem(type, id);
  if (action === "delete") deleteItem(type, id);
});

document.querySelector("#clearForm").addEventListener("click", clearForm);
filterType.addEventListener("change", () => {
  renderAdminList();
  contentMessage.textContent =
    filterType.value === "all" ? "Chọn một loại nội dung cụ thể để kéo thả đổi thứ tự." : "";
});

function setEditorEnabled(enabled) {
  form.querySelectorAll("input, select, textarea, button").forEach((control) => {
    control.disabled = !enabled;
  });
}

async function setupLogin() {
  await renderAuthStatus(document.querySelector("#adminAuthStatus"));
  const user = await getCurrentUser();

  if (!user) {
    loginPanel.hidden = false;
    protectedPanel.hidden = true;
    return;
  }

  loginPanel.hidden = true;
  protectedPanel.hidden = false;
  canManageContent = user.role === "admin";
  setEditorEnabled(canManageContent);

  if (!canManageContent) {
    document.querySelector(".admin-intro").insertAdjacentHTML(
      "afterend",
      `
        <section class="notice-panel">
          <p class="eyebrow">Chỉ xem</p>
          <h2>Tài khoản của bạn không có quyền thêm, sửa, xóa nội dung</h2>
          <p>Vui lòng đăng nhập bằng tài khoản admin để quản trị nội dung.</p>
        </section>
      `
    );
  }

  try {
    content = await getContent();
    renderAdminList();
  } catch (error) {
    document.querySelector("#adminList").innerHTML = `
      <article class="admin-item">
        <div>
          <span>Lỗi Firebase</span>
          <h3>Không thể tải dữ liệu</h3>
          <p>${error.message}</p>
        </div>
      </article>
    `;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const session = await login(
    document.querySelector("#loginUsername").value,
    document.querySelector("#loginPassword").value
    );

    if (!session) {
      loginMessage.textContent = "User hoặc password không đúng.";
      return;
    }

    window.location.reload();
  } catch (error) {
    loginMessage.textContent = error.message;
  }
});

setupLogin();
