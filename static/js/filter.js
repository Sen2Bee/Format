// File: static/js/filter.js

// Import necessary elements and functions
import {
    searchBox,
    clearSearchBtn,
    toggleFiltersButton,
    searchDropdownContainer,
    clearAllFiltersButton,
    movieContainer,
    toggleAdvancedFiltersButton,
    advancedFiltersContainer
} from './entry.js';
import { updateCarouselTitle } from './carousel.js';
import { showProgressIndicator, hideProgressIndicator } from './entry.js';
import { updateMovieListings } from './catalog.js';
import { updatePagination } from './pagination.js';

let debounceTimer = null;
const AUTOCOMPLETE_DEBOUNCE_DELAY = 500; // milliseconds
const AUTOCOMPLETE_MIN_DIGITS = 2;

/**
 * Initialize the toggle functionality for the filter panel and advanced filters
 */
export function initializeFilterPanelToggle() {
    // Advanced Filters Toggle is now handled within the main filters
}

/**
 * Clear all filters and reset selections
 */
export function clearAllFilters() {
    // Clear selections in all dropdowns

    const filterButtons = document.querySelectorAll('.dropdown-list .filter-button.selected');
    filterButtons.forEach(button => button.classList.remove('selected'));

    // Hide clear icons
    const clearIcons = document.querySelectorAll('.clear-icon');
    clearIcons.forEach(icon => {
        icon.classList.remove('visible');
    });

    // Reset and hide selection badges
    const selectionBadges = document.querySelectorAll('.selection-badge');
    selectionBadges.forEach(badge => {
        badge.textContent = '';
        badge.classList.remove('visible');
    });

    // For single-select dropdowns, ensure "Random" or first option is selected
    const singleSelectDropdowns = document.querySelectorAll('.dropdown-list.single-select');
    singleSelectDropdowns.forEach(dropdownList => {
        const buttonsContainer = dropdownList.querySelector('.filter-buttons-container');
        const optionsArray = Array.from(buttonsContainer.children).map(btn => btn.dataset.value);
        const defaultOption = optionsArray.find(label => label.toLowerCase() === 'zufall');
        const buttonToSelect = defaultOption
            ? buttonsContainer.querySelector(`.filter-button[data-value="${defaultOption}"]`)
            : buttonsContainer.firstElementChild;

        if (buttonToSelect) {
            buttonToSelect.classList.add('selected');
            const badge = dropdownList.parentElement.querySelector('.selection-badge');
            updateSelectionBadge([buttonToSelect.dataset.value], badge, dropdownList.id);
        }
    });

    // Clear search box
    if (searchBox) {
        searchBox.value = '';
        clearSearchBtn.classList.remove('visible');
        hideAutocompleteSuggestions();
    }

    // Trigger a filter update
    triggerDropdownChangeEvent();
}

/**
 * Initialize event listeners for action buttons like "Clear All"
 */
export function initializeFilterActionButtons() {
    // Attach event listener to "Clear All" button
    if (clearAllFiltersButton) {
        clearAllFiltersButton.addEventListener('click', () => {
            clearAllFilters();
        });

        // Ensure the button is accessible via keyboard
        clearAllFiltersButton.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                clearAllFilters();
            }
        });
    } else {
        console.error("initializeFilterActionButtons: clearAllFiltersButton element not found.");
    }
}

/**
 * Function to initialize dropdowns and attach necessary event listeners
 */
