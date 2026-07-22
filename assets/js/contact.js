window.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("bookingForm");
  const formStatus = document.getElementById("formStatus");
  if (!form || !formStatus) return;

  function showFormStatus(type, message) {
    formStatus.textContent = message;
    formStatus.className =
      "rounded-xl p-4 text-sm font-semibold " +
      (type === "success"
        ? "bg-green-100 text-green-800 border border-green-300"
        : "bg-red-100 text-red-800 border border-red-300");

    formStatus.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function clearFormStatus() {
    formStatus.textContent = "";
    formStatus.className = "hidden rounded-xl p-4 text-sm font-semibold";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFormStatus();

    const button = form.querySelector('button[type="submit"]');
    const originalButtonText = button.textContent;
    const turnstileField = form.querySelector('[name="cf-turnstile-response"]');
    const turnstileToken = turnstileField ? turnstileField.value : "";

    if (!turnstileToken) {
      showFormStatus(
        "error",
        "Please complete the security verification before sending."
      );
      return;
    }

    button.disabled = true;
    button.textContent = "Sending...";

    const payload = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      phone: form.elements.phone.value.trim(),
      checkin: form.elements.checkin.value,
      checkout: form.elements.checkout.value,
      guests: form.elements.guests.value,
      message: form.elements.message.value.trim(),
      website: form.elements.website.value,
      turnstileToken
    };

    try {
      const response = await fetch(window.EldiApp.config.contactWorkerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      let result;
      try {
        result = await response.json();
      } catch {
        throw new Error("The server returned an invalid response.");
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to send your request.");
      }

      form.reset();
      window.EldiApp.booking?.resetDateRules();

      showFormStatus(
        "success",
        result.message ||
          "Thank you! Your request was sent successfully. We will reply as soon as possible."
      );
    } catch (error) {
      console.error("Booking form error:", error);
      showFormStatus(
        "error",
        error.message ||
          "Your request could not be sent. Please contact us through WhatsApp or call +355 69 604 5101."
      );
    } finally {
      button.disabled = false;
      button.textContent = originalButtonText;
      window.turnstile?.reset();
    }
  });
});
