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
  let checkinPicker = null;
  let checkoutPicker = null;

  function showDateMessage(message, type = "error") {
    stayDuration.textContent = message;
    stayDuration.className = type === "success"
      ? "rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800"
      : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800";
  }

  function clearDateMessage() {
    stayDuration.textContent = "";
    stayDuration.className = "hidden";
  }

  function stayOverlapsUnavailable(checkin, checkout) {
    if (!checkin || !checkout || checkout <= checkin) return false;

    for (let date = checkin; date < checkout; date = addDays(date, 1)) {
      if (unavailableDates.has(date)) return true;
    }

    return false;
  }

  function getNextUnavailableDate(checkin) {
    if (!checkin) return null;

    return [...unavailableDates]
      .filter((date) => date > checkin)
      .sort()[0] || null;
  }

  function getLatestCheckoutDate(checkin) {
    const nextUnavailable = getNextUnavailableDate(checkin);
    return nextUnavailable ? addDays(nextUnavailable, -1) : null;
  }

  function validateSelectedStay({ clearInvalid = false } = {}) {
    const checkin = checkinInput.value;
    const checkout = checkoutInput.value;

    if (checkin && unavailableDates.has(checkin)) {
      showDateMessage("This check-in date is booked. Please choose another date.");
      if (clearInvalid) {
        checkinPicker?.clear(false);
        checkoutPicker?.clear(false);
      }
      return false;
    }

    if (checkin && checkout && checkout <= checkin) {
      showDateMessage("Check-out must be after check-in.");
      if (clearInvalid) checkoutPicker?.clear(false);
      return false;
    }

    if (checkin && checkout && unavailableDates.has(checkout)) {
      showDateMessage("This check-out date is booked. Please choose an earlier date.");
      if (clearInvalid) checkoutPicker?.clear(false);
      return false;
    }

    if (checkin && checkout && stayOverlapsUnavailable(checkin, checkout)) {
      showDateMessage("The selected stay overlaps booked dates. Please choose different dates.");
      if (clearInvalid) checkoutPicker?.clear(false);
      return false;
    }

    const latestCheckout = getLatestCheckoutDate(checkin);
    if (checkin && checkout && latestCheckout && checkout > latestCheckout) {
      showDateMessage(`Check-out must be on or before ${latestCheckout} because the next reservation starts immediately after.`);
      if (clearInvalid) checkoutPicker?.clear(false);
      return false;
    }

    return true;
  }

  function updateStayDuration() {
    const checkin = checkinInput.value;
    const checkout = checkoutInput.value;

    if (!checkin || !checkout) {
      clearDateMessage();
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

  function configureCheckoutForCheckin(checkin, { open = false } = {}) {
    const today = formatLocalDate(new Date());
    const earliestCheckout = checkin ? addDays(checkin, 1) : addDays(today, 1);
    const latestCheckout = checkin ? getLatestCheckoutDate(checkin) : null;

    checkoutPicker.set("minDate", earliestCheckout);
    checkoutPicker.set("maxDate", latestCheckout || null);
    checkoutPicker.set("disable", [...unavailableDates]);

    if (checkoutInput.value) {
      const isTooEarly = checkoutInput.value < earliestCheckout;
      const isTooLate = latestCheckout && checkoutInput.value > latestCheckout;
      const isBooked = unavailableDates.has(checkoutInput.value);
      const overlaps = checkin && stayOverlapsUnavailable(checkin, checkoutInput.value);

      if (isTooEarly || isTooLate || isBooked || overlaps) {
        checkoutPicker.clear(false);
      }
    }

    if (open) checkoutPicker.open();
  }

  function initializeCalendars() {
    if (typeof window.flatpickr !== "function") {
      console.error("Flatpickr failed to load.");
      showDateMessage("The booking calendar could not load. Please refresh the page.");
      return;
    }

    const today = formatLocalDate(new Date());
    const commonOptions = {
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "F j, Y",
      allowInput: false,
      disableMobile: true,
      minDate: today,
      disable: [...unavailableDates],
      locale: { firstDayOfWeek: 1 },
      monthSelectorType: "static",
      animate: true,
      position: "auto center",
      onDayCreate: (_selectedDates, _dateStr, _instance, dayElement) => {
        const date = formatLocalDate(dayElement.dateObj);
        if (unavailableDates.has(date)) {
          dayElement.classList.add("booked-date");
          dayElement.setAttribute("aria-label", `${dayElement.getAttribute("aria-label") || date}, booked`);
          dayElement.title = "Booked";
        }
      }
    };

    checkinPicker = window.flatpickr(checkinInput, {
      ...commonOptions,
      minDate: today,
      onChange: (_selectedDates, dateString) => {
        if (!dateString) {
          checkoutPicker.clear(false);
          configureCheckoutForCheckin("");
          updateStayDuration();
          return;
        }

        if (unavailableDates.has(dateString)) {
          checkinPicker.clear(false);
          checkoutPicker.clear(false);
          showDateMessage("This check-in date is booked. Please choose another date.");
          return;
        }

        configureCheckoutForCheckin(dateString, { open: true });
        updateStayDuration();
      }
    });

    checkoutPicker = window.flatpickr(checkoutInput, {
      ...commonOptions,
      minDate: addDays(today, 1),
      onOpen: () => {
        configureCheckoutForCheckin(checkinInput.value);
      },
      onChange: () => {
        if (availabilityLoaded && !validateSelectedStay({ clearInvalid: true })) return;
        updateStayDuration();
      }
    });

    configureCheckoutForCheckin(checkinInput.value);
  }

  function refreshCalendarAvailability() {
    if (!checkinPicker || !checkoutPicker) return;

    checkinPicker.set("disable", [...unavailableDates]);
    configureCheckoutForCheckin(checkinInput.value);
    checkinPicker.redraw();
    checkoutPicker.redraw();
  }

  async function loadAvailability() {
    if (!availabilityWorkerUrl) {
      initializeCalendars();
      return;
    }

    try {
      const response = await fetch(availabilityWorkerUrl, {
        method: "GET",
        headers: { "Accept": "application/json" },
        cache: "no-cache"
      });
      const data = await response.json();

      if (!response.ok || !data.success || !Array.isArray(data.unavailableDates)) {
        throw new Error(data.message || "Invalid availability response.");
      }

      unavailableDates = new Set(
        data.unavailableDates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      );
      availabilityLoaded = true;

      if (!checkinPicker || !checkoutPicker) {
        initializeCalendars();
      } else {
        refreshCalendarAvailability();
      }

      validateSelectedStay({ clearInvalid: true });
      updateStayDuration();
    } catch (error) {
      console.error("Availability loading failed:", error);
      availabilityLoaded = false;
      initializeCalendars();
    }
  }

  function resetDateRules() {
    checkinPicker?.clear(false);
    checkoutPicker?.clear(false);
    configureCheckoutForCheckin("");
    clearDateMessage();
  }

  guestsInput.addEventListener("input", updateStayDuration);

  form.addEventListener("submit", (event) => {
    if (!checkinInput.value || !checkoutInput.value) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showDateMessage("Please select both check-in and check-out dates.");
      (checkinInput.value ? checkoutPicker : checkinPicker)?.open();
      return;
    }

    if (availabilityLoaded && !validateSelectedStay()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      checkinPicker?.open();
    }
  }, true);

  loadAvailability();

  window.EldiApp.booking = {
    updateStayDuration,
    resetDateRules,
    validateSelectedStay,
    loadAvailability
  };
});
