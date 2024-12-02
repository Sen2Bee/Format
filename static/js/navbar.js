document.addEventListener('DOMContentLoaded', function () {
    const navbar = document.querySelector('.navbar');
    let lastScrollTop = 0;
    let ticking = false;

    function handleScroll() {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

        if (currentScroll <= 20) {
            // Always show navbar when near the top
            navbar.classList.remove('hidden');
        } else if (currentScroll > lastScrollTop) {
            // Scrolling down - hide navbar
            navbar.classList.add('hidden');
        } else {
            // Scrolling up - show navbar
            navbar.classList.remove('hidden');
        }

        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll; // For mobile or negative scrolling
        ticking = false;
    }

    function onScroll() {
        if (!ticking) {
            window.requestAnimationFrame(handleScroll);
            ticking = true;
        }
    }

    window.addEventListener('scroll', onScroll);

    // Show navbar when hovering near the top
    document.addEventListener('mousemove', function (event) {
        if (event.clientY < 50) {
            navbar.classList.remove('hidden');
        }
    });
});
