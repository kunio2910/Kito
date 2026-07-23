const loginPanel = document.querySelector("#loginPanel");
const protectedPanel = document.querySelector("#accountProtected");
const loginForm = document.querySelector("#loginForm");
const loginMessage = document.querySelector("#loginMessage");
const accountForm = document.querySelector("#accountForm");
const accountId = document.querySelector("#accountId");
const accountName = document.querySelector("#accountName");
const accountUsername = document.querySelector("#accountUsername");
const accountPassword = document.querySelector("#accountPassword");
const accountRole = document.querySelector("#accountRole");
const accountMessage = document.querySelector("#accountMessage");
const accountList = document.querySelector("#accountList");

const roleLabels = {
  admin: "Admin - toàn quyền",
  editor: "Editor - chưa có quyền sửa nội dung",
  viewer: "Viewer - chỉ xem",
};

if (typeof trackPageView === "function") {
  trackPageView({ key: "page_accounts", label: "Quản lý tài khoản", kind: "admin_page" });
}

async function setupLogin() {
  await renderAuthStatus(document.querySelector("#accountAuthStatus"));
  const user = await getCurrentUser();

  if (!user) {
    loginPanel.hidden = false;
    protectedPanel.hidden = true;
    return;
  }

  loginPanel.hidden = true;
  protectedPanel.hidden = false;

  if (!(await isAdmin())) {
    protectedPanel.innerHTML = `
      <section class="notice-panel">
        <p class="eyebrow">Không đủ quyền</p>
        <h1>Tài khoản của bạn không có quyền quản lý tài khoản</h1>
        <p>Vui lòng đăng nhập bằng tài khoản admin để tạo, sửa hoặc xóa user.</p>
      </section>
    `;
    return;
  }

  await renderAccounts();
}

async function renderAccounts() {
  const users = await getUsers();
  accountList.innerHTML = users
    .map(
      (user) => `
        <article class="admin-item account-item">
          <div class="account-avatar">${user.name.slice(0, 1).toUpperCase()}</div>
          <div>
            <span>${roleLabels[user.role]}</span>
            <h3>${user.name}</h3>
            <p>User: ${user.username}</p>
            <small>Ngày tạo: ${user.createdAt || ""}</small>
          </div>
          <div class="row-actions">
            <button type="button" data-action="edit" data-id="${user.id}">Sửa</button>
            <button type="button" data-action="delete" data-id="${user.id}">Xóa</button>
          </div>
        </article>
      `
    )
    .join("");
}

function clearAccountForm() {
  accountForm.reset();
  accountId.value = "";
  accountUsername.disabled = false;
  accountPassword.required = true;
  accountMessage.textContent = "";
}

function editAccount(id) {
  getUsers().then((users) => {
    const user = users.find((entry) => entry.id === id);
    if (!user) return;

    accountId.value = user.id;
    accountName.value = user.name;
    accountUsername.value = user.username;
    accountUsername.disabled = true;
    accountPassword.value = "";
    accountPassword.required = false;
    accountRole.value = user.role;
    accountName.focus();
  });
}

async function removeAccount(id) {
  try {
    const user = (await getUsers()).find((entry) => entry.id === id);
    if (!user) return;
    const confirmed = confirm(`Xóa tài khoản "${user.username}"?`);
    if (!confirmed) return;
    await deleteUser(id);
    await renderAccounts();
    clearAccountForm();
  } catch (error) {
    accountMessage.textContent = error.message;
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

accountForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  accountMessage.textContent = "";

  try {
    if (accountId.value) {
      await updateUser(accountId.value, {
        name: accountName.value,
        password: accountPassword.value,
        role: accountRole.value,
      });
    } else {
      await createUser({
        name: accountName.value,
        username: accountUsername.value,
        password: accountPassword.value,
        role: accountRole.value,
      });
    }

    await renderAccounts();
    clearAccountForm();
    accountMessage.textContent = "Đã lưu tài khoản.";
  } catch (error) {
    accountMessage.textContent = error.message;
  }
});

accountList?.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === "edit") editAccount(id);
  if (action === "delete") removeAccount(id);
});

document.querySelector("#clearAccountForm")?.addEventListener("click", clearAccountForm);

setupLogin();