export function initializeFilterDropdowns() {
    // Handle filter updates triggered by custom dropdowns
    document.addEventListener('dropdownChange', () => {
        // Do not call updateFilters here
    });

    // Search box input event with debouncing
    if (searchBox) {
        searchBox.addEventListener('input', () => {
            // Toggle visibility of the clear icon
            if (searchBox.value.length > 0) {
                clearSearchBtn.classList.add('visible');
            } else {
                clearSearchBtn.classList.remove('visible');
            }
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                if (searchBox.value.length >= AUTOCOMPLETE_MIN_DIGITS) {
                    handleAutocomplete();
                } else {
                    hideAutocompleteSuggestions();
                }
            }, AUTOCOMPLETE_DEBOUNCE_DELAY);
        });
    } else {
        console.error("initializeFilterDropdowns: searchBox element not found.");
    }

    // Clear search box and trigger update
    if (clearSearchBtn && searchBox) {
        clearSearchBtn.addEventListener('click', () => {
            searchBox.value = '';
            clearSearchBtn.classList.remove('visible');
            triggerDropdownChangeEvent();
            hideAutocompleteSuggestions();
        });

        // Ensure the clear button is accessible via keyboard
        clearSearchBtn.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                searchBox.value = '';
                clearSearchBtn.classList.remove('visible');
                triggerDropdownChangeEvent();
                hideAutocompleteSuggestions();
            }
        });
    } else {
        console.error("initializeFilterDropdowns: clearSearchBtn or searchBox element not found.");
    }

    // Attach event listeners to dropdowns using event delegation
    attachDropdownEventDelegation();

    // Initialize filter navigation arrows
    initializeFilterNavigationArrows();

    // Initial filter update: Fetch movies first without counts
    updateFilters(1, false);

    // After displaying movies, fetch and update filters
    updateFilters(1, true);
}

/**
 * Function to attach event listeners to dropdowns using event delegation
 */
export function attachDropdownEventDelegation() {
    const dropdownHeaders = document.querySelectorAll('.dropdown-header');
    const dropdownLists = document.querySelectorAll('.dropdown-list');

    // Function to handle dropdown toggling
    function toggleDropdown(targetDropdown, header) {
        const isVisible = targetDropdown.classList.contains('show');
        if (isVisible) {
            targetDropdown.classList.remove('show');
            header.setAttribute('aria-expanded', 'false');
        } else {
            // Close other open dropdowns
            document.querySelectorAll('.dropdown-list.show').forEach(list => {
                list.classList.remove('show');
                document.querySelector(`.dropdown-header[data-target="${list.id}"]`)?.setAttribute('aria-expanded', 'false');
            });
            targetDropdown.classList.add('show');
            header.setAttribute('aria-expanded', 'true');
        }
    }

    // Function to handle selection of dropdown items
    function handleDropdownSelection(dropdownList, target) {
        const isSingleSelect = dropdownList.classList.contains('single-select');
        const dropdownHeader = document.querySelector(`.dropdown-header[data-target="${dropdownList.id}"]`);
        const selectionBadge = dropdownHeader.querySelector('.selection-badge');
        const clearButton = dropdownHeader.querySelector('.clear-icon');

        if (isSingleSelect) {
            dropdownList.querySelectorAll('.filter-button').forEach(btn => btn.classList.remove('selected'));
            target.classList.add('selected');
        } else {
            target.classList.toggle('selected');
        }

        // Update the selection badge
        const selectedButtons = dropdownList.querySelectorAll('.filter-button.selected');
        const selectedValues = Array.from(selectedButtons).map(btn => btn.dataset.value);
        updateSelectionBadge(selectedValues, selectionBadge, dropdownList.id);

        // Update the visibility of the clear button
        if (isSingleSelect) {
            if (clearButton) clearButton.style.display = 'none';
        } else {
            if (selectedValues.length > 0) {
                clearButton.classList.add('visible');
            } else {
                clearButton.classList.remove('visible');
            }
        }

        // Trigger filter update
        triggerDropdownChangeEvent();

        // Fetch movies immediately after selection
        updateFilters(1, false);

        // Fetch and update filters
        updateFilters(1, true);
    }

    // Function to clear selected items in a dropdown
    function clearDropdownSelection(dropdownList) {
        const dropdownHeader = document.querySelector(`.dropdown-header[data-target="${dropdownList.id}"]`);
        const selectionBadge = dropdownHeader.querySelector('.selection-badge');
        const clearButton = dropdownHeader.querySelector('.clear-icon');

        // Deselect all buttons
        dropdownList.querySelectorAll('.filter-button.selected').forEach(button => button.classList.remove('selected'));

        // Clear the badge and hide clear button
        updateSelectionBadge([], selectionBadge, dropdownList.id);
        if (clearButton) clearButton.classList.remove('visible');

        // Trigger filter update
        triggerDropdownChangeEvent();

        // Fetch movies immediately after clearing selection
        updateFilters(1, false);

        // Fetch and update filters
        updateFilters(1, true);
    }

    // Attach event listeners to dropdown headers
    dropdownHeaders.forEach(header => {
        header.addEventListener('click', (event) => {
            event.stopPropagation();
            const targetDropdownId = header.getAttribute('data-target');
            const targetDropdown = document.getElementById(targetDropdownId);
            toggleDropdown(targetDropdown, header);
        });

        // Allow keyboard accessibility
        header.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                const targetDropdownId = header.getAttribute('data-target');
                const targetDropdown = document.getElementById(targetDropdownId);
                toggleDropdown(targetDropdown, header);
            }
        });
    });

    // Handle button clicks within the dropdowns using event delegation
    dropdownLists.forEach(dropdownList => {
        dropdownList.addEventListener('click', (event) => {
            const target = event.target;
            if (target && target.classList.contains('filter-button')) {
                event.preventDefault();
                handleDropdownSelection(dropdownList, target);
            }
        });

        // Handle clear button (only for multi-select dropdowns)
        const dropdownHeader = document.querySelector(`.dropdown-header[data-target="${dropdownList.id}"]`);
        const clearButton = dropdownHeader?.querySelector('.clear-icon');

        if (clearButton) {
            clearButton.addEventListener('click', (event) => {
                event.stopPropagation();
                clearDropdownSelection(dropdownList);
            });

            // Ensure the clear button is accessible via keyboard
            clearButton.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    clearDropdownSelection(dropdownList);
                }
            });
        }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (event) => {
        dropdownLists.forEach(dropdownList => {
            const header = document.querySelector(`.dropdown-header[data-target="${dropdownList.id}"]`);
            if (!dropdownList.contains(event.target) && !header.contains(event.target)) {
                dropdownList.classList.remove('show');
                header.setAttribute('aria-expanded', 'false');
            }
        });
    });
}

