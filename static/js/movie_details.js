// File: static/js/movie_details.js

document.addEventListener('DOMContentLoaded', function () {
    // Retrieve the movie folder name from the data attribute
    const body = document.querySelector('body');
    const movieFolder = body.getAttribute('data-folder');

    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);

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

    /**
     * Initialize Tooltips for Director and Actors
     */
    initializeDirectorAndActorsTooltips();

    function initializeDirectorAndActorsTooltips() {
        // Fetch person images and set up tooltips
        fetch(`/get_person_images/${encodeURIComponent(movieFolder)}`)
            .then(response => response.json())
            .then(data => {
                const availableImages = data.images;

                // Function to get person image by matching the name in availableImages
                function getPersonImage(person) {
                    for (const image of availableImages) {
                        if (image.startsWith(person.trim())) {
                            return `/movie_images/${encodeURIComponent(movieFolder)}/person/${encodeURIComponent(image)}`;
                        }
                    }
                    return '/static/images/default_person.png'; // Fallback to default person image
                }

                // Select director and actors elements
                const directorElements = document.querySelectorAll('.director .person-tooltip');
                const actorElements = document.querySelectorAll('.actors .person-tooltip');

                [...directorElements, ...actorElements].forEach(element => {
                    const personName = element.getAttribute('data-person-name');
                    const tmdbId = element.getAttribute('data-tmdb-id');
                    const personImage = getPersonImage(personName);

                    const tooltipContent = `
                        <div class="tooltip-person-content">
                            <a href="https://www.themoviedb.org/person/${tmdbId}" target="_blank">
                                <img src="${personImage}" alt="${personName}" onerror="this.onerror=null; this.src='/static/images/default_person.png';">
                                <span class="tooltip-name">${personName}</span>
                            </a>
                        </div>
                    `;
                    // Initialize Tippy.js tooltip
                    tippy(element, {
                        content: tooltipContent,
                        allowHTML: true,
                        interactive: true,
                        theme: 'light-border',
                        placement: 'top',
                        arrow: true,
                    });
                });
            })
            .catch(error => {
                console.error('Error fetching person images:', error);
            });
    }

    // Event Listener for Filter Icons next to persons
    document.addEventListener('click', function (event) {
        if (event.target.matches('.filter-icon') || event.target.closest('.filter-icon')) {
            event.preventDefault();
            const personName = event.target.closest('.filter-icon').getAttribute('data-person-name');
            // Redirect to catalog page with search query
            window.location.href = `/catalog?search=${encodeURIComponent(personName)}`;
        }
    });

    // Event Listener for Genres and Countries
    document.addEventListener('click', function (event) {
        if (event.target.matches('.genre-filter')) {
            event.preventDefault();
            const genre = event.target.getAttribute('data-genre');
            // Redirect to catalog page with genre filter
            window.location.href = `/catalog?genres=${encodeURIComponent(genre)}`;
        } else if (event.target.matches('.country-filter')) {
            event.preventDefault();
            const country = event.target.getAttribute('data-country');
            // Redirect to catalog page with country filter
            window.location.href = `/catalog?countries=${encodeURIComponent(country)}`;
        }
    });

});
