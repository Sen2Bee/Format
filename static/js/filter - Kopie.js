document.addEventListener('DOMContentLoaded', function () {
    console.log("Filter.js: DOM fully loaded");
    initializeFilterDropdowns();  // Initialize dropdowns on page load
});

// Variables to manage the dropdown update state
let isDropdownUpdating = false;

// Cache dropdown and button elements
const yearDropdown = document.getElementById('year-dropdown');
const genreDropdown = document.getElementById('genre-dropdown');
const countryDropdown = document.getElementById('country-dropdown');
const clearYearBtn = document.getElementById('clear-year');
const clearGenreBtn = document.getElementById('clear-genre');
const clearCountryBtn = document.getElementById('clear-country');
const clearAllBtn = document.getElementById('clear-all');

// Function to initialize dropdowns and attach event listeners
function initializeFilterDropdowns() {
    if (!yearDropdown || !genreDropdown || !countryDropdown) {
        console.warn("Filter dropdowns not found!");
        return;  // Exit if dropdowns are missing
    }

    // Attach event listeners to dropdowns
    yearDropdown.addEventListener('change', () => handleDropdownChange(yearDropdown, clearYearBtn));
    genreDropdown.addEventListener('change', () => handleDropdownChange(genreDropdown, clearGenreBtn));
    countryDropdown.addEventListener('change', () => handleDropdownChange(countryDropdown, clearCountryBtn));

    // Attach event listeners to the clear buttons
    clearYearBtn.addEventListener('click', () => clearDropdown(yearDropdown, clearYearBtn));
    clearGenreBtn.addEventListener('click', () => clearDropdown(genreDropdown, clearGenreBtn));
    clearCountryBtn.addEventListener('click', () => clearDropdown(countryDropdown, clearCountryBtn));
    clearAllBtn.addEventListener('click', clearAllDropdowns);

    // Initialize with the first update
    updateFilters();
}

// Function to handle dropdown changes and update button states
function handleDropdownChange(dropdown, clearButton) {
    updateButtonState(dropdown, clearButton);
    updateFilters();  // Trigger filter update
}

// Clear dropdown selection and update filters
function clearDropdown(dropdown, clearButton) {
    dropdown.selectedIndex = -1;  // Deselect all options
    updateButtonState(dropdown, clearButton);
    updateFilters();
}

// Global Clear All functionality
function clearAllDropdowns() {
    [yearDropdown, genreDropdown, countryDropdown].forEach((dropdown, index) => {
        dropdown.selectedIndex = -1;  // Clear all selections
        updateButtonState(dropdown, [clearYearBtn, clearGenreBtn, clearCountryBtn][index]);  // Disable respective buttons
    });
    updateGlobalClearButton();
    updateFilters();
}

// Update button state based on dropdown selection
function updateButtonState(dropdown, clearButton) {
    clearButton.disabled = dropdown.selectedOptions.length === 0;
    updateGlobalClearButton();
}

// Update the global "Clear All" button state based on individual clear buttons
function updateGlobalClearButton() {
    clearAllBtn.disabled = [clearYearBtn, clearGenreBtn, clearCountryBtn].every(button => button.disabled);
}

// Function to update dropdown values and movie listings based on selection
function updateFilters(page = 1) {
    const selectedYears = Array.from(yearDropdown.selectedOptions).map(option => option.value);
    const selectedGenres = Array.from(genreDropdown.selectedOptions).map(option => option.value);
    const selectedCountries = Array.from(countryDropdown.selectedOptions).map(option => option.value);

    const params = new URLSearchParams();
    if (selectedYears.length) params.append('years', selectedYears.join(','));
    if (selectedGenres.length) params.append('genres', selectedGenres.join(','));
    if (selectedCountries.length) params.append('countries', selectedCountries.join(','));
    params.append('page', page);

    console.log("Fetching updated filter data with params:", params.toString());

    fetch(`/filter_movies?${params.toString()}`)
        .then(response => response.json())
        .then(data => {
            isDropdownUpdating = true;  // Start dropdown update

            const yearsData = data.years || {};  // Fallback to empty object
            const genresData = data.genres || {};
            const countriesData = data.countries || {};

            console.log("Dropdown Data:", { yearsData, genresData, countriesData });

            renderYearDropdown(yearsData, selectedYears);  // Update the year dropdown and preserve selection
            populateDropdown(genreDropdown, genresData);
            populateDropdown(countryDropdown, countriesData);

            updateMovieListings(data.movies);
            updatePagination(data.current_page, data.total_pages);

            isDropdownUpdating = false;  // End dropdown update
        })
        .catch(error => {
            console.error('Error fetching filter data:', error);
            isDropdownUpdating = false;  // Reset the flag on error
        });
}

