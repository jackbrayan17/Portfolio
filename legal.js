/* =========================================================
   Jack Brayan — Legal & Support Pages Script
   Theme · Language Switcher · FAQ Accordion · Interactive Forms
   ========================================================= */

(function () {
  'use strict';

  // --- 1. Language Handling ---
  const DEFAULT_LANG = 'fr';
  const LANG_STORAGE_KEY = 'jb-legal-lang';

  function getInitialLang() {
    // Check URL param first (?lang=en or ?lang=fr)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get('lang');
      if (urlLang === 'en' || urlLang === 'fr') return urlLang;
    } catch (e) {}

    // Check localStorage
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY);
      if (stored === 'en' || stored === 'fr') return stored;
    } catch (e) {}

    // Check browser preference if English
    if (navigator.language && navigator.language.toLowerCase().startsWith('en')) {
      return 'en';
    }

    return DEFAULT_LANG;
  }

  function setPageLanguage(lang) {
    const validLang = lang === 'en' ? 'en' : 'fr';
    document.documentElement.dataset.pageLang = validLang;
    document.documentElement.lang = validLang;

    try {
      localStorage.setItem(LANG_STORAGE_KEY, validLang);
    } catch (e) {}

    // Update active state on toggle buttons
    document.querySelectorAll('.lang-btn').forEach((btn) => {
      const btnLang = btn.dataset.langTarget;
      btn.classList.toggle('active', btnLang === validLang);
      btn.setAttribute('aria-pressed', String(btnLang === validLang));
    });
  }

  // --- 2. Theme Handling ---
  const THEME_KEY = 'jb-theme';
  function initTheme() {
    let savedTheme = 'dark';
    try {
      savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    } catch (e) {}
    applyTheme(savedTheme);
  }

  function applyTheme(theme) {
    const t = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch (e) {}

    const meta = document.getElementById('theme-color-meta');
    if (meta) {
      meta.setAttribute('content', t === 'light' ? '#fbf7ef' : '#080d16');
    }

    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.innerHTML = t === 'light'
        ? '<i class="fa-solid fa-moon"></i>'
        : '<i class="fa-solid fa-sun"></i>';
      themeBtn.setAttribute('aria-label', t === 'light' ? 'Mode sombre' : 'Mode clair');
    }
  }

  function toggleTheme() {
    const current = document.documentElement.dataset.theme || 'dark';
    applyTheme(current === 'light' ? 'dark' : 'light');
  }

  // --- 3. FAQ Accordion ---
  function initFaq() {
    document.querySelectorAll('.faq-item').forEach((item) => {
      const question = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      if (!question || !answer) return;

      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');

        // Close other items in the same group optionally
        const parentGroup = item.closest('.faq-group');
        if (parentGroup) {
          parentGroup.querySelectorAll('.faq-item.open').forEach((other) => {
            if (other !== item) {
              other.classList.remove('open');
              const otherAns = other.querySelector('.faq-answer');
              if (otherAns) otherAns.style.maxHeight = null;
            }
          });
        }

        if (isOpen) {
          item.classList.remove('open');
          answer.style.maxHeight = null;
          question.setAttribute('aria-expanded', 'false');
        } else {
          item.classList.add('open');
          answer.style.maxHeight = answer.scrollHeight + 40 + 'px';
          question.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  // --- 4. Forms Handling (Support & Data Deletion) ---
  function initForms() {
    // Support Form
    const supportForm = document.getElementById('support-form');
    if (supportForm) {
      supportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!supportForm.checkValidity()) {
          supportForm.reportValidity();
          return;
        }

        const fd = new FormData(supportForm);
        const name = fd.get('name') || '';
        const email = fd.get('email') || '';
        const platform = fd.get('platform') || '';
        const appName = fd.get('app_name') || 'General';
        const category = fd.get('category') || '';
        const message = fd.get('message') || '';

        const subject = `[Support Request] ${appName} - ${category} (${name})`;
        const body = [
          `Name: ${name}`,
          `Email: ${email}`,
          `Platform: ${platform}`,
          `App / Service: ${appName}`,
          `Category: ${category}`,
          `Date: ${new Date().toISOString()}`,
          '',
          'Message:',
          message
        ].join('\n');

        const mailtoUrl = `mailto:hello@jackbrayan.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        
        const statusEl = document.getElementById('support-form-status');
        if (statusEl) {
          const isEn = document.documentElement.dataset.pageLang === 'en';
          statusEl.innerHTML = isEn
            ? '<i class="fa-solid fa-circle-check" style="color:var(--sky-300)"></i> Opening your email client to send the support ticket...'
            : '<i class="fa-solid fa-circle-check" style="color:var(--sky-300)"></i> Ouverture de votre messagerie pour transmettre votre demande de support...';
        }

        window.location.href = mailtoUrl;
      });
    }

    // Data Deletion Form
    const deletionForm = document.getElementById('deletion-form');
    if (deletionForm) {
      deletionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!deletionForm.checkValidity()) {
          deletionForm.reportValidity();
          return;
        }

        const fd = new FormData(deletionForm);
        const name = fd.get('name') || '';
        const email = fd.get('email') || '';
        const appName = fd.get('app_name') || '';
        const userId = fd.get('user_id') || 'N/A';
        const details = fd.get('details') || '';

        const subject = `[DATA DELETION REQUEST - Google/Apple/Meta Compliant] ${appName} - ${email}`;
        const body = [
          '*** FORMAL USER DATA DELETION REQUEST ***',
          `Name: ${name}`,
          `Account Email: ${email}`,
          `Target App / Service: ${appName}`,
          `User ID / Profile URL (if applicable): ${userId}`,
          `Request Timestamp: ${new Date().toISOString()}`,
          '',
          'User Statement:',
          'I hereby formally request the permanent deletion of my account, profile, and all associated personal data in accordance with Google Play User Data Policy, Apple App Store Guideline 5.1, Meta Developer Platform Terms, and GDPR/CCPA regulations.',
          '',
          'Additional Notes:',
          details
        ].join('\n');

        const mailtoUrl = `mailto:hello@jackbrayan.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        const statusEl = document.getElementById('deletion-form-status');
        if (statusEl) {
          const isEn = document.documentElement.dataset.pageLang === 'en';
          statusEl.innerHTML = isEn
            ? '<i class="fa-solid fa-circle-check" style="color:var(--sky-300)"></i> Opening your email client to transmit your formal deletion request. You will receive email confirmation within 48h.'
            : '<i class="fa-solid fa-circle-check" style="color:var(--sky-300)"></i> Ouverture de votre messagerie pour transmettre votre demande de suppression. Une confirmation vous sera adressée sous 48h.';
        }

        window.location.href = mailtoUrl;
      });
    }
  }

  // --- 5. Mobile Navigation ---
  function initMobileMenu() {
    const btn = document.getElementById('mobile-menu-toggle');
    const panel = document.getElementById('mobile-nav-panel');
    if (!btn || !panel) return;

    btn.addEventListener('click', () => {
      const isOpen = panel.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(isOpen));
      btn.innerHTML = isOpen
        ? '<i class="fa-solid fa-xmark"></i>'
        : '<i class="fa-solid fa-bars"></i>';
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    panel.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        panel.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = '<i class="fa-solid fa-bars"></i>';
        document.body.style.overflow = '';
      });
    });
  }

  // --- 6. Quick Copy Helper ---
  function initCopyButtons() {
    document.querySelectorAll('[data-copy-text]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const text = btn.dataset.copyText;
        try {
          await navigator.clipboard.writeText(text);
          const original = btn.innerHTML;
          btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
          setTimeout(() => { btn.innerHTML = original; }, 2000);
        } catch (e) {}
      });
    });
  }

  // --- 7. Year Updater ---
  function initYear() {
    document.querySelectorAll('#year, .current-year').forEach((el) => {
      el.textContent = new Date().getFullYear();
    });
  }

  // --- DOM Ready ---
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setPageLanguage(getInitialLang());

    // Bind lang buttons
    document.querySelectorAll('.lang-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        setPageLanguage(btn.dataset.langTarget);
      });
    });

    // Bind theme button
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleTheme();
      });
    }

    initFaq();
    initForms();
    initMobileMenu();
    initCopyButtons();
    initYear();
  });
})();

