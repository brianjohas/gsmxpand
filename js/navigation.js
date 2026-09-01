document.addEventListener("DOMContentLoaded", function () {
  const menuToggle = document.getElementById("menuToggle");
  const navbar = document.getElementById("navbar");

  if (!menuToggle || !navbar) return;

  function closeMenu() {
    navbar.classList.remove("active");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
  }

  function openMenu() {
    navbar.classList.add("active");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Close navigation");
  }

  menuToggle.addEventListener("click", function () {
    if (navbar.classList.contains("active")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Close the menu once a link is chosen (previously stayed open on mobile)
  navbar.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeMenu);
  });

  // Close when clicking outside the nav or toggle button
  document.addEventListener("click", function (event) {
    const clickedInside = navbar.contains(event.target) || menuToggle.contains(event.target);
    if (!clickedInside && navbar.classList.contains("active")) {
      closeMenu();
    }
  });

  // Close on Escape key, return focus to the toggle button
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && navbar.classList.contains("active")) {
      closeMenu();
      menuToggle.focus();
    }
  });
});
