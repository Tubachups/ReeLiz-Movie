import { filterPastTimeSlots, getSelectedDate } from './dateUtils.js';

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

  // Get selected date and filter past time slots
  const selectedDate = getSelectedDate();
  const availableTimeSlots = selectedDate 
    ? filterPastTimeSlots(schedule.timeSlots, selectedDate)
    : schedule.timeSlots;

  // Clear existing options
  showtimeSelect.innerHTML = "";

  // Add only the available time slots for this movie
  availableTimeSlots.forEach((time) => {
    const option = document.createElement("option");
    option.value = time;
    option.textContent = time;
    showtimeSelect.appendChild(option);
  });

  // Update cinema visibility based on available times
  updateCinemaVisibility(schedule, availableTimeSlots);

  // Set initial time based on active cinema
  const activeCarouselItem = document.querySelector('#cinemaCarousel .carousel-item.active');
  if (activeCarouselItem) {
    const cinemaNumber = activeCarouselItem.querySelector('[data-cinema]')?.getAttribute('data-cinema');
    if (cinemaNumber) {
      const timeIndex = parseInt(cinemaNumber) - 1;
      if (schedule.timeSlots[timeIndex] && availableTimeSlots.includes(schedule.timeSlots[timeIndex])) {
        showtimeSelect.value = schedule.timeSlots[timeIndex];
      } else if (availableTimeSlots.length > 0) {
        // If the current cinema's time is not available, use the first available time
        showtimeSelect.value = availableTimeSlots[0];
      }
    }
  }
}

/**
 * Update cinema carousel visibility based on available time slots
 * Hides cinemas whose scheduled time has passed for today
 */
function updateCinemaVisibility(schedule, availableTimeSlots) {
  const carousel = document.getElementById('cinemaCarousel');
  if (!carousel || !schedule || !schedule.timeSlots) return;

  const carouselItems = carousel.querySelectorAll('.carousel-item');
  const carouselControls = carousel.querySelectorAll('.carousel-control-prev, .carousel-control-next');
  
  let visibleCinemas = 0;
  let firstVisibleIndex = -1;

  carouselItems.forEach((item, index) => {
    // Cinema 1 uses timeSlots[0], Cinema 2 uses timeSlots[1]
    const cinemaTimeSlot = schedule.timeSlots[index];
    const isTimeAvailable = availableTimeSlots.includes(cinemaTimeSlot);

    if (isTimeAvailable) {
      item.style.display = '';
      item.classList.remove('unavailable-cinema');
      visibleCinemas++;
      if (firstVisibleIndex === -1) {
        firstVisibleIndex = index;
      }
    } else {
      item.style.display = 'none';
      item.classList.add('unavailable-cinema');
      item.classList.remove('active');
    }
  });

  // If no cinemas are visible, show a message
  const noCinemasMsg = carousel.querySelector('.no-cinemas-message');
  if (visibleCinemas === 0) {
    if (!noCinemasMsg) {
      const msg = document.createElement('div');
      msg.className = 'no-cinemas-message text-center text-muted py-4';
      msg.innerHTML = '<i class="bi bi-clock-history fs-1 mb-2 d-block"></i><p>No more showings available for today.<br>Please select a future date.</p>';
      carousel.querySelector('.carousel-inner').appendChild(msg);
    }
    // Hide carousel controls
    carouselControls.forEach(ctrl => ctrl.style.display = 'none');
  } else {
    if (noCinemasMsg) noCinemasMsg.remove();
    // Show/hide controls based on number of visible cinemas
    carouselControls.forEach(ctrl => {
      ctrl.style.display = visibleCinemas > 1 ? '' : 'none';
    });
    
    // Make sure the first visible cinema is active
    if (firstVisibleIndex >= 0 && !carouselItems[firstVisibleIndex].classList.contains('active')) {
      carouselItems.forEach(item => item.classList.remove('active'));
      carouselItems[firstVisibleIndex].classList.add('active');
      
      // Update showtime dropdown and cinema number display
      const showtimeSelect = document.getElementById("showtime");
      const cinemaNumberEl = document.getElementById('cinema-number');
      const cinemaNumber = carouselItems[firstVisibleIndex].querySelector('[data-cinema]')?.getAttribute('data-cinema');
      
      if (cinemaNumber && showtimeSelect && schedule.timeSlots[firstVisibleIndex]) {
        showtimeSelect.value = schedule.timeSlots[firstVisibleIndex];
        if (cinemaNumberEl) cinemaNumberEl.textContent = cinemaNumber;
      }
    }
  }

  return visibleCinemas;
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

export { getMovieSchedule, generateScheduledDates, populateTimeSlots, getActiveCinema, updateCinemaVisibility };
