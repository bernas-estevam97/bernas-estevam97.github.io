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
       6. Hero canvas: hindlimb gait stick diagram
          A tracked limb (iliac crest, hip, knee, ankle, toe) walks across the
          bottom of the hero, leaving stroboscopic stick traces, the toe
          trajectory and paw prints, as in kinematic gait analysis figures.
       ========================================================================== */
    const canvas = document.getElementById('heroCanvas');

    if (canvas && canvas.getContext) {
        const ctx = canvas.getContext('2d');

        // Gait parameters in limb units (scaled to screen by `u`)
        const CYCLE = 1.15;          // seconds per step cycle
        const STANCE = 0.6;          // fraction of the cycle the paw is on the ground
        const STRIDE = 92;           // stride length
        const FEMUR = 46;
        const TIBIA = 50;
        const FOOT = 26;
        const HIP_HEIGHT = 84;
        const LIFT = 22;             // toe clearance during swing
        const SNAP_EVERY = 0.26;     // seconds between stick snapshots
        const FADE = 7;              // seconds for traces to fade out

        let width = 0;
        let height = 0;
        let u = 1;
        let ground = 0;
        let running = false;
        let frame = 0;
        let lastTs = 0;

        let t = 0;                   // time since the current crossing started
        let x0 = 0;                  // hip x at t = 0
        let clock = 0;               // total elapsed time, used for fading
        let lastSnap = 0;
        let lastStep = -1;
        let snaps = [];
        let toePath = [];
        let prints = [];

        function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = canvas.clientWidth;
            height = canvas.clientHeight;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            // Scale the limb with the hero so it reads on large screens and fits on phones
            u = Math.max(0.7, Math.min(1.7, height / 820, width / 620));
            ground = height - 52 * u;
            resetCrossing();
            snaps = [];
            toePath = [];
            prints = [];
        }

        function resetCrossing() {
            t = 0;
            x0 = -140 * u;
            lastSnap = -SNAP_EVERY;
            lastStep = -1;
        }

        // Pose of one limb at time `time`, with a phase offset for the contralateral limb
        function pose(time, offset) {
            const s = STRIDE * u;
            const speed = s / CYCLE;
            const local = time / CYCLE + offset;
            const step = Math.floor(local);
            const phase = local - step;

            const hipX = x0 + speed * time;
            const hipY = ground - HIP_HEIGHT * u + Math.cos(phase * Math.PI * 4) * 2.5 * u;

            // Paw lands 0.45 strides ahead of where the hip is at touchdown
            const contactX = x0 + speed * (step - offset) * CYCLE + 0.45 * s;
            let toeX;
            let toeY;
            let footAngle;

            if (phase < STANCE) {
                const k = phase / STANCE;
                toeX = contactX;
                toeY = ground;
                footAngle = 0.25 + k * 0.7;           // heel rises through stance
            } else {
                const k = (phase - STANCE) / (1 - STANCE);
                const ease = k * k * (3 - 2 * k);
                toeX = contactX + s * ease;
                toeY = ground - Math.sin(Math.PI * k) * LIFT * u;
                footAngle = 0.95 - ease * 0.7;        // foot swings back to flat
            }

            const ankleX = toeX - Math.cos(footAngle) * FOOT * u;
            const ankleY = toeY - Math.sin(footAngle) * FOOT * u;

            // Two-link inverse kinematics for the knee, which points forward
            const a = FEMUR * u;
            const b = TIBIA * u;
            const dx = ankleX - hipX;
            const dy = ankleY - hipY;
            const d = Math.min(Math.hypot(dx, dy), a + b - 0.5);
            const base = Math.atan2(dy, dx);
            const bend = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d))));
            const kneeA = [hipX + Math.cos(base - bend) * a, hipY + Math.sin(base - bend) * a];
            const kneeB = [hipX + Math.cos(base + bend) * a, hipY + Math.sin(base + bend) * a];
            const knee = kneeA[0] > kneeB[0] ? kneeA : kneeB;

            const crest = [hipX - 34 * u, hipY - 16 * u];

            return {
                step,
                phase,
                contactX,
                points: [crest, [hipX, hipY], knee, [ankleX, ankleY], [toeX, toeY]]
            };
        }

        function update(dt) {
            t += dt;
            clock += dt;

            const main = pose(t, 0);

            if (main.step !== lastStep && main.phase < STANCE) {
                lastStep = main.step;
                prints.push({ x: main.contactX, born: clock });
            }

            if (t - lastSnap >= SNAP_EVERY) {
                lastSnap = t;
                snaps.push({ points: main.points, born: clock });
            }

            toePath.push({ x: main.points[4][0], y: main.points[4][1], born: clock });

            const alive = item => clock - item.born < FADE;
            snaps = snaps.filter(alive);
            toePath = toePath.filter(alive);
            prints = prints.filter(alive);

            // Start a new crossing once the limb has left the screen
            if (main.points[0][0] > width + 60 * u) resetCrossing();
        }

        function strokeLimb(points, alpha, lineWidth) {
            ctx.globalAlpha = alpha;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            ctx.moveTo(points[0][0], points[0][1]);
            for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
            ctx.stroke();
        }

        function draw() {
            const styles = getComputedStyle(root);
            const accent = styles.getPropertyValue('--accent').trim() || '#2f5fd0';
            const muted = styles.getPropertyValue('--muted').trim() || '#646b7b';
            const surface = styles.getPropertyValue('--surface').trim() || '#ffffff';

            ctx.clearRect(0, 0, width, height);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Ground line
            ctx.strokeStyle = muted;
            ctx.globalAlpha = 0.25;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 7]);
            ctx.beginPath();
            ctx.moveTo(0, ground + 0.5);
            ctx.lineTo(width, ground + 0.5);
            ctx.stroke();
            ctx.setLineDash([]);

            // Paw prints: a pad plus four toes
            ctx.fillStyle = accent;
            prints.forEach(p => {
                const life = 1 - (clock - p.born) / FADE;
                ctx.globalAlpha = 0.28 * life;
                ctx.beginPath();
                ctx.ellipse(p.x - 6 * u, ground + 10 * u, 7 * u, 3 * u, 0, 0, Math.PI * 2);
                ctx.fill();
                [[-1.6, -3.6], [1.8, -4.6], [5, -3], [6.4, 0.4]].forEach(([tx, ty]) => {
                    ctx.beginPath();
                    ctx.arc(p.x + tx * u, ground + 10 * u + ty * u, 1.5 * u, 0, Math.PI * 2);
                    ctx.fill();
                });
            });

            // Stroboscopic stick traces
            ctx.strokeStyle = muted;
            snaps.forEach(s => {
                const life = 1 - (clock - s.born) / FADE;
                strokeLimb(s.points, 0.35 * life * life, 1.1);
            });

            // Toe trajectory
            ctx.strokeStyle = accent;
            ctx.lineWidth = 1.25;
            for (let i = 1; i < toePath.length; i++) {
                const a = toePath[i - 1];
                const b = toePath[i];
                if (b.x < a.x) continue;               // skip the jump between crossings
                ctx.globalAlpha = 0.5 * (1 - (clock - b.born) / FADE);
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();
            }

            // Contralateral limb, half a cycle out of phase and fainter
            ctx.strokeStyle = accent;
            strokeLimb(pose(t, 0.5).points, 0.3, 2);

            // Current limb with tracking markers
            const main = pose(t, 0).points;
            strokeLimb(main, 0.9, 2.25);
            ctx.globalAlpha = 1;
            main.forEach(([px, py]) => {
                ctx.beginPath();
                ctx.arc(px, py, 4 * u, 0, Math.PI * 2);
                ctx.fillStyle = surface;
                ctx.fill();
                ctx.lineWidth = 1.75;
                ctx.strokeStyle = accent;
                ctx.stroke();
            });
            ctx.globalAlpha = 1;
        }

        function loop(ts) {
            if (!running) return;
            const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0;
            lastTs = ts;
            update(dt);
            draw();
            frame = requestAnimationFrame(loop);
        }

        function start() {
            if (running || reduceMotion.matches) return;
            running = true;
            lastTs = 0;
            frame = requestAnimationFrame(loop);
        }

        function stop() {
            running = false;
            cancelAnimationFrame(frame);
        }

        function drawStill() {
            // Pre-roll the walk so the first frame already shows a stick diagram:
            // two thirds across for the static (reduced motion) version, a quarter
            // across when animating so the limb is seen walking under the content.
            resetCrossing();
            snaps = [];
            toePath = [];
            prints = [];
            const speed = (STRIDE * u) / CYCLE;
            const target = (width * (reduceMotion.matches ? 0.66 : 0.25) - x0) / speed;
            while (t < target) update(1 / 60);
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
