(function () {
  const year = new Date().getFullYear();
  const yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = String(year);
})();
