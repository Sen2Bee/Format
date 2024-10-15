// File: static/js/filter.js

// Import necessary elements and functions
import {
    searchBox,
    clearSearchBtn,
    toggleFiltersButton,
    searchDropdownContainer,
    clearAllFiltersButton,
    showAllResultsButton,
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
            } else {
                mainFiltersContainer.classList.remove('shrink');
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
    filterButtons.forEach(button => button.classList.remove('selected')); // Remove 'selected' class from all buttons

    // Reset include/exclude toggles
    const includeExcludeCheckboxes = document.querySelectorAll('.include-exclude-checkbox');
    includeExcludeCheckboxes.forEach(checkbox => {
        checkbox.checked = true; // Reset all checkboxes to 'include'
    });

    // Hide clear icons (except for single-select dropdowns, which have no clear icons)
    const clearIcons = document.querySelectorAll('.clear-icon');
    clearIcons.forEach(icon => {
        icon.classList.remove('visible'); // Hide all clear icons
    });

    // Reset and hide selection badges
    const selectionBadges = document.querySelectorAll('.selection-badge');
    selectionBadges.forEach(badge => {
        badge.textContent = ''; // Clear the text in the badges
        badge.classList.remove('visible'); // Hide the badges
    });

    // For single-select dropdowns, ensure "Zufall" is selected by default if applicable
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

    // Trigger a filter update by dispatching the dropdownChange event
    triggerDropdownChangeEvent();
}

/**
 * Initialize event listeners for action buttons like "Clear All" and "Show All Results"
 */
