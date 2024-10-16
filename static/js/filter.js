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

/**
 * Initialize the toggle functionality for the filter panel and advanced filters
 */
export function initializeFilterPanelToggle() {
    if (toggleFiltersButton && searchDropdownContainer) {
        toggleFiltersButton.addEventListener('click', () => {
            searchDropdownContainer.classList.toggle('hidden');
            toggleFiltersButton.classList.toggle('rotate');
        });
    }

    // Initialize Advanced Filters Toggle
    if (toggleAdvancedFiltersButton && advancedFiltersContainer) {
        toggleAdvancedFiltersButton.addEventListener('click', () => {
            const mainFiltersContainer = document.querySelector('.main-filters-container');
            
            // Toggle the advanced filters container
            advancedFiltersContainer.classList.toggle('open');
            
            // Shrink the main filters container if the advanced filters are open
            if (advancedFiltersContainer.classList.contains('open')) {
                mainFiltersContainer.classList.add('shrink');
                toggleAdvancedFiltersButton.classList.add('active');
            } else {
                mainFiltersContainer.classList.remove('shrink');
                toggleAdvancedFiltersButton.classList.remove('active');
            }
        });
    }
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

    // For single-select dropdowns, ensure "Zufall" or first option is selected
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
            updateSelectionBadge([buttonToSelect.dataset.value], badge);
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
    }
}

/**
 * Function to initialize dropdowns and attach necessary event listeners
 */
export function initializeFilterDropdowns() {   
    // Handle filter updates triggered by custom dropdowns
    document.addEventListener('dropdownChange', () => {
        console.log("Filter.js: Detected dropdown change event");
        updateFilters();
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
                triggerDropdownChangeEvent();
                handleAutocomplete();
            }, 500); // Reduced debounce time for better responsiveness
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
    } else {
        console.error("initializeFilterDropdowns: clearSearchBtn or searchBox element not found.");
    }

    // Attach event listeners to dropdowns using event delegation
    attachDropdownEventDelegation();

    // Initial filter update
    triggerDropdownChangeEvent();
}

/**
 * Function to attach event listeners to dropdowns using event delegation
 */
