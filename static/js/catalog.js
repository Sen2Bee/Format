// catalog.js

function getIconSizeByType(typeval, type = "rating") {
    // Define the minimum and maximum sizes for the icon
    const minSize = 1;   // 1em for the smallest value
    const maxSize = 2.5;   // 3em for the largest value

    let minVal, maxVal;

    // Set value ranges based on the type
    if (type === "rating") {
        minVal = 5;   // IMDb rating starts at 0
        maxVal = 10;  // IMDb rating goes up to 10
    } else if (type === "fsk") {
        minVal = 0;   // FSK can start from 0
        maxVal = 18;  // FSK goes up to 18
    } else if (type === "runtime") {
        minVal = 60;   // Minimum runtime is 60 minutes (1 hour)
        maxVal = 180;  // Maximum runtime is 180 minutes (3 hours)
    } else {
        console.warn(`Unknown type: ${type}. Using default rating scale.`);
        minVal = 0;  // Default to the rating scale
        maxVal = 10;
    }

    // Clamp the value within the min and max range
    const clampedVal = Math.max(minVal, Math.min(typeval, maxVal));

    // Calculate the size as a ratio between the value and the value range
    const size = minSize + (clampedVal - minVal) * (maxSize - minSize) / (maxVal - minVal);

    // Return the size in 'em' units, rounded to two decimal places
    return `${size.toFixed(2)}em`;
}







