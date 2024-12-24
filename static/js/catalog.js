// File: static/js/catalog.js

import { triggerDropdownChangeEvent } from './filter.js';

/**
 * Dynamically scale icon sizes (runtime, rating, fsk, etc.).
 */
function getIconSizeByType(typeval, type = "rating") {
    const minSize = 1;   // 1em for the smallest value
    const maxSize = 2.5; // 2.5em for the largest value

    let minVal, maxVal;

    // Set value ranges based on the type
    if (type === "rating") {
        minVal = 5;   // Minimum rating
        maxVal = 10;  // Maximum rating
    } else if (type === "fsk") {
        minVal = 0;   // Minimum FSK value
        maxVal = 18;  // Maximum FSK value
    } else if (type === "runtime") {
        minVal = 60;   // Minimum runtime in minutes
        maxVal = 180;  // Maximum runtime in minutes
    } else {
        console.warn(`Unknown type: ${type}. Using default rating scale.`);
        minVal = 0;
        maxVal = 10;
    }

    // Clamp the value within the min and max range
    const clampedVal = Math.max(minVal, Math.min(typeval, maxVal));

    // Calculate the size as a ratio of the value vs. the range
    const size = minSize + (clampedVal - minVal) * (maxSize - minSize) / (maxVal - minVal);
    return `${size.toFixed(2)}em`;
}

/**
 * On DOM load, check for `?search=` param and auto-fill the #search-box if present.
 * Then call `triggerDropdownChangeEvent()` so the catalog shows relevant results.
 */
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const searchQuery = params.get('search');

    if (searchQuery) {
        const searchBox = document.getElementById('search-box');
        if (searchBox) {
            console.log("Auto-filling search box with:", searchQuery);
            searchBox.value = searchQuery;
            // Trigger your existing filter logic to show results
            triggerDropdownChangeEvent();
        }
    }
});

/**
 * Renders movie listings in either list or grid view, depending on `.list-view` class.
 * Called by e.g. `updateMovieListingsUI()` after fetching movies from server.
 */
export function updateMovieListings(movies) {
    const movieContainer = document.querySelector('.movie-listings');
    if (!movieContainer) {
        console.error("updateMovieListings: movieContainer element not found.");
        return;
    }

    // Check if we are in list view or grid view
    const isListView = movieContainer.classList.contains('list-view');

    // Clear old content
    movieContainer.innerHTML = "";

    if (movies.length === 0) {
        movieContainer.innerHTML = `<p class="no-movies-message">No movies match the selected filters.</p>`;
        return;
    }

    // Render each movie
    movies.forEach(movie => {
        const imagePath = `/movie_images/${encodeURIComponent(movie.folder_name || 'default')}/poster/poster_1.avif`;
        const defaultImagePath = '/static/images/default_movie.png';

        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card';

        // Prepare runtime display
        const runtimeIconSize = getIconSizeByType(movie.runtime, "runtime");
        const formatRuntimeHtml = `
            <div class="meta-item">
                <i class="fas fa-clock" style="font-size:${runtimeIconSize};"></i>
                <span>${movie.runtime}</span>
            </div>
        `;

        // FSK display
        const fskIconSize = getIconSizeByType(movie.fsk, "fsk");
        const formatFskHtml = `
            <div class="meta-item">
                <i class="fas fa-child" style="font-size:${fskIconSize};"></i>
                <span>${movie.fsk}</span>
            </div>
        `;

        // Rating display
        const ratingIconSize = getIconSizeByType(movie.rating, "rating");
        const formatRatingHtml = `
            <div class="meta-item">
                <i class="fas fa-star" style="font-size:${ratingIconSize};"></i>
                <span>${movie.rating}</span>
            </div>
        `;

        // Directors
        const directors = Array.isArray(movie.director) && movie.director.length > 0
            ? movie.director.join(', ')
            : "Unknown Director";

        // Actors: 6 in list view, 2 in grid view
        const maxActorsToShow = isListView ? 6 : 2;
        let actors = '';
        if (typeof movie.actors === 'string') {
            const actorArray = movie.actors.split(',').map(a => a.trim());
            actors = (actorArray.length > maxActorsToShow)
                ? actorArray.slice(0, maxActorsToShow).join(', ') + ', ...'
                : actorArray.join(', ');
        } else if (Array.isArray(movie.actors)) {
            if (movie.actors.length > maxActorsToShow) {
                actors = movie.actors.slice(0, maxActorsToShow).join(', ') + ', ...';
            } else {
                actors = movie.actors.join(', ');
            }
        }

        // Countries
        let countries = "Unknown Countries";
        if (Array.isArray(movie.countries) && movie.countries.length > 0) {
            countries = movie.countries.map(country => {
                const match = country.match(/(.*?)\s\((.*?)\)/);
                const fullName = match ? match[1] : country;
                const shortCode = match ? match[2] : country;
                return `<span class="country-tooltip" data-country="${fullName}">${shortCode}</span>`;
            }).join(', ');
        }

        // Genres
        const genres = (Array.isArray(movie.genres) && movie.genres.length > 0)
            ? movie.genres.join(', ')
            : "Unknown Genres";

        // Overviews / content
        let content = "Keine Inhaltsangabe verfügbar.";
        if (movie.format_inhalt && movie.format_inhalt.length >= 10) {
            content = movie.format_inhalt;
        } else if (movie.overview && movie.overview.length >= 10) {
            content = movie.overview;
        }

        // Truncate content
        const maxLength = isListView ? 300 : 150;
        if (content.length > maxLength) {
            content = content.substring(0, maxLength) + '...';
        }

        // Build the HTML for each card
        movieCard.innerHTML = `
            <div class="movie-content-wrapper">
                <div class="image-container">
                    <a href="/movie/${movie.movie_id}">
                        <img src="${imagePath}" 
                             alt="${movie.main_title}"
                             onerror="this.onerror=null; this.src='${defaultImagePath}';"
                             loading="lazy">
                    </a>
                    <div class="hover-title">
                        <span><i class="fas fa-file-alt"></i> ${movie.original_title}</span>
                    </div>
                </div>

                <div class="info-wrapper">
                    <div class="title-section">
                        <h2>${movie.main_title}</h2>
                    </div>
                    <div class="overview-section">
                        <p>${content} <a href="/movie/${movie.movie_id}" class="more-link">mehr</a></p>
                    </div>
                    <div class="info-section">
                        <div class="metadata">
                            <p class="countries">
                                <strong><i class="fas fa-globe"></i></strong> ${countries}
                                | <strong><i class="fas fa-film"></i></strong> ${genres}
                            </p>
                            <p><strong><i class="fas fa-video"></i></strong> ${directors}</p>
                            <p><strong><i class="fas fa-users"></i></strong> ${actors}</p>
                            
                            <div class="inline-meta">
                                ${formatRuntimeHtml}
                                ${formatFskHtml}
                                ${formatRatingHtml}
                                <div class="meta-item">
                                    <i class="fas fa-calendar" style="font-size:1.4em;"></i>
                                    <span>${movie.release_date}</span>
                                </div>
                            </div>
                            
                            <p class="standort">
                                <strong><i class="fas fa-map-marker-alt"></i></strong> ${movie.standort || 'N/A'}
                                | <strong><i class="fas fa-disc"></i></strong> ${movie.formats}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        movieContainer.appendChild(movieCard);
    });
}

/**
 * Optional: if you don't rely on toggleViews or fetch code here, 
 * you can keep them separate. The main function is updateMovieListings(...) 
 * plus the DOMContentLoaded block above.
 */
// File: static/js/toggle-view.js

