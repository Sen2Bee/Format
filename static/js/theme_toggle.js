export function themeToggle() {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeImage = document.getElementById('theme-image'); // Target the theme image
    const currentTheme = localStorage.getItem('theme') || 'light';

    // Function to apply theme and update the image source
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);

        // Update theme toggle button
        if (theme === 'dark') {
            themeToggleBtn.classList.add('active');
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>'; // Change to sun icon
        } else {
            themeToggleBtn.classList.remove('active');
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>'; // Change to moon icon
        }

        // Update theme-based image
        if (themeImage) {
            const darkSrc = themeImage.getAttribute('data-dark-src');
            const lightSrc = themeImage.getAttribute('data-light-src');
            themeImage.src = theme === 'dark' ? darkSrc : lightSrc;
        }
    };

    // Initial theme application
    applyTheme(currentTheme);

    // Toggle theme on button click
    themeToggleBtn.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // Keyboard Accessibility for Theme Toggle Button
    themeToggleBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            themeToggleBtn.click();
        }
    });
}