// Populate dropdown with options
function populateDropdown(dropdown, optionsData) {
    const currentSelection = Array.from(dropdown.selectedOptions).map(opt => opt.value);

    dropdown.innerHTML = "";  // Clear existing options
    for (const [value, count] of Object.entries(optionsData)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = `${value} (${count})`;
        dropdown.appendChild(option);
    }

    // Restore previously selected options
    currentSelection.forEach(value => {
        const option = Array.from(dropdown.options).find(opt => opt.value === value);
        if (option) option.selected = true;
    });
}

// Function to render year dropdown with both years and decades
function renderYearDropdown(yearsData, selectedYears = []) {
    const decades = [];
    const years = [];

    // Separate decades and individual years
    for (const [year, count] of Object.entries(yearsData)) {
        if (year.includes("...")) {
            decades.push({ label: year, count: count });
        } else {
            years.push({ label: year, count: count });
        }
    }

    // Sort decades and years
    const combinedEntries = [...decades.sort(), ...years.sort((a, b) => parseInt(a.label) - parseInt(b.label))];

    yearDropdown.innerHTML = "";  // Clear current dropdown
    combinedEntries.forEach(entry => {
        const option = document.createElement("option");
        option.value = entry.label;
        option.text = `${entry.label} (${entry.count})`;
        yearDropdown.appendChild(option);
    });

    // Restore previous selection
    selectedYears.forEach(value => {
        const option = Array.from(yearDropdown.options).find(opt => opt.value === value);
        if (option) option.selected = true;
    });
}

// Update the movie listings dynamically based on filter results
function updateMovieListings(movies) {
    const movieContainer = document.querySelector('.movie-listings');
    movieContainer.innerHTML = "";  // Clear existing listings

    if (movies.length > 0) {
        movies.forEach(movie => {
            const imagePath = `/movie_images/${encodeURIComponent(movie.folder_name)}/poster/poster_1.jpg`;
            const defaultImagePath = '/static/images/default_movie.png';

            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card poster-background';
            movieCard.style.backgroundImage = `url('${imagePath}')`;

            movieCard.innerHTML = `
                <div class="transparency-layer"></div>
                <div class="movie-content-wrapper">
                    <div class="image-container">
                        <img src="${imagePath}" alt="${movie.main_title}" onerror="this.src='${defaultImagePath}';">
                    </div>
                    <div class="info-section">
                        <h2>${movie.main_title}</h2>
                        <p><strong>Original: ${movie.original_title}</strong> (${movie.release_date})</p>
                        <p class="inline-meta">${movie.runtime} min | ${movie.formats} | FSK ${movie.format_fsk} | &#9733; ${movie.imdb_rating}</p>
                        <p><strong>Regie:</strong> ${movie.director}</p>
                        <p><strong>Schauspieler:</strong> ${movie.actors}</p>
                    </div>
                    <div class="overview-section">
                        ${movie.overview.length > 150 
                            ? `<p>${movie.overview.substring(0, 150)}... <a href="/movie/${movie.format_filmId}" class="more-link">mehr</a></p>` 
                            : `<p>${movie.overview} <a href="/movie/${movie.format_filmId}" class="more-link">mehr</a></p>`}
                    </div>
                </div>
            `;
            movieContainer.appendChild(movieCard);
        });
    } else {
        movieContainer.innerHTML = `<p class="no-movies-message">No movies match the selected filters.</p>`;
    }
}

// Function to handle pagination updates for both top and bottom paginations
function updatePagination(currentPage, totalPages) {
    const topPaginationContainer = document.querySelector('.top-pagination nav ul');
    const bottomPaginationContainer = document.querySelector('.bottom-pagination nav ul');

    [topPaginationContainer, bottomPaginationContainer].forEach(paginationContainer => {
        if (!paginationContainer) return;

        paginationContainer.innerHTML = "";  // Clear existing pagination buttons

        // Create "Previous" button
        let prevDisabledClass = currentPage <= 1 ? 'disabled' : '';
        let prevDisabledAttr = currentPage <= 1 ? 'aria-disabled="true"' : '';
        paginationContainer.innerHTML += `<li class="${prevDisabledClass}"><a href="#" data-page="${currentPage - 1}" ${prevDisabledAttr}>&laquo; Previous</a></li>`;

        if (currentPage > 3) {
            paginationContainer.innerHTML += `<li><a href="#" data-page="1">1</a></li>`;
            paginationContainer.innerHTML += `<li class="ellipsis"><span>...</span></li>`;
        }

        // Generate page numbers around current page
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);
        for (let p = startPage; p <= endPage; p++) {
            let activeClass = (p === currentPage) ? 'active' : '';
            paginationContainer.innerHTML += `<li class="${activeClass}"><a href="#" data-page="${p}">${p}</a></li>`;
        }

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



// Function to attach click event listeners for pagination buttons
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

