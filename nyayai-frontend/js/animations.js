// js/animations.js

document.addEventListener("DOMContentLoaded", () => {
    // Initialize Intersection Observer for scroll animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const scrollObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: stop observing once animated
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Select all elements with the animation class
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    animatedElements.forEach(el => scrollObserver.observe(el));
});
