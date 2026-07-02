let currentHeroImages = {};
let currentGalleryData = [];

// Deterministic daily rotation helper
function getDailyHeroAndGallery() {
    const allImages = [];
    if (typeof HERO_IMAGES !== 'undefined') {
        allImages.push(HERO_IMAGES.leftTop, HERO_IMAGES.leftBottom, HERO_IMAGES.rightTop, HERO_IMAGES.rightBottom);
    }
    if (typeof GALLERY_DATA !== 'undefined') {
        allImages.push(...GALLERY_DATA);
    }

    // Filter duplicates
    const uniqueImages = allImages.filter((item, index, self) => 
        item && item.src && self.findIndex(t => t.src === item.src) === index
    );

    if (uniqueImages.length < 4) {
        return { hero: HERO_IMAGES, gallery: GALLERY_DATA };
    }

    // Daily seed based on current date
    const today = new Date();
    const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

    function seededRandom(seed) {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
    }

    // Seeded shuffle
    const shuffled = [...uniqueImages];
    let seed = dateSeed;
    for (let i = shuffled.length - 1; i > 0; i--) {
        const r = seededRandom(seed);
        seed += 1;
        const j = Math.floor(r * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Return all images in the gallery, shuffled daily for a fresh layout each day
    return { hero: {}, gallery: shuffled };
}

document.addEventListener('DOMContentLoaded', () => {
    // Generate daily rotation set
    const daily = getDailyHeroAndGallery();
    currentHeroImages = daily.hero;
    currentGalleryData = daily.gallery;

    initHeroSection();
    initGallerySection();
    initScrollAnimations();
    initFormHandler();
    initHudTooltip();
    initScrollProgressBar();
    initCursorGlowSpotlight();
    initMobileMenu();
    initBookingModalTriggers();
});

/**
 * 0. MOBILE HAMBURGER MENU
 * Toggles the slide-down mobile nav panel; closes when a link is tapped or outside is tapped.
 */
function initMobileMenu() {
    const hamburger  = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');
    if (!hamburger || !mobileMenu) return;

    function openMenu() {
        hamburger.classList.add('open');
        mobileMenu.classList.add('open');
        hamburger.setAttribute('aria-expanded', 'true');
        mobileMenu.setAttribute('aria-hidden', 'false');
    }

    function closeMenu() {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
    }

    function toggleMenu() {
        hamburger.classList.contains('open') ? closeMenu() : openMenu();
    }

    hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });

    // Close when any mobile nav link is tapped
    mobileMenu.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Close when tapping outside the menu/navbar
    document.addEventListener('click', (e) => {
        if (!mobileMenu.contains(e.target) && !hamburger.contains(e.target)) {
            closeMenu();
        }
    });
}

/**
 * 1. HERO SECTION DYNAMIC RENDER
 * Injects image cards from HERO_IMAGES config into the left and right columns.
 */
