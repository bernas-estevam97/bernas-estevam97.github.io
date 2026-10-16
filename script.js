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
    /* ==========================================================================
       1. Theme (initial theme is set by the inline script in <head>)
       ========================================================================== */
    const root = document.documentElement;
    const themeToggle = document.getElementById('themeToggle');

    function syncThemeToggle() {
        if (!themeToggle) return;
        const isDark = root.dataset.theme === 'dark';
        themeToggle.setAttribute('aria-pressed', String(isDark));
        const label = themeToggle.querySelector('.theme-toggle-label');
        if (label) label.textContent = isDark ? 'Light theme' : 'Dark theme';
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
       3. Highlight the current section in the sidebar index
       ========================================================================== */
    const tocLinks = document.querySelectorAll('.toc a');

    if (tocLinks.length > 0 && 'IntersectionObserver' in window) {
        const linkBySection = new Map();
        tocLinks.forEach(link => {
            const section = document.querySelector(link.getAttribute('href'));
            if (section) linkBySection.set(section, link);
        });

        const sectionObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                tocLinks.forEach(link => link.removeAttribute('aria-current'));
                linkBySection.get(entry.target).setAttribute('aria-current', 'true');
            });
        }, { rootMargin: '-35% 0px -60% 0px' });

        linkBySection.forEach((link, section) => sectionObserver.observe(section));
    }

    /* ==========================================================================
       4. Research software filter
       ========================================================================== */
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projects = document.querySelectorAll('.project');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;
            filterButtons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
            projects.forEach(project => {
                project.hidden = filter !== 'all' && project.dataset.category !== filter;
            });
        });
    });

    /* ==========================================================================
       5. Web3Forms contact submission
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
