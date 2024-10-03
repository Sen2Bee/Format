document.addEventListener('DOMContentLoaded', function () {
    console.log("Custom Dropdowns: DOM fully loaded");
    initializeCustomDropdowns(); // Initialize custom dropdowns when DOM is loaded
});

// Function to initialize the custom dropdowns
function initializeCustomDropdowns() {
    console.log("Initializing Custom Dropdowns...");

    // Retrieve the custom dropdown elements by ID
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
        const clearButton = clearButtons[index];
        attachDropdownListeners(header, dropdownList, clearButton);
    });
}

// Function to populate dropdowns with checkbox options dynamically
function populateDropdownOptions(dropdownList, options) {
    console.log("Populating dropdown options for:", dropdownList.id);
    dropdownList.innerHTML = "";  // Clear any existing options
    if (!options || options.length === 0) {
        console.warn("No options provided for dropdown:", dropdownList.id);
        return; // Exit if no options are provided
    }

    options.forEach(option => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${option}"> ${option}`;
        dropdownList.appendChild(label);
    });
    console.log("Dropdown populated successfully:", dropdownList.id);
}

// Function to attach listeners to dropdown header, checkboxes, and clear button
function attachDropdownListeners(header, dropdownList, clearButton) {
    console.log(`Attaching listeners to ${header.id}...`);

    const checkboxes = dropdownList.querySelectorAll('input[type="checkbox"]');
    const selectedCount = header.querySelector('.selected-count');

    if (!selectedCount) {
        console.error(`Selected count element not found in ${header.id}`);
        return;
    }

    // Show/hide dropdown on header click
    header.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent click propagation
        console.log(`Toggling dropdown for ${header.id}`);
        toggleDropdown(dropdownList);
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (!header.contains(event.target) && !dropdownList.contains(event.target)) {
            dropdownList.style.display = 'none';
        }
    });

    // Handle checkbox selection changes
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateSelectedCount(checkboxes, selectedCount, clearButton);
            triggerDropdownChangeEvent();  // Trigger a custom change event to update filters
        });
    });

    // Clear all selections when the clear button is clicked
    clearButton.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent header dropdown toggle
        checkboxes.forEach(checkbox => (checkbox.checked = false)); // Uncheck all boxes
        updateSelectedCount(checkboxes, selectedCount, clearButton); // Update selection count
        triggerDropdownChangeEvent();  // Trigger a custom change event to update filters
    });

    console.log(`Listeners successfully attached to ${header.id}`);
}

// Function to show/hide dropdown
function toggleDropdown(dropdownList) {
    const isVisible = dropdownList.style.display === 'block';
    dropdownList.style.display = isVisible ? 'none' : 'block';
}

// Update the selected count display and handle visibility of the clear button
function updateSelectedCount(checkboxes, countElement, clearButton) {
    const selectedItems = Array.from(checkboxes).filter(checkbox => checkbox.checked);
    const count = selectedItems.length;

    // Update the count display
    countElement.textContent = `${count} selected`;
    countElement.style.display = count > 0 ? 'inline-flex' : 'none'; // Use 'inline-flex' to support icon/text alignment

    // Show or hide the clear button based on the count
    clearButton.style.visibility = count > 0 ? 'visible' : 'hidden';
}

// Function to trigger a custom event to notify filter.js of dropdown changes
function triggerDropdownChangeEvent() {
    const event = new CustomEvent('dropdownChange');
    console.log("Dispatching dropdownChange event");
    document.dispatchEvent(event);
}
