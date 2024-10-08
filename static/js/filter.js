// File: static/js/filter.js

document.addEventListener('DOMContentLoaded', function () {
    console.log("Filter.js: DOM fully loaded");
    initializeFilterDropdowns();  // Initialize dropdowns on page load
    initializeSwiper(); // Initialize Swiper Carousel
});

/** Cache Elements and Buttons */
const clearSearchBtn = document.getElementById('clear-search');
const searchBox = document.getElementById('search-box');
const movieContainer = document.querySelector('.movie-listings');
const topPaginationContainer = document.querySelector('.top-pagination nav ul');
const bottomPaginationContainer = document.querySelector('.bottom-pagination nav ul');
const progressIndicator = document.getElementById('progress-indicator');
const carouselTitle = document.getElementById('carousel-title');

let debounceTimer;

/** Genre to Font Mapping */
const genreFontMapping = {
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
        // Handle button clicks within the dropdown
        dropdownList.addEventListener('click', (event) => {
            const target = event.target;
            if (target && target.classList.contains('filter-button')) {
                event.preventDefault();
                const value = target.dataset.value;
                target.classList.toggle('selected');

                // Update the selected values
                const selectedButtons = dropdownList.querySelectorAll('.filter-button.selected');
                const selectedValues = Array.from(selectedButtons).map(btn => btn.dataset.value);

                // Update the selection badge and clear button
                const dropdownHeader = dropdownList.previousElementSibling;
                const clearButton = dropdownHeader.querySelector('.clear-icon');
                const selectionBadge = dropdownHeader.querySelector('.selection-badge');
                updateSelectionBadge(selectedValues, selectionBadge);
                clearButton.style.visibility = selectedValues.length > 0 ? 'visible' : 'hidden';

                // Trigger filter update
                triggerDropdownChangeEvent();

                // Update carousel title based on selected genre
                if (dropdownList.id === 'genre-dropdown-list') {
                    updateCarouselTitle();
                }
            }
        });

        // Handle clear button
        const clearButton = dropdownList.parentElement.querySelector('.clear-icon');
        if (clearButton) {
            clearButton.addEventListener('click', (event) => {
                event.stopPropagation();
                const buttons = dropdownList.querySelectorAll('.filter-button.selected');
                buttons.forEach(button => button.classList.remove('selected'));
                const dropdownHeader = dropdownList.previousElementSibling;
                const selectionBadge = dropdownHeader.querySelector('.selection-badge');
                updateSelectionBadge([], selectionBadge);
                clearButton.style.visibility = 'hidden';
                triggerDropdownChangeEvent();

                // Update carousel title based on selected genre
                if (dropdownList.id === 'genre-dropdown-list') {
                    updateCarouselTitle();
                }
            });
        }
    });

    // Handle dropdown header clicks
    const dropdownHeaders = document.querySelectorAll('.dropdown-header');
    dropdownHeaders.forEach(header => {
        header.addEventListener('click', (event) => {
            event.stopPropagation();
            const dropdownList = header.nextElementSibling;
            toggleDropdown(dropdownList, header);
        });

        // Allow keyboard accessibility
        header.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                const dropdownList = header.nextElementSibling;
                toggleDropdown(dropdownList, header);
            }
        });
    });

    // Close dropdowns when clicking outside
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
 * Function to update the Selection Badge based on current selections
 */
