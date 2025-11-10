import { generateDates } from '../utils/dateUtils.js';
import { updateTicketInfo } from '../services/updateTicketInfo.js';
import { getMovieSchedule, generateScheduledDates, populateTimeSlots } from '../utils/movieSchedule.js';

document.addEventListener("DOMContentLoaded", () => {
  const BASE_PRICE = 300;
  const seats = document.querySelectorAll(".seat");
  const selectedSeatsEl = document.getElementById("selected-seats");
  const seatCountEl = document.getElementById("seat-count");
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

  // Store transaction data globally for later use
  let currentTransactionData = null;

if (confirmPaymentBtn) {
  confirmPaymentBtn.addEventListener('click', async () => {
    console.log('User selected payment method:', selectedPayment);
    
    // Gather transaction data
    const dateTimeEl = document.getElementById('selected-date-time');
    const cinemaNumberEl = document.getElementById('cinema-number');
    const totalCostPanelEl = document.getElementById('total-cost-panel');
    
    // FIX: Get ALL selected seats directly from DOM, not from display text
    const selectedSeats = Array.from(document.querySelectorAll('.seat.selected'))
      .map(seat => seat.textContent.trim())
      .join(', ');
    
    console.log('Selected seats:', selectedSeats); // Debug log
    
    // Get movie title from the page
    const movieTitleEl = document.querySelector('.movie-detail h1');
    const movieTitle = movieTitleEl ? movieTitleEl.textContent : 'Unknown Movie';
      
      const prepareData = {
        selectedDate: dateTimeEl.textContent,
        cinemaRoom: cinemaNumberEl.textContent,
        totalAmount: totalCostPanelEl.textContent
      };
      
      console.log('Preparing transaction with data:', prepareData);
      
      // Keep payment method modal open - DON'T hide it yet
      var method = bootstrap.Modal.getInstance(document.getElementById('paymentMethodModal'));
      
      // Show loading state
      confirmPaymentBtn.disabled = true;
      confirmPaymentBtn.textContent = 'Processing...';
      
      try {
        // Step 1: Prepare transaction - get next ID and barcode
        const response = await fetch('/api/prepare-transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(prepareData)
        });
        
        const result = await response.json();
        
        // NOW close payment method modal after we get response
        if (method) method.hide();
        
        if (result.success) {
          console.log('Transaction prepared:', result);
          
          // Store all transaction data for later confirmation
         currentTransactionData = {
        transaction_id: result.transaction_id,
        barcode: result.barcode,
        db_date: result.db_date,
        selectedDate: dateTimeEl.textContent,
        cinemaRoom: cinemaNumberEl.textContent,
        movieTitle: movieTitle,
        selectedSeats: selectedSeats, // Use the directly collected seats
        totalAmount: totalCostPanelEl.textContent
      };
    
          
          console.log('Stored transaction data:', currentTransactionData);
          
          // Show success modal with barcode
          const barcodeEl = document.getElementById('transactionBarcode');
          if (barcodeEl) {
            barcodeEl.textContent = result.barcode;
            // Store barcode as data attribute for later use
            barcodeEl.setAttribute('data-barcode', result.barcode);
          }
          var successModal = new bootstrap.Modal(document.getElementById('successModal'));
          successModal.show();
        } else {
          console.error('Transaction preparation failed:', result.message);
          // Show error modal
          const errorMessageEl = document.getElementById('transactionErrorMessage');
          if (errorMessageEl) {
            errorMessageEl.textContent = result.message;
          }
          var failedModal = new bootstrap.Modal(document.getElementById('transactionFailedModal'));
          failedModal.show();
        }
      } catch (error) {
        console.error('Error preparing transaction:', error);
        // Close payment modal on error too
        if (method) method.hide();
        // Show error modal
        const errorMessageEl = document.getElementById('transactionErrorMessage');
        if (errorMessageEl) {
          errorMessageEl.textContent = 'Network error: Could not connect to server.';
        }
        var failedModal = new bootstrap.Modal(document.getElementById('transactionFailedModal'));
        failedModal.show();
      } finally {
        // Reset button state
        confirmPaymentBtn.disabled = false;
        confirmPaymentBtn.textContent = 'Confirm Payment';
      }
    });
  }

  // Handle "Done" button in success modal to confirm and insert transaction
  const successModalDoneBtn = document.querySelector('#successModal button[data-bs-dismiss="modal"]');
  if (successModalDoneBtn) {
    successModalDoneBtn.addEventListener('click', async () => {
      if (currentTransactionData) {
        try {
          console.log('Confirming and inserting transaction:', currentTransactionData);
          
          // Step 2: Insert complete transaction with barcode
          const response = await fetch('/api/confirm-transaction', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(currentTransactionData)
          });
          
          const result = await response.json();
          if (result.success) {
            console.log('Transaction saved successfully to database!');
            console.log('Transaction ID:', currentTransactionData.transaction_id);
            console.log('Barcode:', currentTransactionData.barcode);
            
            // Reset transaction data
            currentTransactionData = null;
            
            // Optionally redirect to home or show confirmation
            setTimeout(() => {
              window.location.href = '/';
            }, 500);
          } else {
            console.error('Failed to save transaction:', result.message);
            alert('Warning: Transaction may not be saved. Please contact support.');
          }
        } catch (error) {
          console.error('Error saving transaction:', error);
          alert('Warning: Could not save transaction. Please contact support.');
        }
      } else {
        console.error('Missing transaction data');
      }
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