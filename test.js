export function updateMovieListings(movies) {
    const movieContainer = document.querySelector('.movie-listings');
    if (!movieContainer) {
        console.error("updateMovieListings: movieContainer element not found.");
        return;
    }

    // Check if we are in list view or raster (grid) view
    const isListView = movieContainer.classList.contains('list-view');

    movieContainer.innerHTML = "";  // Clear existing entries
    if (movies.length > 0) {
        const promises = movies.map(movie => {
            const imagePath = `/movie_images/${encodeURIComponent(movie.folder_name || 'default')}/poster/poster_1.jpg`;
            const defaultImagePath = '/static/images/default_movie.png';

            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card';

            // Generate dynamic size for runtime
            let runtimeHtml = '';
            const runtimeIconSize = getIconSizeByType(movie.runtime, "runtime"); // Get runtime icon size
            runtimeHtml = `
                <div class="meta-item">
                    <i class="fas fa-clock" style="font-size:${runtimeIconSize};"></i>
                    <span>${movie.runtime}min</span>
                </div>
            `;

            // Generate formatFskHtml to handle FSK values
            let formatFskHtml = '';
            const fskIconSize = getIconSizeByType(movie.format_fsk, "fsk"); // Get FSK icon size
            formatFskHtml = `
                <div class="meta-item">
                    <i class="fas fa-child" style="font-size:${fskIconSize};"></i>
                    <span>${movie.format_fsk}</span>
                </div>
            `;

            // Generate starRatingHtml to handle IMDb rating values
            let starRatingHtml = '';
            const ratingIconSize = getIconSizeByType(movie.imdb_rating, "rating"); // Get IMDb rating icon size
            starRatingHtml = getStarRatingHTML(movie.imdb_rating, ratingIconSize);

            // Determine the overview truncation length based on view type
            let overview = movie.format_inhalt ? movie.format_inhalt : (movie.overview ? movie.overview : "Keine Inhaltsangabe verfügbar.");
            const maxLength = isListView ? 300 : 150; // 300 characters for list view, 150 for raster view
            if (overview.length > maxLength) {
                overview = overview.substring(0, maxLength) + '...';
            }

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

                        const tooltipContent = `
                            <div class="tooltip-person-content">
                                <img src="${personImage}" alt="${personName}" onerror="this.onerror=null; this.src='/static/images/default_person.png';">
                                <span class="tooltip-name">${personName}</span>
                            </div>
                        `;

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

                    const directors = Array.isArray(movie.director) && movie.director.length > 0 
                        ? movie.director.map(director => renderPersonTooltip(director, "Director")).join(', ') 
                        : "Unknown Director";

                    const actors = movie.actors && movie.actors.length > 0 
                        ? movie.actors.map(actor => renderPersonTooltip(actor, "Actor")).join(', ') 
                        : "Unknown Actors";

                    const countries = Array.isArray(movie.countries) && movie.countries.length > 0
                        ? movie.countries.map(country => {
                            const match = country.match(/(.*?)\s\((.*?)\)/); 
                            const fullName = match ? match[1] : country;
                            const shortCode = match ? match[2] : country;
                            return `<span class="country-tooltip" data-country="${fullName}">${shortCode}</span>`;
                        }).join(', ')
                        : "Unknown Countries";

                    const genres = Array.isArray(movie.genres) && movie.genres.length > 0 ? movie.genres.join(', ') : "Unknown Genres";

                    movieCard.innerHTML = `
                        <div class="movie-content-wrapper">
                            <div class="image-container">
                                <img src="${imagePath}" alt="${movie.main_title}" onerror="this.onerror=null; this.src='${defaultImagePath}';" loading="lazy">
                                <div class="hover-title">
                                    <span><i class="fas fa-file-alt"></i> ${movie.original_title}</span>
                                </div>
                                <!-- Inline Meta in Grid View -->
                                <div class="inline-meta">
                                    ${runtimeHtml}
                                    ${formatFskHtml}
                                    <div class="meta-item">
                                        ${starRatingHtml}
                                    </div>
                                </div>
                            </div>
                            <div class="info-wrapper">
                                <div class="info-section">
                                    <h2>${movie.main_title}</h2>
                                    <div class="metadata">
                                        <p><strong><i class="fas fa-video"></i></strong> ${directors}</p>
                                        <p><strong><i class="fas fa-users"></i></strong> ${actors}</p>
                                        <p class="standort"><strong><i class="fas fa-map-marker-alt"></i></strong> ${movie.format_standort || 'N/A'}</p>
                                        <p class="countries"><strong><i class="fas fa-globe"></i></strong> ${countries} | ${new Date(movie.release_date).getFullYear()}</p>
                                        <p class="genres"><strong><i class="fas fa-film"></i></strong> ${genres}</p>
                                    </div>
                                </div>
                                <div class="overview-section">
                                    <p>${overview} <a href="/movie/${movie.movie_id}" class="more-link">mehr</a></p>
                                </div>
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

    // Initialize Tippy.js after all movie cards have been appended
    initializeTippyTooltips();
}
