// File: static/js/filter.js

import {
    searchBox,
    clearSearchBtn,
    toggleFiltersButton,
    searchDropdownContainer,
    clearAllFiltersButton,
    showAllResultsButton,
    movieContainer
} from './entry.js';
import { updateCarouselTitle } from './carousel.js';
import { showProgressIndicator, hideProgressIndicator } from './entry.js';
import { updateMovieListings } from './catalog.js';
import { updatePagination } from './pagination.js';

let debounceTimer = null;

/**
 * Function to initialize filter panel toggle
 */
export function initializeFilterPanelToggle() {
    if (toggleFiltersButton && searchDropdownContainer) {
        toggleFiltersButton.addEventListener('click', () => {
            searchDropdownContainer.classList.toggle('hidden');
            toggleFiltersButton.classList.toggle('rotate');
        });
    }
}

/**
 * Function to initialize "Clear All" and "Show All Results" buttons
 */
export function initializeFilterActionButtons() {
    if (clearAllFiltersButton) {
        clearAllFiltersButton.addEventListener('click', () => {
            clearAllFilters();
            updateFilters();
        });
    }

    if (showAllResultsButton) {
        showAllResultsButton.addEventListener('click', () => {
            clearAllFilters();
            searchBox.value = '';
            updateFilters();
        });
    }
}

/**
 * Function to clear all filters
 */
export function clearAllFilters() {
    // Clear selections in all dropdowns
    const filterButtons = document.querySelectorAll('.dropdown-list .filter-button.selected');
    filterButtons.forEach(button => button.classList.remove('selected'));

    // Reset include/exclude toggles
    const includeExcludeCheckboxes = document.querySelectorAll('.include-exclude-checkbox');
    includeExcludeCheckboxes.forEach(checkbox => {
        checkbox.checked = true; // Set to include
    });

    // Hide clear icons and reset selection badges
    const clearIcons = document.querySelectorAll('.clear-icon');
    clearIcons.forEach(icon => {
        icon.style.visibility = 'hidden';
    });

    const selectionBadges = document.querySelectorAll('.selection-badge');
    selectionBadges.forEach(badge => {
        badge.textContent = '';
        badge.classList.remove('visible');
    });
}

/**
 * Function to initialize dropdowns and attach event listeners
 */
