document.addEventListener('DOMContentLoaded', function () {
    const navbar = document.querySelector('.navbar'); // Select the navbar element
    let lastScrollTop = 0; // Track the previous scroll position
    let debounceTimer = null; // Timer for debounce to limit function calls

    // Function to handle scroll events
    function handleScroll() {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

        // Show navbar at the top of the page
        if (currentScroll <= 20) {
            navbar.classList.remove('hide');
            navbar.classList.add('show');
        }
        // Hide navbar on scroll down
        else if (currentScroll > lastScrollTop) {
            navbar.classList.add('hide');
            navbar.classList.remove('show');
        }
        // Show navbar on scroll up
        else {
            navbar.classList.remove('hide');
            navbar.classList.add('show');
        }

        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll; // Update lastScrollTop
    }

    // Debounce function to limit the number of scroll events fired
    function debounce(func, delay) {
        return function (...args) {
            clearTimeout(debounceTimer); // Clear the previous timer
            debounceTimer = setTimeout(() => func.apply(this, args), delay); // Set a new timer
        };
    }

    // Listen to scroll events with debounce applied
    window.addEventListener('scroll', debounce(handleScroll, 100));
});
