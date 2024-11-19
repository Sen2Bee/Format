// File: static/js/catalog.js

import { triggerDropdownChangeEvent } from './filter.js';

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

    // Calculate the size as a ratio between the value and the value range
    const size = minSize + (clampedVal - minVal) * (maxSize - minSize) / (maxVal - minVal);

    // Return the size in 'em' units, rounded to two decimal places
    return `${size.toFixed(2)}em`;
}

export function updateMovieListings(movies) {
    const movieContainer = document.querySelector('.movie-listings');
    if (!movieContainer) {
        console.error("updateMovieListings: movieContainer element not found.");
        return;
    }

    // Check if we are in list view or grid view
    const isListView = movieContainer.classList.contains('list-view');

    movieContainer.innerHTML = "";  // Clear existing entries

    if (movies.length > 0) {
        movies.forEach(movie => {
            const imagePath = `/movie_images/${encodeURIComponent(movie.folder_name || 'default')}/poster/poster_1.avif`;
            const defaultImagePath = '/static/images/default_movie.png';

            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card';

            // Prepare runtime display
            let formatRuntimeHtml = '';
            const runtimeIconSize = getIconSizeByType(movie.runtime, "runtime");
            formatRuntimeHtml = `
                <div class="meta-item">
                    <i class="fas fa-clock" style="font-size:${runtimeIconSize};"></i>
                    <span>${movie.runtime}</span>
                </div>
            `;

            // Prepare FSK display
            let formatFskHtml = '';
            const fskIconSize = getIconSizeByType(movie.fsk, "fsk");
            formatFskHtml = `
                <div class="meta-item">
                    <i class="fas fa-child" style="font-size:${fskIconSize};"></i>
                    <span>${movie.fsk}</span>
                </div>
            `;

            // Prepare rating display
            let formatRatingHtml = '';
            const ratingIconSize = getIconSizeByType(movie.rating, "rating");
            formatRatingHtml = `
                <div class="meta-item">
                    <i class="fas fa-star" style="font-size:${ratingIconSize};"></i>
                    <span>${movie.rating}</span>
                </div>
            `;

            // Process directors
            const directors = Array.isArray(movie.director) && movie.director.length > 0
                ? movie.director.join(', ')
                : "Unknown Director";

            // Process actors
            let actors = "Unknown Actors";
            if (movie.actors) {
                if (Array.isArray(movie.actors)) {
                    actors = movie.actors.join(', ');
                } else if (typeof movie.actors === 'string') {
                    actors = movie.actors.split(',').map(actor => actor.trim()).filter(actor => actor.length > 0).join(', ');
                }
            }

            // Limit the number of displayed actors
            const maxActorsToShow = 5;
            if (Array.isArray(movie.actors) && movie.actors.length > maxActorsToShow) {
                actors = `${movie.actors.slice(0, maxActorsToShow).join(', ')}, ...`;
            }

            // Process countries
            const countries = Array.isArray(movie.countries) && movie.countries.length > 0
                ? movie.countries.map(country => {
                    const match = country.match(/(.*?)\s\((.*?)\)/);
                    const fullName = match ? match[1] : country;
                    const shortCode = match ? match[2] : country;
                    return `<span class="country-tooltip" data-country="${fullName}">${shortCode}</span>`;
                }).join(', ')
                : "Unknown Countries";

            // Process genres
            const genres = Array.isArray(movie.genres) && movie.genres.length > 0 ? movie.genres.join(', ') : "Unknown Genres";

            // Determine the content based on format_inhalt and overview
            let content;

            if (movie.format_inhalt && movie.format_inhalt.length >= 10) {
                content = movie.format_inhalt;
            } else if (movie.overview && movie.overview.length >= 10) {
                content = movie.overview;
            } else {
                content = "Keine Inhaltsangabe verfügbar.";
            }

            // Truncate content based on view type
            const maxLength = isListView ? 300 : 150; // 300 characters for list view, 150 for grid view
            if (content.length > maxLength) {
                content = content.substring(0, maxLength) + '...';
            }

            movieCard.innerHTML = `
                <div class="movie-content-wrapper">
                    <div class="image-container">
                        <a href="/movie/${movie.movie_id}">
                            <img src="${imagePath}" alt="${movie.main_title}" onerror="this.onerror=null; this.src='${defaultImagePath}';" loading="lazy">
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
                                <p class="countries"><strong><i class="fas fa-globe"></i></strong> ${countries} | <strong><i class="fas fa-film"></i></strong> ${genres}</p>
                                <p><strong><i class="fas fa-video"></i></strong> ${directors}</p>
                                <p><strong><i class="fas fa-users"></i></strong> ${actors}</p>
                                <!-- Inline Meta in List View -->
                                <div class="inline-meta">
                                    ${formatRuntimeHtml}
                                    ${formatFskHtml}
                                    ${formatRatingHtml}
                                    <div class="meta-item">
                                        <i class="fas fa-calendar" style="font-size:1.4em;"></i>
                                        <span>${movie.release_date}</span>
                                    </div>
                                </div>
                                <p class="standort"><strong><i class="fas fa-map-marker-alt"></i></strong> ${movie.standort || 'N/A'} | <strong><i class="fas fa-disc"></i></strong> ${movie.formats}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            movieContainer.appendChild(movieCard);
        });

    } else {
        movieContainer.innerHTML = `<p class="no-movies-message">No movies match the selected filters.</p>`;
    }
}


// toggle-view.js

export function toggleViews() {
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
        fetch('/get_movies') // Replace with your actual endpoint
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
