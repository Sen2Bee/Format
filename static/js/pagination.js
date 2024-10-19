// File: static/js/pagination.js

import { topPaginationContainer, bottomPaginationContainer } from './entry.js';  // Import pagination containers
import { updateFilters } from './filter.js';  // Import the updateFilters function

/**
 * Function to handle pagination updates for both top and bottom paginations
 */
export function updatePagination(currentPage, totalPages, totalMovies, columnsPerRow) {
    [topPaginationContainer, bottomPaginationContainer].forEach(paginationContainer => {
        if (!paginationContainer) return;

        paginationContainer.innerHTML = "";  // Clear existing pagination buttons

        // Create the "Previous" Button
        let prevDisabledClass = currentPage <= 1 ? 'disabled' : '';
        let prevDisabledAttr = currentPage <= 1 ? 'aria-disabled="true"' : '';
        paginationContainer.innerHTML += `<li class="${prevDisabledClass}"><a href="#" data-page="${currentPage - 1}" ${prevDisabledAttr}>&laquo; Previous</a></li>`;

        // Determine if ellipsis is needed
        const showStartEllipsis = currentPage > 3;
        const showEndEllipsis = currentPage < totalPages - 2;

        // Add first page and ellipsis if needed
        if (showStartEllipsis) {
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
        if (showEndEllipsis) {
            paginationContainer.innerHTML += `<li class="ellipsis"><span>...</span></li>`;
            paginationContainer.innerHTML += `<li><a href="#" data-page="${totalPages}">${totalPages}</a></li>`;
        }

        // Create the "Next" Button
        let nextDisabledClass = currentPage >= totalPages ? 'disabled' : '';
        let nextDisabledAttr = currentPage >= totalPages ? 'aria-disabled="true"' : '';
        paginationContainer.innerHTML += `<li class="${nextDisabledClass}"><a href="#" data-page="${currentPage + 1}" ${nextDisabledAttr}>Next &raquo;</a></li>`;
    });

    attachPaginationEventListeners(columnsPerRow);
}

/**
 * Function to attach click event listeners for pagination buttons
 */
export function attachPaginationEventListeners(columnsPerRow) {
    const paginationLinks = document.querySelectorAll('.pagination nav ul li a[data-page]');
    paginationLinks.forEach(link => {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            if (this.parentElement.classList.contains('disabled')) {
                return;  // Ignore clicks on disabled buttons
            }
            const page = parseInt(this.getAttribute('data-page'));
            if (!isNaN(page)) updateFilters(page);  // Trigger filter update with selected page
        });
    });
}
