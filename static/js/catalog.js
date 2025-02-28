// File: static/js/catalog.js

import { triggerDropdownChangeEvent } from './filter.js';

/** Module-level variable to store current movies so we can re-render without refetching. */
export let currentMovies = [];

/**
 * Dynamically scale icon sizes (runtime, rating, fsk, etc.).
 */
function getIconSizeByType(typeval, type = "rating") {
    const minSize = 1;   // 1em for the smallest value
    const maxSize = 2.1; // 2.5em for the largest value

    let minVal, maxVal;

    // Define ranges based on the type
    if (type === "rating") {
        minVal = 5;   // Minimum rating is 5
        maxVal = 10;  // Maximum rating is 10
    } else if (type === "fsk") {
        minVal = 0;
        maxVal = 18;
    } else if (type === "runtime") {
        minVal = 60;
        maxVal = 180;
    } else {
        console.warn(`Unknown type: ${type}. Using default rating scale 0-10.`);
        minVal = 0;
        maxVal = 10;
    }

    // Clamp the actual value
    const clampedVal = Math.max(minVal, Math.min(typeval, maxVal));

    // Calculate the icon size as a ratio in 'em'
    const size = minSize + (clampedVal - minVal) * (maxSize - minSize) / (maxVal - minVal);
    return `${size.toFixed(2)}em`;
}

/**
 * On DOM load, parse ?search= from the URL.
 * If present, insert it into #search-box and trigger filter logic.
 */
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);

    // 1) If there's `similar=...`, let 'updateFilters()' handle it
    const similarId = params.get('similar');
    if (similarId) {
        // We want to call updateFilters(1) anyway:
        // That function will see `similar=...` in the URL
        // and do a fetch to /filter_movies?similar=...
        triggerDropdownChangeEvent();
        return;
    }

    // 2) Otherwise, normal path:
    const searchQuery = params.get('search');
    if (searchQuery) {
        const searchBox = document.getElementById('search-box');
        const clearSearchBtn = document.getElementById('clear-search');
        if (searchBox) {
            console.log("Auto-filling search box with:", searchQuery);
            searchBox.value = searchQuery;

            if (clearSearchBtn) {
                if (searchQuery.length > 0) {
                    clearSearchBtn.classList.add('visible');
                } else {
                    clearSearchBtn.classList.remove('visible');
                }
            }
        }
    }

    // Trigger a normal filter update
    triggerDropdownChangeEvent();
});


/**
 * Renders movie listings in either list or grid view, depending on `.list-view` class.
 * - Called after fetching movies from server or toggling view.
 */
