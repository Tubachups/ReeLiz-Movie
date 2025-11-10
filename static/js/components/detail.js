import { generateDates } from '../utils/dateUtils.js';
import { updateTicketInfo } from '../services/updateTicketInfo.js';
import { getMovieSchedule, generateScheduledDates, populateTimeSlots } from '../utils/movieSchedule.js';

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

  // Get movie schedule and generate appropriate dates
  const movieSchedule = getMovieSchedule();
  
  if (movieSchedule && movieSchedule.allowedWeekdays.length > 0) {
    // Generate only scheduled dates for this movie
    generateScheduledDates(update, movieSchedule);
    // Populate only scheduled time slots
    populateTimeSlots(movieSchedule);
  } else {
    // Fallback to regular date generation if no schedule
    generateDates(update);
  }

  // Handle cinema carousel changes to update time slot and cinema display
  const cinemaCarousel = document.getElementById('cinemaCarousel');
  const cinemaNumberEl = document.getElementById('cinema-number');
  
  if (cinemaCarousel && movieSchedule) {
    cinemaCarousel.addEventListener('slid.bs.carousel', function (e) {
      const activeSlide = e.relatedTarget;
      const cinemaNumber = activeSlide.querySelector('[data-cinema]')?.getAttribute('data-cinema');
      
      if (cinemaNumber && showtimeSelect) {
        // Update cinema number display
        if (cinemaNumberEl) {
          cinemaNumberEl.textContent = cinemaNumber;
        }
        
        // Cinema 1 gets the first time slot, Cinema 2 gets the second time slot
        const timeIndex = parseInt(cinemaNumber) - 1;
        if (movieSchedule.timeSlots[timeIndex]) {
          showtimeSelect.value = movieSchedule.timeSlots[timeIndex];
          // Clear selected seats when changing cinema
          document.querySelectorAll('.seat.selected').forEach(seat => {
            seat.classList.remove('selected');
            seat.classList.add('vacant');
          });
          update();
        }
      }
    });
  }

  // Toggle seat selection
  seats.forEach((seat) => {
    seat.addEventListener("click", () => {
      if (seat.classList.contains("occupied")) return;
      seat.classList.toggle("selected");
      seat.classList.toggle("vacant");
      update();
    });
  });

  // Note: Showtime is now automatically set by cinema selection, no manual change needed

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

  // When user clicks Proceed inside the first payment modal, check if user is signed in
  const paymentModalProceedBtn = document.getElementById('paymentModalProceedBtn');
  if (paymentModalProceedBtn) {
    paymentModalProceedBtn.addEventListener('click', function () {
      // Hide the first modal
      var first = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
      if (first) first.hide();

      // Check if user is signed in
      const authStatus = document.getElementById('userAuthStatus');
      const isSignedIn = authStatus && authStatus.getAttribute('data-authenticated') === 'true';

      if (!isSignedIn) {
        // Show sign-in required modal
        var signInModal = new bootstrap.Modal(document.getElementById('signInRequiredModal'), { backdrop: 'static', keyboard: false });
        signInModal.show();
      } else {
        // Show payment method modal
        var methodModal = new bootstrap.Modal(document.getElementById('paymentMethodModal'), { backdrop: 'static', keyboard: false });
        methodModal.show();
      }
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
      
      // Show success modal with animation
      var successModal = new bootstrap.Modal(document.getElementById('successModal'));
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