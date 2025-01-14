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
    filterButtons.forEach(button => {
        button.classList.remove('selected');
        button.disabled = false; // Re-enable if we previously disabled them
        button.classList.remove('used-up');
    });

    // Hide all clear icons if any
    const clearIcons = document.querySelectorAll('.clear-icon');
    clearIcons.forEach(icon => {
        icon.classList.remove('visible');
    });

    // If you had any "badge" elements to reset, do it here
    // e.g., .selection-badge or highlight on the dropdown header
    document.querySelectorAll('.dropdown-header.has-selection').forEach(header => {
        header.classList.remove('has-selection');
    });

    // For single-select dropdowns, re-select default if desired
    const singleSelectDropdowns = document.querySelectorAll('.dropdown-list.single-select');
    singleSelectDropdowns.forEach(dropdownList => {
        const buttonsContainer = dropdownList.querySelector('.filter-buttons-container');
        if (!buttonsContainer) return;
        const optionsArray = Array.from(buttonsContainer.children).map(btn => btn.dataset.value);
        // Example: look for 'Zufall' or default to first
        const defaultOption = optionsArray.find(label => label.toLowerCase() === 'zufall');
        const buttonToSelect = defaultOption
            ? buttonsContainer.querySelector(`.filter-button[data-value="${defaultOption}"]`)
            : buttonsContainer.firstElementChild;

        if (buttonToSelect) {
            buttonToSelect.classList.add('selected');
            buttonToSelect.disabled = false;
            buttonToSelect.classList.remove('used-up');
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

    // Clear icon click
    if (clearSearchBtn && searchBox) {
        clearSearchBtn.addEventListener('click', () => {
            // 1) Empty the search box
            searchBox.value = '';
            // 2) Hide the clear icon
            clearSearchBtn.classList.remove('visible');
            // 3) Hide autocomplete
            hideAutocompleteSuggestions();
            // 4) Trigger update
            triggerDropdownChangeEvent();
        });
    }

    // Attach event listeners to dropdowns using event delegation
    attachDropdownEventDelegation();

    // We no longer need arrow-based filter navigation => remove or comment out
    // triggerDropdownChangeEvent() on page load
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
                document
                    .querySelector(`.dropdown-header[data-target="${list.id}"]`)
                    ?.setAttribute('aria-expanded', 'false');
            });
            targetDropdown.classList.add('show');
            header.setAttribute('aria-expanded', 'true');
        }
    }

    // Handle selection of dropdown items
    function handleDropdownSelection(dropdownList, target) {
        const isSingleSelect = dropdownList.classList.contains('single-select');
        if (isSingleSelect) {
            dropdownList.querySelectorAll('.filter-button').forEach(btn => {
                btn.classList.remove('selected');
                btn.disabled = false;
                btn.classList.remove('used-up');
            });
            target.classList.add('selected');
        } else {
            target.classList.toggle('selected');
        }

        // Optionally disable the button if selected
        if (target.classList.contains('selected')) {
            target.disabled = true;
            target.classList.add('used-up'); // visually indicate it's used
        } else {
            target.disabled = false;
            target.classList.remove('used-up');
        }

        // Highlight the dropdown header if there's a selection
        const selectedValues = getSelectedValuesFromDOM(dropdownList);
        toggleHeaderHighlight(dropdownList, selectedValues);

        // Trigger an update
        triggerDropdownChangeEvent();
    }

    function getSelectedValuesFromDOM(dropdownList) {
        const selectedButtons = dropdownList.querySelectorAll('.filter-button.selected');
        return Array.from(selectedButtons).map(btn => btn.dataset.value);
    }

    // Clear all selected items in a dropdown (if you have a dedicated "clear" button)
    function clearDropdownSelection(dropdownList) {
        const selectedButtons = dropdownList.querySelectorAll('.filter-button.selected');
        selectedButtons.forEach(button => {
            button.classList.remove('selected');
            button.disabled = false;
            button.classList.remove('used-up');
        });

        const selectedValues = [];
        toggleHeaderHighlight(dropdownList, selectedValues);

        // Trigger an update after clearing
        triggerDropdownChangeEvent();
    }

    // 1) Dropdown header click: ONLY toggles open/close
    dropdownHeaders.forEach(header => {
        header.addEventListener('click', (event) => {
            event.stopPropagation();
            const targetDropdownId = header.getAttribute('data-target');
            const targetDropdown = document.getElementById(targetDropdownId);
            if (targetDropdown) {
                toggleDropdown(targetDropdown, header);
            }
        });

        // (Optional) Keyboard accessibility
        header.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                const targetDropdownId = header.getAttribute('data-target');
                const targetDropdown = document.getElementById(targetDropdownId);
                if (targetDropdown) {
                    toggleDropdown(targetDropdown, header);
                }
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

        // If you have a separate clear button inside the dropdown header
        const dropdownHeader = document.querySelector(`.dropdown-header[data-target="${dropdownList.id}"]`);
        const clearButton = dropdownHeader?.querySelector('.clear-icon');

        if (clearButton) {
            clearButton.addEventListener('click', (event) => {
                event.stopPropagation();
                clearDropdownSelection(dropdownList);
            });

            clearButton.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    clearDropdownSelection(dropdownList);
                }
            });
        }
    });

    // 3) Close dropdowns when clicking outside
    document.addEventListener('click', (event) => {
        dropdownLists.forEach(dropdownList => {
            const header = document.querySelector(`.dropdown-header[data-target="${dropdownList.id}"]`);
            if (header && !header.contains(event.target) && !dropdownList.contains(event.target)) {
                dropdownList.classList.remove('show');
                header.setAttribute('aria-expanded', 'false');
            }
        });
    });
}