export function updateMovieListings(movies) {
    // Store the current movies array globally
    currentMovies = movies;
    console.log("updateMovieListings -> currentMovies:", currentMovies);

    // Identify the container
    const movieContainer = document.querySelector('.movie-listings');
    if (!movieContainer) {
        console.error("updateMovieListings: movieContainer not found.");
        return;
    }

    // Check if we are in list view or grid view
    const isListView = movieContainer.classList.contains('list-view');
    

    // Clear previous content
    movieContainer.innerHTML = "";

    // Handle empty list
    if (movies.length === 0) {
        movieContainer.innerHTML = `<p class="no-movies-message">No movies match the selected filters.</p>`;
        return;
    }

    movies.forEach(movie => {
        // Prepare paths
        const imagePath = `/movie_images/${encodeURIComponent(movie.folder_name || 'default')}/poster/poster_1.avif`;
        const defaultImagePath = '/static/images/default_movie.png';
    
        // Are we in list view or grid view?
        const isListView = movieContainer.classList.contains('list-view');
    
        // Create a clickable link wrapper
        const movieLink = document.createElement('a');
        movieLink.href = `/movie/${movie.movie_id}`;
        // Optional: add a class for styling or hover effects
        movieLink.className = 'movie-card-link';
        // Optional: add an ARIA label for accessibility
        movieLink.setAttribute('aria-label', `Details for ${movie.main_title}`);
    
        // Create the movie card
        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card';
    
        // If in list view, set background to the backdrop
        if (isListView) {
            const backdropPath = `/movie_images/${encodeURIComponent(movie.folder_name || 'default')}/backdrop/backdrop_1.avif`;
            movieCard.style.backgroundImage = `url('${backdropPath}')`;
        }
    
        // Icon sizes
        const runtimeIconSize = getIconSizeByType(movie.runtime, "runtime");
        const fskIconSize     = getIconSizeByType(movie.fsk, "fsk");
        const ratingIconSize  = getIconSizeByType(movie.rating, "rating");

        const formatYearHtml = `
        <div class="meta-item">
            <i class="fas fa-hourglass-half" style="font-size:15px;"></i>
            <span>${movie.release_date}</span>
        </div>
    `;
         
    
        const formatRuntimeHtml = `
            <div class="meta-item">
                <i class="fas fa-clock" style="font-size:${runtimeIconSize};"></i>
                <span>${movie.runtime}</span>
            </div>
        `;
        const formatFskHtml = `
            <div class="meta-item">
                <i class="fas fa-child" style="font-size:${fskIconSize};"></i>
                <span>${movie.fsk}</span>
            </div>
        `;
        const formatRatingHtml = `
            <div class="meta-item">
                <i class="fas fa-star" style="font-size:${ratingIconSize};"></i>
                <span>${movie.rating}</span>
            </div>
        `;
    
        // Directors
        const directors = (Array.isArray(movie.director) && movie.director.length > 0)
            ? movie.director.join(', ')
            : "Unknown Director";
    
        // Actors: show 6 if list view, otherwise 2
        const maxActorsToShow = isListView ? 6 : 2;
        let actors = "";
        if (typeof movie.actors === 'string') {
            const actorArray = movie.actors.split(',').map(a => a.trim());
            actors = (actorArray.length > maxActorsToShow)
                ? actorArray.slice(0, maxActorsToShow).join(', ') + ', ...'
                : actorArray.join(', ');
        } else if (Array.isArray(movie.actors)) {
            actors = (movie.actors.length > maxActorsToShow)
                ? movie.actors.slice(0, maxActorsToShow).join(', ') + ', ...'
                : movie.actors.join(', ');
        }
    
        // Countries
        let countries = "Unknown Countries";
        if (Array.isArray(movie.countries) && movie.countries.length > 0) {
            countries = movie.countries.map(country => {
                const match = country.match(/(.*?)\s\((.*?)\)/);
                const fullName  = match ? match[1] : country;
                const shortCode = match ? match[2] : country;
                return `<span class="country-tooltip" data-country="${fullName}">${shortCode}</span>`;
            }).join(', ');
        }
    
        // Genres
        const genres = (Array.isArray(movie.genres) && movie.genres.length > 0)
            ? movie.genres.join(', ')
            : "Unknown Genres";
    
        // Content
        let content = "Keine Inhaltsangabe verfügbar.";
        if (movie.format_inhalt && movie.format_inhalt.length >= 10) {
            content = movie.format_inhalt;
        } else if (movie.overview && movie.overview.length >= 10) {
            content = movie.overview;
        }
    
        // Truncate content
        let maxLength = isListView ? 300 : 150;
        if (content.length > maxLength) {
            content = content.substring(0, maxLength) + '...';
        }
    
        // Truncate main title
        maxLength = isListView ? 200 : 100;
        let main_title = movie.main_title || "Untitled";
        if (main_title.length > maxLength) {
            main_title = main_title.substring(0, maxLength) + '...';
        }
    
        // Build the card's inner HTML
        movieCard.innerHTML = `
            <div class="movie-content-wrapper">
                <div class="image-container">
                    <!-- Removed the <a> around the image so the entire card can be linked -->
                    <img src="${imagePath}" 
                         alt="${movie.main_title}"
                         onerror="this.onerror=null; this.src='${defaultImagePath}';"
                         loading="lazy">
                    <div class="hover-title">
                        <span><i class="fas fa-file-alt"></i> ${movie.original_title}</span>
                    </div>
                </div>
    
                <div class="info-wrapper">

                    ${
                        isListView
                        ? `
                    <div class="title-section">
                        <h2>${main_title}</h2>
                    </div>                        
                        <div class="overview-section">
                            <p>${content} 
                                <!-- 'mehr' link still points to details if you want it -->
                                <a href="/movie/${movie.movie_id}" class="more-link">mehr</a>
                            </p>
                        </div>
                        `
                        : ''
                    }
                    <div class="info-section">
                        <div class="metadata">
                            <p class="countries">
                                <strong><i class="fas fa-globe"></i></strong> ${countries}
                                | <strong><i class="fas fa-film"></i></strong> ${genres}
                            </p>
                            ${
                                isListView 
                                ? `
                                <p>
                                    <strong><i class="fas fa-video"></i></strong> ${directors}
                                </p>
                                <p>
                                    <strong><i class="fas fa-users"></i></strong> ${actors}
                                </p>
                                <p class="standort">
                                    ${
                                        movie.standort 
                                            ? `<strong><i class="fas fa-map-marker-alt"></i></strong> ${movie.standort}`
                                            : ''
                                    }
                                    ${
                                        movie.standort && movie.formats 
                                            ? ' | ' 
                                            : ''
                                    }
                                    ${
                                        movie.formats 
                                            ? `<strong><i class="fas fa-disc"></i></strong> ${movie.formats}`
                                            : ''
                                    }
                                </p>
                                `
                                : ''
                            }
                            <div class="inline-meta">
                                ${formatRatingHtml}
                                ${formatRuntimeHtml}
                                ${formatFskHtml}
                                ${formatYearHtml}
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        `;
    
        // Append the .movie-card to the clickable link
        movieLink.appendChild(movieCard);
    
        // Finally, append the link to the container
        movieContainer.appendChild(movieLink);
    });
    
}

/**
 * Toggles between Grid view and List view, storing preference in localStorage.
 * Re-renders from currentMovies without refetching by default.
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
        updateMovieListings(currentMovies); // Re-render
    }

    function activateListView() {
        movieListings.classList.add('list-view');
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        listViewBtn.setAttribute('aria-pressed', 'true');
        gridViewBtn.setAttribute('aria-pressed', 'false');
        updateMovieListings(currentMovies); // Re-render
    }

    // Event Listeners for toggles
    gridViewBtn.addEventListener('click', () => {
        activateGridView();
        localStorage.setItem('movieView', 'grid');
    });

    listViewBtn.addEventListener('click', () => {
        activateListView();
        localStorage.setItem('movieView', 'list');
    });

    // On load, set the initial view from localStorage
    const savedView = localStorage.getItem('movieView');
    if (savedView === 'list') {
        activateListView();
    } else {
        activateGridView();
    }
}

