function generateDates() {
  const dateStrip = document.getElementById("date-strip");
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(today.getDate() + i);

    const month = date.toLocaleString("default", { month: "short" });
    const day = date.toLocaleString("default", { weekday: "short" });
    const num = date.getDate();

    const div = document.createElement("div");
    div.classList.add("date-pill");
    if (i === 0) div.classList.add("selected"); // default today

    div.innerHTML = `
      <div class="date-month">${month}</div>
      <div class="date-num">${num}</div>
      <div class="date-day">${day}</div>
    `;

    div.addEventListener("click", () => {
      document
        .querySelectorAll(".date-pill")
        .forEach((d) => d.classList.remove("selected"));
      div.classList.add("selected");
      updateTicketInfo(); // ✅ update immediately when date changes
    });

    dateStrip.appendChild(div);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  generateDates();

  const BASE_PRICE = 300;

  const seats = document.querySelectorAll(".seat");
  const selectedSeatsEl = document.getElementById("selected-seats");
  const seatCountEl = document.getElementById("seat-count");
  const seatQuantityEl = document.getElementById("seat-quantity");
  const totalCostEl = document.getElementById("total-cost");
  const dateTimeEl = document.getElementById("selected-date-time");
  const showtimeSelect = document.getElementById("showtime");

  function updateTicketInfo() {
    const selectedSeats = document.querySelectorAll(".seat.selected");
    const seatNumbers = Array.from(selectedSeats).map(
      (seat) => seat.textContent
    );

    // Seats info
    selectedSeatsEl.textContent =
      seatNumbers.length > 0 ? seatNumbers.join(", ") : "None";
    seatCountEl.textContent = seatNumbers.length;
    seatQuantityEl.textContent = seatNumbers.length;
    totalCostEl.textContent = seatNumbers.length * BASE_PRICE;

    // ✅ Always update Date & Time when date or time changes
    const selectedDate = document.querySelector(".date-pill.selected");
    const showtime = showtimeSelect ? showtimeSelect.value : "";
    if (selectedDate) {
      const month = selectedDate.querySelector(".date-month").textContent;
      const num = selectedDate.querySelector(".date-num").textContent;
      const day = selectedDate.querySelector(".date-day").textContent;
      dateTimeEl.textContent = `${month} ${num} (${day}), ${showtime}`;
    } else {
      dateTimeEl.textContent = "Not selected";
    }
  }

  // Toggle seat selection
  seats.forEach((seat) => {
    seat.addEventListener("click", () => {
      if (seat.classList.contains("occupied")) return; // 🚫 skip if occupied
      seat.classList.toggle("selected");
      seat.classList.toggle("vacant");
      updateTicketInfo();
    });
  });

  // ✅ Update when showtime changes
  if (showtimeSelect) {
    showtimeSelect.addEventListener("change", updateTicketInfo);
  }

  // ✅ Initial update (to show default today + default time)
  updateTicketInfo();
});
