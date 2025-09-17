function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getFutureDate(monthsAhead) {
  const today = new Date();
  today.setMonth(today.getMonth() + monthsAhead);
  return today.toISOString().split("T")[0];
}


export {formatDate, getTodayDate, getFutureDate}