/**
 * Function to update selection badges based on selected values
 * @param {Array} selectedValues - Array of selected values
 * @param {HTMLElement} badgeElement - The badge element to update
 * @param {string} dropdownListId - ID of the dropdown list
 */
export function updateSelectionBadge(selectedValues, badgeElement, dropdownListId) {
    if (!badgeElement) return; // Early return if badgeElement is not provided

    if (selectedValues.length > 0) {
        badgeElement.textContent = selectedValues.join(', ');
        badgeElement.classList.add('visible');
        badgeElement.style.display = 'inline-block';
    } else {
        badgeElement.textContent = '';
        badgeElement.classList.remove('visible');
        badgeElement.style.display = 'none';
    }
    checkSelections();
}

/**
 * Function to check if any selections exist and enable/disable the "Clear All" button
 */
function checkSelections() {
    const selectedButtons = document.querySelectorAll('.dropdown-list .filter-button.selected');
    
    if (selectedButtons.length > 0) {
        clearAllFiltersButton.removeAttribute('disabled');  // Enable the button
    } else {
        clearAllFiltersButton.setAttribute('disabled', 'true');  // Disable the button
    }
}

/**
 * Helper function to get selected values from a specific dropdown list
 * @param {string} dropdownListId - The ID of the dropdown list element
 * @returns {Array} - An array of selected values
 */
export function getSelectedValues(dropdownListId) {
    const buttons = document.querySelectorAll(`#${dropdownListId} .filter-button.selected`);
    return Array.from(buttons).map(btn => btn.dataset.value);
}

/**
 * Function to handle autocomplete for cast and director names
 */
