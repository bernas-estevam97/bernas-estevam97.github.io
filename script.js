document.addEventListener('DOMContentLoaded', () => {
    /* ==========================================================================
       1. Theme Switcher (Dark / Light Mode)
       ========================================================================== */
    const themeToggleBtn = document.getElementById('themeToggle');
    const htmlElement = document.documentElement;

    // Detect initial theme: stored preference -> OS preference -> default 'dark'
    const storedTheme = localStorage.getItem('theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const initialTheme = storedTheme ? storedTheme : (prefersLight ? 'light' : 'dark');

    function applyTheme(theme) {
        htmlElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        if (themeToggleBtn) {
            themeToggleBtn.setAttribute('title', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
            themeToggleBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
        }
    }

    applyTheme(initialTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme') || 'dark';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
        });
    }

    // Synchronize if user changes OS color scheme and hasn't explicitly set localStorage
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            applyTheme(e.matches ? 'light' : 'dark');
        }
    });

    /* ==========================================================================
       2. Dynamic Year in Footer
       ========================================================================== */
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    /* ==========================================================================
       3. Navbar Scroll Effect & Mobile Drawer
       ========================================================================== */
    const navbar = document.getElementById('navbar');
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    const backToTopBtn = document.getElementById('backToTop');

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;

        // Navbar blur elevation
        if (navbar) {
            if (scrollY > 30) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }

        // Back to top visibility
        if (backToTopBtn) {
            if (scrollY > 400) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        }

        // Active link scroll spy
        highlightActiveNavLink();
    });

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-xmark');
            }
        });

        // Close mobile menu when a nav link is clicked
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                const icon = menuToggle.querySelector('i');
                if (icon) {
                    icon.classList.add('fa-bars');
                    icon.classList.remove('fa-xmark');
                }
            });
        });
    }

    // Active link highlighting
    function highlightActiveNavLink() {
        const sections = document.querySelectorAll('section[id]');
        const scrollPosition = window.scrollY + 120;

        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');
            const link = document.querySelector(`.nav-link[href="#${id}"]`);

            if (link) {
                if (scrollPosition >= top && scrollPosition < top + height) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            }
        });
    }

    /* ==========================================================================
       4. Animated Impact Counter Numbers
       ========================================================================== */
    const counters = document.querySelectorAll('.counter');
    let countersStarted = false;

    if (counters.length > 0 && 'IntersectionObserver' in window) {
        const statsObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !countersStarted) {
                    countersStarted = true;
                    counters.forEach(counter => {
                        const target = parseInt(counter.getAttribute('data-target'), 10) || 0;
                        const duration = 1600;
                        const start = 0;
                        const startTime = performance.now();

                        function updateCount(currentTime) {
                            const elapsed = currentTime - startTime;
                            const progress = Math.min(elapsed / duration, 1);
                            // Ease out quartic function
                            const easeProgress = 1 - Math.pow(1 - progress, 4);
                            const currentVal = Math.floor(start + (target - start) * easeProgress);

                            counter.textContent = currentVal.toLocaleString();

                            if (progress < 1) {
                                requestAnimationFrame(updateCount);
                            } else {
                                counter.textContent = target.toLocaleString();
                            }
                        }

                        requestAnimationFrame(updateCount);
                    });
                    observer.disconnect();
                }
            });
        }, { threshold: 0.2 });

        const statsSection = document.querySelector('.stats-grid');
        if (statsSection) {
            statsObserver.observe(statsSection);
        }
    }

    /* ==========================================================================
       5. Interactive Featured Projects: Slider, Filter Tabs & View Modes
       ========================================================================== */
    const projectsContainer = document.getElementById('projectsContainer');
    const sliderTrack = document.getElementById('sliderTrack');
    const prevBtn = document.getElementById('prevSlide');
    const nextBtn = document.getElementById('nextSlide');
    const sliderCounter = document.getElementById('sliderCounter');
    const sliderDots = document.getElementById('sliderDots');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const viewSliderBtn = document.getElementById('viewSlider');
    const viewGridBtn = document.getElementById('viewGrid');

    if (sliderTrack) {
        const allCards = Array.from(sliderTrack.querySelectorAll('.project-card'));
        let visibleCards = [...allCards];
        let currentIndex = 0;

        function getVisibleCardsPerView() {
            return window.innerWidth <= 992 ? 1 : 2;
        }

        function getMaxIndex() {
            const cardsPerView = getVisibleCardsPerView();
            return Math.max(0, visibleCards.length - cardsPerView);
        }

        function updateSliderPosition() {
            if (projectsContainer && projectsContainer.classList.contains('grid-mode')) {
                return;
            }

            const cardsPerView = getVisibleCardsPerView();
            const maxIdx = getMaxIndex();

            if (currentIndex > maxIdx) currentIndex = maxIdx;
            if (currentIndex < 0) currentIndex = 0;

            if (visibleCards.length === 0) {
                sliderTrack.style.transform = 'translateX(0px)';
                if (sliderCounter) sliderCounter.textContent = '00 / 00';
                return;
            }

            // Calculate translation based on card width and gap
            const firstCard = visibleCards[0];
            if (firstCard) {
                const cardWidth = firstCard.getBoundingClientRect().width;
                const gap = 28; // matches CSS gap
                const shift = currentIndex * (cardWidth + gap);
                sliderTrack.style.transform = `translateX(-${shift}px)`;
            }

            // Update Counter
            if (sliderCounter) {
                const currentDisplay = String(currentIndex + 1).padStart(2, '0');
                const totalDisplay = String(visibleCards.length).padStart(2, '0');
                sliderCounter.textContent = `${currentDisplay} / ${totalDisplay}`;
            }

            // Update Prev / Next button states
            if (prevBtn) prevBtn.disabled = currentIndex === 0;
            if (nextBtn) nextBtn.disabled = currentIndex >= maxIdx;

            // Update active dot
            if (sliderDots) {
                const dots = sliderDots.querySelectorAll('.slider-dot');
                dots.forEach((dot, idx) => {
                    dot.classList.toggle('active', idx === currentIndex);
                });
            }
        }

        function renderDots() {
            if (!sliderDots) return;
            sliderDots.innerHTML = '';
            const maxIdx = getMaxIndex();
            const totalDots = maxIdx + 1;

            if (totalDots <= 1) return;

            for (let i = 0; i < totalDots; i++) {
                const dot = document.createElement('button');
                dot.classList.add('slider-dot');
                dot.setAttribute('aria-label', `Slide ${i + 1}`);
                if (i === currentIndex) dot.classList.add('active');
                dot.addEventListener('click', () => {
                    currentIndex = i;
                    updateSliderPosition();
                });
                sliderDots.appendChild(dot);
            }
        }

        // Navigation button listeners
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentIndex > 0) {
                    currentIndex--;
                    updateSliderPosition();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const maxIdx = getMaxIndex();
                if (currentIndex < maxIdx) {
                    currentIndex++;
                    updateSliderPosition();
                }
            });
        }

        // Category Filter Handling
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filter = btn.getAttribute('data-filter');

                allCards.forEach(card => {
                    const category = card.getAttribute('data-category');
                    if (filter === 'all' || category === filter) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });

                visibleCards = allCards.filter(card => card.style.display !== 'none');
                currentIndex = 0;
                renderDots();
                updateSliderPosition();
            });
        });

        // View Mode Toggles: Carousel Slider vs Grid
        if (viewSliderBtn && viewGridBtn) {
            viewSliderBtn.addEventListener('click', () => {
                viewSliderBtn.classList.add('active');
                viewGridBtn.classList.remove('active');
                projectsContainer.classList.remove('grid-mode');
                renderDots();
                updateSliderPosition();
            });

            viewGridBtn.addEventListener('click', () => {
                viewGridBtn.classList.add('active');
                viewSliderBtn.classList.remove('active');
                projectsContainer.classList.add('grid-mode');
                sliderTrack.style.transform = 'none';
            });
        }

        // Touch swipe support for mobile
        let touchStartX = 0;
        let touchEndX = 0;

        sliderTrack.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        sliderTrack.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });

        function handleSwipe() {
            const threshold = 50;
            const maxIdx = getMaxIndex();

            if (touchStartX - touchEndX > threshold) {
                // Swipe Left -> Next Slide
                if (currentIndex < maxIdx) {
                    currentIndex++;
                    updateSliderPosition();
                }
            } else if (touchEndX - touchStartX > threshold) {
                // Swipe Right -> Prev Slide
                if (currentIndex > 0) {
                    currentIndex--;
                    updateSliderPosition();
                }
            }
        }

        // Window resize event handler
        window.addEventListener('resize', () => {
            renderDots();
            updateSliderPosition();
        });

        // Initial setup
        renderDots();
        updateSliderPosition();
    }

    /* ==========================================================================
       6. Web3Forms Contact Submission Handler
       ========================================================================== */
    const contactForm = document.getElementById("contactForm");
    const formResult = document.getElementById("formResult");
    const submitBtn = document.getElementById("submitBtn");

    if (contactForm) {
        contactForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const hCaptchaResponse = contactForm.querySelector('[name="h-captcha-response"]')?.value;

            if (!hCaptchaResponse) {
                showFormResult("Please complete the captcha verification before sending.", "error");
                return;
            }

            // Set loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Sending...</span>';
            }
            showFormResult("Sending message...", "");

            const formData = new FormData(contactForm);

            try {
                const response = await fetch("https://api.web3forms.com/submit", {
                    method: "POST",
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    showFormResult("Thank you! Your message has been sent successfully. I will get back to you soon.", "success");
                    contactForm.reset();

                    if (window.hcaptcha) {
                        window.hcaptcha.reset();
                    }
                } else {
                    showFormResult(data.message || "Something went wrong. Please try again or reach out directly on LinkedIn.", "error");
                }
            } catch (error) {
                console.error("Form error:", error);
                showFormResult("A network error occurred. Please verify your connection or reach out on LinkedIn.", "error");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> <span>Send Message</span>';
                }
            }
        });
    }

    function showFormResult(message, type) {
        if (!formResult) return;
        formResult.textContent = message;
        formResult.className = 'form-result';
        if (type) {
            formResult.classList.add(type);
        }
    }
});

