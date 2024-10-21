// File: static/js/catalog.js

export function updateMovieListings(movies) {
    const movieContainer = document.querySelector('.movie-listings');
    if (!movieContainer) {
        console.error("updateMovieListings: movieContainer element not found.");
        return;
    }

    movieContainer.innerHTML = "";  // Clear existing entries
    if (movies.length > 0) {
        const promises = movies.map(movie => {
            const imagePath = `/movie_images/${encodeURIComponent(movie.folder_name || 'default')}/poster/poster_1.jpg`;
            const defaultImagePath = '/static/images/default_movie.png';

            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card';

            // Fetch available person images from the backend
            return fetch(`/get_person_images/${encodeURIComponent(movie.folder_name)}`)
                .then(response => response.json())
                .then(data => {
                    const availableImages = data.images;

                    // Function to get person image by matching the name in availableImages
                    function getPersonImage(person) {
                        for (const image of availableImages) {
                            if (image.startsWith(person.trim())) {
                                return `/movie_images/${encodeURIComponent(movie.folder_name)}/person/${encodeURIComponent(image)}`;
                            }
                        }
                        return '/static/images/default_person.png'; // Fallback to default person image
                    }

                    // Unified Tooltip Class for Directors and Actors
                    const renderPersonTooltip = (person, role) => {
                        const personImage = getPersonImage(person);
                        const personName = person.split('_')[0].replace(/_/g, ' '); // Replace underscores with spaces for display

                        // Prepare tooltip content with template literals
                        const tooltipContent = `
                            <div class="tooltip-person-content">
                                <img src="${personImage}" alt="${personName}" onerror="this.onerror=null; this.src='/static/images/default_person.png';">
                                <span class="tooltip-name">${personName}</span>
                            </div>
                        `;

                        // Return the tooltip element with correct attributes
                        return `
                            <span 
                                class="person-tooltip" 
                                tabindex="0" 
                                aria-label="${role}: ${personName}"
                                data-tippy-content="${tooltipContent.replace(/"/g, '&quot;')}" 
                            >
                                ${personName}
                            </span>
                        `;
                    };

                    // Map directors with their tooltip images
                    const directors = Array.isArray(movie.director) && movie.director.length > 0 
                        ? movie.director.map(director => renderPersonTooltip(director, "Director")).join(', ') 
                        : "Unknown Director";

                    // Map actors with their tooltip images
                    let actors = movie.actors 
                        ? (Array.isArray(movie.actors) 
                            ? movie.actors.map(actor => renderPersonTooltip(actor, "Actor")).join(', ') 
                            : movie.actors) 
                        : "Unknown Actors";
                        
                    // Truncate actors if necessary
                    if (actors.length > 75) {
                        actors = actors.substring(0, 72) + '...';
                    }

                    const countries = Array.isArray(movie.countries) && movie.countries.length > 0
                        ? movie.countries.map(country => {
                            const match = country.match(/(.*?)\s\((.*?)\)/); 
                            const fullName = match ? match[1] : country;
                            const shortCode = match ? match[2] : country;
                            return `<span class="country-tooltip" data-country="${fullName}">${shortCode}</span>`;
                        }).join(', ')
                        : "Unknown Countries";

                    const genres = Array.isArray(movie.genres) && movie.genres.length > 0 ? movie.genres.join(', ') : "Unknown Genres";

                    let content = movie.format_inhalt ? movie.format_inhalt : (movie.overview ? movie.overview : "Keine Inhaltsangabe verfügbar.");
                    if (content.length > 150) {
                        content = content.substring(0, 150) + '...';
                    }

                    let imdb_rating = movie.imdb_rating ? movie.imdb_rating : 6;

                    movieCard.innerHTML = `
                        <div class="movie-content-wrapper">
                            <div class="image-container">
                                <img src="${imagePath}" alt="${movie.main_title}" onerror="this.onerror=null; this.src='${defaultImagePath}';" loading="lazy">
                                <div class="hover-title">
                                    <span>${movie.original_title}</span>
                                </div>
                            </div>
                            <div class="info-section">
                                <h2>${movie.main_title}</h2>
                                <div class="metadata">
                                    <p><strong><i class="fas fa-video"></i></strong> ${directors}</p>
                                    <p><strong><i class="fas fa-users"></i></strong> ${actors}</p>
                                    <p class="inline-meta">
                                        <i class="fas fa-clock"></i> ${movie.runtime} min | 
                                        <i class="fas fa-compact-disc"></i> ${movie.formats} | 
                                        <i class="fas fa-child"></i> ${movie.format_fsk} | 
                                        &#9733; ${imdb_rating}
                                    </p>
                                    <p class="standort"><strong><i class="fas fa-map-marker-alt"></i></strong> ${movie.format_standort || 'N/A'}</p>
                                    <p class="countries"><strong><i class="fas fa-globe"></i></strong> ${countries} | ${new Date(movie.release_date).getFullYear()}</p>
                                    <p class="genres"><strong><i class="fas fa-film"></i></strong> ${genres}</p>
                                </div>
                            </div>
                            <div class="overview-section">
                                <p>${content} <a href="/movie/${movie.movie_id}" class="more-link">mehr</a></p>
                            </div>
                        </div>
                    `;
                    
                    movieContainer.appendChild(movieCard);
                })
                .catch(err => console.error('Error fetching person images:', err));
        });

        // Wait for all movie cards to be appended, then initialize Tippy.js
        Promise.all(promises).then(() => initializeTippyTooltips());
    } else {
        movieContainer.innerHTML = `<p class="no-movies-message">No movies match the selected filters.</p>`;
    }
}

// Function to initialize Tippy.js tooltips
function initializeTippyTooltips() {
    // Ensure Tippy.js is available
    if (typeof tippy === 'undefined') {
        console.error("Tippy.js is not loaded.");
        return;
    }

    // Initialize Tippy.js on elements with the 'person-tooltip' class
    tippy('.person-tooltip', {
        allowHTML: true, // Allow HTML content in tooltips
        interactive: true, // Allow interaction with the tooltip (e.g., clicking links)
        theme: 'light-border', // Optional: choose a theme or define your own
        placement: 'top', // Position the tooltip above the element
        arrow: true, // Show an arrow pointing to the element
    });
}