function handleAutocomplete() {
    const searchQuery = searchBox.value.trim();

    if (searchQuery.length >= AUTOCOMPLETE_MIN_DIGITS) {
        showProgressIndicator(); // Show the progress indicator before starting the fetch

        fetch(`/autocomplete?query=${encodeURIComponent(searchQuery)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                showAutocompleteSuggestions(data); // Populate autocomplete suggestions
            })
            .catch(error => {
                console.error('Error fetching autocomplete suggestions:', error);
                hideAutocompleteSuggestions(); // Hide suggestions on error
            })
            .finally(() => {
                hideProgressIndicator(); // Always hide the progress indicator
            });
    } else {
        hideAutocompleteSuggestions(); // Hide suggestions if query is too short
    }
}

/**
 * Function to show autocomplete suggestions
 * @param {Array} suggestions - Array of suggestion objects
 */
function showAutocompleteSuggestions(suggestions) {
    let autocompleteList = document.getElementById('autocomplete-list');
    if (!autocompleteList) {
        autocompleteList = document.createElement('div');
        autocompleteList.id = 'autocomplete-list';
        autocompleteList.className = 'autocomplete-items';
        document.body.appendChild(autocompleteList);
    }

    // Position the autocompleteList under the searchBox
    const searchBoxRect = searchBox.getBoundingClientRect();
    autocompleteList.style.position = 'absolute';
    autocompleteList.style.top = `${searchBoxRect.bottom + window.scrollY}px`;
    autocompleteList.style.left = `${searchBoxRect.left + window.scrollX}px`;
    autocompleteList.style.width = `${searchBoxRect.width}px`;
    autocompleteList.style.zIndex = '10000'; // Ensure it's on top

    autocompleteList.innerHTML = '';

    suggestions.forEach(item => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'autocomplete-item';
        suggestionItem.innerHTML = `<strong>${item.name}</strong> <small>(${item.type})</small>`;
        suggestionItem.dataset.name = item.name;
        suggestionItem.dataset.type = item.type;

        suggestionItem.addEventListener('click', () => {
            searchBox.value = item.name;
            hideAutocompleteSuggestions();
            triggerDropdownChangeEvent();

            // Fetch movies immediately after search selection
            updateFilters(1, false);

            // Fetch and update filters
            updateFilters(1, true);
        });

        autocompleteList.appendChild(suggestionItem);
    });
}

/**
 * Function to hide autocomplete suggestions
 */
function hideAutocompleteSuggestions() {
    const autocompleteList = document.getElementById('autocomplete-list');
    if (autocompleteList) {
        autocompleteList.parentNode.removeChild(autocompleteList);
    }
    hideProgressIndicator();
}

/**
 * Function to populate dropdown lists with options
 * @param {string} dropdownListId - The ID of the dropdown list element
 * @param {Object|Array} options - An object with option labels as keys and counts as values or an array of labels
 * @param {Array} selectedValues - An array of currently selected option values
 * @param {boolean} singleSelect - If true, only one option can be selected
 * @param {boolean} showCounts - If true, display counts alongside labels
 */
export function populateDropdown(dropdownListId, options, selectedValues = [], singleSelect = false, showCounts = true) {
    const dropdownList = document.getElementById(dropdownListId);
    if (!dropdownList) {
        console.error(`populateDropdown: Element with ID '${dropdownListId}' not found.`);
        return;
    }

    dropdownList.innerHTML = "";

    // Add 'single-select' class if applicable
    if (singleSelect) {
        dropdownList.classList.add('single-select');
    } else {
        dropdownList.classList.remove('single-select');
    }

    let optionsArray = [];

    if (typeof options === 'object' && !Array.isArray(options)) {
        optionsArray = Object.entries(options).map(([label, count]) => ({ label, count }));
    } else if (Array.isArray(options)) {
        optionsArray = options.map(label => ({ label }));
    } else {
        console.error(`populateDropdown: 'options' should be an object or array. Received:`, options);
        return;
    }

    // Conditionally sort the options alphabetically, but skip sorting for "sort-dropdown-list"
    if (dropdownListId !== 'sort-dropdown-list') {
        optionsArray.sort((a, b) => a.label.localeCompare(b.label));
    }

    // For "sort-dropdown-list", implement ascending and descending options, excluding "Random"
    if (dropdownListId === 'sort-dropdown-list') {
        const extendedOptionsArray = [];
        optionsArray.forEach(option => {
            if (option.label.toLowerCase() === 'zufall') { // 'zufall' means 'random' in German
                // Add "Random" without icons
                extendedOptionsArray.push({
                    label: option.label,
                    value: `${option.label}`
                });
            } else {
                // Add options with ascending and descending icons
                extendedOptionsArray.push({
                    value: option.label,
                    label: option.label.includes("asc") ? `${option.label} <i class="fa fa-sort-amount-up"></i>` : `${option.label} <i class="fa fa-sort-amount-down"></i>`,
                });
            }
        });

        optionsArray = extendedOptionsArray;
    }

    // Create a container for the filter buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'filter-buttons-container';

    // Render buttons
    optionsArray.forEach(option => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "filter-button";

        if (showCounts && option.count !== undefined) {
            button.innerHTML = `${option.label} (${option.count})`;
        } else {
            button.innerHTML = option.label;
        }

        button.dataset.value = option.value || option.label;

        if (selectedValues.includes(option.value || option.label)) {
            button.classList.add('selected');
        }
        buttonsContainer.appendChild(button);
    });

    dropdownList.appendChild(buttonsContainer);

    // Update the Selection Badge for normal filters
    const dropdownHeader = document.querySelector(`.dropdown-header[data-target="${dropdownListId}"]`);
    const selectionBadge = dropdownHeader.querySelector('.selection-badge');
    const selectedButtons = dropdownList.querySelectorAll('.filter-button.selected');
    const selectedValuesUpdated = Array.from(selectedButtons).map(btn => btn.dataset.value);
    updateSelectionBadge(selectedValuesUpdated, selectionBadge, dropdownList.id);
    
    // Hide the clear icon for single-select dropdowns
    const clearButton = dropdownHeader.querySelector('.clear-icon');
    if (singleSelect) {
        if (clearButton) {
            clearButton.style.display = 'none';
        }
    } else {
        if (clearButton) {
            clearButton.style.display = '';
        }
    }
}

/**
 * Function to update filters based on selected criteria and search query
 * @param {number} page - The current page number for pagination
 * @param {boolean} includeCounts - Whether to fetch and update filter counts
 */
export function updateFilters(page = 1, includeCounts = true) {
    const selectedYears = getSelectedValues('year-dropdown-list');
    const selectedGenres = getSelectedValues('genre-dropdown-list');
    const selectedCountries = getSelectedValues('country-dropdown-list');
    const selectedStandorte = getSelectedValues('standort-dropdown-list');
    const selectedMedia = getSelectedValues('medium-dropdown-list');
    const selectedSortByValues = getSelectedValues('sort-dropdown-list');
    const selectedSortBy = selectedSortByValues.length > 0 ? selectedSortByValues : ["Zufall"]; // 'Zufall' means 'Random'

    const searchQuery = searchBox ? searchBox.value.trim() : '';

    const params = new URLSearchParams();
    if (selectedYears.length) {
        params.append('years', selectedYears.join(','));
    }
    if (selectedGenres.length) {
        params.append('genres', selectedGenres.join(','));
    }
    if (selectedCountries.length) {
        params.append('countries', selectedCountries.join(','));
    }
    if (selectedStandorte.length) {
        params.append('standorte', selectedStandorte.join(','));
    }
    if (selectedMedia.length) {
        params.append('media', selectedMedia.join(','));
    }
    if (selectedSortBy.length) {
        params.append('sort_by', selectedSortBy[0]);
    }

    // Include search query regardless of length
    if (searchQuery.length > 0) {
        params.append('search', searchQuery);
    }

    params.append('page', page);
    params.append('include_counts', includeCounts);

    let total_movies = 0;

    // Show the progress indicator before starting the fetch
    showProgressIndicator();

    fetch(`/filter_movies?${params.toString()}`)
        .then(response => response.json())
        .then(data => {
            const { years, genres, countries, standorte, media, sort_options, movies, current_page, total_pages, total_movies } = data;

            // Determine number of columns per row based on total_movies
            let columnsPerRow = 1; // Default to 1 column

            if (total_movies > 100) {
                columnsPerRow = 5;
            } else if (total_movies > 60) {
                columnsPerRow = 4;
            } else if (total_movies > 20) {
                columnsPerRow = 3;
            } else {
                columnsPerRow = 1;
            }

            // Update the movie listings with the current number of movies
            updateMovieListings(movies);

            // Update the layout by adding a class based on columnsPerRow
            setGridLayout(columnsPerRow);

            // Update pagination
            updatePagination(current_page, total_pages, total_movies, columnsPerRow);

            updateHeadline(selectedGenres, 
                selectedYears, 
                selectedCountries, 
                selectedStandorte,
                selectedMedia, 
                selectedSortByValues,
                searchQuery, 
                total_movies); // Pass selected genres and years

            // Populate dropdowns based on the filtered data if includeCounts is true
            if (includeCounts) {
                populateDropdown('year-dropdown-list', years, selectedYears);
                populateDropdown('genre-dropdown-list', genres, selectedGenres);
                populateDropdown('country-dropdown-list', countries, selectedCountries);
                populateDropdown('standort-dropdown-list', standorte, selectedStandorte);
                populateDropdown('medium-dropdown-list', media, selectedMedia);
                populateDropdown('sort-dropdown-list', sort_options, selectedSortBy, true, false);
            }

        })
        .catch(error => {
            console.error('Error fetching filter data:', error);
            if (movieContainer) {
                movieContainer.innerHTML = `<p class="no-movies-message">An error occurred. Please try again later.</p>`;
            }
        })
        .finally(() => {
            hideProgressIndicator();
        });
}

/**
 * Function to set the grid layout based on the number of columns
 * @param {number} columns - Number of columns per row
 */
function setGridLayout(columns) {
    if (!movieContainer) return;

    // Remove existing column classes
    movieContainer.classList.remove('columns-1', 'columns-3', 'columns-4', 'columns-5');

    // Add the appropriate column class
    switch (columns) {
        case 3:
            movieContainer.classList.add('columns-3');
            break;
        case 4:
            movieContainer.classList.add('columns-4');
            break;
        case 5:
            movieContainer.classList.add('columns-5');
            break;
        default:
            movieContainer.classList.add('columns-1');
            break;
    }
}

/**
 * Initialize filter navigation arrows
 */
function initializeFilterNavigationArrows() {
    const leftArrow = document.querySelector('.filter-nav-arrow.left');
    const rightArrow = document.querySelector('.filter-nav-arrow.right');
    const mainFiltersContainer = document.querySelector('.main-filters-container');

    if (!leftArrow || !rightArrow || !mainFiltersContainer) {
        console.error("Filter navigation arrows or main filters container not found.");
        return;
    }

    leftArrow.addEventListener('click', () => {
        mainFiltersContainer.scrollBy({
            left: -200,
            behavior: 'smooth'
        });
    });

    rightArrow.addEventListener('click', () => {
        mainFiltersContainer.scrollBy({
            left: 200,
            behavior: 'smooth'
        });
    });

    // Update arrow visibility on scroll
    mainFiltersContainer.addEventListener('scroll', () => {
        updateFilterNavigationArrowsVisibility();
    });

    // Update arrow visibility on window resize
    window.addEventListener('resize', () => {
        updateFilterNavigationArrowsVisibility();
    });

    // Initial check
    updateFilterNavigationArrowsVisibility();
}

/**
 * Update visibility of filter navigation arrows based on scroll position
 */
function updateFilterNavigationArrowsVisibility() {
    const leftArrow = document.querySelector('.filter-nav-arrow.left');
    const rightArrow = document.querySelector('.filter-nav-arrow.right');
    const mainFiltersContainer = document.querySelector('.main-filters-container');

    if (!leftArrow || !rightArrow || !mainFiltersContainer) {
        return;
    }

    const scrollLeft = mainFiltersContainer.scrollLeft;
    const maxScrollLeft = mainFiltersContainer.scrollWidth - mainFiltersContainer.clientWidth;

    if (scrollLeft <= 0) {
        leftArrow.classList.add('hidden');
    } else {
        leftArrow.classList.remove('hidden');
    }

    if (scrollLeft >= maxScrollLeft - 1) {
        rightArrow.classList.add('hidden');
    } else {
        rightArrow.classList.remove('hidden');
    }
}

/**
 * Function to trigger a custom event to notify filter.js of dropdown changes
 */
export function triggerDropdownChangeEvent() {
    const event = new CustomEvent('dropdownChange');
    console.log("Dispatching dropdownChange event");
    document.dispatchEvent(event);
}


export function updateHeadline(
    selectedGenres = [], 
    selectedYears = [], 
    selectedCountries = [], 
    selectedStandorte = [], 
    selectedMedia = [], 
    selectedSortByValues = [], 
    searchQuery,
    total_movies
) {
    let headlineText = 'Auswahl: ';
    console.log("total_movies", total_movies)

    // Clear existing headline content
    const headlineElement = document.querySelector('.view-toggle-title');
    if (!headlineElement) {
        console.error('Element with class .view-toggle-title not found');
        return;
    }
    headlineElement.innerHTML = '';  // Clear existing content

    // Helper function to add text with icon
    const appendTextWithIcon = (iconClass, text) => {
        const span = document.createElement('span');
        const icon = document.createElement('i');
        icon.className = iconClass;  // Assign Font Awesome class
        span.appendChild(icon);      // Add the icon to span
        span.innerHTML += ` ${text}`; // Add text after the icon
        if (headlineElement.innerHTML) {
            headlineElement.innerHTML += ' | '; // Add separator if there is existing content
        }
        headlineElement.appendChild(span); // Append the span to the headline
    };

    // Add search query if present
    if (searchQuery) {
        appendTextWithIcon('fa fa-search', searchQuery);
    }

    // Add genres if present
    if (selectedGenres.length > 0) {
        appendTextWithIcon('fa fa-film', selectedGenres.join(', '));
    }

    // Add years if present
    if (selectedYears.length > 0) {
        appendTextWithIcon('fa fa-calendar-alt', selectedYears.join(', '));
    }

    // Add countries if present
    if (selectedCountries.length > 0) {
        appendTextWithIcon('fa fa-globe', selectedCountries.join(', '));
    }

    // Add standorte (locations) if present
    if (selectedStandorte.length > 0) {
        appendTextWithIcon('fa fa-map-marker-alt', selectedStandorte.join(', '));
    }

    // Add media formats if present
    if (selectedMedia.length > 0) {
        appendTextWithIcon('fa fa-compact-disc', selectedMedia.join(', '));
    }

    // Add sort options if present
    if (selectedSortByValues.length > 0) {
        appendTextWithIcon('fa fa-sort', selectedSortByValues.join(', '));
    }

    // Add total movie count with thousand separators
    if (total_movies !== undefined && total_movies > 0) {
        const formattedTotalMovies = total_movies.toLocaleString('de-DE'); // German locale for dot as thousand separator
        appendTextWithIcon('fa fa-film', `${formattedTotalMovies} ${formattedTotalMovies === '1' ? 'Film gefunden' : 'Filme gefunden'}`);

    }

    // Default text if nothing is selected
    if (!searchQuery && 
        selectedGenres.length === 0 && 
        selectedYears.length === 0 && 
        selectedCountries.length === 0 && 
        selectedStandorte.length === 0 && 
        selectedMedia.length === 0 && 
        selectedSortByValues.length === 0 && 
        total_movies === 0) {
        headlineElement.textContent = '';  // Set to empty if nothing is selected
    }
}
