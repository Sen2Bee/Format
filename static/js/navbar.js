document.addEventListener('DOMContentLoaded', function () {
    const navbar = document.querySelector('.navbar');
    let lastScrollTop = 0;
    let ticking = false;

    console.log("Test1");
    console.log("Page Height:", document.body.scrollHeight, "Viewport Height:", window.innerHeight);
    console.log("Navbar element:", navbar);
    window.scrollTo(0, 50);
    console.log("Scrolled programmatically to trigger scroll event.");


    function handleScroll() {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

        console.log("Handling scroll:", currentScroll); // Debugging current scroll value

        if (currentScroll <= 20) {
            console.log("Near top, showing navbar");
            navbar.classList.remove('hidden');
        } else if (currentScroll > lastScrollTop) {
            console.log("Scrolling down, hiding navbar");
            navbar.classList.add('hidden');
        } else {
            console.log("Scrolling up, showing navbar");
            navbar.classList.remove('hidden');
        }

        lastScrollTop = currentScroll <= 0 ? 0 : currentScroll; // For mobile or negative scrolling
        ticking = false;
    }

    function onScroll() {
        console.log("Scroll detected"); // Confirming scroll event is fired
        if (!ticking) {
            window.requestAnimationFrame(handleScroll);
            ticking = true;
        }
    }

    console.log("Scroll listener attached to window");
    window.addEventListener('scroll', onScroll);

    // Show navbar when hovering near the top
    document.addEventListener('mousemove', function (event) {
        if (event.clientY < 50) {
            console.log("Mouse near top, showing navbar");
            navbar.classList.remove('hidden');
        }
    });
});
