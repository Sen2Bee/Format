document.addEventListener('DOMContentLoaded', function () {
 
    // Call the wrapper function after the DOM content is fully loaded
    initializeHeroSectionIfPresent();

    // Call truncateText function for overview sections
    truncateText('.info-section.overview p', 500);

    // Call the function on initial load and resize
    adjustTitleFontSize();
    window.addEventListener('resize', adjustTitleFontSize);

    // Call the function on initial load and window resize
    adjustMetadataWidth();
    window.addEventListener('resize', adjustMetadataWidth);

    // Call the function on initial load and window resize
    updateMovieCardBackground();
    window.addEventListener('resize', updateMovieCardBackground);

});


// Wrapper function to check the presence of hero section before initializing
function initializeHeroSectionIfPresent() {
    function manageHeroAndTaglines() {
        // Taglines array for the hero section
        const taglines = [
            "Entdecke unsere Sammlung von fast 20.000 Filmen.",
            "Finde deine Lieblingsfilme und entdecke neue Perlen.",
            "Tauche ein in cineastische Meisterwerke.",
            "Erlebe das Beste aus Arthouse- und klassischem Kino.",
            "Dein Zugang zu zeitlosen Filmen.",
            "Die Filmsammlung des FORMAT Filmkunst-Verleihs.",
            "Für eine Handvoll Dollar kannst du von den Möglichkeiten profitieren.",
            "Über 19.000 Filme - die größte private Filmsammlung Mitteldeutschlands.",
            "Independent- und Arthouse-Filme auf DVD, Blu-ray und 3D-Blu-ray.",
            "'Unendliche Weiten' an Informationen zu den Filmen.",
            "Cineastische Raritäten, Arthouse und Blockbuster - alles unter einem Dach.",
            "FILMKUNST-Verleih seit über 18 Jahren."
        ];
    
        // Hero images array
        const heroImages = [
            '/static/images/backdrop_1.jpg',
            '/static/images/backdrop_2.jpg',
            '/static/images/backdrop_3.jpg',
            '/static/images/backdrop_4.jpg'
        ];
    
        // Elements for the hero section
        const taglineElement = document.getElementById('dynamic-tagline');
        const heroImageElement = document.querySelector('.hero-image img');
        const logoElement = document.querySelector('.logo span');
    
        // Check for the presence of critical elements before proceeding
        if (!taglineElement || !heroImageElement || !logoElement) {
            console.info("Hero elements not found on this page. Skipping hero section initialization.");
            return; // Exit the function if elements are not found
        }
    
        // Initial setup for tagline and hero image
        let currentTaglineIndex = Math.floor(Math.random() * taglines.length);
        taglineElement.textContent = taglines[currentTaglineIndex];
        taglineElement.classList.add('fade-in');
    
        // Set a random hero image
        const randomImage = heroImages[Math.floor(Math.random() * heroImages.length)];
        heroImageElement.src = randomImage;
    
        // Change taglines periodically
        setInterval(() => {
            taglineElement.classList.remove('fade-in');
            taglineElement.classList.add('fade-out');
    
            setTimeout(() => {
                currentTaglineIndex = (currentTaglineIndex + 1) % taglines.length;
                taglineElement.textContent = taglines[currentTaglineIndex];
                taglineElement.classList.remove('fade-out');
                taglineElement.classList.add('fade-in');
    
                // Randomly change logo color
                const randomChance = Math.random();
                logoElement.style.color = randomChance < 0.3 ? 'red' : 'white';
            }, 1000); // Matches transition duration
        }, 5000);
    }    
    // Run the hero management code only if the relevant elements exist on the page
    const heroSectionExists = document.querySelector('.hero-image img') && document.getElementById('dynamic-tagline') && document.querySelector('.logo span');
    
    if (heroSectionExists) {
        manageHeroAndTaglines(); // Initialize only if hero section elements are present
    } else {
        console.info("Hero section elements not found on this page. Skipping hero management.");
    }
}

// Truncate text for overview sections
function truncateText(selector, maxLength) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
        const originalText = element.textContent;
        if (originalText.length > maxLength) {
            const truncatedText = originalText.substring(0, maxLength).trim() + '...';
            element.textContent = truncatedText;
        }
    });
}
// Adjust title font size dynamically based on overflow
function adjustTitleFontSize() {
    const movieCards = document.querySelectorAll('.movie-card');
    movieCards.forEach(card => {
        const titleContainer = card.querySelector('.titles');
        if (titleContainer) {
            const mainTitle = titleContainer.querySelector('.main-title');
            const releaseYear = titleContainer.querySelector('.release-year');
            
            if (mainTitle && releaseYear) {
                // Reset to default size
                mainTitle.style.fontSize = '1.6em';
                releaseYear.style.fontSize = '0.8em';
                
                // Check if the title overflows
                if (titleContainer.scrollWidth > titleContainer.clientWidth) {
                    let fontSize = parseFloat(window.getComputedStyle(mainTitle).fontSize);
                    while (titleContainer.scrollWidth > titleContainer.clientWidth && fontSize > 0.8) {
                        fontSize -= 0.1;
                        mainTitle.style.fontSize = fontSize + 'em';
                        releaseYear.style.fontSize = (fontSize * 0.7) + 'em';  // Adjust year proportionally
                    }
                }
            }
        }
    });
}

// Adjust the width of metadata elements dynamically
function adjustMetadataWidth() {
    const metadataElements = document.querySelectorAll('.movie-metadata');
    metadataElements.forEach(metadata => {
        const parentWidth = metadata.parentElement.clientWidth;
        metadata.style.maxWidth = parentWidth + 'px';
    });
}


// Function to update movie card background images based on screen size
function updateMovieCardBackground() {
const movieCards = document.querySelectorAll('.movie-card.poster-background');
movieCards.forEach(card => {
    const mobileImage = card.getAttribute('data-mobile-image');
    const desktopImage = card.getAttribute('data-desktop-image');

    // Set the correct background based on the screen size
    if (window.innerWidth >= 1024) {
        if (desktopImage) {
            card.style.backgroundImage = `url(${desktopImage})`;
        }
    } else {
        if (mobileImage) {
            card.style.backgroundImage = `url(${mobileImage})`;
        }
    }
});
}