export function initializeFilterActionButtons() {
    // Attach event listener to "Clear All" button
    if (clearAllFiltersButton) {
        clearAllFiltersButton.addEventListener('click', () => {
            clearAllFilters(); // Call clearAllFilters function
            // No need to call updateFilters here since clearAllFilters triggers the event
        });
    }

    // Attach event listener to "Show All Results" button
    if (showAllResultsButton) {
        showAllResultsButton.addEventListener('click', () => {
            clearAllFilters(); // Call clearAllFilters function to clear the filters
            if (searchBox) {
                searchBox.value = ''; // Clear the search box
            }
            // No need to call updateFilters here since clearAllFilters triggers the event
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
            if (searchBox.value.length > 3) {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    triggerDropdownChangeEvent(); // Trigger filter update after user stops typing for 1000ms
                    handleAutocomplete(); // Handle autocomplete for cast and director
                }, 1000);
            }
        });
    } else {
        console.error("initializeFilterDropdowns: searchBox element not found.");
    }

    // Clear search box and trigger update
    if (clearSearchBtn && searchBox) { // Ensure both elements exist
        clearSearchBtn.addEventListener('click', () => {
            searchBox.value = '';
            clearSearchBtn.classList.remove('visible');
            triggerDropdownChangeEvent(); // Trigger filter update
            hideAutocompleteSuggestions(); // Hide autocomplete suggestions
        });
    } else {
        console.error("initializeFilterDropdowns: clearSearchBtn or searchBox element not found.");
    }

    // Attach event listeners to dropdowns using event delegation
    attachDropdownEventDelegation();

    // Attach event listeners to include/exclude checkboxes
    const includeExcludeCheckboxes = document.querySelectorAll('.include-exclude-checkbox');
    includeExcludeCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            triggerDropdownChangeEvent(); // Trigger filter update when include/exclude toggles change
        });
    });    

    // Initial filter update by dispatching the dropdownChange event
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
        badgeElement.style.display = 'inline-block'; // Show the badge
    } else {
        badgeElement.textContent = '';
        badgeElement.classList.remove('visible');
        badgeElement.style.display = 'none'; // Hide the badge
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
    // Get selected values from advanced filters
    const selectedStandorte = getSelectedValues('standort-dropdown-list');
    const selectedMedia = getSelectedValues('medium-dropdown-list');
    const selectedSortBy = getSelectedValues('sort-dropdown-list').length > 0 
    ? getSelectedValues('sort-dropdown-list') 
    : ["Zufall"];



    const searchQuery = searchBox ? searchBox.value.trim() : '';

    const params = new URLSearchParams();
    if (selectedYears.length) {
        params.append('years', selectedYears.join(','));
        params.append('years_include', '1'); // Fixed to always include
    }
    if (selectedGenres.length) {
        params.append('genres', selectedGenres.join(','));
        // params.append('genres_include', genreInclude ? '1' : '0');
    }
    if (selectedCountries.length) {
        params.append('countries', selectedCountries.join(','));
        // params.append('countries_include', countryInclude ? '1' : '0');
    }
    if (selectedStandorte.length) {
        params.append('standorte', selectedStandorte.join(','));
    }
    if (selectedMedia.length) {
        params.append('media', selectedMedia.join(','));
    }
    if (selectedSortBy.length) {
        params.append('sort_by', selectedSortBy[0]); // Only one sort option should be selected
    }

    // Search logic: apply filters and shrink dropdowns based on search query
    if (searchQuery.length > 3) {
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
            // Populate dropdowns based on the filtered data from search query
            populateDropdown('year-dropdown-list', years, selectedYears);
            populateDropdown('genre-dropdown-list', genres, selectedGenres);
            populateDropdown('country-dropdown-list', countries, selectedCountries);
            populateDropdown('standort-dropdown-list', standorte, selectedStandorte);
            populateDropdown('medium-dropdown-list', media, selectedMedia);
            populateDropdown('sort-dropdown-list', sort_options, selectedSortBy, true, false); // Single-select, no counts

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

    autocompleteList.innerHTML = ''; // Clear existing suggestions

    suggestions.forEach(item => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'autocomplete-item';
        suggestionItem.textContent = `${item.name} (${item.type})`;
        suggestionItem.dataset.name = item.name;
        suggestionItem.dataset.type = item.type;

        suggestionItem.addEventListener('click', () => {
            searchBox.value = item.name;
            hideAutocompleteSuggestions();
            triggerDropdownChangeEvent(); // Trigger filter update after selecting autocomplete suggestion
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

    dropdownList.innerHTML = ""; // Clear existing options

    // Add 'single-select' class if applicable
    if (singleSelect) {
        dropdownList.classList.add('single-select');
    } else {
        dropdownList.classList.remove('single-select');
    }

    let optionsArray = [];

    if (typeof options === 'object' && !Array.isArray(options)) {
        // Convert object to array of { label, count }
        optionsArray = Object.entries(options).map(([label, count]) => ({ label, count }));
    } else if (Array.isArray(options)) {
        // Convert array to array of { label }
        optionsArray = options.map(label => ({ label }));
    } else {
        console.error(`populateDropdown: 'options' should be an object or array. Received:`, options);
        return;
    }

    // Conditionally sort the options alphabetically, but skip sorting for "sort-dropdown-list"
    if (dropdownListId !== 'sort-dropdown-list') {
        optionsArray.sort((a, b) => a.label.localeCompare(b.label));
    }

    // Create a container for the filter buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'filter-buttons-container';

    // Render buttons
    optionsArray.forEach(option => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "filter-button";

        // Show either label with count or just label depending on `showCounts` flag
        if (showCounts && option.count !== undefined) {
            button.textContent = `${option.label} (${option.count})`;
        } else {
            button.textContent = option.label;
        }

        // Store the value as the dataset value (can be the label or actual value for sorting)
        button.dataset.value = option.label;

        if (selectedValues.includes(option.label)) {
            button.classList.add('selected');
        }

        // Note: We no longer attach per-button event listeners here
        // Event handling is done via event delegation in attachDropdownEventDelegation()

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
        const defaultOption = optionsArray.find(option => option.label.toLowerCase() === 'zufall');
        if (defaultOption) {
            const defaultButton = buttonsContainer.querySelector(`.filter-button[data-value="${defaultOption.label}"]`);
            if (defaultButton) {
                defaultButton.classList.add('selected');
                selectedValuesUpdated.push(defaultOption.label);
            }
        } else {
            buttonsContainer.firstChild.classList.add('selected');
            selectedValuesUpdated.push(buttonsContainer.firstChild.dataset.value);
        }
    }

    updateSelectionBadge(selectedValuesUpdated, selectionBadge);

    // Hide clear icon for single-select dropdowns like "Sort By"
    const dropdownHeader = parentDropdown.querySelector('.dropdown-header');
    const clearButton = dropdownHeader.querySelector('.clear-icon');
    if (singleSelect) {
        if (clearButton) {
            clearButton.style.display = 'none';
        }
    } else {
        if (clearButton) {
            clearButton.style.display = ''; // Reset display property
        }
    }
}
