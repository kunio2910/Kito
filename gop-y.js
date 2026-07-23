function setupFeedbackPageForm() {
  const form = document.querySelector("#feedbackPageForm");
  const textarea = document.querySelector("#feedbackPageMessage");
  const status = document.querySelector("#feedbackPageStatus");
  if (!form || !textarea || typeof submitContentFeedback !== "function") return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = textarea.value.trim();
    if (!message) {
      if (status) status.textContent = "Vui lòng nhập ý kiến đóng góp.";
      textarea.focus();
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    if (status) status.textContent = "Đang gửi ý kiến...";

    try {
      await submitContentFeedback(
        {
          id: "feedback-page",
          type: "feedback",
          title: "Ý kiến đóng góp",
        },
        message
      );
      textarea.value = "";
      if (status) status.textContent = "Cảm ơn bạn, ý kiến đã được gửi.";
      if (typeof trackVercelEvent === "function") {
        trackVercelEvent("Feedback Submitted", {
          source: "feedback_page",
          path: window.location.pathname,
        });
      }
    } catch (error) {
      console.error("Không thể gửi ý kiến đóng góp.", error);
      if (status) status.textContent = error.message || "Không thể gửi ý kiến, vui lòng thử lại.";
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

setupFeedbackPageForm();

if (typeof trackPageView === "function") {
  trackPageView({ key: "page_feedback", label: "Góp ý", kind: "page" });
}

if (typeof rememberCurrentPage === "function") {
  rememberCurrentPage("Góp ý");
}
