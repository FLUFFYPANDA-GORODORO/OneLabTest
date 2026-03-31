export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount / 100); // Assuming amount is in paise
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const exportToJSON = (data, filename) => {
  const jsonString = JSON.stringify(data, null, 2);
  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(jsonString),
  );
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

export const exportToCSV = (data, filename) => {
  let csv = "";

  if (Array.isArray(data) && data.length > 0) {
    const headers = Object.keys(data[0]);
    csv = headers.join(",") + "\n";

    data.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header];
        return typeof value === "string" && value.includes(",")
          ? `"${value}"`
          : value;
      });
      csv += values.join(",") + "\n";
    });
  }

  const element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/csv;charset=utf-8," + encodeURIComponent(csv),
  );
  element.setAttribute("download", filename);
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};
