// File: static/js/catalog.js

function getIconSizeByType(typeval, type = "rating") {
    const minSize = 1;   // 1em for the smallest value
    const maxSize = 2.5;   // 2.5em for the largest value

    let minVal, maxVal;

    // Set value ranges based on the type
    if (type === "rating") {
        minVal = 5;   // IMDb rating starts at 5
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

export function updateMovieListings(movies) {
    const movieContainer = document.querySelector('.movie-listings');
    if (!movieContainer) {
        console.error("updateMovieListings: movieContainer element not found.");
        return;
    }

    // Check if we are in list view or grid view
    const isListView = movieContainer.classList.contains('list-view');

    movieContainer.innerHTML = "";  // Clear existing entries
    if (movies.length > 0) {
        movies.forEach(movie => {
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
            const ratingIconSize = getIconSizeByType(movie.imdb_rating, "rating");
            formatRatingHtml = `
                <div class="meta-item">
                    <i class="fas fa-star" style="font-size:${ratingIconSize};"></i>
                    <span>${movie.imdb_rating}</span>
                </div>
            `;                    

            // Map directors
            const directors = Array.isArray(movie.director) && movie.director.length > 0 
                ? movie.director.join(', ') 
                : "Unknown Director";

            // Process actors
            let actors = "Unknown Actors";
            if (movie.actors) {
                if (Array.isArray(movie.actors)) {
                    actors = movie.actors.join(', ');
                } else if (typeof movie.actors === 'string') {
                    // Split the string into an array by commas
                    const actorArray = movie.actors.split(',').map(actor => actor.trim()).filter(actor => actor.length > 0);
                    actors = actorArray.join(', ');
                }
            }

            // Limit the number of displayed actors
            const maxActorsToShow = 5;
            if (Array.isArray(movie.actors)) {
                if (movie.actors.length > maxActorsToShow) {
                    const displayedActors = movie.actors.slice(0, maxActorsToShow).join(', ');
                    actors = `${displayedActors}, ...`;
                }
            } else if (typeof movie.actors === 'string') {
                const actorArray = movie.actors.split(',').map(actor => actor.trim()).filter(actor => actor.length > 0);
                if (actorArray.length > maxActorsToShow) {
                    const displayedActors = actorArray.slice(0, maxActorsToShow).join(', ');
                    actors = `${displayedActors}, ...`;
                }
            }

            const countries = Array.isArray(movie.countries) && movie.countries.length > 0
                ? movie.countries.join(', ')
                : "Unknown Countries";

            const genres = Array.isArray(movie.genres) && movie.genres.length > 0 ? movie.genres.join(', ') : "Unknown Genres";

            // Determine the overview truncation length based on view type
            let content = movie.format_inhalt ? movie.format_inhalt : "Keine Inhaltsangabe verfügbar.";
            const maxLength = isListView ? 300 : 150; // 300 characters for list view, 150 for grid view
            if (content.length > maxLength) {
                content = content.substring(0, maxLength) + '...';
            }                    

            movieCard.innerHTML = `
                <div class="movie-content-wrapper">
                    <div class="image-container">
                        <a href="/movie/${movie.movie_id}">
                            <img src="${imagePath}" alt="${movie.main_title}" onerror="this.onerror=null; this.src='${defaultImagePath}';" loading="lazy">
                        </a>
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
        });
    } else {
        movieContainer.innerHTML = `<p class="no-movies-message">No movies match the selected filters.</p>`;
    }
}
