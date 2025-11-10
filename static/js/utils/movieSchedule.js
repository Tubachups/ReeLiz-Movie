/**
 * Get the movie schedule from the hidden element in the DOM
 */
function getMovieSchedule() {
  const scheduleEl = document.getElementById("movieSchedule");
  if (!scheduleEl) return null;

  const allowedWeekdaysStr = scheduleEl.getAttribute("data-allowed-weekdays");
  const timeSlotsStr = scheduleEl.getAttribute("data-time-slots");

  if (!allowedWeekdaysStr || !timeSlotsStr) return null;

  return {
    allowedWeekdays: allowedWeekdaysStr.split(",").map(Number),
    timeSlots: timeSlotsStr.split(","),
  };
}

/**
 * Check if a date is allowed for this movie
 */
function isDateAllowed(date, allowedWeekdays) {
  const dayOfWeek = date.getDay();
  return allowedWeekdays.includes(dayOfWeek);
}

/**
 * Generate only dates that match the movie schedule
 */
function generateScheduledDates(updateCallback, schedule) {
  const dateStrip = document.getElementById("date-strip");
  const today = new Date();
  let datesAdded = 0;
  let daysChecked = 0;

  // Clear existing dates
  dateStrip.innerHTML = "";

  // Generate up to 7 valid dates (or check up to 14 days ahead)
  while (datesAdded < 7 && daysChecked < 14) {
    const date = new Date();
    date.setDate(today.getDate() + daysChecked);

    // Check if this date is allowed for this movie
    if (isDateAllowed(date, schedule.allowedWeekdays)) {
      const month = date.toLocaleString("default", { month: "short" });
      const day = date.toLocaleString("default", { weekday: "short" });
      const num = date.getDate();

      // Create elements using DOM manipulation
      const div = document.createElement("div");
      div.classList.add(
        "date-pill",
        "d-flex",
        "flex-column",
        "justify-content-center",
        "align-items-center",
        "p-2",
        "rounded-3",
        "shadow-sm"
      );
      if (datesAdded === 0) div.classList.add("selected"); // default first valid date

      const monthDiv = document.createElement("div");
      monthDiv.classList.add("date-month", "text-uppercase");
      monthDiv.textContent = month;

      const numDiv = document.createElement("div");
      numDiv.classList.add("date-num", "fw-bold");
      numDiv.textContent = num;

      const dayDiv = document.createElement("div");
      dayDiv.classList.add("date-day");
      dayDiv.textContent = day;

      // Append child elements to parent
      div.appendChild(monthDiv);
      div.appendChild(numDiv);
      div.appendChild(dayDiv);

      div.addEventListener("click", () => {
        // Remove selected class from all dates first
        document
          .querySelectorAll(".date-pill")
          .forEach((d) => d.classList.remove("selected"));
        // Add selected class to clicked date
        div.classList.add("selected");
        // Update ticket info AFTER the DOM has been updated
        if (updateCallback) {
          updateCallback();
        }
      });

      dateStrip.appendChild(div);
      datesAdded++;
    }

    daysChecked++;
  }
}

/**
 * Populate time slots based on movie schedule and current cinema
 */
function populateTimeSlots(schedule) {
  const showtimeSelect = document.getElementById("showtime");
  if (!showtimeSelect || !schedule || !schedule.timeSlots) return;

  // Clear existing options
  showtimeSelect.innerHTML = "";

  // Add only the time slots for this movie
  schedule.timeSlots.forEach((time) => {
    const option = document.createElement("option");
    option.value = time;
    option.textContent = time;
    showtimeSelect.appendChild(option);
  });

  // Set initial time based on active cinema
  const activeCarouselItem = document.querySelector('#cinemaCarousel .carousel-item.active');
  if (activeCarouselItem) {
    const cinemaNumber = activeCarouselItem.querySelector('[data-cinema]')?.getAttribute('data-cinema');
    if (cinemaNumber) {
      const timeIndex = parseInt(cinemaNumber) - 1;
      if (schedule.timeSlots[timeIndex]) {
        showtimeSelect.value = schedule.timeSlots[timeIndex];
      }
    }
  }
}

/**
 * Get current active cinema number
 */
function getActiveCinema() {
  const activeCarouselItem = document.querySelector('#cinemaCarousel .carousel-item.active');
  if (activeCarouselItem) {
    const cinemaNumber = activeCarouselItem.querySelector('[data-cinema]')?.getAttribute('data-cinema');
    return cinemaNumber ? parseInt(cinemaNumber) : 1;
  }
  return 1;
}

export { getMovieSchedule, generateScheduledDates, populateTimeSlots, getActiveCinema };
