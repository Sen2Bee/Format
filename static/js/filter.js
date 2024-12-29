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

    // For single-select dropdowns, ensure "Random" (Zufall) or first option is selected
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

    // Trigger a filter update after everything is cleared
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
 * Main initialization for filter dropdowns and search box
 */
export function initializeFilterDropdowns() {
    // Handle filter updates triggered by our custom 'dropdownChange' event
    document.addEventListener('dropdownChange', () => {
        updateFilters();
    });

    // Search box input event with debouncing
    if (searchBox) {
        searchBox.addEventListener('input', () => {
            // Show/hide clear icon based on current text
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

// In filter.js
if (clearSearchBtn && searchBox) {
    clearSearchBtn.addEventListener('click', () => {
      // 1) Empty the search box
      searchBox.value = '';
  
      // 2) Hide the clear icon itself
      clearSearchBtn.classList.remove('visible');
  
      // 3) Hide any open autocomplete suggestions
      hideAutocompleteSuggestions();
  
      // 4) Trigger an update, which calls updateFilters(),
      //    and inside updateFilters() we call showProgressIndicator().
      triggerDropdownChangeEvent();
    });
  }
  

    // Attach event listeners to dropdowns using event delegation
    attachDropdownEventDelegation();

    // Initialize filter navigation arrows
    initializeFilterNavigationArrows();

    // Trigger initial filter update on page load
    triggerDropdownChangeEvent();
}

/**
 * Attach event listeners to dropdowns (header + options)
 */
export function attachDropdownEventDelegation() {
    const dropdownHeaders = document.querySelectorAll('.dropdown-header');
    const dropdownLists = document.querySelectorAll('.dropdown-list');

    // Helper to open/close the dropdown
    function toggleDropdown(targetDropdown, header) {
        const isVisible = targetDropdown.classList.contains('show');
        if (isVisible) {
            targetDropdown.classList.remove('show');
            header.setAttribute('aria-expanded', 'false');
        } else {
            // Close other open dropdowns
            document.querySelectorAll('.dropdown-list.show').forEach(list => {
                list.classList.remove('show');
                document.querySelector(`.dropdown-header[data-target="${list.id}"]`)
                    ?.setAttribute('aria-expanded', 'false');
            });
            targetDropdown.classList.add('show');
            header.setAttribute('aria-expanded', 'true');
        }
    }

    // Handle selection of dropdown items
    function handleDropdownSelection(dropdownList, target) {
        const isSingleSelect = dropdownList.classList.contains('single-select');
        const dropdownHeader = document.querySelector(`.dropdown-header[data-target="${dropdownList.id}"]`);
        const selectionBadge = dropdownHeader.querySelector('.selection-badge');
        const clearButton = dropdownHeader.querySelector('.clear-icon');

        // Single-select vs. multi-select
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

        // Update the clear button's visibility
        if (isSingleSelect) {
            if (clearButton) clearButton.style.display = 'none';
        } else {
            if (selectedValues.length > 0) {
                clearButton.classList.add('visible');
            } else {
                clearButton.classList.remove('visible');
            }
        }

        // **Trigger** the search/filter update only after a selection
        triggerDropdownChangeEvent();
    }

    // Handle clearing of dropdown selections
    function clearDropdownSelection(dropdownList) {
        const dropdownHeader = document.querySelector(`.dropdown-header[data-target="${dropdownList.id}"]`);
        const selectionBadge = dropdownHeader.querySelector('.selection-badge');
        const clearButton = dropdownHeader.querySelector('.clear-icon');

        // Deselect all
        dropdownList.querySelectorAll('.filter-button.selected')
                   .forEach(button => button.classList.remove('selected'));

        // Clear badge & hide clear icon
        updateSelectionBadge([], selectionBadge, dropdownList.id);
        if (clearButton) clearButton.classList.remove('visible');

        // Trigger the update after clearing
        triggerDropdownChangeEvent();
    }

    // 1) Dropdown header click: ONLY toggles open/close (no search triggered here)
    dropdownHeaders.forEach(header => {
        header.addEventListener('click', (event) => {
            event.stopPropagation();
            const targetDropdownId = header.getAttribute('data-target');
            const targetDropdown = document.getElementById(targetDropdownId);
            toggleDropdown(targetDropdown, header);
        });

        // Keyboard accessibility (Space/Enter)
        header.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                const targetDropdownId = header.getAttribute('data-target');
                const targetDropdown = document.getElementById(targetDropdownId);
                toggleDropdown(targetDropdown, header);
            }
        });
    });

    // 2) Filter-button clicks inside the dropdown
    dropdownLists.forEach(dropdownList => {
        dropdownList.addEventListener('click', (event) => {
            const target = event.target;
            if (target && target.classList.contains('filter-button')) {
                event.preventDefault();
                handleDropdownSelection(dropdownList, target);
            }
        });

        // 3) Clear button (for multi-select only)
        const dropdownHeader = document.querySelector(`.dropdown-header[data-target="${dropdownList.id}"]`);
        const clearButton = dropdownHeader?.querySelector('.clear-icon');

        if (clearButton) {
            clearButton.addEventListener('click', (event) => {
                event.stopPropagation();
                clearDropdownSelection(dropdownList);
            });

            // Keyboard accessibility for the clear button
            clearButton.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    clearDropdownSelection(dropdownList);
                }
            });
        }
    });

    // 4) Close dropdowns when clicking outside
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
 * @param {Array} selectedValues - The selected filter values
 * @param {HTMLElement} badgeElement - Badge to display selected items
 * @param {string} dropdownListId - ID of the dropdown list
 */