function initHeroSection() {
    const leftCol = document.getElementById('hero-col-left');
    const rightCol = document.getElementById('hero-col-right');

    if (!leftCol || !rightCol || typeof HERO_IMAGES === 'undefined') return;

    // Render Left Column (Scatter Stack: Top 100% width, Bottom 85% width aligned right)
    leftCol.innerHTML = `
        <div class="scatter-card scatter-card-left-top fade-in-up" style="animation-delay: 0.2s;">
            <div class="scatter-img-wrapper">
                <img src="${HERO_IMAGES.leftTop.src}" alt="${HERO_IMAGES.leftTop.title}" onerror="handleImageError(this)">
                <div class="scatter-card-overlay">
                    <span class="scatter-card-title">${HERO_IMAGES.leftTop.title}</span>
                </div>
            </div>
        </div>
        <div class="scatter-card scatter-card-left-bottom fade-in-up" style="animation-delay: 0.4s;">
            <div class="scatter-img-wrapper">
                <img src="${HERO_IMAGES.leftBottom.src}" alt="${HERO_IMAGES.leftBottom.title}" onerror="handleImageError(this)">
                <div class="scatter-card-overlay">
                    <span class="scatter-card-title">${HERO_IMAGES.leftBottom.title}</span>
                </div>
            </div>
        </div>
    `;

    // Render Right Column (Scatter Stack: Top tall preview with badge, Bottom shorter image)
    rightCol.innerHTML = `
        <div class="scatter-card scatter-card-right-top fade-in-up" style="animation-delay: 0.3s;">
            <div class="scatter-img-wrapper tall-wrapper">
                <img src="${HERO_IMAGES.rightTop.src}" alt="${HERO_IMAGES.rightTop.title}" onerror="handleImageError(this)">
                <div class="scatter-badge-overlay">${HERO_IMAGES.rightTop.badge || 'Focal Precision'}</div>
                <div class="scatter-card-overlay">
                    <span class="scatter-card-title">${HERO_IMAGES.rightTop.title}</span>
                </div>
            </div>
        </div>
        <div class="scatter-card scatter-card-right-bottom fade-in-up" style="animation-delay: 0.5s;">
            <div class="scatter-img-wrapper">
                <img src="${HERO_IMAGES.rightBottom.src}" alt="${HERO_IMAGES.rightBottom.title}" onerror="handleImageError(this)">
                <div class="scatter-card-overlay">
                    <span class="scatter-card-title">${HERO_IMAGES.rightBottom.title}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * 2. GALLERY DYNAMIC RENDER
 * Generates asymmetric masonry items dynamically from GALLERY_DATA.
 * Implements a "Load More" system to prevent excessively long page scroll heights.
 */
function initGallerySection() {
    const grid = document.getElementById('gallery-grid');
    const loadMoreContainer = document.getElementById('load-more-container');
    if (!grid || !currentGalleryData) return;

    grid.innerHTML = '';
    if (loadMoreContainer) loadMoreContainer.innerHTML = '';

    const initialCount = 12;
    let renderedCount = 0;

    function renderItems(start, count) {
        const end = Math.min(start + count, currentGalleryData.length);
        for (let i = start; i < end; i++) {
            const item = currentGalleryData[i];
            let spanClass = '';
            if (item.span === 'landscape') {
                spanClass = 'span-col-2';
            } else if (item.span === 'portrait') {
                spanClass = 'span-row-2';
            }
            const delay = 0.1 * (renderedCount % 4);
            const positionStyle = item.position ? ` style="object-position: ${item.position};"` : '';

            const card = document.createElement('div');
            card.className = `gallery-card ${spanClass} scroll-reveal`;
            card.style.transitionDelay = `${delay}s`;

            card.innerHTML = `
                <div class="gallery-img-container">
                    <img src="${item.src}" alt="${item.title}" class="gallery-img"${positionStyle} onerror="handleImageError(this)">
                    <div class="gallery-overlay">
                        <div class="gallery-metadata">
                            <span class="gallery-category">${item.category}</span>
                            <h3 class="gallery-card-title">${item.title}</h3>
                            <p class="gallery-caption">${item.caption}</p>
                            <button class="gallery-book-btn" onclick="event.stopPropagation(); openBookingModal('${item.title.replace(/'/g, "\\'")}', '${item.category.replace(/'/g, "\\'")}')">
                                <i class="fa-solid fa-calendar-check"></i> Book This Style
                            </button>
                        </div>
                    </div>
                </div>
            `;

            grid.appendChild(card);
            renderedCount++;
        }
    }

    // Render first batch
    renderItems(0, initialCount);

    // If there are more items, render the Load More button
    if (currentGalleryData.length > initialCount && loadMoreContainer) {
        const btn = document.createElement('button');
        btn.className = 'btn-load-more';
        btn.innerHTML = 'LOAD MORE WORK';
        btn.addEventListener('click', () => {
            renderItems(renderedCount, currentGalleryData.length - renderedCount);
            loadMoreContainer.style.display = 'none';
            // Re-initialize scroll animations for the newly added elements
            if (typeof initScrollAnimations === 'function') {
                initScrollAnimations();
            }
        });
        loadMoreContainer.appendChild(btn);
    }
}

/**
 * Image Error Fallback Handler
 * If a local image fails to load, shows an aesthetic typography placeholder instead of breaking layout.
 */
function handleImageError(imageElement) {
    const parent = imageElement.parentElement;
    if (!parent) return;

    // Create a luxury aesthetic editorial placeholder
    const altText = imageElement.alt || "Cinematic Frame";
    const placeholder = document.createElement('div');
    placeholder.className = 'fallback-image-placeholder';
    placeholder.innerHTML = `
        <div class="placeholder-content">
            <i class="fa-solid fa-camera-retro"></i>
            <span class="placeholder-title">${altText}</span>
            <span class="placeholder-sub">AKSA INFINITE CLICKZ</span>
        </div>
    `;

    // Replace the image with the placeholder
    imageElement.style.display = 'none';
    parent.appendChild(placeholder);
}

/**
 * 3. INTERSECTION OBSERVER FOR SCROLL REVEALS
 * Triggers elegant micro-animations when elements scroll into view.
 */
function initScrollAnimations() {
    const reveals = document.querySelectorAll('.scroll-reveal, .section-header, .booking-card');
    
    const observerOptions = {
        root: null,
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                // Optional: Stop observing after reveal for performance
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    reveals.forEach(element => {
        element.classList.add('reveal-init');
        revealObserver.observe(element);
    });

    // Add scroll listener for Navbar shrink and backdrop intensity
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

/**
 * 4. BOOKING FORM HANDLER
 * Process commission form inputs and transitions into a premium success screen.
 */
function initFormHandler() {
    const form = document.getElementById('booking-form');
    const feedback = document.getElementById('form-feedback');

    if (!form || !feedback) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Add loading state to button
        const button = form.querySelector('.btn-submit-gradient');
        const originalHtml = button.innerHTML;
        button.disabled = true;
        button.innerHTML = `<span>SUBMITTING COMMISSION...</span> <i class="fa-solid fa-spinner fa-spin"></i>`;

        // Simulate secure database submission
        setTimeout(() => {
            // Animate transition
            form.style.opacity = '0';
            setTimeout(() => {
                form.style.display = 'none';
                feedback.style.display = 'flex';
                setTimeout(() => {
                    feedback.style.opacity = '1';
                    feedback.style.transform = 'translateY(0)';
                }, 50);
            }, 300);
        }, 1500);
    });
}

/**
 * 5. HUD WHATSAPP TOOLTIP PULSE
 * Shows a subtle tooltip inviting user inquiry, fading out after a few seconds.
 */
function initHudTooltip() {
    const whatsappBtn = document.getElementById('whatsapp-btn');
    if (!whatsappBtn) return;

    const tooltip = whatsappBtn.querySelector('.hud-tooltip');
    if (!tooltip) return;

    // Show tooltip after a slight delay
    setTimeout(() => {
        tooltip.classList.add('visible');
        
        // Hide tooltip after 5 seconds of visibility
        setTimeout(() => {
            tooltip.classList.remove('visible');
        }, 5000);
    }, 2000);
    
    // Toggle tooltip visibility on button hover
    whatsappBtn.addEventListener('mouseenter', () => {
        tooltip.classList.add('visible');
    });
    whatsappBtn.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
    });
}

/**
 * 6. SCROLL PROGRESS BAR
 * Appends and updates a thin gradient loading bar at the top of viewport.
 */
function initScrollProgressBar() {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress-bar';
    document.body.prepend(bar);

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        bar.style.width = `${scrollPercent}%`;
    });
}

/**
 * 7. CURSOR GLOW SPOTLIGHT
 * Binds mouse position coordinates to CSS variables for dynamic spotlight shading.
 */
function initCursorGlowSpotlight() {
    window.addEventListener('mousemove', (e) => {
        document.body.style.setProperty('--mouse-x', `${e.clientX}px`);
        document.body.style.setProperty('--mouse-y', `${e.clientY}px`);
    });
}

/**
 * 8. BOOKING INTAKE POPUP MODAL CONTROLLER
 * Handles modal transitions, backdrop clicks, close triggers, and style-based pre-fills.
 */
function initBookingModalTriggers() {
    const navBtn = document.getElementById('nav-book-btn');
    const heroBtn = document.getElementById('hero-book-btn');
    const mLinkBtn = document.getElementById('m-link-book');
    const closeBtn = document.getElementById('modal-close-btn');
    const bookingSection = document.getElementById('book');

    if (navBtn) navBtn.addEventListener('click', () => openBookingModal());
    if (heroBtn) heroBtn.addEventListener('click', () => openBookingModal());
    if (mLinkBtn) mLinkBtn.addEventListener('click', () => openBookingModal());
    if (closeBtn) closeBtn.addEventListener('click', () => closeBookingModal());

    if (bookingSection) {
        bookingSection.addEventListener('click', (e) => {
            // Close if clicked directly on the overlay backdrop
            if (e.target === bookingSection || e.target.classList.contains('section-container')) {
                closeBookingModal();
            }
        });
    }
}

window.openBookingModal = function(title = '', category = '') {
    const bookingSection = document.getElementById('book');
    const msgField = document.getElementById('message');
    if (!bookingSection) return;

    bookingSection.classList.add('open');
    document.body.style.overflow = 'hidden'; // Stop background scrolling

    // Auto-populate message based on gallery item click
    if (title && msgField) {
        msgField.value = `Hi! I am interested in booking a session in the style of "${title}" (${category}). Please send details!`;
        msgField.focus();
    }

    // Close mobile menu if open
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');
    if (hamburger && hamburger.classList.contains('open')) {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
    }
};

window.closeBookingModal = function() {
    const bookingSection = document.getElementById('book');
    if (!bookingSection) return;

    bookingSection.classList.remove('open');
    document.body.style.overflow = ''; // Re-enable background scrolling
};

