// File: static/js/theme-toggle.js

export function themeToggle() {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const currentTheme = localStorage.getItem('theme') || 'light';

    // Function to apply theme
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'dark') {
            themeToggleBtn.classList.add('active');
            themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>'; // Change icon
        } else {
            themeToggleBtn.classList.remove('active');
            themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>'; // Change icon
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
