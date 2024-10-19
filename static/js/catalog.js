// File: static/js/catalog.js

// Import any dependencies (if necessary)
import { movieContainer } from './entry.js';  // Import the movie container element

/**
 * Function to update the movie listings based on the filter results
 */
export function updateMovieListings(movies) {
    if (!movieContainer) {
        console.error("updateMovieListings: movieContainer element not found.");
        return;
    }

    movieContainer.innerHTML = "";  // Clear existing entries

    if (movies.length > 0) {
        movies.forEach(movie => {
            const imagePath = `/movie_images/${encodeURIComponent(movie.folder_name)}/poster/poster_1.jpg`;
            const defaultImagePath = '/static/images/default_movie.png';

            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card';

            movieCard.innerHTML = `
                <div class="movie-content-wrapper">
                    <div class="image-container">
                        <img src="${imagePath}" alt="${movie.main_title}" onerror="this.onerror=null; this.src='${defaultImagePath}';">
                    </div>
                    <div class="info-section">
                        <h2>${movie.main_title}</h2>
                        <div class="metadata">
                            <p><strong>Director:</strong> ${movie.director}</p>
                            <p><strong>Actors:</strong> ${movie.actors}</p>
                            <p class="inline-meta">${movie.runtime} min | ${movie.formats} | FSK ${movie.format_fsk} | &#9733; ${movie.imdb_rating}</p>
                            <p class="standort"><strong>Location:</strong> ${movie.format_standort || 'N/A'}</p>
                            <p class="countries"><strong>Countries:</strong> ${movie.countries}</p>
                        </div>
                    </div>
                    <div class="overview-section">
                        ${movie.overview.length > 350
                            ? `<p>${movie.overview.substring(0, 350)}... <a href="/movie/${movie.movie_id}" class="more-link">mehr</a></p>`
                            : `<p>${movie.overview} <a href="/movie/${movie.movie_id}" class="more-link">mehr</a></p>`}
                    </div>
                </div>
            `;

            movieContainer.appendChild(movieCard);
        });
    } else {
        movieContainer.innerHTML = `<p class="no-movies-message">No movies match the selected filters.</p>`;
    }
}
