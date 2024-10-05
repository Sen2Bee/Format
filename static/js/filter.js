// filter.js

document.addEventListener('DOMContentLoaded', function () {
    console.log("Filter.js: DOM fully loaded");
    initializeFilterDropdowns();  // Initialize dropdowns on page load
});

/** Cache Elements and Buttons */
const clearSearchBtn = document.getElementById('clear-search');
const searchBox = document.getElementById('search-box');
const movieContainer = document.querySelector('.movie-listings');
const topPaginationContainer = document.querySelector('.top-pagination nav ul');
const bottomPaginationContainer = document.querySelector('.bottom-pagination nav ul');
const progressIndicator = document.getElementById('progress-indicator');

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
    if (searchBox) { // Check if searchBox exists
        searchBox.addEventListener('input', () => {
            // Toggle visibility of the clear icon
            if (searchBox.value.length > 0) {
                clearSearchBtn.classList.add('visible');
            } else {
                clearSearchBtn.classList.remove('visible');
            }

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                updateFilters(); // Trigger filter update after user stops typing for 300ms
            }, 300);
        });
    } else {
        console.error("initializeFilterDropdowns: searchBox element not found.");
    }

    // Clear search box and trigger update
    if (clearSearchBtn && searchBox) { // Ensure both elements exist
        clearSearchBtn.addEventListener('click', () => {
            searchBox.value = '';
            clearSearchBtn.classList.remove('visible');
            updateFilters();
        });
    } else {
        console.error("initializeFilterDropdowns: clearSearchBtn or searchBox element not found.");
    }

    // Attach event listeners to dropdowns using event delegation
    attachDropdownEventDelegation();

    // Initial filter update
    updateFilters();
}

/**
 * Function to attach event listeners to dropdowns using event delegation
 */
function attachDropdownEventDelegation() {
    const dropdownLists = document.querySelectorAll('.dropdown-list');

    dropdownLists.forEach(dropdownList => {
        // Handle checkbox changes within the dropdown
        dropdownList.addEventListener('change', (event) => {
            const target = event.target;
            if (target && target.matches('input[type="checkbox"]')) {
                const dropdownHeader = dropdownList.previousElementSibling; // Assuming .dropdown-header precedes .dropdown-list
                const clearButton = dropdownHeader.querySelector('.clear-icon');
                const selectedCount = dropdownHeader.querySelector('.selected-count');

                updateSelectedCount(dropdownList, selectedCount, clearButton);
                triggerDropdownChangeEvent();
            }
        });

        // Handle clear button within the dropdown
        const clearButton = dropdownList.parentElement.querySelector('.clear-icon');
        if (clearButton) {
            clearButton.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent dropdown toggle
                const checkboxes = dropdownList.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => (checkbox.checked = false)); // Uncheck all boxes
                updateSelectedCount(dropdownList, dropdownList.parentElement.querySelector('.selected-count'), clearButton); // Update selection count
                triggerDropdownChangeEvent();  // Trigger a custom change event to update filters
            });
        }
    });

    // Handle dropdown header clicks to toggle visibility
    const dropdownHeaders = document.querySelectorAll('.dropdown-header');
    dropdownHeaders.forEach(header => {
        header.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent event from bubbling up
            const dropdownList = header.nextElementSibling; // Assumes .dropdown-list follows .dropdown-header
            toggleDropdown(dropdownList, header);
        });
    });

    // Close all dropdowns when clicking outside
    document.addEventListener('click', (event) => {
        dropdownLists.forEach(dropdownList => {
            const header = dropdownList.previousElementSibling;
            if (!dropdownList.contains(event.target) && !header.contains(event.target)) {
                dropdownList.classList.remove('show');
                header.setAttribute('aria-expanded', 'false');
            }
        });
    });
}

/**
 * Function to toggle dropdown visibility
 */
function toggleDropdown(dropdownList, header) {
    const isVisible = dropdownList.classList.contains('show');
    if (isVisible) {
        dropdownList.classList.remove('show');
        header.setAttribute('aria-expanded', 'false');
    } else {
        dropdownList.classList.add('show');
        header.setAttribute('aria-expanded', 'true');
    }
}

/**
 * Function to update the selected count display and handle visibility of the clear button
 */
function updateSelectedCount(dropdownList, countElement, clearButton) {
    const selectedItems = Array.from(dropdownList.querySelectorAll('input[type="checkbox"]:checked'));
    const count = selectedItems.length;

    // Update the count display
    countElement.textContent = `${count} sel.`;

    // Show or hide the clear button based on the count
    clearButton.style.visibility = count > 0 ? 'visible' : 'hidden';
}

/**
 * Function to trigger a custom event to notify filter.js of dropdown changes
 */
