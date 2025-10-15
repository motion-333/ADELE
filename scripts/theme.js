const root = document.documentElement;
const storageKey = "adele-theme";
const yearEl = document.getElementById("year");

const applyTheme = (theme) => {
  const normalized = theme === "light" ? "light" : "dark";
  root.setAttribute("data-theme", normalized);
  if (normalized === "light") {
    root.classList.add("light-mode");
  } else {
    root.classList.remove("light-mode");
  }
};

const savedTheme = localStorage.getItem(storageKey);
if (savedTheme) {
  applyTheme(savedTheme);
} else {
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  applyTheme(prefersLight ? "light" : "dark");
}

const toggleButtons = document.querySelectorAll(".mode-toggle");
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
