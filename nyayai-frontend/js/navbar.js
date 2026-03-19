// js/navbar.js

document.addEventListener("DOMContentLoaded", () => {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const closeDrawerBtn = document.getElementById("closeDrawerBtn");
  const mobileDrawer = document.getElementById("mobileDrawer");

  if (hamburgerBtn && closeDrawerBtn && mobileDrawer) {
    hamburgerBtn.addEventListener("click", () => {
      mobileDrawer.classList.add("open");
    });

    closeDrawerBtn.addEventListener("click", () => {
      mobileDrawer.classList.remove("open");
    });
  }

  // Navbar scroll effect + hide on scroll down
  const navbar = document.querySelector('.navbar');
  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    if (!navbar) return;
    const currentScrollY = window.scrollY;

    if (currentScrollY > 50) {
      navbar.classList.add('navbar--scrolled');
      
      if (currentScrollY > lastScrollY && currentScrollY > 200) {
        // Scrolling down & past 200px
        navbar.classList.add('navbar--hidden');
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up
        navbar.classList.remove('navbar--hidden');
      }
    } else {
      navbar.classList.remove('navbar--scrolled');
      navbar.classList.remove('navbar--hidden');
    }
    
    lastScrollY = currentScrollY;
  });
});
