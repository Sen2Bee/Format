// Import any dependencies (if necessary)
import { movieContainer } from './entry.js';  // Example import

/**
 * Funktion zur Aktualisierung der Movie Listings basierend auf den Filterergebnissen
 */
export function updateMovieListings(movies) {
    if (!movieContainer) {
        console.error("updateMovieListings: movieContainer Element nicht gefunden.");
        return;
    }

    movieContainer.innerHTML = "";  // Bestehende Einträge löschen

    if (movies.length > 0) {
        movies.forEach(movie => {
            const imagePath = `/movie_images/${encodeURIComponent(movie.folder_name)}/poster/poster_1.jpg`;
            const defaultImagePath = '/static/images/default_movie.png';

            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card poster-background';
            movieCard.style.backgroundImage = `url('${imagePath}')`;

            const maxOverviewLength = window.innerWidth <= 768 ? 150 : 350;
            movieCard.innerHTML = `
                <div class="movie-content-wrapper">
                    <div class="image-container">
                        <img src="${imagePath}" alt="${movie.main_title}" onerror="this.onerror=null; this.src='${defaultImagePath}';">
                    </div>
                    <div class="info-section">
                        <div class="header-section">
                            <h2>${movie.main_title}</h2>
                            <!-- Weitere Elemente wie Buttons oder Icons -->
                        </div>
                        <div class="metadata">
                            <p><strong>Regie:</strong> ${movie.director}</p>
                            <p><strong>Schauspieler:</strong> ${movie.actors}</p>
                            <p class="inline-meta">${movie.runtime} min | ${movie.formats} | FSK ${movie.format_fsk} | &#9733; ${movie.imdb_rating}</p>
                            <p class="standort"><strong>Standort:</strong> ${movie.format_standort || 'N/A'}</p>
                            <p class="countries"><strong>Länder:</strong> ${movie.countries}</p> <!-- Länderinformationen -->
                        </div>
                    </div>
                    <div class="overview-section">
                        ${movie.overview.length > maxOverviewLength
                            ? `<p>${movie.overview.substring(0, maxOverviewLength)}... <a href="/movie/${movie.movie_id}" class="more-link">mehr</a></p>`
                            : `<p>${movie.overview} <a href="/movie/${movie.movie_id}" class="more-link">mehr</a></p>`}
                    </div>
                </div>
            `;

            movieContainer.appendChild(movieCard);
        });
    } else {
        movieContainer.innerHTML = `<p class="no-movies-message">Keine Filme entsprechen den ausgewählten Filtern.</p>`;
    }
}
