document.addEventListener('DOMContentLoaded', function () {
    console.log("Custom Dropdowns: DOM fully loaded");
    initializeCustomDropdowns(); // Initialize custom dropdowns when DOM is loaded
    initializeSearchBox();
});

// Function to initialize the search box clear button and its behavior
function initializeSearchBox() {
    const searchBox = document.getElementById('search-box');
    const clearSearchButton = document.getElementById('clear-search');

    if (!searchBox || !clearSearchButton) {
        console.error("Search box or clear button not found.");
        return;
    }

    console.log("Initializing search box listeners...");
    
    // Show/hide the clear button based on input value
    searchBox.addEventListener('input', () => {
        if (searchBox.value.length > 0) {
            clearSearchButton.style.visibility = 'visible';  // Show the clear button
        } else {
            clearSearchButton.style.visibility = 'hidden';   // Hide the clear button
        }
    });

    // Clear the search box when the clear button is clicked
    clearSearchButton.addEventListener('click', () => {
        searchBox.value = '';
        clearSearchButton.style.visibility = 'hidden';
        console.log("Search box cleared.");
        // Optionally trigger any search box reset logic here
    });

    console.log("Search box listeners attached successfully.");
}

// Stellen Sie sicher, dass beim Initialisieren der Dropdowns das Selection Badge ebenfalls aktualisiert wird
function initializeCustomDropdowns() {
    console.log("Initializing Custom Dropdowns...");

    // Retrieve the custom dropdown elements by their header and list classes
    const dropdownHeaders = document.querySelectorAll('.dropdown-header');
    const dropdownLists = document.querySelectorAll('.dropdown-list');
    const clearButtons = document.querySelectorAll('.clear-icon');

    // Check if all required elements are present
    if (dropdownHeaders.length !== dropdownLists.length) {
        console.error("Mismatch in dropdown elements. Headers, lists, or clear buttons are not matching in count.");
        console.log("Headers found: ", dropdownHeaders.length);
        console.log("Dropdown lists found: ", dropdownLists.length);
        console.log("Clear buttons found: ", clearButtons.length);
        return; // Exit initialization if element counts don't match
    }

    console.log("Attaching event listeners to custom dropdowns...");
    // Attach event listeners for each dropdown and clear button
    dropdownHeaders.forEach((header, index) => {
        const dropdownList = dropdownLists[index];
        const clearButton = header.querySelector('.clear-icon');
        const countElement = header.querySelector('.selected-count');
        const badgeElement = header.querySelector('.selection-badge');

        // Initial Update
        updateSelectedCount(dropdownList, countElement, clearButton);

        attachDropdownListeners(header, dropdownList, clearButton);
    });
}
// Function to attach listeners to dropdown header, checkboxes, and clear button
/**
 * Function to attach event listeners to dropdown headers and clear buttons
 */
function attachDropdownListeners() {
    const dropdownHeaders = document.querySelectorAll('.dropdown-header');

    dropdownHeaders.forEach(header => {
        const dropdownList = header.nextElementSibling; // Assumes .dropdown-list follows .dropdown-header
        const clearButton = header.querySelector('.clear-icon');
        const selectedCount = header.querySelector('.selected-count');

        if (!dropdownList) {
            console.error("attachDropdownEventListeners: Dropdown list not found for a header.");
            return;
        }

        if (!selectedCount) {
            console.error("attachDropdownEventListeners: Selected count element not found in a header.");
            return;
        }

        // Toggle dropdown visibility on header click
        header.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent event from bubbling up
            toggleDropdown(dropdownList, header);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (!header.contains(event.target) && !dropdownList.contains(event.target)) {
                dropdownList.classList.remove('show');
                header.setAttribute('aria-expanded', 'false');
            }
        });

        // Clear all selections when the clear button is clicked
        clearButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent header dropdown toggle
            const checkboxes = dropdownList.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => (checkbox.checked = false)); // Uncheck all boxes
            updateSelectedCount(checkboxes, selectedCount, clearButton); // Update selection count
            triggerDropdownChangeEvent();  // Trigger a custom change event to update filters
        });
    });

    // Attach a single event listener for all dropdown lists (event delegation)
    const dropdownLists = document.querySelectorAll('.dropdown-list');
    dropdownLists.forEach(list => {
        list.addEventListener('change', (event) => {
            if (event.target && event.target.matches('input[type="checkbox"]')) {
                const dropdownList = event.currentTarget;
                const header = dropdownList.previousElementSibling; // Assumes .dropdown-header precedes .dropdown-list
                const selectedCount = header.querySelector('.selected-count');
                const clearButton = header.querySelector('.clear-icon');
                updateSelectedCount(dropdownList.querySelectorAll('input[type="checkbox"]'), selectedCount, clearButton);
                triggerDropdownChangeEvent();
            }
        });
    });
}


