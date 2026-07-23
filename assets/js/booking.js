window.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("bookingForm");
  if (!form) return;

  const { formatLocalDate, addDays } = window.EldiApp.utils;
  const { availabilityWorkerUrl } = window.EldiApp.config;
  const checkinInput = form.elements.checkin;
  const checkoutInput = form.elements.checkout;
  const guestsInput = form.elements.guests;
  const rangeInput = document.getElementById("stayDates");
  const stayDuration = document.getElementById("stayDuration");
  const calendarLoading = document.getElementById("calendarLoading");

  let unavailableDates = new Set();
  let availabilityLoaded = false;
  let picker = null;
  let selectedCheckin = "";

  const setLoading = (loading, message = "Loading live availability…") => {
    if (!calendarLoading) return;
    calendarLoading.textContent = message;
    calendarLoading.classList.toggle("hidden", !loading);
  };

  function showDateMessage(message, type = "error") {
    stayDuration.textContent = message;
    stayDuration.className = type === "success"
      ? "rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800"
      : type === "info"
        ? "rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-900"
        : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800";
  }

  function clearDateMessage() {
    stayDuration.textContent = "";
    stayDuration.className = "hidden";
  }

  function getNights(checkin, checkout) {
    if (!checkin || !checkout) return 0;
    const start = new Date(`${checkin}T12:00:00`);
    const end = new Date(`${checkout}T12:00:00`);
    return Math.round((end - start) / 86400000);
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
    return [...unavailableDates].filter((date) => date > checkin).sort()[0] || null;
  }

  function getLatestCheckoutDate(checkin) {
    const nextUnavailable = getNextUnavailableDate(checkin);
    return nextUnavailable ? addDays(nextUnavailable, -1) : null;
  }

  function syncHiddenDates(checkin = "", checkout = "") {
    checkinInput.value = checkin;
    checkoutInput.value = checkout;
    selectedCheckin = checkin;
  }

  function validateSelectedStay({ clearInvalid = false } = {}) {
    const checkin = checkinInput.value;
    const checkout = checkoutInput.value;

    if (!checkin || !checkout) return false;
    if (unavailableDates.has(checkin)) {
      showDateMessage("This check-in date is booked. Please choose another date.");
      if (clearInvalid) resetDateRules();
      return false;
    }
    if (checkout <= checkin) {
      showDateMessage("Check-out must be after check-in.");
      if (clearInvalid) resetDateRules();
      return false;
    }
    if (unavailableDates.has(checkout) || stayOverlapsUnavailable(checkin, checkout)) {
      showDateMessage("The selected stay overlaps booked dates. Please choose different dates.");
      if (clearInvalid) resetDateRules();
      return false;
    }

    const latestCheckout = getLatestCheckoutDate(checkin);
    if (latestCheckout && checkout > latestCheckout) {
      showDateMessage(`Check-out must be on or before ${latestCheckout}.`);
      if (clearInvalid) resetDateRules();
      return false;
    }
    return true;
  }

  function updateStayDuration() {
    const checkin = checkinInput.value;
    const checkout = checkoutInput.value;
    if (!checkin || !checkout) return;

    const nights = getNights(checkin, checkout);
    if (nights < 1 || (availabilityLoaded && !validateSelectedStay())) return;

    const guestCount = Number.parseInt(guestsInput.value, 10);
    const guestText = guestCount > 0
      ? ` • ${guestCount} ${guestCount === 1 ? "guest" : "guests"}`
      : "";
    showDateMessage(`Stay duration: ${nights} ${nights === 1 ? "night" : "nights"}${guestText}`, "success");
  }

  function updateCheckoutBoundary(checkin) {
    if (!picker) return;
    picker.set("minDate", checkin || formatLocalDate(new Date()));
    picker.set("maxDate", checkin ? (getLatestCheckoutDate(checkin) || null) : null);
    picker.redraw();
  }

  function addHoverPreview(dayElement) {
    dayElement.addEventListener("mouseenter", () => {
      if (!selectedCheckin || checkinInput.value && checkoutInput.value) return;
      const hoverDate = formatLocalDate(dayElement.dateObj);
      const nights = getNights(selectedCheckin, hoverDate);
      if (nights > 0 && !dayElement.classList.contains("flatpickr-disabled")) {
        showDateMessage(`${nights} ${nights === 1 ? "night" : "nights"} selected`, "info");
      }
    });
  }

  function initializeCalendar() {
    if (picker || !rangeInput) return;

    if (typeof window.flatpickr !== "function") {
      setLoading(false);
      showDateMessage("The booking calendar could not load. Please refresh the page.");
      return;
    }

    picker = window.flatpickr(rangeInput, {
      mode: "range",
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "M j, Y",
      conjunction: " → ",
      minDate: formatLocalDate(new Date()),
      disable: [...unavailableDates],
      disableMobile: true,
      allowInput: false,
      clickOpens: true,
      monthSelectorType: "static",
      locale: { firstDayOfWeek: 1, rangeSeparator: " → " },
      showMonths: window.matchMedia("(min-width: 768px)").matches ? 2 : 1,
      onOpen: () => {
        if (!checkinInput.value) showDateMessage("Select your check-in date, then choose check-out.", "info");
      },
      onDayCreate: (_dates, _dateStr, _instance, dayElement) => {
        const date = formatLocalDate(dayElement.dateObj);
        if (unavailableDates.has(date)) {
          dayElement.classList.add("booked-date");
          dayElement.setAttribute("aria-label", `${dayElement.getAttribute("aria-label") || date}, booked`);
          dayElement.title = "Booked";
        }
        addHoverPreview(dayElement);
      },
      onChange: (selectedDates) => {
        if (selectedDates.length === 0) {
          syncHiddenDates();
          updateCheckoutBoundary("");
          clearDateMessage();
          return;
        }

        const checkin = formatLocalDate(selectedDates[0]);
        if (selectedDates.length === 1) {
          syncHiddenDates(checkin, "");
          updateCheckoutBoundary(checkin);
          const latest = getLatestCheckoutDate(checkin);
          if (latest) {
            const nights = getNights(checkin, latest);
            showDateMessage(`Choose check-out. Up to ${nights} ${nights === 1 ? "night" : "nights"} available before the next booking.`, "info");
          } else {
            showDateMessage("Now choose your check-out date.", "info");
          }
          return;
        }

        const checkout = formatLocalDate(selectedDates[1]);
        syncHiddenDates(checkin, checkout);
        updateCheckoutBoundary(checkin);
        if (!validateSelectedStay({ clearInvalid: true })) return;
        updateStayDuration();
        picker.close();
      },
      onClose: (selectedDates) => {
        if (selectedDates.length === 1) {
          showDateMessage("Please choose a check-out date to complete your stay.", "info");
        }
      }
    });

    setLoading(false);
  }

  function refreshCalendarAvailability() {
    if (!picker) return;
    picker.set("disable", [...unavailableDates]);
    updateCheckoutBoundary(checkinInput.value);
    picker.redraw();
  }

  async function loadAvailability() {
    setLoading(true);

    if (!availabilityWorkerUrl) {
      setLoading(false);
      showDateMessage("Calendar ready. Dates will be confirmed when your request is sent.", "info");
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(availabilityWorkerUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-cache",
        signal: controller.signal
      });

      const data = await response.json();
      if (!response.ok || !data.success || !Array.isArray(data.unavailableDates)) {
        throw new Error(data.message || "Invalid availability response.");
      }

      unavailableDates = new Set(
        data.unavailableDates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      );
      availabilityLoaded = true;
      refreshCalendarAvailability();
      setLoading(false);

      if (!checkinInput.value && !checkoutInput.value) clearDateMessage();
    } catch (error) {
      console.error("Availability loading failed:", error);
      availabilityLoaded = false;
      setLoading(false);
      showDateMessage(
        "Live availability could not be refreshed. The calendar is still available and your dates will be checked before the request is sent.",
        "info"
      );
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function resetDateRules() {
    syncHiddenDates();
    picker?.clear(false);
    updateCheckoutBoundary("");
    clearDateMessage();
  }

  guestsInput.addEventListener("input", updateStayDuration);

  form.addEventListener("submit", (event) => {
    if (!checkinInput.value || !checkoutInput.value) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showDateMessage("Please select both check-in and check-out dates.");
      picker?.open();
      return;
    }

    if (availabilityLoaded && !validateSelectedStay()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      picker?.open();
    }
  }, true);

  initializeCalendar();
  loadAvailability();

  window.EldiApp.booking = {
    updateStayDuration,
    resetDateRules,
    validateSelectedStay,
    loadAvailability
  };
});
