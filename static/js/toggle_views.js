// File: static/js/toggle-view.js

import { updateMovieListings } from './catalog.js';

/**
 * Toggles between Grid view and List view, storing preference in localStorage.
 * Re-fetches the movies from an endpoint (/get_movies) for demonstration.
 */
export function toggleViews() {
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const movieListings = document.querySelector('.movie-listings');

    if (!gridViewBtn || !listViewBtn || !movieListings) {
        console.error("toggleViews: One or more elements not found.");
        return;
    }

    function activateGridView() {
        movieListings.classList.remove('list-view');
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        gridViewBtn.setAttribute('aria-pressed', 'true');
        listViewBtn.setAttribute('aria-pressed', 'false');
        updateMovieListingsUI();
    }

    function activateListView() {
        movieListings.classList.add('list-view');
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        listViewBtn.setAttribute('aria-pressed', 'true');
        gridViewBtn.setAttribute('aria-pressed', 'false');
        updateMovieListingsUI();
    }

    // Event Listeners
    gridViewBtn.addEventListener('click', () => {
        activateGridView();
        localStorage.setItem('movieView', 'grid');
    });

    listViewBtn.addEventListener('click', () => {
        activateListView();
        localStorage.setItem('movieView', 'list');
    });

    /**
     * Example: fetch /get_movies, then call updateMovieListings() with the results.
     */
    function updateMovieListingsUI() {
        fetch('/get_movies')  // Adjust to your actual endpoint
            .then(response => response.json())
            .then(data => {
                updateMovieListings(data.movies);
            })
            .catch(err => console.error('Error fetching movies:', err));
    }

    // Check localStorage for user preference
    const savedView = localStorage.getItem('movieView');
    if (savedView === 'list') {
        activateListView();
    } else {
        activateGridView();
    }
}
