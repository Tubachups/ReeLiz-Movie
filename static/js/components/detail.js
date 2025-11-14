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

  // Store occupied seats data for both cinemas
  const occupiedSeatsCache = {
    '1': [],
    '2': []
  };

  // Helper function to get selected date in MM/DD format
  function getSelectedDateFormatted() {
    const selectedDatePill = document.querySelector('.date-pill.selected');
    if (!selectedDatePill) return null;
    
    const month = selectedDatePill.querySelector('.date-month').textContent.trim();
    const day = selectedDatePill.querySelector('.date-num').textContent.trim();
    
    // Convert month abbreviation to number
    const monthMap = {
      'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
      'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
      'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };
    
    const monthNum = monthMap[month.toUpperCase()];
    const dayNum = day.padStart(2, '0');
    
    return `${monthNum}/${dayNum}`;
  }

  // Function to fetch occupied seats for a specific cinema and date
  async function fetchOccupiedSeats(cinemaRoom) {
    try {
      const movieId = window.location.pathname.split('/').pop();
      const selectedDate = getSelectedDateFormatted();
      
      // Build URL with date parameter if available
      let url = `/api/occupied-seats/${movieId}/${cinemaRoom}`;
      if (selectedDate) {
        url += `?date=${selectedDate}`;
      }
      
      console.log(`Fetching occupied seats for Cinema ${cinemaRoom} on date ${selectedDate}`);
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success && data.occupied_seats) {
        occupiedSeatsCache[cinemaRoom] = data.occupied_seats;
        console.log(`Loaded occupied seats for Cinema ${cinemaRoom} on ${selectedDate}:`, data.occupied_seats);
        return data.occupied_seats;
      }
      return [];
    } catch (error) {
      console.error(`Error fetching occupied seats for cinema ${cinemaRoom}:`, error);
      return [];
    }
  }

  // Function to apply occupied seats to a specific cinema's DOM
  function applyOccupiedSeats(cinemaRoom, clearSelections = false) {
    const occupiedSeats = occupiedSeatsCache[cinemaRoom] || [];
    
    // Target seats in the specific cinema (using data-cinema attribute)
    const cinemaSeats = document.querySelectorAll(`.seat[data-cinema="${cinemaRoom}"]`);
    
    cinemaSeats.forEach(seat => {
      const seatCode = seat.textContent.trim();
      
      if (occupiedSeats.includes(seatCode)) {
        // Mark as occupied (red)
        seat.classList.remove('vacant', 'selected');
        seat.classList.add('occupied');
      } else {
        // Mark as vacant (clear selection if requested or always reset to vacant)
        if (clearSelections || !seat.classList.contains('selected')) {
          seat.classList.remove('occupied', 'selected');
          seat.classList.add('vacant');
        }
      }
    });
    
    console.log(`Applied occupied seats to Cinema ${cinemaRoom} (clearSelections: ${clearSelections})`);
  }

  // Preload occupied seats for both cinemas
  async function preloadAllOccupiedSeats(clearSelections = false) {
    console.log('Preloading occupied seats for both cinemas...');
    
    // Show loading spinner, hide carousel
    const loadingSpinner = document.getElementById('seatsLoadingSpinner');
    const carousel = document.getElementById('cinemaCarousel');
    
    if (loadingSpinner) loadingSpinner.classList.remove('d-none');
    if (carousel) carousel.classList.add('d-none');
    
    try {
      // Fetch both cinemas in parallel
      await Promise.all([
        fetchOccupiedSeats('1'),
        fetchOccupiedSeats('2')
      ]);
      
      // Apply to both cinemas immediately (clear selections if date changed)
      applyOccupiedSeats('1', clearSelections);
      applyOccupiedSeats('2', clearSelections);
      
      console.log('✅ Occupied seats loaded successfully');
    } catch (error) {
      console.error('Error loading occupied seats:', error);
    } finally {
      // Hide loading spinner, show carousel
      if (loadingSpinner) loadingSpinner.classList.add('d-none');
      if (carousel) carousel.classList.remove('d-none');
    }
  }

  // Combined callback that updates ticket info AND reloads occupied seats for the new date
  const updateWithSeats = async () => {
    update(); // Update ticket info
    await preloadAllOccupiedSeats(true); // Reload occupied seats for the new date and clear selections
  };

  // Get movie schedule and generate appropriate dates
  const movieSchedule = getMovieSchedule();
  
  if (movieSchedule && movieSchedule.allowedWeekdays.length > 0) {
    // Generate only scheduled dates for this movie
    generateScheduledDates(updateWithSeats, movieSchedule);
    // Populate only scheduled time slots
    populateTimeSlots(movieSchedule);
  } else {
    // Fallback to regular date generation if no schedule
    generateDates(updateWithSeats);
  }

  // Preload occupied seats for both cinemas on initial page load (don't clear selections)
  preloadAllOccupiedSeats(false);

  // Handle cinema carousel changes to update time slot and cinema display
  const cinemaCarousel = document.getElementById('cinemaCarousel');
  const cinemaNumberEl = document.getElementById('cinema-number');
  
  if (cinemaCarousel && movieSchedule) {
    // Use 'slide.bs.carousel' instead of 'slid.bs.carousel' to update before transition
    cinemaCarousel.addEventListener('slide.bs.carousel', function (e) {
      const nextSlide = e.relatedTarget;
      const cinemaNumber = nextSlide.querySelector('[data-cinema]')?.getAttribute('data-cinema');
      
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

  // Function to populate ticket preview modal
  function populateTicketPreview(transactionData, barcode) {
    // Get username and email from session
    const authStatus = document.getElementById('userAuthStatus');
    const username = authStatus?.getAttribute('data-username') || 'Guest';
    const email = authStatus?.getAttribute('data-email') || 'guest@reeliz.com';
    
    // Populate all preview fields
    document.getElementById('preview-movie-title').textContent = transactionData.movieTitle;
    document.getElementById('preview-date-time').textContent = transactionData.selectedDate;
    document.getElementById('preview-seat-count').textContent = transactionData.selectedSeats.split(',').length;
    document.getElementById('preview-seats').textContent = transactionData.selectedSeats;
    document.getElementById('preview-cinema').textContent = transactionData.cinemaRoom;
    document.getElementById('preview-ticket-count').textContent = transactionData.selectedSeats.split(',').length;
    document.getElementById('preview-total').textContent = transactionData.totalAmount;
    document.getElementById('preview-username').textContent = username;
    document.getElementById('preview-email').textContent = email;
    
    // Generate barcode
    document.getElementById('preview-barcode-number').textContent = barcode;
    try {
      JsBarcode("#preview-barcode", barcode, {
        format: "CODE128",
        width: 2,
        height: 80,
        displayValue: false,
        margin: 10,
        background: "#ffffff",
        lineColor: "#000000",
        fontSize: 0,
        textMargin: 0,
        valid: function(valid) {
          if (!valid) {
            console.error('Invalid barcode');
          }
        }
      });
      
      // Ensure SVG is properly sized after generation
      const barcodeElement = document.getElementById('preview-barcode');
      if (barcodeElement) {
        barcodeElement.style.display = 'block';
        barcodeElement.style.width = '100%';
        barcodeElement.style.maxWidth = '400px';
        barcodeElement.style.height = 'auto';
        barcodeElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }
    } catch (error) {
      console.error('Error generating barcode:', error);
    }
  }

  // Function to proceed to success modal from ticket preview
  function proceedToSuccessModal() {
    const ticketPreviewModal = bootstrap.Modal.getInstance(document.getElementById('ticketPreviewModal'));
    if (ticketPreviewModal) ticketPreviewModal.hide();
    
    // Small delay to allow modal transition
    setTimeout(() => {
      const successModal = new bootstrap.Modal(document.getElementById('successModal'));
      successModal.show();
    }, 300);
  }

  // Handle Send to Email button - Generate same visual as PDF
  const sendToEmailBtn = document.getElementById('sendToEmailBtn');
  if (sendToEmailBtn) {
    sendToEmailBtn.addEventListener('click', async () => {
      console.log('Send to Email clicked');
      
      // Disable button while sending
      sendToEmailBtn.disabled = true;
      sendToEmailBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';
      
      try {
        // Get email from auth status
        const authStatus = document.getElementById('userAuthStatus');
        const email = authStatus?.getAttribute('data-email') || 'guest@reeliz.com';
        const username = authStatus?.getAttribute('data-username') || 'Guest';
        
        // Get the ticket invoice element
        const ticketElement = document.querySelector('.ticket-invoice');
        
        if (!ticketElement) {
          console.error('Ticket element not found');
          alert('Error: Cannot generate ticket');
          return;
        }

        // Store original styles to restore later
        const originalOverflow = ticketElement.style.overflow;
        const originalHeight = ticketElement.style.height;
        
        // Temporarily remove any height/overflow constraints for full capture
        ticketElement.style.overflow = 'visible';
        ticketElement.style.height = 'auto';
        
        // Force a reflow to apply changes
        ticketElement.offsetHeight;
        
        // Wait for barcode SVG to fully render
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Take a complete "long screenshot" of the entire ticket
        const canvas = await html2canvas(ticketElement, {
          scale: 3, // Higher quality
          backgroundColor: '#f8f9fa',
          logging: false,
          useCORS: true,
          allowTaint: true,
          foreignObjectRendering: false,
          scrollY: 0,
          scrollX: 0,
          windowWidth: ticketElement.scrollWidth,
          windowHeight: ticketElement.scrollHeight,
          onclone: (clonedDoc) => {
            const clonedTicket = clonedDoc.querySelector('.ticket-invoice');
            if (clonedTicket) {
              clonedTicket.style.overflow = 'visible';
              clonedTicket.style.height = 'auto';
              clonedTicket.style.maxHeight = 'none';
              clonedTicket.style.display = 'block';
              clonedTicket.style.paddingBottom = '30px';
            }
            
            // Ensure all sections are visible
            const allSections = clonedDoc.querySelectorAll('.ticket-invoice > *');
            allSections.forEach(section => {
              section.style.display = 'block';
              section.style.visibility = 'visible';
              section.style.opacity = '1';
            });
            
            // Barcode specific fixes
            const clonedBarcode = clonedDoc.querySelector('#preview-barcode');
            if (clonedBarcode) {
              clonedBarcode.style.display = 'block';
              clonedBarcode.style.visibility = 'visible';
              clonedBarcode.style.width = '100%';
              clonedBarcode.style.maxWidth = '400px';
              clonedBarcode.style.height = 'auto';
              clonedBarcode.style.margin = '0 auto';
              clonedBarcode.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            }
            
            const barcodeSection = clonedDoc.querySelector('.barcode-section');
            if (barcodeSection) {
              barcodeSection.style.display = 'block';
              barcodeSection.style.visibility = 'visible';
              barcodeSection.style.textAlign = 'center';
            }
          }
        });
        
        // Restore original styles
        ticketElement.style.overflow = originalOverflow;
        ticketElement.style.height = originalHeight;

        // Convert canvas to base64 image
        const imgData = canvas.toDataURL('image/png', 1.0);
        
        // Send email with image
        const response = await fetch('/api/send-ticket-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: email,
            username: username,
            ticketImage: imgData
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Show success message
          alert(`✓ Ticket sent successfully to ${email}!\n\nPlease check your email inbox (and spam folder if needed).`);
          
          // Reset button state
          sendToEmailBtn.disabled = false;
          sendToEmailBtn.innerHTML = '<i class="bi bi-envelope-fill me-2"></i>Send to Email';
          
          // Close modal and redirect to home after short delay
          setTimeout(() => {
            const ticketModal = bootstrap.Modal.getInstance(document.getElementById('ticketPreviewModal'));
            if (ticketModal) {
              ticketModal.hide();
            }
            // Redirect to home page
            window.location.href = '/';
          }, 1000);
        } else {
          // Show error message
          console.error('Email send failed:', result);
          alert(`✗ Failed to send email: ${result.message}\n\nPlease try again or contact support.`);
          // Re-enable button on error
          sendToEmailBtn.disabled = false;
          sendToEmailBtn.innerHTML = '<i class="bi bi-envelope-fill me-2"></i>Send to Email';
        }
      } catch (error) {
        console.error('Error sending email:', error);
        console.error('Error details:', error.message, error.stack);
        alert(`✗ An error occurred while sending the email.\n\nError: ${error.message}\n\nPlease try again or contact support.`);
        // Re-enable button on error
        sendToEmailBtn.disabled = false;
        sendToEmailBtn.innerHTML = '<i class="bi bi-envelope-fill me-2"></i>Send to Email';
      }
    });
  }

  // Handle Download Copy button - Generate PDF
  const downloadCopyBtn = document.getElementById('downloadCopyBtn');
  if (downloadCopyBtn) {
    downloadCopyBtn.addEventListener('click', async () => {
      try {
        // Get the barcode number for filename
        const barcodeNumber = document.getElementById('preview-barcode-number')?.textContent || 'TICKET';
        
        // Get the ticket invoice element
        const ticketElement = document.querySelector('.ticket-invoice');
        
        if (!ticketElement) {
          console.error('Ticket element not found');
          alert('Error: Cannot generate PDF');
          return;
        }

        // Show loading state
        downloadCopyBtn.disabled = true;
        downloadCopyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Generating PDF...';

        // Wait for barcode SVG to fully render
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Store original styles to restore later
        const originalOverflow = ticketElement.style.overflow;
        const originalHeight = ticketElement.style.height;
        
        // Temporarily remove any height/overflow constraints for full capture
        ticketElement.style.overflow = 'visible';
        ticketElement.style.height = 'auto';
        
        // Force a reflow to apply changes
        ticketElement.offsetHeight;
        
        // Take a complete "long screenshot" of the entire ticket
        const canvas = await html2canvas(ticketElement, {
          scale: 3, // Higher quality for crisp barcode
          backgroundColor: '#f8f9fa',
          logging: false,
          useCORS: true,
          allowTaint: true,
          foreignObjectRendering: false,
          scrollY: 0,
          scrollX: 0,
          windowWidth: ticketElement.scrollWidth,
          windowHeight: ticketElement.scrollHeight,
          onclone: (clonedDoc) => {
            const clonedTicket = clonedDoc.querySelector('.ticket-invoice');
            if (clonedTicket) {
              // Ensure full content is visible in clone
              clonedTicket.style.overflow = 'visible';
              clonedTicket.style.height = 'auto';
              clonedTicket.style.maxHeight = 'none';
              clonedTicket.style.display = 'block';
              clonedTicket.style.paddingBottom = '30px';
            }
            
            // Ensure all sections are visible
            const allSections = clonedDoc.querySelectorAll('.ticket-invoice > *');
            allSections.forEach(section => {
              section.style.display = 'block';
              section.style.visibility = 'visible';
              section.style.opacity = '1';
            });
            
            // Barcode specific fixes - ensure proper dimensions
            const clonedBarcode = clonedDoc.querySelector('#preview-barcode');
            if (clonedBarcode) {
              clonedBarcode.style.display = 'block';
              clonedBarcode.style.visibility = 'visible';
              clonedBarcode.style.width = '100%';
              clonedBarcode.style.maxWidth = '400px';
              clonedBarcode.style.height = 'auto';
              clonedBarcode.style.margin = '0 auto';
              // Preserve SVG aspect ratio
              clonedBarcode.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            }
            
            const barcodeSection = clonedDoc.querySelector('.barcode-section');
            if (barcodeSection) {
              barcodeSection.style.display = 'block';
              barcodeSection.style.visibility = 'visible';
              barcodeSection.style.pageBreakInside = 'avoid';
              barcodeSection.style.textAlign = 'center';
            }
          }
        });
        
        // Restore original styles
        ticketElement.style.overflow = originalOverflow;
        ticketElement.style.height = originalHeight;

        // Get jsPDF
        const { jsPDF } = window.jspdf;
        
        // Calculate dimensions for dynamic PDF size
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Add some margin for the PDF
        const margin = 15;
        const pdfHeight = imgHeight + (margin * 2);
        
        // Create PDF with exact size needed for the image
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [imgWidth, pdfHeight],
          compress: true
        });

        // Convert canvas to image
        const imgData = canvas.toDataURL('image/png', 1.0);
        
        // Add the complete ticket image to PDF (fills the entire page)
        pdf.addImage(imgData, 'PNG', 0, margin, imgWidth, imgHeight);


        // Save PDF with formatted filename
        const filename = `ReeLizCinema_${barcodeNumber}.pdf`;
        pdf.save(filename);

        // Reset button state
        downloadCopyBtn.disabled = false;
        downloadCopyBtn.innerHTML = '<i class="fa-solid fa-download me-2"></i>Download Copy';

        // Close modal and redirect to home after short delay
        setTimeout(() => {
          const ticketModal = bootstrap.Modal.getInstance(document.getElementById('ticketPreviewModal'));
          if (ticketModal) {
            ticketModal.hide();
          }
          // Redirect to home page
          window.location.href = '/';
        }, 1000);

      } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
        
        // Reset button state
        downloadCopyBtn.disabled = false;
        downloadCopyBtn.innerHTML = '<i class="fa-solid fa-download me-2"></i>Download Copy';
      }
    });
  }

  // When success modal is closed, show ticket preview modal
  const successModalEl = document.getElementById('successModal');
  if (successModalEl) {
    successModalEl.addEventListener('hidden.bs.modal', function (e) {
      // Only show ticket preview if we have transaction data
      if (currentTransactionData) {
        setTimeout(() => {
          const ticketPreviewModal = new bootstrap.Modal(document.getElementById('ticketPreviewModal'));
          ticketPreviewModal.show();
        }, 300);
      }
    });
  }

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
          
          // Populate ticket preview modal (prepare it for later)
          populateTicketPreview(currentTransactionData, result.barcode);
          
          // Store barcode for success modal
          const barcodeEl = document.getElementById('transactionBarcode');
          if (barcodeEl) {
            barcodeEl.textContent = result.barcode;
            barcodeEl.setAttribute('data-barcode', result.barcode);
          }
          
          // Show success modal FIRST
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

  // Handle "Done" button in success modal - save transaction and show ticket preview
  const successModalDoneBtn = document.querySelector('#successModal button[data-bs-dismiss="modal"]');
  if (successModalDoneBtn) {
    successModalDoneBtn.addEventListener('click', async () => {
      if (currentTransactionData) {
        try {
          console.log('Confirming and inserting transaction:', currentTransactionData);
          
          // Insert complete transaction with barcode
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
            
            // Transaction saved successfully - modal will close and show ticket preview via hidden.bs.modal event
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

  // Handle closing of ticket preview modal - just redirect home
  const ticketPreviewModalEl = document.getElementById('ticketPreviewModal');
  if (ticketPreviewModalEl) {
    ticketPreviewModalEl.addEventListener('hidden.bs.modal', function (e) {
      // Reset transaction data and redirect to home
      currentTransactionData = null;
      setTimeout(() => {
        window.location.href = '/';
      }, 300);
    });
  }

  // Book Now button functionality
  if (bookNowBtn && bookingSection) {
    bookNowBtn.addEventListener("click", () => {
      // Don't do anything if button is disabled (coming soon movies)
      if (bookNowBtn.hasAttribute('disabled')) {
        return;
      }
      
      bookingSection.classList.add("d-block");
      bookingSection.classList.remove("d-none");
      bookingSection.style.transofrm = "translateY(0)";
      bookingSection.scrollIntoView({ behavior: "smooth", block: "start" });
      
      // Load occupied seats after booking section is visible
      setTimeout(() => {
        loadOccupiedSeats();
      }, 300);
    });
  }

  // Initial update
  update();
});