// Function to attach checkbox listeners
function attachCheckboxListeners(dropdownList, selectedCount, clearButton) {
    const checkboxes = dropdownList.querySelectorAll('input[type="checkbox"]');
    console.log(`Attaching checkbox listeners to ${dropdownList.id}...`);
    console.log("Checkboxes found:", checkboxes.length);

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            console.log("Checkbox change detected in", dropdownList.id);
            updateSelectedCount(checkboxes, selectedCount, clearButton); // Update the selected count
            triggerDropdownChangeEvent();  // Trigger a custom change event to update filters
        });
    });
    console.log(`Checkbox listeners successfully attached to ${dropdownList.id}`);
}

// Function to populate dropdowns dynamically and attach checkbox listeners
function populateDropdown(dropdownListId, options, selectedValues = []) {
    const dropdownList = document.getElementById(dropdownListId);
    dropdownList.innerHTML = "";  // Clear any existing options

    // Separate Decades and Years
    const decades = [];
    const years = [];

    // Iterate through options and separate into decades and years
    Object.entries(options).forEach(([key, count]) => {
        if (key.includes("...")) {
            decades.push({ label: key, count: count });
        } else {
            years.push({ label: key, count: count });
        }
    });

    console.log("Decades:", decades);
    console.log("Years:", years);

    // Sort Decades in Ascending Order (e.g., 1910...1919, 1920...1929)
    decades.sort((a, b) => parseInt(a.label.split("...")[0]) - parseInt(b.label.split("...")[0]));

    // Sort Years in Descending Order (e.g., 2023, 2022, 2021)
    years.sort((a, b) => parseInt(b.label) - parseInt(a.label));

    // Combine Decades First and Years Below
    const sortedOptions = [...decades, ...years];

    // Render Sorted Options to the Dropdown
    sortedOptions.forEach(option => {
        const isChecked = selectedValues.includes(option.label) ? 'checked' : '';
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${option.label}" ${isChecked}> ${option.label} (${option.count})`;
        dropdownList.appendChild(label);
    });



    // Attach Checkbox Listeners after the dropdown is populated
    const header = document.querySelector(`#${dropdownListId}-header`);
    console.log(`Dropdown ${dropdownListId} header: `, header);
    if (header) {
        const selectedCount = header.querySelector('.selected-count');
        const clearButton = header.querySelector('.clear-icon');

        // Attach checkbox listeners to handle selections and updates
        if (selectedCount && clearButton) {
            attachCheckboxListeners(dropdownList, selectedCount, clearButton);
        } else {
            console.error(`Dropdown ${dropdownListId}: Could not find header elements for attaching checkbox listeners.`);
        }
    } else {
        console.error(`Dropdown header not found for ${dropdownListId}`);
    }
}


// Function to show/hide dropdown
function toggleDropdown(dropdownList) {
    const isVisible = dropdownList.style.display === 'block';
    dropdownList.style.display = isVisible ? 'none' : 'block';
}


// Function to trigger a custom event to notify filter.js of dropdown changes
// Trigger a custom change event to update filters
function triggerDropdownChangeEvent() {
    const event = new CustomEvent('dropdownChange');
    console.log("Dispatching dropdownChange event");

    // Dispatch the custom dropdownChange event
    document.dispatchEvent(event);

    // Call the function to update the movie list and pagination
    updateMovieListAndPagination();
}

const searchBox = document.getElementById('search-box');
const clearSearchButton = document.getElementById('clear-search');

// Show/hide the clear button based on input value
searchBox.addEventListener('input', () => {
    if (searchBox.value.length > 0) {
        clearSearchButton.style.visibility = 'visible';  // Show the clear button
    } else {
        clearSearchButton.style.visibility = 'hidden';   // Hide the clear button
    }
});

// Clear the search box when the clear button is clicked
clearSearchButton.addEventListener('click', () => {
    searchBox.value = '';
    clearSearchButton.style.visibility = 'hidden';
    // Optionally trigger any search box reset logic here
});

