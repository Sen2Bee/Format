// File: static/js/entry.js

import { initializeSwiper } from './carousel.js';  // Example import
import { initializeFilterDropdowns, initializeFilterPanelToggle, initializeFilterActionButtons } from './filter.js';  // Example imports

/** Cache Elements and Buttons */
export const clearSearchBtn = document.getElementById('clear-search');
export const searchBox = document.getElementById('search-box');
export const movieContainer = document.querySelector('.movie-listings');
export const topPaginationContainer = document.querySelector('.top-pagination nav ul');
export const bottomPaginationContainer = document.querySelector('.bottom-pagination nav ul');
export const progressIndicator = document.getElementById('progress-indicator');
export const carouselTitle = document.getElementById('carousel-title');
export const toggleFiltersButton = document.getElementById('toggle-filters-button');
export const searchDropdownContainer = document.querySelector('.search-dropdown-container');
export const clearAllFiltersButton = document.getElementById('clear-all-filters-button');
export const showAllResultsButton = document.getElementById('show-all-results-button');



/** Genre to Font Mapping */
export const genreFontMapping = {
    "Action": "'Anton', sans-serif",
    "Drama": "'Playfair Display', serif",
    "Family": "'Baloo 2', cursive", 
    "Comedy": "'Comic Sans MS', cursive, sans-serif",
    "Thriller": "'Roboto Slab', serif",
    "Horror": "'Creepster', cursive",
    "Sci-Fi": "'Orbitron', sans-serif",
    "Romance": "'Great Vibes', cursive",
    "Documentary": "'Merriweather', serif",
    "Fantasy": "'Goudy Bookletter 1911', serif"
};

/**
 * Function to show the progress indicator
 */
export function showProgressIndicator() {
    if (progressIndicator) {
        progressIndicator.style.display = 'flex'; // Show the Progress Indicator
        progressIndicator.setAttribute('aria-hidden', 'false');
    } else {
        console.error("showProgressIndicator: Progress Indicator Element not found.");
    }
}

/**
 * Function to hide the progress indicator
 */
export function hideProgressIndicator() {
    if (progressIndicator) {
        progressIndicator.style.display = 'none'; // Hide the Progress Indicator
        progressIndicator.setAttribute('aria-hidden', 'true');
    } else {
        console.error("hideProgressIndicator: Progress Indicator Element not found.");
    }
}
