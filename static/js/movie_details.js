// File: static/js/movie_details.js

document.addEventListener('DOMContentLoaded', function () {
    // Retrieve the movie folder name from the data attribute
    const body = document.querySelector('body');
    const movieFolder = body.getAttribute('data-folder');

    if (!movieFolder) {
        console.error('No folder name found in data attributes.');
        return;
    }

    // Fetch backdrop images
    fetch(`/get_backdrop_images/${encodeURIComponent(movieFolder)}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            let backdrops = data.images;
            const swiperWrapper = document.querySelector('.swiper-wrapper');

            if (backdrops.length === 0) {
                console.warn('No backdrops found. Attempting to use poster images as backdrops.');
                // Fetch poster images if no backdrops are available
                return fetch(`/get_poster_images/${encodeURIComponent(movieFolder)}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! Status: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(posterData => {
                        backdrops = posterData.images;
                        if (backdrops.length === 0) {
                            console.warn('No posters found to use as backdrops.');
                            // Optionally, you can display a default backdrop here
                            return;
                        }
                        // Use the posters as backdrops
                        populateSwiper(backdrops, movieFolder, 'poster');
                        initializeSwiper(); // Initialize Swiper after adding slides
                    });
            }

            // Clear existing slides if any
            swiperWrapper.innerHTML = '';

            // Add backdrop slides
            populateSwiper(backdrops, movieFolder, 'backdrop');
            initializeSwiper(); // Initialize Swiper after adding slides
        })
        .catch(error => {
            console.error('Error fetching backdrop images:', error);
        });

    /**
     * Function to populate Swiper with images
     */
    function populateSwiper(images, folderName, type) {
        const swiperWrapper = document.querySelector('.swiper-wrapper');
        images.forEach(image => {
            const slide = document.createElement('div');
            slide.className = 'swiper-slide';
            const img = document.createElement('img');
            img.src = `/movie_images/${encodeURIComponent(folderName)}/${type}/${encodeURIComponent(image)}`;
            img.alt = `${type.charAt(0).toUpperCase() + type.slice(1)} Image`;
            slide.appendChild(img);
            swiperWrapper.appendChild(slide);
        });
    }

    /**
     * Initialize Swiper Carousel
     */
    function initializeSwiper() {
        var swiper = new Swiper('.swiper-container', {
            loop: true,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
            slidesPerView: 1,
            spaceBetween: 10,
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
        });
    }
});
