const root = document.documentElement;
const storageKey = "adele-theme";
const toggleButtons = document.querySelectorAll(".mode-toggle");
const yearEl = document.getElementById("year");

const syncToggleState = (theme) => {
  const isLight = theme === "light";
  toggleButtons.forEach((button) => {
    button.setAttribute("aria-pressed", isLight ? "true" : "false");
  });
};

const applyTheme = (theme) => {
  const normalized = theme === "light" ? "light" : "dark";
  root.setAttribute("data-theme", normalized);
  root.classList.toggle("light-mode", normalized === "light");
  syncToggleState(normalized);
};

const savedTheme = localStorage.getItem(storageKey);
if (savedTheme) {
  applyTheme(savedTheme);
} else {
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  applyTheme(prefersLight ? "light" : "dark");
}

toggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const currentTheme = root.getAttribute("data-theme");
    const nextTheme = currentTheme === "light" ? "dark" : "light";
    applyTheme(nextTheme);
    localStorage.setItem(storageKey, nextTheme);
  });
});

if (yearEl) {
  yearEl.textContent = new Date().getFullYear();
}
