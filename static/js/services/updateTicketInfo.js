function updateTicketInfo(elements, BASE_PRICE) {
  const {
    selectedSeatsEl,
    seatCountEl,
    seatQuantityEl,
    seatQuantityPanelEl,
    totalCostPanelEl,
    proceedBtn,
    dateTimeEl,
    showtimeSelect
  } = elements;

  const selectedSeats = document.querySelectorAll(".seat.selected");
  const seatNumbers = Array.from(selectedSeats).map(
    (seat) => seat.textContent
  );

  // Seats info
  selectedSeatsEl.textContent =
    seatNumbers.length > 0 ? seatNumbers.join(", ") : "None";
  seatCountEl.textContent = seatNumbers.length;
  seatQuantityEl.textContent = seatNumbers.length;

  // only update new panel
  seatQuantityPanelEl.textContent = seatNumbers.length;
  totalCostPanelEl.textContent = seatNumbers.length * BASE_PRICE;

  // Enable / disable proceed button
  proceedBtn.disabled = seatNumbers.length === 0;

  // Date + time info
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

export { updateTicketInfo };