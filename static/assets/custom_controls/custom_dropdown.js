document.addEventListener('DOMContentLoaded', function () {
    initializeCustomDropdowns(); // Initialize custom dropdowns when DOM is loaded
});

// Function to initialize the custom dropdowns
function initializeCustomDropdowns() {
    const yearDropdownHeader = document.getElementById('year-dropdown-header');
    const yearDropdownList = document.getElementById('year-dropdown-list');
    const clearYearBtn = document.getElementById('clear-year-custom');

    // Sample data for testing; Replace with dynamic data if available
    const yearOptions = ['1913', '1915', '1916', '1919', '1920', '1925', '1930', '1940'];

    // Populate year dropdown options
    populateDropdownOptions(yearDropdownList, yearOptions);

    // Attach event listeners for the year dropdown
    attachDropdownListeners(yearDropdownHeader, yearDropdownList, clearYearBtn);
}

// Populate dropdown with options dynamically
function populateDropdownOptions(dropdownList, options) {
    dropdownList.innerHTML = "";  // Clear any existing content
    options.forEach(option => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" value="${option}"> ${option}`;
        dropdownList.appendChild(label);
    });
}

// Attach event listeners to the dropdown header and options
function attachDropdownListeners(header, dropdownList, clearButton) {
    const checkboxes = dropdownList.querySelectorAll('input[type="checkbox"]');
    const selectedCount = header.querySelector('.selected-count');
    const clearIcon = selectedCount.querySelector('.clear-icon');

    // Toggle dropdown visibility on header click
    header.addEventListener('click', () => {
        dropdownList.style.display = dropdownList.style.display === 'block' ? 'none' : 'block';
    });

    // Close dropdown when clicking outside of it
    document.addEventListener('click', (event) => {
        if (!header.contains(event.target) && !dropdownList.contains(event.target)) {
            dropdownList.style.display = 'none';
        }
    });

    // Handle checkbox selection changes
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateSelectedCount(checkboxes, selectedCount, clearButton);
        });
    });

    // Clear all selections when clear button or icon is clicked
    clearButton.addEventListener('click', () => {
        checkboxes.forEach(checkbox => (checkbox.checked = false));
        updateSelectedCount(checkboxes, selectedCount, clearButton);
    });

    // Integrated clear icon functionality within the selected count label
    if (clearIcon) {
        clearIcon.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent dropdown toggle on icon click
            checkboxes.forEach(checkbox => (checkbox.checked = false));
            updateSelectedCount(checkboxes, selectedCount, clearButton);
        });
    }
}

// Update selected count display and show/hide clear button
function updateSelectedCount(checkboxes, countElement, clearButton) {
    const selectedItems = Array.from(checkboxes).filter(checkbox => checkbox.checked);
    const count = selectedItems.length;

    // Show the selected count and integrated clear icon if there are selections
    countElement.textContent = `${count} selected`;
    countElement.style.display = count > 0 ? 'inline-flex' : 'none'; // Use 'inline-flex' to align text and icon
    clearButton.style.visibility = count > 0 ? 'visible' : 'hidden';
}
