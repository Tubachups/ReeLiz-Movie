function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

export { formatDate, generateDates };