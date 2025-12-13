function formatDate(dateString) {
  // Handle missing or invalid date
  if (!dateString) {
    return "TBA";
  }
  
  const date = new Date(dateString);
  
  // Check for invalid date
  if (isNaN(date.getTime())) {
    return "TBA";
  }
  
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Filter out past time slots for today's date
 * @param {string[]} timeSlots - Array of time slots like ["10:00 AM", "1:00 PM"]
 * @param {Date} selectedDate - The date being checked
 * @returns {string[]} - Filtered time slots (only future times if today, all times if future date)
 */
function filterPastTimeSlots(timeSlots, selectedDate) {
  const now = new Date();
  const selected = new Date(selectedDate);
  
  // Normalize dates to compare just the date portion
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const selectedDateOnly = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate());
  
  // If selected date is in the future, show all times
  if (selectedDateOnly > nowDate) {
    return timeSlots;
  }
  
  // If selected date is in the past, show no times (shouldn't happen but safety check)
  if (selectedDateOnly < nowDate) {
    return [];
  }
  
  // If today, filter out past times
  return timeSlots.filter(timeSlot => {
    // Parse time like "10:00 AM" or "1:00 PM"
    const [time, period] = timeSlot.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    
    // Convert to 24-hour format
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
    const slotTime = new Date(now);
    slotTime.setHours(hours, minutes, 0, 0);
    
    // Return true if the time slot is in the future
    return slotTime > now;
  });
}

/**
 * Get the full date object from a selected date pill
 * @returns {Date|null} - The selected date or null
 */
function getSelectedDate() {
  const selectedDatePill = document.querySelector('.date-pill.selected');
  if (!selectedDatePill) return null;
  
  const month = selectedDatePill.querySelector('.date-month').textContent.trim();
  const day = parseInt(selectedDatePill.querySelector('.date-num').textContent.trim());
  
  // Convert month abbreviation to number
  const monthMap = {
    'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3,
    'MAY': 4, 'JUN': 5, 'JUL': 6, 'AUG': 7,
    'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
  };
  
  const monthNum = monthMap[month.toUpperCase()];
  const year = new Date().getFullYear();
  
  // Handle year rollover (e.g., if current month is Dec and selected is Jan)
  const now = new Date();
  let selectedYear = year;
  if (monthNum < now.getMonth() - 6) {
    selectedYear = year + 1; // Assume next year if month is much earlier
  }
  
  return new Date(selectedYear, monthNum, day);
}

function generateDates(updateCallback) {
  const dateStrip = document.getElementById("date-strip");
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(today.getDate() + i);

    const month = date.toLocaleString("default", { month: "short" });
    const day = date.toLocaleString("default", { weekday: "short" });
    const num = date.getDate();

    // Create elements using DOM manipulation
    const div = document.createElement("div");
    div.classList.add("date-pill", "d-flex", "flex-column", "justify-content-center", "align-items-center", "p-2", "rounded-3", "shadow-sm");
    if (i === 0) div.classList.add("selected"); // default today

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
  }
}

export { formatDate, generateDates, filterPastTimeSlots, getSelectedDate };