function getIconSizeByFsk(fsk) {
    if (fsk <= 6) {
        return '1em';  // Small size for lower FSK values
    } else if (fsk <= 12) {
        return '1.5em';  // Medium size for mid-range FSK values
    } else if (fsk <= 16) {
        return '2em';  // Large size for higher FSK values
    } else if (fsk === 18) {
        return '2.5em';  // Extra large size for FSK 18
    } else {
        return '1em';  // Default size
    }
}
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
            const imagePath = `/movie_images/${encodeURIComponent(movie.folder_name || 'default')}/poster/poster_1.avif`;
            const defaultImagePath = '/static/images/default_movie.png';

            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card';

            let formatRuntimeHtml = '';
            const runtimeIconSize = getIconSizeByType(movie.runtime, "runtime");
            formatRuntimeHtml = `
                <div class="meta-item">
                    <i class="fas fa-clock" style="font-size:${runtimeIconSize};"></i>
                    <span>${movie.runtime}</span>
                </div>
            `;  
            let formatFskHtml = '';
            const fskIconSize = getIconSizeByType(movie.format_fsk, "fsk");
            formatFskHtml = `
                <div class="meta-item">
                    <i class="fas fa-child" style="font-size:${fskIconSize};"></i>
                    <span>${movie.format_fsk}</span>
                </div>
            `;     
            let formatRatingHtml = '';
            const ratingIconSize = getIconSizeByType(movie.imdb_rating, "rating"); // Returns a size in 'em', like '2.125em'  
            console.log("movie.imdb_rating", ratingIconSize, movie.imdb_rating)
            formatRatingHtml = `
                <div class="meta-item">
                    <i class="fas fa-star" style="font-size:${ratingIconSize};"></i>
                    <span>${movie.imdb_rating}</span>
                </div>
            `;                    

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

                    // Map directors with their tooltip images
                    const directors = Array.isArray(movie.director) && movie.director.length > 0 
                        ? movie.director.map(director => renderPersonTooltip(director, "Director")).join(', ') 
                        : "Unknown Director";

                    // Process actors
                    let actors = "Unknown Actors";
                    if (movie.actors) {
                        if (Array.isArray(movie.actors)) {
                            actors = movie.actors.map(actor => renderPersonTooltip(actor, "Actor")).join(', ');
                        } else if (typeof movie.actors === 'string') {
                            // Split the string into an array by commas
                            const actorArray = movie.actors.split(',').map(actor => actor.trim()).filter(actor => actor.length > 0);
                            actors = actorArray.map(actor => renderPersonTooltip(actor, "Actor")).join(', ');
                        }
                    }

                    // Limit the number of displayed actors
                    const maxActorsToShow = 5;
                    if (Array.isArray(movie.actors)) {
                        if (movie.actors.length > maxActorsToShow) {
                            const displayedActors = movie.actors.slice(0, maxActorsToShow).map(actor => renderPersonTooltip(actor, "Actor")).join(', ');
                            const remainingCount = movie.actors.length - maxActorsToShow;
                            actors = `${displayedActors}, ...`;
                        }
                    } else if (typeof movie.actors === 'string') {
                        const actorArray = movie.actors.split(',').map(actor => actor.trim()).filter(actor => actor.length > 0);
                        if (actorArray.length > maxActorsToShow) {
                            const displayedActors = actorArray.slice(0, maxActorsToShow).map(actor => renderPersonTooltip(actor, "Actor")).join(', ');
                            const remainingCount = actorArray.length - maxActorsToShow;
                            actors = `${displayedActors}, ...`;
                        }
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


                    // Determine the overview truncation length based on view type
                    let content = movie.format_inhalt ? movie.format_inhalt : (movie.format_inhalt ? movie.format_inhalt : "Keine Inhaltsangabe verfügbar.");
                    const maxLength = isListView ? 300 : 150; // 300 characters for list view, 150 for raster view
                    if (content.length > maxLength) {
                        content = content.substring(0, maxLength) + '...';
                    }                    


                    movieCard.innerHTML = `
                        <div class="movie-content-wrapper">
                            <div class="image-container">
                                <img src="${imagePath}" alt="${movie.main_title}" onerror="this.onerror=null; this.src='${defaultImagePath}';" loading="lazy">
                                <div class="hover-title">
                                    <span><i class="fas fa-file-alt"></i> ${movie.original_title}</span>
                                </div>
                            </div>
                            
                            <div class="info-wrapper">
                                <div class="title-section">
                                    <h2>${movie.main_title}</h2>
                                </div>                                                
                                <div class="overview-section">
                                    <p>${content} <a href="/movie/${movie.movie_id}" class="more-link">mehr</a></p>
                                </div>                                        
                                <div class="info-section">
                                    <div class="metadata">  
                                        <p class="countries"><strong><i class="fas fa-globe"></i></strong> ${countries} | <i class="fas fa-film"></i></strong> ${genres}</p>
                                        <p><strong><i class="fas fa-video"></i></strong> ${directors}</p>
                                        <p><strong><i class="fas fa-users"></i></strong> ${actors}</p>
                                        <!-- Inline Meta in List View -->
                                        <div class="inline-meta">
                                            ${formatRuntimeHtml}                                        
                                            ${formatFskHtml}                                        
                                            ${formatRatingHtml}
                                            <div class="meta-item">
                                                <i class="fas fa-calendar" style="font-size:1.4em;"></i>
                                                <span>${movie.release_date}</span>
                                            </div>
                                        </div>
                                        <p class="standort"><strong><i class="fas fa-map-marker-alt"></i></strong> ${movie.format_standort || 'N/A'} | <i class="fas fa-disc"></i></strong>${movie.formats}</p>

                                    </div>
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

// Function to initialize Tippy.js tooltips
function initializeTippyTooltips() {
    if (typeof tippy === 'undefined') {
        console.error("Tippy.js is not loaded.");
        return;
    }

    tippy('.person-tooltip', {
        allowHTML: true,
        interactive: true,
        theme: 'light-border',
        placement: 'top',
        arrow: true,
    });
}


// toggle-view.js

export function toggleViews() {
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const movieListings = document.querySelector('.movie-listings');

    if (!gridViewBtn || !listViewBtn || !movieListings) {
        console.error("toggleViews: One or more elements not found.");
        return;
    }

    // Function to activate Grid View
    const activateGridView = () => {
        movieListings.classList.remove('list-view');
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        gridViewBtn.setAttribute('aria-pressed', 'true');
        listViewBtn.setAttribute('aria-pressed', 'false');
        updateMovieListingsUI();
    };

    // Function to activate List View
    const activateListView = () => {
        movieListings.classList.add('list-view');
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        listViewBtn.setAttribute('aria-pressed', 'true');
        gridViewBtn.setAttribute('aria-pressed', 'false');
        updateMovieListingsUI();
    };

    // Event Listeners for Toggle Buttons
    gridViewBtn.addEventListener('click', () => {
        activateGridView();
        localStorage.setItem('movieView', 'grid');
    });

    listViewBtn.addEventListener('click', () => {
        activateListView();
        localStorage.setItem('movieView', 'list');
    });

    // Function to update movie listings UI based on view type
    const updateMovieListingsUI = () => {
        // Assuming you have a function or way to re-fetch and re-render movies
        // For example:
        fetch('/get_movies') // Replace with your actual endpoint
            .then(response => response.json())
            .then(data => {
                updateMovieListings(data.movies);
            })
            .catch(err => console.error('Error fetching movies:', err));
    };

    // Optional: Persist User Preference using LocalStorage
    // Check if user has a saved preference
    const savedView = localStorage.getItem('movieView');

    if (savedView === 'list') {
        activateListView();
    } else {
        activateGridView();
    }
}
