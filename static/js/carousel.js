// File: static/js/carousel.js

import { carouselTitle, genreFontMapping } from './entry.js';
import { getSelectedValues } from './filter.js';

export function initializeSwiper() {
    const swiperContainer = document.querySelector('.swiper-container');
    if (!swiperContainer) {
        console.error("initializeSwiper: Swiper container not found.");
        return;
    }

    const totalSlides = swiperContainer.querySelectorAll('.swiper-slide').length;
    const slidesPerViewDesktop = 7; // Base number for desktop

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
        slidesPerView: 1, // Set default slides per view
        spaceBetween: 10,
        watchOverflow: true, // Disable Swiper if not enough slides

        simulateTouch: true,
        touchRatio: 1,
        touchAngle: 45,
        longSwipes: true,
        longSwipesRatio: 0.5,
        longSwipesMs: 300,
        followFinger: true,
        allowTouchMove: true,

        // Responsive breakpoints
        breakpoints: {
            2200: {
                slidesPerView: 13,
                spaceBetween: 10,
            },
            2000: {
                slidesPerView: 10,
                spaceBetween: 10,
            },
            1800: {
                slidesPerView: 9,
                spaceBetween: 10,
            },
            1600: {
                slidesPerView: 8,
                spaceBetween: 10,
            },
            1400: {
                slidesPerView: 6.5,
                spaceBetween: 10,
            },
            1200: {
                slidesPerView: 6,
                spaceBetween: 6,
            },
            1024: {
                slidesPerView: 5,
                spaceBetween: 8,
            },
            900: {
                slidesPerView: 4,
                spaceBetween: 10,
            },
            768: {
                slidesPerView: 3,
                spaceBetween: 12,
            },
            640: {
                slidesPerView: 2.5,
                spaceBetween: 14,
            },
            0: {
                slidesPerView: 2.5,
                spaceBetween: 16,
            },
        },

        on: {
            resize: function () {
                this.update(); // Update Swiper on window resize
            },
            init: function () {
                if (totalSlides <= this.params.slidesPerView) {
                    this.loopDestroy(); // Disable loop if not enough slides
                }
            },
        },
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