function updateSelectionBadge(selectedValues, badgeElement) {
    if (selectedValues.length > 0) {
        badgeElement.textContent = selectedValues.join(', ');
        badgeElement.classList.add('visible');
    } else {
        badgeElement.textContent = '';
        badgeElement.classList.remove('visible');
    }
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
 * Function to update the carousel title based on selected genre
 */
function updateCarouselTitle() {
    const selectedGenres = getSelectedValues('genre-dropdown-list');
    if (selectedGenres.length === 1) {
        const genre = selectedGenres[0];
        carouselTitle.textContent = genreFontMapping[genre] ? `${genre} Filmtitel` : `${genre} Filme`;
        // Apply the corresponding font
        carouselTitle.style.fontFamily = genreFontMapping[genre] || "'Open Sans', sans-serif";
    } else if (selectedGenres.length > 1) {
        carouselTitle.textContent = "Verschiedene Genres";
        carouselTitle.style.fontFamily = "'Open Sans', sans-serif";
    } else {
        carouselTitle.textContent = "Hervorgehobene Filme";
        carouselTitle.style.fontFamily = "'Cinzel', serif";
    }
}

/**
 * Function to update dropdown values and movie listings based on current selections and search query
 */
function updateFilters(page = 1) {
    const selectedYears = getSelectedValues('year-dropdown-list');
    const selectedGenres = getSelectedValues('genre-dropdown-list');
    const selectedCountries = getSelectedValues('country-dropdown-list');
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
 * Helper to get selected values from a specific dropdown list
 */
function getSelectedValues(dropdownListId) {
    const buttons = document.querySelectorAll(`#${dropdownListId} .filter-button.selected`);
    return Array.from(buttons).map(btn => btn.dataset.value);
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
        console.error(`populateDropdown: Element mit ID '${dropdownListId}' nicht gefunden.`);
        return;
    }

    dropdownList.innerHTML = "";  // Bestehende Optionen löschen

    if (typeof options !== 'object' || Array.isArray(options)) {
        console.error(`populateDropdown: 'options' sollte ein Objekt sein. Erhalten:`, options);
        return;
    }

    // Convert options object to array and sort
    const optionsArray = Object.entries(options).map(([label, count]) => ({ label, count }));

    // Sort options as needed (e.g., alphabetically)
    optionsArray.sort((a, b) => a.label.localeCompare(b.label));

    // Render buttons
    optionsArray.forEach(option => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "filter-button";
        button.textContent = `${option.label} (${option.count})`;
        button.dataset.value = option.label;

        if (selectedValues.includes(option.label)) {
            button.classList.add('selected');
        }

        dropdownList.appendChild(button);
    });

    // Update Selection Badge after populating
    const parentDropdown = dropdownList.parentElement;
    const selectionBadge = parentDropdown.querySelector('.selection-badge');
    const selectedButtons = dropdownList.querySelectorAll('.filter-button.selected');
    const selectedValuesUpdated = Array.from(selectedButtons).map(btn => btn.dataset.value);
    updateSelectionBadge(selectedValuesUpdated, selectionBadge);
}

/**
 * Funktion zur Aktualisierung der Movie Listings basierend auf den Filterergebnissen
 */
function updateMovieListings(movies) {
    console.log("Updating Movie Listings");
    if (!movieContainer) {
        console.error("updateMovieListings: movieContainer Element nicht gefunden.");
        return;
    }

    movieContainer.innerHTML = "";  // Bestehende Einträge löschen

    if (movies.length > 0) {
        movies.forEach(movie => {
            const imagePath = `/movie_images/${encodeURIComponent(movie.folder_name)}/poster/poster_1.jpg`;
            const defaultImagePath = '/static/images/default_movie.png';

            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card poster-background';
            movieCard.style.backgroundImage = `url('${imagePath}')`;

            const maxOverviewLength = window.innerWidth <= 768 ? 150 : 350;
            movieCard.innerHTML = `
                <div class="movie-content-wrapper">
                    <div class="image-container">
                        <img src="${imagePath}" alt="${movie.main_title}" onerror="this.onerror=null; this.src='${defaultImagePath}';">
                    </div>
                    <div class="info-section">
                        <div class="header-section">
                            <h2>${movie.main_title}</h2>
                            <!-- Weitere Elemente wie Buttons oder Icons -->
                        </div>
                        <div class="metadata">
                            <p><strong>Regie:</strong> ${movie.director}</p>
                            <p><strong>Schauspieler:</strong> ${movie.actors}</p>
                            <p class="inline-meta">${movie.runtime} min | ${movie.formats} | FSK ${movie.format_fsk} | &#9733; ${movie.imdb_rating}</p>
                            <p class="standort"><strong>Standort:</strong> ${movie.format_standort || 'N/A'}</p>
                            <p class="countries"><strong>Länder:</strong> ${movie.countries}</p> <!-- Länderinformationen -->
                        </div>
                    </div>
                    <div class="overview-section">
                        ${movie.overview.length > maxOverviewLength
                            ? `<p>${movie.overview.substring(0, maxOverviewLength)}... <a href="/movie/${movie.movie_id}" class="more-link">mehr</a></p>`
                            : `<p>${movie.overview} <a href="/movie/${movie.movie_id}" class="more-link">mehr</a></p>`}
                    </div>
                </div>
            `;

            movieContainer.appendChild(movieCard);
        });
    } else {
        movieContainer.innerHTML = `<p class="no-movies-message">Keine Filme entsprechen den ausgewählten Filtern.</p>`;
    }
}

/**
 * Function to handle pagination updates for both top and bottom paginations
 */
