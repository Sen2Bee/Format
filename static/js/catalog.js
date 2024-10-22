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
                            <div class="info-wrapper">
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

export function toogleViews() {
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const movieListings = document.querySelector('.movie-listings');

    // Function to activate Grid View
    const activateGridView = () => {
        movieListings.classList.remove('list-view');
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        gridViewBtn.setAttribute('aria-pressed', 'true');
        listViewBtn.setAttribute('aria-pressed', 'false');
    };

    // Function to activate List View
    const activateListView = () => {
        movieListings.classList.add('list-view');
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        listViewBtn.setAttribute('aria-pressed', 'true');
        gridViewBtn.setAttribute('aria-pressed', 'false');
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

    // Optional: Persist User Preference using LocalStorage
    // Check if user has a saved preference
    const savedView = localStorage.getItem('movieView');

    if (savedView === 'list') {
        activateListView();
    } else {
        activateGridView();
    }
};





