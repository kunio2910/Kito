let content = null;
let currentImage = "";
let selectedImageFile = null;
let canManageContent = false;

const typeLabels = {
  saints: "Các thánh",
  churches: "Nhà thờ",
  articles: "Bài viết",
  events: "Sự kiện",
};

const form = document.querySelector("#contentForm");
const itemId = document.querySelector("#itemId");
const itemType = document.querySelector("#itemType");
const itemTitle = document.querySelector("#itemTitle");
const itemDescription = document.querySelector("#itemDescription");
const itemMeta = document.querySelector("#itemMeta");
const itemDate = document.querySelector("#itemDate");
const itemImage = document.querySelector("#itemImage");
const imagePreview = document.querySelector("#imagePreview");
const filterType = document.querySelector("#filterType");
const loginPanel = document.querySelector("#loginPanel");
const protectedPanel = document.querySelector("#adminProtected");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");

function detailLink(type, id) {
  return `detail.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
}

function getItemsForAdmin() {
  if (!content) return [];
  const selected = filterType.value;
  const types = selected === "all" ? ["saints", "churches", "articles", "events"] : [selected];
  return types.flatMap((type) => content[type].map((item) => ({ ...item, type })));
}

function renderAdminList() {
  const items = getItemsForAdmin();
  document.querySelector("#adminList").innerHTML = items
    .map(
      (item) => `
        <article class="admin-item">
          <img src="${item.image || fallbackImage}" alt="${item.title}" />
          <div>
            <span>${typeLabels[item.type]}</span>
            <h3>${item.title}</h3>
            <p>${item.description}</p>
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

  document.querySelector("#previewList").innerHTML = content.articles
    .slice(0, 3)
    .map(
      (item) => `
        <article class="article-card">
          <img src="${item.image || fallbackImage}" alt="${item.title}" />
          <div>
            <h3>${item.title}</h3>
            <p>${item.description}</p>
            <a href="${detailLink("articles", item.id)}">Đọc thêm</a>
          </div>
        </article>
      `
    )
    .join("");
}

function clearForm() {
  form.reset();
  itemId.value = "";
  currentImage = "";
  selectedImageFile = null;
  imagePreview.removeAttribute("src");
  imagePreview.classList.remove("show");
}

function editItem(type, id) {
  if (!canManageContent) return;
  const item = content[type].find((entry) => entry.id === id);
  if (!item) return;

  itemId.value = item.id;
  itemType.value = type;
  itemTitle.value = item.title;
  itemDescription.value = item.description;
  itemMeta.value = item.meta || "";
  itemDate.value = item.date || "";
  currentImage = item.image || "";

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

itemImage.addEventListener("change", () => {
  if (!canManageContent) return;
  const file = itemImage.files[0];
  if (!file) return;

  selectedImageFile = file;
  imagePreview.src = URL.createObjectURL(file);
  imagePreview.classList.add("show");
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

  try {
    const imageUrl = selectedImageFile
      ? await uploadContentImage(selectedImageFile, type)
      : currentImage || fallbackImage;

    await saveContentItem(type, {
      id,
      title: itemTitle.value.trim(),
      description: itemDescription.value.trim(),
      meta: itemMeta.value.trim(),
      date: itemDate.value,
      image: imageUrl,
    });

    content = await getContent();
    renderAdminList();
    clearForm();
  } catch (error) {
    alert(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelector("#adminList").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const { action, type, id } = button.dataset;
  if (action === "edit") editItem(type, id);
  if (action === "delete") deleteItem(type, id);
});

document.querySelector("#clearForm").addEventListener("click", clearForm);
filterType.addEventListener("change", renderAdminList);

document.querySelector("#resetData").addEventListener("click", async () => {
  if (!canManageContent) return;
  const confirmed = confirm("Khôi phục dữ liệu mẫu và xóa các nội dung đã chỉnh sửa?");
  if (!confirmed) return;
  try {
    await resetContent();
    content = await getContent();
    clearForm();
    renderAdminList();
  } catch (error) {
    alert(error.message);
  }
});

function setEditorEnabled(enabled) {
  form.querySelectorAll("input, select, textarea, button").forEach((control) => {
    control.disabled = !enabled;
  });
  document.querySelector("#resetData").hidden = !enabled;
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
