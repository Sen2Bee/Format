<!-- Example HTML snippet showing usage:
<button class="menu-toggle">
    <i class="fas fa-bars"></i>
</button>

<ul class="nav-links">
    <li><a href="#" class="active">Home</a></li>
    <li><a href="#">Catalog</a></li>
    <li><a href="#">Contact</a></li>
</ul>
-->

<script>
document.addEventListener('DOMContentLoaded', function () {
    const navbar = document.querySelector('.navbar');
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    let lastScrollTop = 0;
    let ticking = false;

    // Hide/Show Navbar on Scroll
    function handleScroll() {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

        if (currentScroll <= 20) {
            // Always show navbar near the top
            navbar.classList.remove('hidden');
        } else if (currentScroll > lastScrollTop) {
            // Scrolling down -> hide navbar
            navbar.classList.add('hidden');
        } else {
            // Scrolling up -> show navbar
            navbar.classList.remove('hidden');
        }

        lastScrollTop = Math.max(currentScroll, 0); // Avoid negative scroll
        ticking = false;
    }

    function onScroll() {
        if (!ticking) {
            window.requestAnimationFrame(handleScroll);
            ticking = true;
        }
    }

    window.addEventListener('scroll', onScroll);

    // Reveal navbar on hover near the top
    document.addEventListener('mousemove', function (event) {
        // If mouse is within 50px from top edge, show the navbar
        if (event.clientY < 50) {
            navbar.classList.remove('hidden');
        }
    });


        
});
</script>