export function updateSelectionBadge(selectedValues, badgeElement, dropdownListId) {
    if (!badgeElement) return;

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
 * Checks if any selections exist to enable/disable "Clear All" button
 */
function checkSelections() {
    const selectedButtons = document.querySelectorAll('.dropdown-list .filter-button.selected');
    if (selectedButtons.length > 0) {
        clearAllFiltersButton.removeAttribute('disabled');
    } else {
        clearAllFiltersButton.setAttribute('disabled', 'true');
    }
}

/**
 * Helper to get selected values from a dropdown list by ID
 */
export function getSelectedValues(dropdownListId) {
    const buttons = document.querySelectorAll(`#${dropdownListId} .filter-button.selected`);
    return Array.from(buttons).map(btn => btn.dataset.value);
}

/**
 * Autocomplete for cast/director names
 */
function handleAutocomplete() {
    const searchQuery = searchBox.value.trim();

    if (searchQuery.length >= AUTOCOMPLETE_MIN_DIGITS) {
        showProgressIndicator(); // Show loading spinner

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
            })
            .finally(() => {
                hideProgressIndicator();
            });
    } else {
        hideAutocompleteSuggestions();
    }
}

/**
 * Show autocomplete suggestions
 * (Updated to ensure only one result per unique person name)
 */
function showAutocompleteSuggestions(suggestions) {
    // Deduplicate by 'name'
    const deduplicatedMap = new Map();
    suggestions.forEach(item => {
        // If the name is not in the map yet, set it
        if (!deduplicatedMap.has(item.name)) {
            deduplicatedMap.set(item.name, item);
        }
    });
    // Convert map back to an array
    const uniqueSuggestions = Array.from(deduplicatedMap.values());

    let autocompleteList = document.getElementById('autocomplete-list');
    if (!autocompleteList) {
        autocompleteList = document.createElement('div');
        autocompleteList.id = 'autocomplete-list';
        autocompleteList.className = 'autocomplete-items';
        document.body.appendChild(autocompleteList);
    }

    // Position it below the search box
    const searchBoxRect = searchBox.getBoundingClientRect();
    autocompleteList.style.position = 'absolute';
    autocompleteList.style.top = `${searchBoxRect.bottom + window.scrollY}px`;
    autocompleteList.style.left = `${searchBoxRect.left + window.scrollX}px`;
    autocompleteList.style.width = `${searchBoxRect.width}px`;
    autocompleteList.style.zIndex = '10000';

    autocompleteList.innerHTML = '';

    uniqueSuggestions.forEach(item => {
        const suggestionItem = document.createElement('div');
        suggestionItem.className = 'autocomplete-item';
        // item.type is optional; you can remove if not needed
        suggestionItem.innerHTML = `<strong>${item.name}</strong> <small>(${item.type})</small>`;
        suggestionItem.dataset.name = item.name;
        suggestionItem.dataset.type = item.type;

        // On click, fill searchBox & trigger search
        suggestionItem.addEventListener('click', () => {
            searchBox.value = item.name;
            hideAutocompleteSuggestions();
            triggerDropdownChangeEvent();
        });

        autocompleteList.appendChild(suggestionItem);
    });
}

