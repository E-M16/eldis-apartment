const CONTACT_WORKER_URL =
  "https://eldis-apartment-contact.eldi-1291.workers.dev/";

const bookingForm = document.getElementById("bookingForm");
const formStatus = document.getElementById("formStatus");
const checkinInput = bookingForm.elements.checkin;
const checkoutInput = bookingForm.elements.checkout;
const guestsInput = bookingForm.elements.guests;
const stayDuration = document.getElementById("stayDuration");

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

function updateStayDuration() {
  const checkin = checkinInput.value;
  const checkout = checkoutInput.value;

  if (!checkin || !checkout) {
    stayDuration.textContent = "";
    stayDuration.classList.add("hidden");
    return;
  }

  const start = new Date(`${checkin}T12:00:00`);
  const end = new Date(`${checkout}T12:00:00`);
  const nights = Math.round((end - start) / 86400000);

  if (nights < 1) {
    stayDuration.textContent = "Check-out must be after check-in.";
    stayDuration.className =
      "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800";
    return;
  }

  const guestCount = Number.parseInt(guestsInput.value, 10);
  const guestText = guestCount > 0
    ? ` • ${guestCount} ${guestCount === 1 ? "guest" : "guests"}`
    : "";

  stayDuration.textContent =
    `Stay duration: ${nights} ${nights === 1 ? "night" : "nights"}${guestText}`;
  stayDuration.className =
    "rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800";
}

const today = formatLocalDate(new Date());
checkinInput.min = today;
checkoutInput.min = addDays(today, 1);

checkinInput.addEventListener("change", function () {
  if (!checkinInput.value) {
    checkoutInput.min = addDays(today, 1);
    updateStayDuration();
    return;
  }

  const earliestCheckout = addDays(checkinInput.value, 1);
  checkoutInput.min = earliestCheckout;

  if (!checkoutInput.value || checkoutInput.value < earliestCheckout) {
    checkoutInput.value = earliestCheckout;
  }

  updateStayDuration();
});

checkoutInput.addEventListener("change", updateStayDuration);
guestsInput.addEventListener("input", updateStayDuration);

function showFormStatus(type, message) {
  formStatus.textContent = message;
  formStatus.className =
    "rounded-xl p-4 text-sm font-semibold " +
    (type === "success"
      ? "bg-green-100 text-green-800 border border-green-300"
      : "bg-red-100 text-red-800 border border-red-300");

  formStatus.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}

function clearFormStatus() {
  formStatus.textContent = "";
  formStatus.className = "hidden rounded-xl p-4 text-sm font-semibold";
}

bookingForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  clearFormStatus();

  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const originalButtonText = button.textContent;

  const turnstileField = form.querySelector(
    '[name="cf-turnstile-response"]'
  );

  const turnstileToken = turnstileField
    ? turnstileField.value
    : "";

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
    turnstileToken: turnstileToken
  };

  try {
    const response = await fetch(CONTACT_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    let result;

    try {
      result = await response.json();
    } catch {
      throw new Error("The server returned an invalid response.");
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Unable to send your request."
      );
    }

    form.reset();
    checkinInput.min = formatLocalDate(new Date());
    checkoutInput.min = addDays(checkinInput.min, 1);
    updateStayDuration();

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

    if (window.turnstile) {
      window.turnstile.reset();
    }
  }
});
