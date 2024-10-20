// File: static/js/catalog.js

// Import any dependencies (if necessary)
import { movieContainer } from './entry.js';  // Import the movie container element

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
    
            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card';
    
            // Handle cases where 'director', 'actors', 'countries' are arrays or null
            const directors = Array.isArray(movie.director) && movie.director.length > 0 ? movie.director.join(', ') : "Unknown Director";
            // If 'actors' is a string, use it directly. If it's an array, join it into a string.
            let actors = movie.actors ? (Array.isArray(movie.actors) ? movie.actors.join(', ') : movie.actors) : "Unknown Actors";

            // Truncate actors' names if they exceed 75 characters (including spaces)
            if (actors.length > 75) {
                actors = actors.substring(0, 72) + '...';
            }
            const countries = Array.isArray(movie.countries) && movie.countries.length > 0 ? movie.countries.join(', ') : "Unknown Countries";
    
            // Fallback to 'overview' if 'format_inhalt' is null or empty
            let content = movie.format_inhalt ? movie.format_inhalt : movie.overview ? movie.overview : "Keine Inhaltsangabe verfügbar.";
            if (content.length > 150) {
                content = content.substring(0, 150) + '...';
            }
            
            // Fallback for IMDb rating if it's null or not provided
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
                    <h2>${movie.main_title} (${new Date(movie.release_date).getFullYear()})</h2>
                    <div class="metadata">
                        <p><strong>Director:</strong> ${directors}</p>
                        <p><strong>Actors:</strong> ${actors}</p>
                        <p class="inline-meta">${movie.runtime} min | ${movie.formats} | FSK ${movie.format_fsk} | &#9733; ${imdb_rating}</p>
                        <p class="standort"><strong>Location:</strong> ${movie.format_standort || 'N/A'}</p>
                        <p class="countries"><strong>Countries:</strong> ${countries}</p>
                    </div>
                </div>
                <div class="overview-section">
                    <p>${content} <a href="/movie/${movie.movie_id}" class="more-link">mehr</a></p>
                </div>
            </div>
        `;
        
    
            movieContainer.appendChild(movieCard);
        });
    } else {
        movieContainer.innerHTML = `<p class="no-movies-message">No movies match the selected filters.</p>`;
    }
    

}
