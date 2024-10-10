import {carouselTitle, genreFontMapping, toggleFiltersButton, searchDropdownContainer, clearAllFiltersButton,showAllResultsButton, movieContainer } from './entry.js';  // Example import
import {getSelectedValues } from './filter.js';  // Example import




export function initializeSwiper() {
    const swiperContainer = document.querySelector('.swiper-container');
    if (!swiperContainer) {
        console.error("initializeSwiper: Swiper container nicht gefunden.");
        return;
    }

    const totalSlides = swiperContainer.querySelectorAll('.swiper-slide').length;
    const slidesPerViewDesktop = 4; // Base number for desktop

    const swiper = new Swiper('.swiper-container', {
        loop: totalSlides > slidesPerViewDesktop,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
        slidesPerView: 'auto', // Allows Swiper to adjust based on slide width
        spaceBetween: 10,
        watchOverflow: true, // Disable Swiper if not enough slides

        // Responsive breakpoints
        breakpoints: {
            // When window width is >= 1400px
            2200: {
                slidesPerView: 13,
                spaceBetween: 10
            },
            2000: {
                slidesPerView: 10,
                spaceBetween: 10
            },
            1800: {
                slidesPerView: 9,
                spaceBetween: 10
            },
            1600: {
                slidesPerView: 8,
                spaceBetween: 10
            },
        
            1400: {
                slidesPerView: 6.5,
                spaceBetween: 10
            },
            // When window width is >= 1200px
            1200: {
                slidesPerView: 6,
                spaceBetween: 6
            },
            // When window width is >= 1024px
            1024: {
                slidesPerView: 5,
                spaceBetween: 8
            },
            // When window width is >= 900px
            900: {
                slidesPerView: 4,
                spaceBetween: 10
            },
            // When window width is >= 768px
            768: {
                slidesPerView: 3,
                spaceBetween: 12
            },
            // When window width is >= 640px
            640: {
                slidesPerView: 2.5,
                spaceBetween: 14
            },
            // When window width is < 640px
            0: { // Mobile-first
                slidesPerView: 2.5,
                spaceBetween: 16
            }
        },

        // Adjust to handle slides dynamically
        on: {
            resize: function () {
                this.update(); // Update Swiper on window resize
            },
            init: function () {
                if (totalSlides <= this.params.slidesPerView) {
                    this.loopDestroy(); // Disable loop if not enough slides
                }
            }
        }
    });
}
/**
 * Function to update the carousel title based on selected genre
 */
export function updateCarouselTitle() {
    const selectedGenres = getSelectedValues('genre-dropdown-list');
    if (selectedGenres.length === 1) {
        const genre = selectedGenres[0];
        carouselTitle.textContent = genreFontMapping[genre] ? `${genre} Filmtitel` : `${genre} Filme`;
        // Apply the corresponding font
        carouselTitle.style.fontFamily = genreFontMapping[genre] || "'Open Sans', sans-serif";
    } else if (selectedGenres.length > 1) {
        carouselTitle.textContent = "Verschiedene Genres";
        carouselTitle.style.fontFamily = "'Open Sans', sans-serif";
    } else {
        carouselTitle.textContent = "Hervorgehobene Filme";
        carouselTitle.style.fontFamily = "'Cinzel', serif";
    }
}