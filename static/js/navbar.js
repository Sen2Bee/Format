document.addEventListener('DOMContentLoaded', function () {
    const navbar = document.querySelector('.navbar'); // Select the navbar element
    let lastScrollTop = 0; // Track the previous scroll position

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

    // Listen to scroll events
    window.addEventListener('scroll', handleScroll);
});
