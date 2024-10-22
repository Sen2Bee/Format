// File: static/js/main.js

import { initializeSwiper } from './carousel.js';  // Example import
import { initializeFilterDropdowns, initializeFilterPanelToggle, initializeFilterActionButtons } from './filter.js'; 
import { toogleViews } from './catalog.js'; 
import { themeToggle } from './theme_toggle.js'; 

document.addEventListener('DOMContentLoaded', function () {
    initializeFilterDropdowns();  // Initialize dropdowns on page load
    initializeSwiper(); // Initialize Swiper Carousel
    initializeFilterPanelToggle(); // Initialize filter panel toggle
    initializeFilterActionButtons(); // Initialize "Clear All" and "Show All Results" buttons
    toogleViews();
    themeToggle();

});
