// File: static/js/movie_details.js
document.addEventListener('DOMContentLoaded', function () {
    const body = document.querySelector('body');
    const movieFolder = body.getAttribute('data-folder');

    // Apply the saved theme
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);

    if (!movieFolder) {
        console.error('No folder name found in data attributes.');
        return;
    }

    // ---------------------------------------------
    // Handle clicks on actor/director `.person-link`
    // ---------------------------------------------
    document.addEventListener('click', function (event) {
        // Check if the clicked element itself matches `.person-link`
        // or if a child was clicked. Use .closest() if needed.
        const link = event.target.closest('.person-link');
        if (link) {
            event.preventDefault();
            const personName = link.getAttribute('data-person-name');
            if (personName) {
                // Navigate to the catalog page with ?search=PersonName
                window.location.href = `/catalog?search=${encodeURIComponent(personName)}`;
            }
        }
    });

    // ---------------------------------------------
    // The rest of your existing code for backdrops, tooltips, etc.
    // ---------------------------------------------

    // 1) Fetch backdrop images, if any
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
                // Fallback to poster images
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
                            return; // optionally show a default
                        }
                        // Use posters as backdrops
                        populateSwiper(backdrops, movieFolder, 'poster');
                        initializeSwiper();
                    });
            }

            // Otherwise, populate with actual backdrops
            swiperWrapper.innerHTML = '';
            populateSwiper(backdrops, movieFolder, 'backdrop');
            initializeSwiper();
        })
        .catch(error => {
            console.error('Error fetching backdrop images:', error);
        });

    function populateSwiper(images, folderName, type) {
        const swiperWrapper = document.querySelector('.swiper-wrapper');
        if (!swiperWrapper) {
            console.error('Swiper wrapper not found.');
            return;
        }
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

    function initializeSwiper() {
        new Swiper('.swiper-container', {
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

    // Example: initialize tooltips for persons
    initializeDirectorAndActorsTooltips();
    function initializeDirectorAndActorsTooltips() {
        // ... your existing code for Tippy.js or images ...
    }

    // Listen for filter-icon, genres, countries ...
    document.addEventListener('click', function (event) {
        // Example if you have icons for filters
        if (event.target.matches('.filter-icon') || event.target.closest('.filter-icon')) {
            event.preventDefault();
            const personName = event.target.closest('.filter-icon').getAttribute('data-person-name');
            window.location.href = `/catalog?search=${encodeURIComponent(personName)}`;
        } else if (event.target.matches('.genre-filter')) {
            event.preventDefault();
            const genre = event.target.getAttribute('data-genre');
            window.location.href = `/catalog?genres=${encodeURIComponent(genre)}`;
        } else if (event.target.matches('.country-filter')) {
            event.preventDefault();
            const country = event.target.getAttribute('data-country');
            window.location.href = `/catalog?countries=${encodeURIComponent(country)}`;
        }
    });

});