export function initializeFilterDropdowns() {
    // Handle filter updates triggered by custom dropdowns
    document.addEventListener('dropdownChange', () => {
        console.log("Filter.js: Detected dropdown change event");
        updateFilters(); // Trigger filter update on dropdown change
    });

    // Search box input event with debouncing
    if (searchBox) { // Check if searchBox exists
        searchBox.addEventListener('input', () => {
            // Toggle visibility of the clear icon
            if (searchBox.value.length > 3) {
                clearSearchBtn.classList.add('visible');
            } else {
                clearSearchBtn.classList.remove('visible');
            }

            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                updateFilters(); // Trigger filter update after user stops typing for 300ms
                handleAutocomplete(); // Handle autocomplete for cast and director
            }, 1000);
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
            hideAutocompleteSuggestions(); // Hide autocomplete suggestions
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
export function attachDropdownEventDelegation() {
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
export function toggleDropdown(dropdownList, header) {
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
export function updateSelectionBadge(selectedValues, badgeElement) {
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
export function triggerDropdownChangeEvent() {
    const event = new CustomEvent('dropdownChange');
    console.log("Dispatching dropdownChange event");
    document.dispatchEvent(event);
}

export function updateFilters(page = 1) {
    const selectedYears = getSelectedValues('year-dropdown-list');
    const selectedGenres = getSelectedValues('genre-dropdown-list');
    const selectedCountries = getSelectedValues('country-dropdown-list');
    const searchQuery = searchBox ? searchBox.value.trim() : '';

    // Get include/exclude status
    const yearInclude = document.querySelector('.include-exclude-checkbox[data-filter="year"]').checked;
    const genreInclude = document.querySelector('.include-exclude-checkbox[data-filter="genre"]').checked;
    const countryInclude = document.querySelector('.include-exclude-checkbox[data-filter="country"]').checked;

    const params = new URLSearchParams();
    if (selectedYears.length) {
        params.append('years', selectedYears.join(','));
        params.append('years_include', yearInclude ? '1' : '0');
    }
    if (selectedGenres.length) {
        params.append('genres', selectedGenres.join(','));
        params.append('genres_include', genreInclude ? '1' : '0');
    }
    if (selectedCountries.length) {
        params.append('countries', selectedCountries.join(','));
        params.append('countries_include', countryInclude ? '1' : '0');
    }

    // Search logic: apply filters and shrink dropdowns based on search query
    if (searchQuery.length > 0) {
        params.append('search', searchQuery);
    }

    params.append('page', page);

    console.log("Fetching updated filter data with params:", params.toString());

    // Show the progress indicator before starting the fetch
    showProgressIndicator();

    fetch(`/filter_movies?${params.toString()}`)
        .then(response => response.json())
        .then(data => {
            console.log("API Response Data:", data);
            const { years, genres, countries, movies, current_page, total_pages } = data;

            // Populate dropdowns based on the filtered data from search query
            populateDropdown('year-dropdown-list', years, selectedYears);
            populateDropdown('genre-dropdown-list', genres, selectedGenres);
            populateDropdown('country-dropdown-list', countries, selectedCountries);

            updateMovieListings(movies); // Updates the displayed movie cards
            updatePagination(current_page, total_pages); // Updates the pagination controls
        })
        .catch(error => {
            console.error('Error fetching filter data:', error);
            if (movieContainer) {
                movieContainer.innerHTML = `<p class="no-movies-message">An error occurred. Please try again later.</p>`;
            }
        })
        .finally(() => {
            hideProgressIndicator(); // Hide the progress indicator after the fetch completes
        });
}


/**
 * Helper to get selected values from a specific dropdown list
 */
export function getSelectedValues(dropdownListId) {
    const buttons = document.querySelectorAll(`#${dropdownListId} .filter-button.selected`);
    return Array.from(buttons).map(btn => btn.dataset.value);
}

/**
 * Function to populate dropdown lists with options
 * @param {string} dropdownListId - The ID of the dropdown list element
 * @param {Object} options - An object with option labels as keys and counts as values
 * @param {Array} selectedValues - An array of currently selected option values
 */
export function populateDropdown(dropdownListId, options, selectedValues = []) {
    const dropdownList = document.getElementById(dropdownListId);
    if (!dropdownList) {
        console.error(`populateDropdown: Element mit ID '${dropdownListId}' nicht gefunden.`);
        return;
    }

    dropdownList.innerHTML = ""; // Clear existing options

    if (typeof options !== 'object' || Array.isArray(options)) {
        console.error(`populateDropdown: 'options' sollte ein Objekt sein. Erhalten:`, options);
        return;
    }
    // Convert options object to array and sort
    const optionsArray = Object.entries(options).map(([label, count]) => ({ label, count }));

    // Sort options as needed (e.g., alphabetically)
    optionsArray.sort((a, b) => a.label.localeCompare(b.label));

    // Create a container for the filter buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'filter-buttons-container';

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

        buttonsContainer.appendChild(button);
    });
    dropdownList.appendChild(buttonsContainer);

    // Update Selection Badge after populating
    const parentDropdown = dropdownList.parentElement;
    const selectionBadge = parentDropdown.querySelector('.selection-badge');
    const selectedButtons = dropdownList.querySelectorAll('.filter-button.selected');
    const selectedValuesUpdated = Array.from(selectedButtons).map(btn => btn.dataset.value);
    updateSelectionBadge(selectedValuesUpdated, selectionBadge);
}

/**
 * Function to handle autocomplete for cast and director names
 */
function handleAutocomplete() {
    const searchQuery = searchBox.value.trim();

    // Only perform autocomplete if the search query length is sufficient
    if (searchQuery.length >= 3) {
        fetch(`/autocomplete?query=${encodeURIComponent(searchQuery)}`)
            .then(response => {
                if (!response.ok) {
                    // Handle 404 or other error responses
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();  // Attempt to parse JSON
            })
            .then(data => {
                showAutocompleteSuggestions(data);
            })
            .catch(error => {
                console.error('Error fetching autocomplete suggestions:', error);
                hideAutocompleteSuggestions();  // Hide suggestions in case of error
                // Optionally, show a user-friendly message (e.g., "No results found" or "Error fetching data")
            });
    } else {
        hideAutocompleteSuggestions();
    }
}


/**
 * Function to show autocomplete suggestions
 */
function showAutocompleteSuggestions(suggestions) {
    let autocompleteList = document.getElementById('autocomplete-list');
    if (!autocompleteList) {
        autocompleteList = document.createElement('div');
        autocompleteList.id = 'autocomplete-list';
        autocompleteList.className = 'autocomplete-items';
        searchBox.parentNode.appendChild(autocompleteList);
    }

    autocompleteList.innerHTML = ''; // Clear existing suggestions

    suggestions.forEach(item => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'autocomplete-item';
        suggestionItem.textContent = item.name + ' (' + item.type + ')';
        suggestionItem.dataset.name = item.name;
        suggestionItem.dataset.type = item.type;

        suggestionItem.addEventListener('click', () => {
            searchBox.value = item.name;
            hideAutocompleteSuggestions();
            updateFilters();
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
}

// Event listener to close autocomplete suggestions when clicking outside
document.addEventListener('click', function (e) {
    if (e.target !== searchBox) {
        hideAutocompleteSuggestions();
    }
});
