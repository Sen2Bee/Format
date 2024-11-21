// File: static/js/navbar.js

document.addEventListener('DOMContentLoaded', function () {
    const navbar = document.querySelector('.navbar');
    let lastScrollTop = 0;
    let ticking = false;

    /**
     * Handles the scroll event to show/hide the navbar
     */
    function handleScroll() {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

        if (currentScroll <= 20) {
            // Always show navbar when near the top
            navbar.classList.remove('hidden');
        } else if (currentScroll < lastScrollTop) {
            // Scrolling up - hide navbar
            navbar.classList.add('hidden');
        } else {
            // Scrolling down - show navbar
            navbar.classList.remove('hidden');
        }

        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll; // For mobile or negative scrolling
        ticking = false;
    }

    /**
     * Throttles the scroll event handler using requestAnimationFrame
     */
    function onScroll() {
        if (!ticking) {
            window.requestAnimationFrame(handleScroll);
            ticking = true;
        }
    }

    // Attach the throttled scroll handler
    window.addEventListener('scroll', onScroll);
});
