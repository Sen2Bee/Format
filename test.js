// File: static/js/catalog.js

// Module-level variable to store current movies
export let currentMovies = [];

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
 * On DOM load, initialize the catalog by fetching movies with current filters.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize view toggle
    // Note: Do NOT call toggleViews() here to prevent unintended behavior.
    // toggleViews(); // Remove or comment out this line if present

    // Auto-fill search box if 'search' query parameter is present
    const params = new URLSearchParams(window.location.search);
    const searchQuery = params.get('search');

    if (searchQuery) {
        const searchBox = document.getElementById('search-box');
        if (searchBox) {
            console.log("Auto-filling search box with:", searchQuery);
            searchBox.value = searchQuery;
            // Optionally, trigger filter logic here if needed
        }
    }

    // Initial fetch of movies with current filters
    updateMovieListingsUI();
}

/**
 * Renders movie listings in either list or grid view, depending on `.list-view` class.
 * Called by `updateMovieListingsUI()` after fetching movies from server.
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
                <span>${movie.runtime} min</span>
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

        // Directors HTML (only for list view)
        let directorsHtml = '';
        if (isListView && Array.isArray(movie.directors) && movie.directors.length > 0) {
            directorsHtml = `
                <p>
                    <strong><i class="fas fa-video"></i></strong>
                    ${movie.directors.map((director, index) => `
                        <a href="#" class="person-link" data-person-name="${director.name}">${director.name}</a>
                        ${index < movie.directors.length - 1 ? ', ' : ''}
                    `).join('')}
                </p>
            `;
        }

        // Actors HTML (only for list view, show up to 6)
        let actorsHtml = '';
        if (isListView && Array.isArray(movie.actors) && movie.actors.length > 0) {
            const maxActorsToShow = 6;
            const displayedActors = movie.actors.slice(0, maxActorsToShow);
            actorsHtml = `
                <p>
                    <strong><i class="fas fa-users"></i></strong>
                    ${displayedActors.map((actor, index) => `
                        <a href="#" class="person-link" data-person-name="${actor.name}">${actor.name}</a>
                        ${index < displayedActors.length - 1 ? ', ' : ''}
                    `).join('')}
                    ${movie.actors.length > maxActorsToShow ? ', ...' : ''}
                </p>
            `;
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
        let content = "No overview available.";
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
                        <p>${content} <a href="/movie/${movie.movie_id}" class="more-link">more</a></p>
                    </div>
                    <div class="info-section">
                        <div class="metadata">
                            <p class="countries">
                                <strong><i class="fas fa-globe"></i></strong> ${countries}
                                | <strong><i class="fas fa-film"></i></strong> ${genres}
                            </p>
                            ${directorsHtml}
                            ${actorsHtml}

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
    }

/**
 * Fetches movies from the server based on current filters and updates the UI.
 */
export function updateMovieListingsUI() {
    const movieContainer = document.querySelector('.movie-listings');
    if (!movieContainer) {
        console.error("updateMovieListingsUI: movieContainer element not found.");
        return;
    }

    // Collect current filter values from the DOM
    const searchQuery = document.getElementById('search-box')?.value || '';
    const genreFilter = document.getElementById('genre-filter')?.value || '';
    const yearFilter = document.getElementById('year-filter')?.value || '';
    const countryFilter = document.getElementById('country-filter')?.value || '';
    const standortFilter = document.getElementById('standort-filter')?.value || '';
    const mediaFilters = Array.from(document.querySelectorAll('input[name="media"]:checked')).map(cb => cb.value);

    // Build query parameters
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (genreFilter) params.append('genres', genreFilter);
    if (yearFilter) params.append('years', yearFilter);
    if (countryFilter) params.append('countries', countryFilter);
    if (standortFilter) params.append('standorte', standortFilter);
    if (mediaFilters.length > 0) params.append('media', mediaFilters.join(','));
    // Add pagination parameters if applicable
    // Example: params.append('page', currentPage);

    // Optional: Add include_counts parameter based on your needs
    params.append('include_counts', 'false'); // Set to 'true' if you need filter counts

    fetch(`/filter_movies?${params.toString()}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(`Error from server: ${data.error}`);
            }
            console.log("Fetched movies:", data.movies);
            currentMovies = data.movies; // Store fetched movies
            updateMovieListings(currentMovies);
        })
        .catch(err => {
            console.error('Error fetching movies:', err);
            movieContainer.innerHTML = `<p class="error-message">An error occurred while fetching movies.</p>`;
        });
}

/**
 * Getter function to access currentMovies
 */
export function getCurrentMovies() {
    return currentMovies;
}
