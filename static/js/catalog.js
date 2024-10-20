// File: static/js/catalog.js

// Import any dependencies (if necessary)
import { movieContainer } from './entry.js';  // Import the movie container element

// Lookup table for country names to ISO 3166-1 alpha-2 codes
const countryCodeMap = {
    "United States": "US",
    "Germany": "DE",
    "France": "FR",
    "United Kingdom": "UK",
    "Netherlands": "NL",
    "Iceland": "IS",
    "Belgium": "BE",
    "Russia": "RU",
    "Saudi Arabia": "SA",
    // Add more countries as needed
};

// Function to transform countries into their short versions
function getShortCountries(countries) {
    // If the countries array exists and is not empty, map full names to short versions
    if (Array.isArray(countries) && countries.length > 0) {
        return countries.map(country => countryCodeMap[country] || country).join(', ');
    }
    return "Unknown Countries";
}


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
    
            // Handle cases where 'director', 'actors', 'countries', and 'genres' are arrays or null
            const directors = Array.isArray(movie.director) && movie.director.length > 0 ? movie.director.join(', ') : "Unknown Director";
            let actors = movie.actors ? (Array.isArray(movie.actors) ? movie.actors.join(', ') : movie.actors) : "Unknown Actors";

            // Truncate actors' names if they exceed 75 characters (including spaces)
            if (actors.length > 75) {
                actors = actors.substring(0, 72) + '...';
            }
            
            // Generate the HTML for countries with custom tooltips
            const countries = Array.isArray(movie.countries) && movie.countries.length > 0
                ? movie.countries.map(country => {
                    const match = country.match(/(.*?)\s\((.*?)\)/); // Extract full name and short code
                    const fullName = match ? match[1] : country;
                    const shortCode = match ? match[2] : country;
                    return `<span class="country-tooltip" data-country="${fullName}">${shortCode}</span>`;
                }).join(', ')
                : "Unknown Countries";



            const genres = Array.isArray(movie.genres) && movie.genres.length > 0 ? movie.genres.join(', ') : "Unknown Genres";
    
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
        
            movieContainer.appendChild(movieCard);
        });
    } else {
        movieContainer.innerHTML = `<p class="no-movies-message">No movies match the selected filters.</p>`;
    }
}