function updatePagination(currentPage, totalPages) {
    [topPaginationContainer, bottomPaginationContainer].forEach(paginationContainer => {
        if (!paginationContainer) return;

        paginationContainer.innerHTML = "";  // Bestehende Pagination-Buttons löschen

        // Create the "Previous" Button
        let prevDisabledClass = currentPage <= 1 ? 'disabled' : '';
        let prevDisabledAttr = currentPage <= 1 ? 'aria-disabled="true"' : '';
        paginationContainer.innerHTML += `<li class="${prevDisabledClass}"><a href="#" data-page="${currentPage - 1}" ${prevDisabledAttr}>&laquo; Previous</a></li>`;

        // Add first page and ellipsis if needed
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

        // Add ellipsis and last page if needed
        if (currentPage < totalPages - 2) {
            paginationContainer.innerHTML += `<li class="ellipsis"><span>...</span></li>`;
            paginationContainer.innerHTML += `<li><a href="#" data-page="${totalPages}">${totalPages}</a></li>`;
        }

        // Create the "Next" Button
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
                return;  // Klicks auf deaktivierte Buttons ignorieren
            }
            const page = parseInt(this.getAttribute('data-page'));
            if (!isNaN(page)) updateFilters(page);  // Filterung mit ausgewählter Seite auslösen
        });
    });
}

/**
 * Function to show the progress indicator
 */
function showProgressIndicator() {
    console.log("showProgressIndicator aufgerufen");
    if (progressIndicator) {
        progressIndicator.style.display = 'flex'; // Progress Indicator anzeigen
        progressIndicator.setAttribute('aria-hidden', 'false');
        console.log("Progress Indicator angezeigt:", progressIndicator.style.display);
    } else {
        console.error("showProgressIndicator: Progress Indicator Element nicht gefunden.");
    }
}

/**
 * Function to hide the progress indicator
 */
function hideProgressIndicator() {
    console.log("hideProgressIndicator aufgerufen");
    if (progressIndicator) {
        progressIndicator.style.display = 'none'; // Progress Indicator ausblenden
        progressIndicator.setAttribute('aria-hidden', 'true');
        console.log("Progress Indicator ausgeblendet:", progressIndicator.style.display);
    } else {
        console.error("hideProgressIndicator: Progress Indicator Element nicht gefunden.");
    }
}

/**
 * Function to initialize the Swiper carousel without pagination bullets
 */
function initializeSwiper() {
    const swiperContainer = document.querySelector('.swiper-container');
    if (!swiperContainer) {
        console.error("initializeSwiper: Swiper container nicht gefunden.");
        return;
    }

    const totalSlides = swiperContainer.querySelectorAll('.swiper-slide').length;
    const slidesPerViewDesktop = 4; // Base number for desktop

    const swiper = new Swiper('.swiper-container', {
        loop: totalSlides > slidesPerViewDesktop,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        slidesPerView: 'auto', // Allows Swiper to adjust based on slide width
        spaceBetween: 10,
        watchOverflow: true, // Disable Swiper if not enough slides

        // Responsive breakpoints
        breakpoints: {
            // When window width is >= 1400px
            2200: {
                slidesPerView: 13,
                spaceBetween: 10
            },
            2000: {
                slidesPerView: 10,
                spaceBetween: 10
            },
            1800: {
                slidesPerView: 9,
                spaceBetween: 10
            },
            1600: {
                slidesPerView: 8,
                spaceBetween: 10
            },
        
            1400: {
                slidesPerView: 6.5,
                spaceBetween: 10
            },
            // When window width is >= 1200px
            1200: {
                slidesPerView: 6,
                spaceBetween: 6
            },
            // When window width is >= 1024px
            1024: {
                slidesPerView: 5,
                spaceBetween: 8
            },
            // When window width is >= 900px
            900: {
                slidesPerView: 4,
                spaceBetween: 10
            },
            // When window width is >= 768px
            768: {
                slidesPerView: 3,
                spaceBetween: 12
            },
            // When window width is >= 640px
            640: {
                slidesPerView: 2.5,
                spaceBetween: 14
            },
            // When window width is < 640px
            0: { // Mobile-first
                slidesPerView: 2.5,
                spaceBetween: 16
            }
        },

        // Adjust to handle slides dynamically
        on: {
            resize: function () {
                this.update(); // Update Swiper on window resize
            },
            init: function () {
                if (totalSlides <= this.params.slidesPerView) {
                    this.loopDestroy(); // Disable loop if not enough slides
                }
            }
        }
    });
}
