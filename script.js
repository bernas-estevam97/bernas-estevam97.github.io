// Clean URL: Strip '/index.html' from browser address bar for clean presentation
// Skipped on file:// (opening index.html directly), where replaceState throws and would stop this whole script.
if (window.location.protocol.startsWith('http') && window.location.pathname.endsWith('/index.html')) {
    const cleanPath = window.location.pathname.replace(/\/index\.html$/, '/') + window.location.search + window.location.hash;
    try {
        window.history.replaceState(null, '', cleanPath);
    } catch (e) {
        // Cosmetic only; never block the rest of the page.
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hasIO = 'IntersectionObserver' in window;

    /* ==========================================================================
       1. Theme (initial theme is set by the inline script in <head>)
       ========================================================================== */
    const themeToggle = document.getElementById('themeToggle');

    function syncThemeToggle() {
        if (!themeToggle) return;
        const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
        themeToggle.setAttribute('aria-label', `Switch to ${next} theme`);
        const label = themeToggle.querySelector('.theme-toggle-label');
        if (label) label.textContent = `${next === 'dark' ? 'Dark' : 'Light'} theme`;
    }

    syncThemeToggle();

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
            try {
                localStorage.setItem('theme', root.dataset.theme);
            } catch (e) {
                // Storage blocked; the choice still applies for this visit.
            }
            syncThemeToggle();
        });
    }

    // Follow OS theme changes until the visitor picks one explicitly
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        let stored = null;
        try {
            stored = localStorage.getItem('theme');
        } catch (err) {
            // Ignore
        }
        if (!stored) {
            root.dataset.theme = e.matches ? 'dark' : 'light';
            syncThemeToggle();
        }
    });

    /* ==========================================================================
       2. Footer year
       ========================================================================== */
    const yearEl = document.getElementById('year');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    /* ==========================================================================
       3. Header: border once past the hero, mobile menu, current section
       ========================================================================== */
    const header = document.getElementById('siteHeader');
    const hero = document.querySelector('.hero');
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');

    if (header && hero && hasIO) {
        new IntersectionObserver(([entry]) => {
            header.classList.toggle('is-scrolled', !entry.isIntersecting);
        }, { rootMargin: '-80px 0px 0px 0px' }).observe(hero);
    }

    function setMenu(open) {
        if (!menuToggle || !navLinks) return;
        navLinks.classList.toggle('is-open', open);
        menuToggle.setAttribute('aria-expanded', String(open));
        menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        const icon = menuToggle.querySelector('i');
        if (icon) icon.className = open ? 'ph ph-x' : 'ph ph-list';
    }

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => setMenu(!navLinks.classList.contains('is-open')));
        navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') setMenu(false);
        });
    }

    const sectionLinks = document.querySelectorAll('.nav-links a');

    if (sectionLinks.length > 0 && hasIO) {
        const linkBySection = new Map();
        sectionLinks.forEach(link => {
            const section = document.querySelector(link.getAttribute('href'));
            if (section) linkBySection.set(section, link);
        });

        const sectionObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                sectionLinks.forEach(link => link.removeAttribute('aria-current'));
                linkBySection.get(entry.target).setAttribute('aria-current', 'true');
            });
        }, { rootMargin: '-45% 0px -50% 0px' });

        linkBySection.forEach((link, section) => sectionObserver.observe(section));
    }

    /* ==========================================================================
       4. Reveal sections as they enter the viewport
       ========================================================================== */
    const revealEls = document.querySelectorAll('.reveal');

    if (hasIO) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-in');
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

        revealEls.forEach(el => revealObserver.observe(el));
    } else {
        revealEls.forEach(el => el.classList.add('is-in'));
    }

    /* ==========================================================================
       5. Research software filter
       ========================================================================== */
    const bento = document.getElementById('bento');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projects = document.querySelectorAll('.project');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            filterButtons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
            projects.forEach(project => {
                project.hidden = filter !== 'all' && project.dataset.category !== filter;
                project.classList.add('is-in');
            });
            if (bento) bento.classList.toggle('is-filtered', filter !== 'all');
        });
    });

    /* ==========================================================================
       6. Hero canvas: drifting tracked keypoints with short trails,
          linked when close, like pose-tracking output
       ========================================================================== */
    const canvas = document.getElementById('heroCanvas');

    if (canvas && canvas.getContext) {
        const ctx = canvas.getContext('2d');
        const TRAIL = 22;
        const LINK_DIST = 130;
        let points = [];
        let width = 0;
        let height = 0;
        let running = false;
        let frame = 0;

        function makePoints() {
            const count = Math.round(Math.min(60, Math.max(22, (width * height) / 20000)));
            points = Array.from({ length: count }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                angle: Math.random() * Math.PI * 2,
                speed: 0.25 + Math.random() * 0.45,
                turn: (Math.random() - 0.5) * 0.02,
                trail: []
            }));
        }

        function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            makePoints();
        }

        function step() {
            points.forEach(p => {
                // Smooth wandering: slowly varying turn rate
                p.turn += (Math.random() - 0.5) * 0.004;
                p.turn = Math.max(-0.03, Math.min(0.03, p.turn));
                p.angle += p.turn;
                p.x += Math.cos(p.angle) * p.speed;
                p.y += Math.sin(p.angle) * p.speed;

                // Wrap around edges, clearing the trail so no line crosses the canvas
                if (p.x < -20 || p.x > width + 20 || p.y < -20 || p.y > height + 20) {
                    p.x = (p.x + width + 40) % (width + 40) - 20;
                    p.y = (p.y + height + 40) % (height + 40) - 20;
                    p.trail = [];
                }

                p.trail.push(p.x, p.y);
                if (p.trail.length > TRAIL * 2) p.trail.splice(0, 2);
            });
        }

        function draw() {
            const accent = getComputedStyle(root).getPropertyValue('--accent').trim() || '#2f5fd0';
            ctx.clearRect(0, 0, width, height);
            ctx.strokeStyle = accent;
            ctx.fillStyle = accent;
            ctx.lineWidth = 1;

            // Trails
            points.forEach(p => {
                const t = p.trail;
                for (let i = 2; i < t.length; i += 2) {
                    ctx.globalAlpha = (i / t.length) * 0.35;
                    ctx.beginPath();
                    ctx.moveTo(t[i - 2], t[i - 1]);
                    ctx.lineTo(t[i], t[i + 1]);
                    ctx.stroke();
                }
            });

            // Links between nearby points
            for (let i = 0; i < points.length; i++) {
                for (let j = i + 1; j < points.length; j++) {
                    const dx = points[i].x - points[j].x;
                    const dy = points[i].y - points[j].y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < LINK_DIST) {
                        ctx.globalAlpha = (1 - dist / LINK_DIST) * 0.28;
                        ctx.beginPath();
                        ctx.moveTo(points[i].x, points[i].y);
                        ctx.lineTo(points[j].x, points[j].y);
                        ctx.stroke();
                    }
                }
            }

            // Keypoints
            ctx.globalAlpha = 0.75;
            points.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1;
        }

        function loop() {
            if (!running) return;
            step();
            draw();
            frame = requestAnimationFrame(loop);
        }

        function start() {
            if (running || reduceMotion.matches) return;
            running = true;
            frame = requestAnimationFrame(loop);
        }

        function stop() {
            running = false;
            cancelAnimationFrame(frame);
        }

        function drawStill() {
            // Pre-roll so the still frame shows trails instead of bare dots
            for (let i = 0; i < TRAIL; i++) step();
            draw();
        }

        resize();
        drawStill();

        if ('ResizeObserver' in window) {
            let resizeTimer;
            new ResizeObserver(() => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    resize();
                    drawStill();
                }, 150);
            }).observe(canvas);
        }

        // Only animate while the hero is on screen and the tab is visible
        let heroVisible = true;
        if (hasIO) {
            new IntersectionObserver(([entry]) => {
                heroVisible = entry.isIntersecting;
                heroVisible && !document.hidden ? start() : stop();
            }).observe(canvas);
        } else {
            start();
        }

        document.addEventListener('visibilitychange', () => {
            document.hidden || !heroVisible ? stop() : start();
        });

        reduceMotion.addEventListener('change', () => {
            if (reduceMotion.matches) {
                stop();
                drawStill();
            } else if (heroVisible) {
                start();
            }
        });

        // Redraw a still frame on theme change so colours update under reduced motion
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                if (!running) draw();
            });
        }
    }

    /* ==========================================================================
       7. Web3Forms contact submission
       ========================================================================== */
    const contactForm = document.getElementById('contactForm');
    const formResult = document.getElementById('formResult');
    const submitBtn = document.getElementById('submitBtn');

    if (contactForm) {
        contactForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const hCaptchaResponse = contactForm.querySelector('[name="h-captcha-response"]')?.value;

            if (!hCaptchaResponse) {
                showFormResult('Complete the captcha before sending.', 'error');
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Sending...';
            }
            showFormResult('', '');

            try {
                const response = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    body: new FormData(contactForm)
                });

                const data = await response.json();

                if (data.success) {
                    showFormResult('Message sent. I will reply by email.', 'success');
                    contactForm.reset();

                    if (window.hcaptcha) {
                        window.hcaptcha.reset();
                    }
                } else {
                    showFormResult(data.message || 'The message could not be sent. Try again, or reach me on LinkedIn.', 'error');
                }
            } catch (error) {
                console.error('Form error:', error);
                showFormResult('Network error. Check your connection and try again, or reach me on LinkedIn.', 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Send message';
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
