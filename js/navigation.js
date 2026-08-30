document.addEventListener("DOMContentLoaded", function () {
  const menuToggle = document.getElementById("menuToggle");
  const navbar = document.getElementById("navbar");

  if (!menuToggle || !navbar) return;

  menuToggle.addEventListener("click", function () {
    const isOpen = navbar.classList.toggle("active");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  });
});