export function attachDropdownEventDelegation() {
    const dropdownLists = document.querySelectorAll('.dropdown-list');

    dropdownLists.forEach(dropdownList => {
        // Handle button clicks within the dropdown using event delegation
        dropdownList.addEventListener('click', (event) => {
            const target = event.target;
            if (target && target.classList.contains('filter-button')) {
                event.preventDefault();
                const isSingleSelect = dropdownList.classList.contains('single-select');
                const value = target.dataset.value;

                if (isSingleSelect) {
                    // For single-select dropdowns, deselect all and select the clicked button
                    const allButtons = dropdownList.querySelectorAll('.filter-button');
                    allButtons.forEach(btn => btn.classList.remove('selected'));
                    target.classList.add('selected');
                } else {
                    // For multi-select dropdowns, toggle selection
                    target.classList.toggle('selected');
                }

                // Update the selection badge
                const dropdownHeader = dropdownList.previousElementSibling;
                const selectionBadge = dropdownHeader.querySelector('.selection-badge');
                const selectedButtons = dropdownList.querySelectorAll('.filter-button.selected');
                const selectedValues = Array.from(selectedButtons).map(btn => btn.dataset.value);
                updateSelectionBadge(selectedValues, selectionBadge);

                // Update the clear icon visibility for multi-select dropdowns
                const clearButton = dropdownHeader.querySelector('.clear-icon');

                if (isSingleSelect) {
                    if (clearButton) {
                        clearButton.style.display = 'none';
                    }
                } else {
                    if (selectedValues.length > 0) {
                        console.log("clearButton visible", clearButton)
                        clearButton.classList.add('visible');
                    } else {
                        clearButton.classList.remove('visible');
                    }
                }

                // Trigger filter update
                triggerDropdownChangeEvent();
            }
        });

        // Handle clear button (only for multi-select dropdowns)
        const clearButton = dropdownList.parentElement.querySelector('.clear-icon');
        if (clearButton) {
            clearButton.addEventListener('click', (event) => {
                event.stopPropagation();
                const buttons = dropdownList.querySelectorAll('.filter-button.selected');
                buttons.forEach(button => button.classList.remove('selected'));
                const dropdownHeader = dropdownList.previousElementSibling;
                const selectionBadge = dropdownHeader.querySelector('.selection-badge');
                updateSelectionBadge([], selectionBadge);
                clearButton.classList.remove('visible');
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
        // Close other dropdowns
        const allDropdownLists = document.querySelectorAll('.dropdown-list.show');
        allDropdownLists.forEach(list => {
            list.classList.remove('show');
            list.previousElementSibling.setAttribute('aria-expanded', 'false');
        });
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
        badgeElement.style.display = 'inline-block';
    } else {
        badgeElement.textContent = '';
        badgeElement.classList.remove('visible');
        badgeElement.style.display = 'none';
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

/**
 * Function to update filters based on selected criteria and search query
 * @param {number} page - The current page number for pagination
 */
export function updateFilters(page = 1) {
    console.log("updateFilters called");

    const selectedYears = getSelectedValues('year-dropdown-list');
    const selectedGenres = getSelectedValues('genre-dropdown-list');
    const selectedCountries = getSelectedValues('country-dropdown-list');
    const selectedStandorte = getSelectedValues('standort-dropdown-list');
    const selectedMedia = getSelectedValues('medium-dropdown-list');
    const selectedSortBy = getSelectedValues('sort-dropdown-list').length > 0 
        ? getSelectedValues('sort-dropdown-list') 
        : ["Zufall"];

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

    // Show the progress indicator before starting the fetch
    showProgressIndicator();

    fetch(`/filter_movies?${params.toString()}`)
        .then(response => response.json())
        .then(data => {
            console.log("API Response Data:", data);
            const { years, genres, countries, standorte, media, sort_options, movies, current_page, total_pages } = data;
            // Populate dropdowns based on the filtered data
            populateDropdown('year-dropdown-list', years, selectedYears);
            populateDropdown('genre-dropdown-list', genres, selectedGenres);
            populateDropdown('country-dropdown-list', countries, selectedCountries);
            populateDropdown('standort-dropdown-list', standorte, selectedStandorte);
            populateDropdown('medium-dropdown-list', media, selectedMedia);
            populateDropdown('sort-dropdown-list', sort_options, selectedSortBy, true, false);

            updateMovieListings(movies);
            updatePagination(current_page, total_pages);
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

    if (searchQuery.length >= 3) {
        fetch(`/autocomplete?query=${encodeURIComponent(searchQuery)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                showAutocompleteSuggestions(data);
            })
            .catch(error => {
                console.error('Error fetching autocomplete suggestions:', error);
                hideAutocompleteSuggestions();
            });
    } else {
        hideAutocompleteSuggestions();
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
        searchBox.parentNode.appendChild(autocompleteList);
    }

    autocompleteList.innerHTML = '';

    suggestions.forEach(item => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'autocomplete-item';
        suggestionItem.textContent = `${item.name} (${item.type})`;
        suggestionItem.dataset.name = item.name;
        suggestionItem.dataset.type = item.type;

        suggestionItem.addEventListener('click', () => {
            searchBox.value = item.name;
            hideAutocompleteSuggestions();
            triggerDropdownChangeEvent();
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

    // For "sort-dropdown-list", implement ascending and descending options
    if (dropdownListId === 'sort-dropdown-list') {
        const extendedOptionsArray = [];
        optionsArray.forEach(option => {
            extendedOptionsArray.push({ label: `${option.label} (aufsteigend)`, value: `${option.label}_asc` });
            extendedOptionsArray.push({ label: `${option.label} (absteigend)`, value: `${option.label}_desc` });
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
            button.textContent = `${option.label} (${option.count})`;
        } else {
            button.textContent = option.label;
        }

        button.dataset.value = option.value || option.label;

        if (selectedValues.includes(option.value || option.label)) {
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

    // For single-select dropdowns, ensure "Zufall" is selected by default if no selection has been made
    if (singleSelect && selectedValuesUpdated.length === 0 && buttonsContainer.firstChild) {
        const defaultOption = optionsArray.find(option => option.label.toLowerCase().includes('zufall'));
        if (defaultOption) {
            const defaultButton = buttonsContainer.querySelector(`.filter-button[data-value="${defaultOption.value || defaultOption.label}"]`);
            if (defaultButton) {
                defaultButton.classList.add('selected');
                selectedValuesUpdated.push(defaultOption.value || defaultOption.label);
            }
        } else {
            buttonsContainer.firstChild.classList.add('selected');
            selectedValuesUpdated.push(buttonsContainer.firstChild.dataset.value);
        }
    }

    updateSelectionBadge(selectedValuesUpdated, selectionBadge);

    // Hide clear icon for single-select dropdowns
    const dropdownHeader = parentDropdown.querySelector('.dropdown-header');
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
