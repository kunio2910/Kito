const prayerForm = document.querySelector("#prayerRequestForm");
const prayerName = document.querySelector("#prayerName");
const prayerTitle = document.querySelector("#prayerTitle");
const prayerText = document.querySelector("#prayerText");
const anonymousToggle = document.querySelector("#anonymousToggle");
const prayerMessage = document.querySelector("#prayerRequestMessage");
let isAnonymous = false;

setupBackLink("index.html", "Trang chủ", { useStored: false, useHistory: false });

anonymousToggle.addEventListener("click", () => {
  isAnonymous = !isAnonymous;
  anonymousToggle.classList.toggle("active", isAnonymous);
  anonymousToggle.setAttribute("aria-pressed", String(isAnonymous));
  prayerName.disabled = isAnonymous;
  prayerName.value = isAnonymous ? "Anonymous" : "";
});

prayerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = prayerForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  prayerMessage.textContent = "Đang gửi lời cầu nguyện...";

  try {
    await submitPrayerRequest({
      displayName: prayerName.value.trim(),
      prayerTitle: prayerTitle.value.trim(),
      anonymous: isAnonymous,
      prayerText: prayerText.value.trim(),
    });
    prayerForm.reset();
    isAnonymous = false;
    anonymousToggle.classList.remove("active");
    anonymousToggle.setAttribute("aria-pressed", "false");
    prayerName.disabled = false;
    prayerMessage.textContent =
      "Lời cầu nguyện của bạn sẽ được gửi đến ban quản trị để duyệt trước khi hiển thị trên website.";
  } catch (error) {
    prayerMessage.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});
