export function updateMovieListings(movies) {
    const movieContainer = document.querySelector('.movie-listings');
    if (!movieContainer) {
        console.error("updateMovieListings: movieContainer element not found.");
        return;
    }

    movieContainer.innerHTML = "";  // Clear existing entries
    if (movies.length > 0) {
        movies.forEach(movie => {
            const imagePath = `/movie_images/${encodeURIComponent(movie.folder_name || 'default')}/poster/poster_1.jpg`;
            const defaultImagePath = '/static/images/default_movie.png';
            console.log(movie);  // For debugging purposes
            
            // You must declare movieCard here
            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card';  // Now movieCard is defined properly

            function getPersonImage(person, movieFolder) {
                const [name, id] = person.split('_'); // Split the name and id
                const personImageFilename = encodeURIComponent(name.trim()) + `_${id}.jpg`; 
                return `${encodeURIComponent(movieFolder)}/person/${personImageFilename}`;
            }

            // Handle directors and actors as tooltips with images
            const directors = Array.isArray(movie.director) && movie.director.length > 0 
                ? movie.director.map(director => {
                    const directorImage = getPersonImage(director, movie.folder_name);
                    console.log(directorImage)
                    return `<span class="director-tooltip" data-director="${director}">
                                <img src="${directorImage}" alt="${director}" onerror="this.onerror=null; this.src='/static/images/default_person.png';" class="person-image-tooltip">
                                ${director.split('_')[0]}
                            </span>`;
                }).join(', ') 
                : "Unknown Director";

            let actors = movie.actors 
                ? (Array.isArray(movie.actors) 
                    ? movie.actors.map(actor => {
                        const actorImage = getPersonImage(actor, movie.folder_name);
                        return `<span class="actor-tooltip" data-actor="${actor}">
                                    <img src="${actorImage}" alt="${actor}" onerror="this.onerror=null; this.src='/static/images/default_person.png';" class="person-image-tooltip">
                                    ${actor.split('_')[0]}
                                </span>`;
                    }).join(', ') 
                    : movie.actors) 
                : "Unknown Actors";

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

            let content = movie.format_inhalt ? movie.format_inhalt : movie.overview ? movie.overview : "Keine Inhaltsangabe verfügbar.";
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
                            <i class="fas fa-child"></i>${movie.format_fsk} | 
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
        
            movieContainer.appendChild(movieCard);  // Append the movieCard to movieContainer
        });
    } else {
        movieContainer.innerHTML = `<p class="no-movies-message">No movies match the selected filters.</p>`;
    }
}

// Add tooltip event listener for director and actor elements to display images
document.addEventListener('mouseover', function(event) {
    if (event.target.classList.contains('director-tooltip') || event.target.classList.contains('actor-tooltip')) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip-content';
        tooltip.innerHTML = `<img src="${event.target.querySelector('img').src}" alt="${event.target.dataset.director || event.target.dataset.actor}">`;
        document.body.appendChild(tooltip);

        event.target.addEventListener('mousemove', (e) => {
            tooltip.style.left = `${e.pageX + 10}px`;
            tooltip.style.top = `${e.pageY + 10}px`;
        });

        event.target.addEventListener('mouseout', () => {
            tooltip.remove();
        });
    }
});
