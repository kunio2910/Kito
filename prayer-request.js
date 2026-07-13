trackPageView({ key: "page_prayer_request", label: "Trang gửi lời cầu nguyện", kind: "page" });

const prayerForm = document.querySelector("#prayerRequestForm");
const prayerName = document.querySelector("#prayerName");
const prayerTitle = document.querySelector("#prayerTitle");
const prayerText = document.querySelector("#prayerText");
const anonymousToggle = document.querySelector("#anonymousToggle");
const prayerMessage = document.querySelector("#prayerRequestMessage");
let isAnonymous = false;

setupBackLink("/", "Trang chủ", { useStored: false, useHistory: false });

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
  prayerMessage.classList.remove("success", "error");
  prayerMessage.textContent = "\u0110ang g\u1eedi l\u1eddi c\u1ea7u nguy\u1ec7n...";

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
    prayerMessage.classList.add("success");
    prayerMessage.textContent =
      "L\u1eddi c\u1ea7u nguy\u1ec7n c\u1ee7a b\u1ea1n s\u1ebd \u0111\u01b0\u1ee3c g\u1eedi \u0111\u1ebfn ban qu\u1ea3n tr\u1ecb \u0111\u1ec3 duy\u1ec7t tr\u01b0\u1edbc khi hi\u1ec3n th\u1ecb tr\u00ean website.";
  } catch (error) {
    prayerMessage.classList.add("error");
    prayerMessage.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});


