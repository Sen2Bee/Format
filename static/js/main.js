// File: static/js/main.js

import { initializeSwiper } from './carousel.js';  // Example import
import { initializeFilterDropdowns, initializeFilterPanelToggle, initializeFilterActionButtons } from './filter.js'; 
import { themeToggle } from './theme_toggle.js'; 

document.addEventListener('DOMContentLoaded', function () {
    initializeFilterDropdowns();  // Initialize dropdowns and fetch movies
    initializeSwiper(); // Initialize Swiper Carousel
    initializeFilterPanelToggle(); // Initialize filter panel toggle
    initializeFilterActionButtons(); // Initialize "Clear All" and "Show All Results" buttons
    toggleViews();
    themeToggle();
});


// toggle-view.js

function toggleViews() {
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const movieListings = document.querySelector('.movie-listings');

    if (!gridViewBtn || !listViewBtn || !movieListings) {
        console.error("toggleViews: One or more elements not found.");
        return;
    }

    // Function to activate Grid View
    const activateGridView = () => {
        movieListings.classList.remove('list-view');
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        gridViewBtn.setAttribute('aria-pressed', 'true');
        listViewBtn.setAttribute('aria-pressed', 'false');
        updateMovieListingsUI();
    };

    // Function to activate List View
    const activateListView = () => {
        movieListings.classList.add('list-view');
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        listViewBtn.setAttribute('aria-pressed', 'true');
        gridViewBtn.setAttribute('aria-pressed', 'false');
        updateMovieListingsUI();
    };

    // Event Listeners for Toggle Buttons
    gridViewBtn.addEventListener('click', () => {
        activateGridView();
        localStorage.setItem('movieView', 'grid');
    });

    listViewBtn.addEventListener('click', () => {
        activateListView();
        localStorage.setItem('movieView', 'list');
    });

    // Function to update movie listings UI based on view type
    const updateMovieListingsUI = () => {
        // Assuming you have a function or way to re-fetch and re-render movies
        // For example:
        fetch('/catalog') // Replace with your actual endpoint
            .then(response => response.json())
            .then(data => {
                updateMovieListings(data.movies);
            })
            .catch(err => console.error('Error fetching movies:', err));
    };

    // Optional: Persist User Preference using LocalStorage
    // Check if user has a saved preference
    const savedView = localStorage.getItem('movieView');

    if (savedView === 'list') {
        activateListView();
    } else {
        activateGridView();
    }
}

