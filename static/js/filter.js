document.addEventListener('DOMContentLoaded', function () {
    console.log("Filter.js: DOM fully loaded");
    initializeFilterDropdowns();  // Initialize dropdowns on page load
});

// Cache elements and buttons
const searchBox = document.getElementById('search-box');
const clearSearchBtn = document.getElementById('clear-search');
const clearAllBtn = document.getElementById('clear-all');
const movieContainer = document.querySelector('.movie-listings');
const topPaginationContainer = document.querySelector('.top-pagination nav ul');
const bottomPaginationContainer = document.querySelector('.bottom-pagination nav ul');

let debounceTimer;

/**
 * Function to initialize dropdowns and attach event listeners
 */
function initializeFilterDropdowns() {
    // Handle filter updates triggered by custom dropdowns
    document.addEventListener('dropdownChange', () => {
        console.log("Filter.js: Detected dropdown change event");
        updateFilters(); // Trigger filter update on dropdown change
    });

    // Search box input event with debouncing
    searchBox.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            updateFilters(); // Trigger filter update after user stops typing for 300ms
        }, 300);
    });

    // Clear search box and trigger update
    clearSearchBtn.addEventListener('click', () => {
        searchBox.value = '';
        clearSearchBtn.classList.remove('visible');
        updateFilters();
    });

    // Clear all dropdown selections and search box
    clearAllBtn.addEventListener('click', clearAllFilters);

    // Initial filter update
    updateFilters();
}

/**
 * Clear all dropdowns and search box
 */
function clearAllFilters() {
    const checkboxes = document.querySelectorAll('.dropdown-list input[type="checkbox"]');
    checkboxes.forEach(checkbox => (checkbox.checked = false));  // Uncheck all boxes
    searchBox.value = '';  // Clear search box
    updateFilters();  // Trigger a full update
}

/**
 * Function to update dropdown values and movie listings based on current selections and search query
 */
function updateFilters(page = 1) {
    const selectedYears = getCheckedValues('year-dropdown-list');
    const selectedGenres = getCheckedValues('genre-dropdown-list');
    const selectedCountries = getCheckedValues('country-dropdown-list');
    const searchQuery = searchBox.value.trim();

    const params = new URLSearchParams();
    if (selectedYears.length) params.append('years', selectedYears.join(','));
    if (selectedGenres.length) params.append('genres', selectedGenres.join(','));
    if (selectedCountries.length) params.append('countries', selectedCountries.join(','));
    if (searchQuery) params.append('search', searchQuery);
    params.append('page', page);

    console.log("Fetching updated filter data with params:", params.toString());

    fetch(`/filter_movies?${params.toString()}`)
        .then(response => response.json())
        .then(data => {
            console.log("API Response Data:", data); // Log the fetched data for verification
            const { years, genres, countries, movies, current_page, total_pages } = data;

            // Populate each dropdown with data
            console.log("Populating Dropdowns: Years, Genres, and Countries");
            populateDropdown('year-dropdown-list', years, selectedYears);
            populateDropdown('genre-dropdown-list', genres, selectedGenres);
            populateDropdown('country-dropdown-list', countries, selectedCountries);

            updateMovieListings(movies);
            updatePagination(current_page, total_pages);
        })
        .catch(error => console.error('Error fetching filter data:', error));
}

/**
 * Helper to get checked values from a specific dropdown list
 */
function getCheckedValues(dropdownListId) {
    const checkboxes = document.querySelectorAll(`#${dropdownListId} input[type="checkbox"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * Function to populate a dropdown with new options based on server data
 */


/**
 * Update the movie listings dynamically based on the filter results
 */
function updateMovieListings(movies) {
    console.log("Updating Movie Listings");
    movieContainer.innerHTML = "";  // Clear existing listings

    if (movies.length > 0) {
        movies.forEach(movie => {
            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card poster-background';
            movieCard.style.backgroundImage = `url('/movie_images/${encodeURIComponent(movie.folder_name)}/poster/poster_1.jpg')`;

            movieCard.innerHTML = `
                <div class="transparency-layer"></div>
                <div class="movie-content-wrapper">
                    <div class="info-section">
                        <h2>${movie.main_title}</h2>
                        <p><strong>Original: ${movie.original_title}</strong> (${movie.release_date})</p>
                        <p class="inline-meta">${movie.runtime} min | ${movie.formats} | FSK ${movie.format_fsk} | &#9733; ${movie.imdb_rating}</p>
                        <p><strong>Regie:</strong> ${movie.director}</p>
                        <p><strong>Schauspieler:</strong> ${movie.actors}</p>
                    </div>
                    <div class="overview-section">
                        ${movie.overview.length > 150 ? `<p>${movie.overview.substring(0, 150)}... <a href="/movie/${movie.format_filmId}" class="more-link">mehr</a></p>` : `<p>${movie.overview} <a href="/movie/${movie.format_filmId}" class="more-link">mehr</a></p>`}
                    </div>
                </div>
            `;
            movieContainer.appendChild(movieCard);
        });
    } else {
        movieContainer.innerHTML = `<p class="no-movies-message">No movies match the selected filters.</p>`;
    }
}

/**
 * Function to update pagination based on the current and total pages
 */
function updatePagination(currentPage, totalPages) {
    [topPaginationContainer, bottomPaginationContainer].forEach(paginationContainer => {
        if (!paginationContainer) return;

        paginationContainer.innerHTML = "";  // Clear existing pagination buttons

        // Create "Previous" button
        let prevDisabledClass = currentPage <= 1 ? 'disabled' : '';
        let prevDisabledAttr = currentPage <= 1 ? 'aria-disabled="true"' : '';
        paginationContainer.innerHTML += `<li class="${prevDisabledClass}"><a href="#" data-page="${currentPage - 1}" ${prevDisabledAttr}>&laquo; Previous</a></li>`;

        // Add first page and ellipsis if necessary
        if (currentPage > 3) {
            paginationContainer.innerHTML += `<li><a href="#" data-page="1">1</a></li>`;
            paginationContainer.innerHTML += `<li class="ellipsis"><span>...</span></li>`;
        }

        // Generate page numbers around the current page
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);
        for (let p = startPage; p <= endPage; p++) {
            let activeClass = (p === currentPage) ? 'active' : '';
            paginationContainer.innerHTML += `<li class="${activeClass}"><a href="#" data-page="${p}">${p}</a></li>`;
        }

        // Add ellipsis and last page if necessary
        if (currentPage < totalPages - 2) {
            paginationContainer.innerHTML += `<li class="ellipsis"><span>...</span></li>`;
            paginationContainer.innerHTML += `<li><a href="#" data-page="${totalPages}">${totalPages}</a></li>`;
        }

        // Create "Next" button
        let nextDisabledClass = currentPage >= totalPages ? 'disabled' : '';
        let nextDisabledAttr = currentPage >= totalPages ? 'aria-disabled="true"' : '';
        paginationContainer.innerHTML += `<li class="${nextDisabledClass}"><a href="#" data-page="${currentPage + 1}" ${nextDisabledAttr}>Next &raquo;</a></li>`;
    });

    attachPaginationEventListeners();
}

/**
 * Function to attach click event listeners for pagination buttons
 */
function attachPaginationEventListeners() {
    const paginationLinks = document.querySelectorAll('.pagination nav ul li a[data-page]');
    paginationLinks.forEach(link => {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            if (this.parentElement.classList.contains('disabled')) {
                return;  // Ignore clicks on disabled buttons
            }
            const page = parseInt(this.getAttribute('data-page'));
            if (!isNaN(page)) updateFilters(page);  // Trigger filtering with the selected page
        });
    });
}
