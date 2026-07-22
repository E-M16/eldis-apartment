window.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("bookingForm");
  if (!form) return;

  const { formatLocalDate, addDays } = window.EldiApp.utils;
  const { availabilityWorkerUrl } = window.EldiApp.config;
  const checkinInput = form.elements.checkin;
  const checkoutInput = form.elements.checkout;
  const guestsInput = form.elements.guests;
  const stayDuration = document.getElementById("stayDuration");
  let unavailableDates = new Set();
  let availabilityLoaded = false;

  function showDateMessage(message, type = "error") {
    stayDuration.textContent = message;
    stayDuration.className = type === "success"
      ? "rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800"
      : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800";
  }

  function stayOverlapsUnavailable(checkin, checkout) {
    if (!checkin || !checkout || checkout <= checkin) return false;

    for (let date = checkin; date < checkout; date = addDays(date, 1)) {
      if (unavailableDates.has(date)) return true;
    }

    return false;
  }

  function validateSelectedStay({ clearInvalid = false } = {}) {
    const checkin = checkinInput.value;
    const checkout = checkoutInput.value;

    if (checkin && unavailableDates.has(checkin)) {
      showDateMessage("This check-in date is unavailable. Please choose another date.");
      if (clearInvalid) checkinInput.value = "";
      return false;
    }

    if (checkin && checkout && stayOverlapsUnavailable(checkin, checkout)) {
      showDateMessage("The selected stay includes unavailable dates. Please choose different dates.");
      if (clearInvalid) checkoutInput.value = "";
      return false;
    }

    return true;
  }

  function updateStayDuration() {
    const checkin = checkinInput.value;
    const checkout = checkoutInput.value;

    if (!checkin || !checkout) {
      stayDuration.textContent = "";
      stayDuration.className = "hidden";
      return;
    }

    const start = new Date(`${checkin}T12:00:00`);
    const end = new Date(`${checkout}T12:00:00`);
    const nights = Math.round((end - start) / 86400000);

    if (nights < 1) {
      showDateMessage("Check-out must be after check-in.");
      return;
    }

    if (availabilityLoaded && !validateSelectedStay()) return;

    const guestCount = Number.parseInt(guestsInput.value, 10);
    const guestText = guestCount > 0
      ? ` • ${guestCount} ${guestCount === 1 ? "guest" : "guests"}`
      : "";

    showDateMessage(
      `Stay duration: ${nights} ${nights === 1 ? "night" : "nights"}${guestText}`,
      "success"
    );
  }

  function resetDateRules() {
    const today = formatLocalDate(new Date());
    checkinInput.min = today;
    checkoutInput.min = addDays(today, 1);
    updateStayDuration();
  }

  async function loadAvailability() {
    if (!availabilityWorkerUrl) return;

    try {
      const response = await fetch(availabilityWorkerUrl, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      const data = await response.json();

      if (!response.ok || !data.success || !Array.isArray(data.unavailableDates)) {
        throw new Error(data.message || "Invalid availability response.");
      }

      unavailableDates = new Set(data.unavailableDates);
      availabilityLoaded = true;
      validateSelectedStay({ clearInvalid: true });
      updateStayDuration();
    } catch (error) {
      console.error("Availability loading failed:", error);
      availabilityLoaded = false;
    }
  }

  resetDateRules();
  loadAvailability();

  checkinInput.addEventListener("change", () => {
    const today = formatLocalDate(new Date());

    if (availabilityLoaded && unavailableDates.has(checkinInput.value)) {
      showDateMessage("This check-in date is unavailable. Please choose another date.");
      checkinInput.value = "";
      checkoutInput.value = "";
      checkoutInput.min = addDays(today, 1);
      return;
    }

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

    if (availabilityLoaded && !validateSelectedStay({ clearInvalid: true })) return;
    updateStayDuration();
  });

  checkoutInput.addEventListener("change", () => {
    if (availabilityLoaded && !validateSelectedStay({ clearInvalid: true })) return;
    updateStayDuration();
  });

  guestsInput.addEventListener("input", updateStayDuration);

  form.addEventListener("submit", (event) => {
    if (availabilityLoaded && !validateSelectedStay()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      checkinInput.focus();
    }
  }, true);

  window.EldiApp.booking = {
    updateStayDuration,
    resetDateRules,
    validateSelectedStay,
    loadAvailability
  };
});