/**
 * Highlights/unhighlights the dropdown header if there are selected values.
 */
function toggleHeaderHighlight(dropdownList, selectedValues) {
    const dropdownHeader = document.querySelector(`.dropdown-header[data-target="${dropdownList.id}"]`);
    if (!dropdownHeader) return;
    if (selectedValues.length > 0) {
        dropdownHeader.classList.add('has-selection');
    } else {
        dropdownHeader.classList.remove('has-selection');
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
 * Dispatch a 'dropdownChange' event so updateFilters() will be called
 */
export function triggerDropdownChangeEvent() {
    const event = new CustomEvent('dropdownChange');
    console.log("Dispatching dropdownChange event");
    document.dispatchEvent(event);
}

/**
 * Autocomplete for cast/director names
 */
function handleAutocomplete() {
    const query = searchBox.value.trim();
    if (query.length >= AUTOCOMPLETE_MIN_DIGITS) {
        showProgressIndicator();
        fetch(`/autocomplete?query=${encodeURIComponent(query)}`)
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
 */
function showAutocompleteSuggestions(suggestions) {
    const deduplicatedMap = new Map();
    suggestions.forEach(item => {
        if (!deduplicatedMap.has(item.name)) {
            deduplicatedMap.set(item.name, item);
        }
    });
    const uniqueSuggestions = Array.from(deduplicatedMap.values());

    let autocompleteList = document.getElementById('autocomplete-list');
    if (!autocompleteList) {
        autocompleteList = document.createElement('div');
        autocompleteList.id = 'autocomplete-list';
        autocompleteList.className = 'autocomplete-items';
        document.body.appendChild(autocompleteList);
    }

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
        suggestionItem.innerHTML = `<strong>${item.name}</strong> <small>(${item.type || ''})</small>`;
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

function hideAutocompleteSuggestions() {
    const list = document.getElementById('autocomplete-list');
    if (list) {
        list.remove();
    }
    hideProgressIndicator();
}

/**
 * Populate a dropdown list (years, genres, countries, etc.)
 * and highlight any pre-selected items if needed.
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
        // { label: count }
        optionsArray = Object.entries(options).map(([label, count]) => ({ label, count }));
    } else if (Array.isArray(options)) {
        // [label1, label2, ...]
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
                extendedOptionsArray.push({
                    label: option.label,
                    value: option.label
                });
            } else {
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
        const button = document.createElement('button');
        button.type = "button";
        button.className = "filter-button";

        // If showCounts is enabled, e.g. "Action (34)"
        if (showCounts && option.count !== undefined) {
            button.innerHTML = `${option.label} (${option.count})`;
        } else {
            button.innerHTML = option.label;
        }

        button.dataset.value = option.value || option.label;

        if (selectedValues.includes(option.value || option.label)) {
            button.classList.add('selected');
            // Optionally disable or mark it as used
            // button.disabled = true;
            // button.classList.add('used-up');
        }
        buttonsContainer.appendChild(button);
    });

    dropdownList.appendChild(buttonsContainer);

    // Highlight the dropdown header if any values are selected
    const selectedButtons = dropdownList.querySelectorAll('.filter-button.selected');
    const updatedSelectedValues = Array.from(selectedButtons).map(btn => btn.dataset.value);
    toggleHeaderHighlight(dropdownList, updatedSelectedValues);

    // Hide or show clear icon if single-select or multi-select
    const dropdownHeader = document.querySelector(`.dropdown-header[data-target="${dropdownListId}"]`);
    if (!dropdownHeader) return;
    const clearButton = dropdownHeader.querySelector('.clear-icon');
    if (singleSelect && clearButton) {
        clearButton.style.display = 'none';
    } else if (!singleSelect && clearButton) {
        clearButton.style.display = '';
    }
}

/**
 * Update filters (fetches updated movie data) based on selected criteria
 */
export function updateFilters(page = 1) {
    // 1) Check if there's a 'similar' param in the URL
    const currentUrlParams = new URLSearchParams(window.location.search);
    const similarId = currentUrlParams.get('similar');

    let requestUrl = "/filter_movies?";
    const finalParams = new URLSearchParams(); // We'll build the query here

    if (similarId) {
        console.log("similarId", similarId)
        // -- SIMILAR-MODE --
        finalParams.append('similar', similarId);
        finalParams.append('page', page);

        // After you've processed the similar parameter,
        // remove it from the URL so it won't be picked up on the next reload.
        const url = new URL(window.location.href);
        url.searchParams.delete('similar');
        window.history.replaceState({}, document.title, url);        
    } else {
        // -- NORMAL FILTER-MODE --
        const selectedYears = getSelectedValues('year-dropdown-list');
        const selectedGenres = getSelectedValues('genre-dropdown-list');
        const selectedCountries = getSelectedValues('country-dropdown-list');
        const selectedStandorte = getSelectedValues('standort-dropdown-list');
        const selectedMedia = getSelectedValues('medium-dropdown-list');
        const selectedSortByValues = getSelectedValues('sort-dropdown-list');
        const selectedSortBy = selectedSortByValues.length > 0 ? selectedSortByValues : ["Zufall"];

        const searchQuery = searchBox ? searchBox.value.trim() : '';

        // Build normal filter params
        if (selectedYears.length) finalParams.append('years', selectedYears.join(','));
        if (selectedGenres.length) finalParams.append('genres', selectedGenres.join(','));
        if (selectedCountries.length) finalParams.append('countries', selectedCountries.join(','));
        if (selectedStandorte.length) finalParams.append('standorte', selectedStandorte.join(','));
        if (selectedMedia.length) finalParams.append('media', selectedMedia.join(','));
        if (selectedSortBy.length) finalParams.append('sort_by', selectedSortBy[0]);
        if (searchQuery.length > 0) finalParams.append('search', searchQuery);
        finalParams.append('page', page);
    }

    showProgressIndicator();

    // 2) Actually fetch the data
    fetch(requestUrl + finalParams.toString())
        .then(response => response.json())
        .then(data => {
            // We handle normal or similar mode based on data.mode
            console.log("Filter response data:", data);

            // For normal filter, your JSON fields might be:
            // { mode: 'normal_filter', movies, current_page, total_pages, total_movies, ... }
            // For similar, your JSON might be:
            // { mode: 'similar_search', similar_id, movies, current_page, total_pages, total_movies, ... }

            if (data.mode === 'similar_search') {
                // 2A) Similar mode
                // No need to repopulate drop-downs for normal filters, etc.
                // Just update your listing, pagination, and .view-toggle-title to reflect "Ähnliche Filme"
                
                // Render the movies
                updateMovieListings(data.movies);

                // Update pagination
                updatePagination(
                    data.current_page,   // current
                    data.total_pages,    // total
                    data.total_movies,   // total item count
                    4                    // columnsPerRow (or read from data.columns_per_row if your server returns it)
                );

                // Update the headline to something like "Ähnliche Filme (XX)"
                const headlineElement = document.querySelector('.view-toggle-title');
                if (headlineElement) {
                    headlineElement.textContent = `Ähnliche Filme (${data.total_movies})`;
                }

            } else {
                // 2B) Normal filter mode
                const {
                    years,
                    genres,
                    countries,
                    standorte,
                    media,
                    sort_options,
                    movies,
                    current_page,
                    total_pages,
                    total_movies
                } = data;

                // Re-populate the dropdowns with updated filters
                // (only if your server is still returning them)
                populateDropdown('year-dropdown-list', years);
                populateDropdown('genre-dropdown-list', genres);
                populateDropdown('country-dropdown-list', countries);
                populateDropdown('standort-dropdown-list', standorte);
                populateDropdown('medium-dropdown-list', media);
                populateDropdown('sort-dropdown-list', sort_options, [], true, false);

                // Render the movies
                updateMovieListings(movies);

                // Basic columns logic
                let columnsPerRow = 1;
                if (total_movies > 100) columnsPerRow = 5;
                else if (total_movies > 60) columnsPerRow = 4;
                else if (total_movies > 20) columnsPerRow = 3;

                setGridLayout(columnsPerRow);

                // Update pagination
                updatePagination(current_page, total_pages, total_movies, columnsPerRow);

                // Update the normal "view-toggle-title" with filters
                // We might do your updateHeadline(...) call here
                // If you want to keep it:
                updateHeadline(
                    getSelectedValues('genre-dropdown-list'),
                    getSelectedValues('year-dropdown-list'),
                    getSelectedValues('country-dropdown-list'),
                    getSelectedValues('standort-dropdown-list'),
                    getSelectedValues('medium-dropdown-list'),
                    getSelectedValues('sort-dropdown-list'),
                    searchBox ? searchBox.value.trim() : '',
                    total_movies
                );
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
 * Dynamically apply grid layout based on the number of columns
 */
function setGridLayout(columns) {
    if (!movieContainer) return;
    movieContainer.classList.remove('columns-1', 'columns-3', 'columns-4', 'columns-5');
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
 * Update the "view-toggle-title" with selected filters
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
    headlineElement.innerHTML = '';

    // Helper to add text + icon
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
    // Genre
    if (selectedGenres.length > 0) {
        appendTextWithIcon('fa fa-theater-masks', selectedGenres.join(', '));
    }
    // Years
    if (selectedYears.length > 0) {
        appendTextWithIcon('fas fa-hourglass-half', selectedYears.join(', '));
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
    // Sort
    if (selectedSortByValues.length > 0) {
        appendTextWithIcon('fa fa-sort', selectedSortByValues.join(', '));
    }
    // Movie count
    if (total_movies !== undefined && total_movies > 0) {
        const formattedTotal = total_movies.toLocaleString('de-DE');
        const label = ''; // e.g. 'Filme gefunden'
        appendTextWithIcon('fa fa-film', `${formattedTotal} ${label}`);
    }
}

