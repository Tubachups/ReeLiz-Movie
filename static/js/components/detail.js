import { generateDates } from '../utils/dateUtils.js';
import { updateTicketInfo } from '../services/updateTicketInfo.js';

document.addEventListener("DOMContentLoaded", () => {
  const BASE_PRICE = 300;
  const seats = document.querySelectorAll(".seat");
  const selectedSeatsEl = document.getElementById("selected-seats");
  const seatCountEl = document.getElementById("seat-count");
  const seatQuantityEl = document.getElementById("seat-quantity");
  const dateTimeEl = document.getElementById("selected-date-time");
  const showtimeSelect = document.getElementById("showtime");

  // new panel elements
  const seatQuantityPanelEl = document.getElementById("seat-quantity-panel");
  const totalCostPanelEl = document.getElementById("total-cost-panel");

  // proceed button
  const proceedBtn = document.getElementById("ProceedBtn");

  // Cancel button
  const cancelBtn = document.getElementById("CancelBtn");

  // Book Now button
  const bookNowBtn = document.getElementById("bookNowBtn");
  const bookingSection = document.querySelector(".booking-section");

  // Bundle all elements needed by updateTicketInfo
  const elements = {
    selectedSeatsEl,
    seatCountEl,
    seatQuantityEl,
    seatQuantityPanelEl,
    totalCostPanelEl,
    proceedBtn,
    dateTimeEl,
    showtimeSelect
  };

  // Create a wrapper function to call updateTicketInfo with the required parameters
  const update = () => updateTicketInfo(elements, BASE_PRICE);

  // Generate dates with callback
  generateDates(update);

  // Toggle seat selection
  seats.forEach((seat) => {
    seat.addEventListener("click", () => {
      if (seat.classList.contains("occupied")) return;
      seat.classList.toggle("selected");
      seat.classList.toggle("vacant");
      update();
    });
  });

  // Showtime select change
  if (showtimeSelect) {
    showtimeSelect.addEventListener("change", update);
  }

  // Cancel button redirect
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      window.location.href = "#"; // or handle data-page="now" logic here
    });
  }

  // Show payment modal when Proceed is clicked
  if (proceedBtn) {
    proceedBtn.addEventListener("click", function () {
      var paymentModal = new bootstrap.Modal(
        document.getElementById("paymentModal"),
        {
          backdrop: "static",
          keyboard: false,
        }
      );
      paymentModal.show();
    });
  }

  // When user clicks Proceed inside the first payment modal, open payment method modal
  const paymentModalProceedBtn = document.getElementById('paymentModalProceedBtn');
  if (paymentModalProceedBtn) {
    paymentModalProceedBtn.addEventListener('click', function () {
      // Hide the first modal
      var first = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
      if (first) first.hide();

      // Show payment method modal
      var methodModal = new bootstrap.Modal(document.getElementById('paymentMethodModal'), { backdrop: 'static', keyboard: false });
      methodModal.show();
    });
  }

  // Payment method selection logic
  const paymentOptions = document.querySelectorAll('.payment-option');
  const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
  let selectedPayment = null;

  paymentOptions.forEach((opt) => {
    opt.addEventListener('click', () => {
      // toggle selection
      paymentOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      selectedPayment = opt.getAttribute('data-method');
      if (confirmPaymentBtn) confirmPaymentBtn.removeAttribute('disabled');
    });
  });

  if (confirmPaymentBtn) {
    confirmPaymentBtn.addEventListener('click', () => {
      // You can replace this with real checkout flow
      console.log('User selected payment method:', selectedPayment);
      // Close payment method modal
      var method = bootstrap.Modal.getInstance(document.getElementById('paymentMethodModal'));
      if (method) method.hide();
      // Optionally show a success toast or redirect
      // For now, show the original paymentModal again as confirmation (or redirect to payment)
      var successModal = new bootstrap.Modal(document.getElementById('paymentModal'));
      successModal.show();
    });
  }

  // Book Now button functionality
  if (bookNowBtn && bookingSection) {
    bookNowBtn.addEventListener("click", () => {
      bookingSection.classList.add("d-block");
      bookingSection.classList.remove("d-none");
      bookingSection.style.transofrm = "translateY(0)";
      bookingSection.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Initial update
  update();
});