function triggerDropdownChangeEvent() {
    const event = new CustomEvent('dropdownChange');
    console.log("Dispatching dropdownChange event");
    document.dispatchEvent(event);
}

/**
 * Function to update dropdown values and movie listings based on current selections and search query
 */
function updateFilters(page = 1) {
    const selectedYears = getCheckedValues('year-dropdown-list');
    const selectedGenres = getCheckedValues('genre-dropdown-list');
    const selectedCountries = getCheckedValues('country-dropdown-list');
    const searchQuery = searchBox ? searchBox.value.trim() : '';

    const params = new URLSearchParams();
    if (selectedYears.length) params.append('years', selectedYears.join(','));
    if (selectedGenres.length) params.append('genres', selectedGenres.join(','));
    if (selectedCountries.length) params.append('countries', selectedCountries.join(','));
    if (searchQuery) params.append('search', searchQuery);
    params.append('page', page);

    console.log("Fetching updated filter data with params:", params.toString());

    // Show the progress indicator before starting the fetch
    showProgressIndicator();

    fetch(`/filter_movies?${params.toString()}`)
        .then(response => response.json())
        .then(data => {
            console.log("API Response Data:", data);
            const { years, genres, countries, movies, current_page, total_pages } = data;

            // Populate each dropdown with data
            populateDropdown('year-dropdown-list', years, selectedYears);
            populateDropdown('genre-dropdown-list', genres, selectedGenres);
            populateDropdown('country-dropdown-list', countries, selectedCountries);

            updateMovieListings(movies);
            updatePagination(current_page, total_pages);
        })
        .catch(error => {
            console.error('Error fetching filter data:', error);
            if (movieContainer) {
                movieContainer.innerHTML = `<p class="no-movies-message">Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.</p>`;
            }
        })
        .finally(() => {
            // Hide the progress indicator after fetch completes (success or error)
            hideProgressIndicator();
        });
}

/**
 * Helper to get checked values from a specific dropdown list
 */
function getCheckedValues(dropdownListId) {
    const checkboxes = document.querySelectorAll(`#${dropdownListId} input[type="checkbox"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * Function to populate dropdown lists with options
 * @param {string} dropdownListId - The ID of the dropdown list element
 * @param {Object} options - An object with option labels as keys and counts as values
 * @param {Array} selectedValues - An array of currently selected option values
 */
function populateDropdown(dropdownListId, options, selectedValues = []) {
    const dropdownList = document.getElementById(dropdownListId);
    if (!dropdownList) {
        console.error(`populateDropdown: Element with ID '${dropdownListId}' not found.`);
        return;
    }

    dropdownList.innerHTML = "";  // Clear existing options

    if (typeof options !== 'object' || Array.isArray(options)) {
        console.error(`populateDropdown: 'options' should be an object. Received:`, options);
        return;
    }

    // Convert the options object into an array of objects with label and count
    const optionsArray = Object.entries(options).map(([label, count]) => ({ label, count }));

    // Sort options alphabetically or as needed
    optionsArray.sort((a, b) => {
        if (a.label < b.label) return -1;
        if (a.label > b.label) return 1;
        return 0;
    });

    // Render options
    optionsArray.forEach(option => {
        const isChecked = selectedValues.includes(option.label) ? 'checked' : '';
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${option.label}" ${isChecked}> ${option.label} (${option.count})`;
        dropdownList.appendChild(label);
    });
}

/**
 * Function to update the movie listings dynamically based on filter results
 */
function updateMovieListings(movies) {
    console.log("Updating Movie Listings");
    if (!movieContainer) {
        console.error("updateMovieListings: movieContainer element not found.");
        return;
    }

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
                        ${movie.format_standort ? `<p class="standort"><strong>Standort:</strong> ${movie.format_standort}</p>` : ''}
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

/**
 * Function to handle pagination updates for both top and bottom paginations
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

        // Generate page numbers around current page
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

/**
 * Function to show the progress indicator
 */
function showProgressIndicator() {
    console.log("showProgressIndicator called");
    if (progressIndicator) {
        progressIndicator.style.display = 'flex'; // Show the progress indicator
        progressIndicator.setAttribute('aria-hidden', 'false');
        console.log("Progress indicator displayed:", progressIndicator.style.display);
    } else {
        console.error("showProgressIndicator: Progress indicator element not found.");
    }
}

/**
 * Function to hide the progress indicator
 */
function hideProgressIndicator() {
    console.log("hideProgressIndicator called");
    if (progressIndicator) {
        progressIndicator.style.display = 'none'; // Hide the progress indicator
        progressIndicator.setAttribute('aria-hidden', 'true');
        console.log("Progress indicator hidden:", progressIndicator.style.display);
    } else {
        console.error("hideProgressIndicator: Progress indicator element not found.");
    }
}
