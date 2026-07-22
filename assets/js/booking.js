window.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("bookingForm");
  if (!form) return;

  const { formatLocalDate, addDays } = window.EldiApp.utils;
  const checkinInput = form.elements.checkin;
  const checkoutInput = form.elements.checkout;
  const guestsInput = form.elements.guests;
  const stayDuration = document.getElementById("stayDuration");

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

  function resetDateRules() {
    const today = formatLocalDate(new Date());
    checkinInput.min = today;
    checkoutInput.min = addDays(today, 1);
    updateStayDuration();
  }

  resetDateRules();

  checkinInput.addEventListener("change", () => {
    const today = formatLocalDate(new Date());

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

  window.EldiApp.booking = { updateStayDuration, resetDateRules };
});