/**
 * Hide autocomplete suggestions
 */
function hideAutocompleteSuggestions() {
    const autocompleteList = document.getElementById('autocomplete-list');
    if (autocompleteList) {
        autocompleteList.parentNode.removeChild(autocompleteList);
    }
    hideProgressIndicator();
}

/**
 * Populate a dropdown list (years, genres, countries, etc.)
 */
export function populateDropdown(dropdownListId, options, selectedValues = [], singleSelect = false, showCounts = true) {
    const dropdownList = document.getElementById(dropdownListId);
    if (!dropdownList) {
        console.error(`populateDropdown: Element with ID '${dropdownListId}' not found.`);
        return;
    }

    dropdownList.innerHTML = "";

    // single-select logic
    if (singleSelect) {
        dropdownList.classList.add('single-select');
    } else {
        dropdownList.classList.remove('single-select');
    }

    let optionsArray = [];

    if (typeof options === 'object' && !Array.isArray(options)) {
        // options is an object => { label: count }
        optionsArray = Object.entries(options).map(([label, count]) => ({ label, count }));
    } else if (Array.isArray(options)) {
        // array => [label1, label2, ...]
        optionsArray = options.map(label => ({ label }));
    } else {
        console.error(`populateDropdown: 'options' should be an object or array. Received:`, options);
        return;
    }

    // Sort except for 'sort-dropdown-list'
    if (dropdownListId !== 'sort-dropdown-list') {
        optionsArray.sort((a, b) => a.label.localeCompare(b.label));
    }

    // Special case: "sort-dropdown-list"
    if (dropdownListId === 'sort-dropdown-list') {
        const extendedOptionsArray = [];
        optionsArray.forEach(option => {
            if (option.label.toLowerCase() === 'zufall') {
                // "Random" (Zufall) w/o icons
                extendedOptionsArray.push({
                    label: option.label,
                    value: option.label
                });
            } else {
                // ascending or descending icons
                extendedOptionsArray.push({
                    value: option.label,
                    label: option.label.includes("asc")
                        ? `${option.label} <i class="fa fa-sort-amount-up"></i>`
                        : `${option.label} <i class="fa fa-sort-amount-down"></i>`,
                });
            }
        });
        optionsArray = extendedOptionsArray;
    }

    // Create container for the filter buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'filter-buttons-container';

    // Build each filter button
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

    // Update the Selection Badge
    const dropdownHeader = document.querySelector(`.dropdown-header[data-target="${dropdownListId}"]`);
    const selectionBadge = dropdownHeader.querySelector('.selection-badge');
    const selectedButtons = dropdownList.querySelectorAll('.filter-button.selected');
    const updatedSelectedValues = Array.from(selectedButtons).map(btn => btn.dataset.value);
    updateSelectionBadge(updatedSelectedValues, selectionBadge, dropdownList.id);

    // Hide clear icon if single-select
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
 * Update filters (triggers a fetch for updated movie data) based on selected criteria
 */
export function updateFilters(page = 1) {
    const selectedYears = getSelectedValues('year-dropdown-list');
    const selectedGenres = getSelectedValues('genre-dropdown-list');
    const selectedCountries = getSelectedValues('country-dropdown-list');
    const selectedStandorte = getSelectedValues('standort-dropdown-list');
    const selectedMedia = getSelectedValues('medium-dropdown-list');
    const selectedSortByValues = getSelectedValues('sort-dropdown-list');
    const selectedSortBy = selectedSortByValues.length > 0 ? selectedSortByValues : ["Zufall"]; // default: 'Zufall'

    // Search query from the box
    const searchQuery = searchBox ? searchBox.value.trim() : '';

    // Build URL params
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

    // Include search query
    if (searchQuery.length > 0) {
        params.append('search', searchQuery);
    }

    // Pagination
    params.append('page', page);

    // Show progress indicator
    showProgressIndicator();

    fetch(`/filter_movies?${params.toString()}`)
        .then(response => response.json())
        .then(data => {
            const { years, genres, countries, standorte, media, sort_options, movies, current_page, total_pages, total_movies } = data;

            // Re-populate the dropdowns with updated filters
            populateDropdown('year-dropdown-list', years, selectedYears);
            populateDropdown('genre-dropdown-list', genres, selectedGenres);
            populateDropdown('country-dropdown-list', countries, selectedCountries);
            populateDropdown('standort-dropdown-list', standorte, selectedStandorte);
            populateDropdown('medium-dropdown-list', media, selectedMedia);
            populateDropdown('sort-dropdown-list', sort_options, selectedSortBy, true, false);

            // Render the movies
            updateMovieListings(movies);

            // Determine columns for layout based on total_movies
            let columnsPerRow = 1;
            if (total_movies > 100) {
                columnsPerRow = 5;
            } else if (total_movies > 60) {
                columnsPerRow = 4;
            } else if (total_movies > 20) {
                columnsPerRow = 3;
            }

            setGridLayout(columnsPerRow);

            // Update pagination
            updatePagination(current_page, total_pages, total_movies, columnsPerRow);

            // Update headline (e.g., "Genres: x | Years: y ... ")
            updateHeadline(
                selectedGenres,
                selectedYears,
                selectedCountries,
                selectedStandorte,
                selectedMedia,
                selectedSortByValues,
                searchQuery,
                total_movies
            );
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
 * Dynamically apply grid layout based on the number of columns
 */
function setGridLayout(columns) {
    if (!movieContainer) return;

    // Remove any existing column classes
    movieContainer.classList.remove('columns-1', 'columns-3', 'columns-4', 'columns-5');

    // Add the appropriate class
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
    }
}

/**
 * Initialize filter navigation (scrolling with arrows)
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
 * Check if the container is scrolled to the ends and hide/show arrows
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
 * Dispatch a 'dropdownChange' event so updateFilters() will be called
 */
export function triggerDropdownChangeEvent() {
    const event = new CustomEvent('dropdownChange');
    console.log("Dispatching dropdownChange event");
    document.dispatchEvent(event);
}

/**
 * Update headline text (e.g., "Auswahl: ...") with selected filters
 */
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
    const headlineElement = document.querySelector('.view-toggle-title');
    if (!headlineElement) {
        console.error('Element with class .view-toggle-title not found');
        return;
    }
    // Clear previous content
    headlineElement.innerHTML = '';

    // Helper: add text with icon and optional separator
    const appendTextWithIcon = (iconClass, text) => {
        const span = document.createElement('span');
        const icon = document.createElement('i');
        icon.className = iconClass;
        span.appendChild(icon);
        span.innerHTML += ` ${text}`;
        if (headlineElement.innerHTML) {
            headlineElement.innerHTML += ' | ';
        }
        headlineElement.appendChild(span);
    };

    // Search query
    if (searchQuery) {
        appendTextWithIcon('fa fa-search', searchQuery);
    }

    // Genres
    if (selectedGenres.length > 0) {
        appendTextWithIcon('fa fa-film', selectedGenres.join(', '));
    }

    // Years
    if (selectedYears.length > 0) {
        appendTextWithIcon('fa fa-calendar-alt', selectedYears.join(', '));
    }

    // Countries
    if (selectedCountries.length > 0) {
        appendTextWithIcon('fa fa-globe', selectedCountries.join(', '));
    }

    // Standort
    if (selectedStandorte.length > 0) {
        appendTextWithIcon('fa fa-map-marker-alt', selectedStandorte.join(', '));
    }

    // Media
    if (selectedMedia.length > 0) {
        appendTextWithIcon('fa fa-compact-disc', selectedMedia.join(', '));
    }

    // Sort Options
    if (selectedSortByValues.length > 0) {
        appendTextWithIcon('fa fa-sort', selectedSortByValues.join(', '));
    }

    // Movie count
    if (total_movies !== undefined && total_movies > 0) {
        const formattedTotal = total_movies.toLocaleString('de-DE');
        const label = (formattedTotal === '1') ? 'Film gefunden' : 'Filme gefunden';
        appendTextWithIcon('fa fa-film', `${formattedTotal} ${label}`);
    }

    // If nothing is selected & no results
    if (
        !searchQuery && 
        selectedGenres.length === 0 && 
        selectedYears.length === 0 && 
        selectedCountries.length === 0 && 
        selectedStandorte.length === 0 && 
        selectedMedia.length === 0 && 
        selectedSortByValues.length === 0 && 
        total_movies === 0
    ) {
        headlineElement.textContent = ''; // or "Keine Auswahl"
    }
}
