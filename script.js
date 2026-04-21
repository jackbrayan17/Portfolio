/* =========================================================
   Jack Brayan — Portfolio JS
   Nav · Scroll · Dynamic project cards
   ========================================================= */

// ---- Smooth anchor scroll ----
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (!href || href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// ---- Mobile menu ----
const hamburgerBtn = document.getElementById('hamburger-btn');
const mobileMenu = document.getElementById('mobile-menu');

function toggleMenu() {
  if (!mobileMenu) return;
  const isOpen = !mobileMenu.classList.contains('translate-x-full');
  if (isOpen) {
    mobileMenu.classList.add('translate-x-full');
    mobileMenu.setAttribute('aria-hidden', 'true');
    hamburgerBtn && hamburgerBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  } else {
    mobileMenu.classList.remove('translate-x-full');
    mobileMenu.setAttribute('aria-hidden', 'false');
    hamburgerBtn && hamburgerBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
}
window.toggleMenu = toggleMenu;
if (hamburgerBtn) hamburgerBtn.addEventListener('click', toggleMenu);

// ---- Theme toggle ----
const themeButtons = document.querySelectorAll('[data-theme-toggle]');
const themeColorMeta = document.getElementById('theme-color-meta');

function persistTheme(theme) {
  try {
    localStorage.setItem('jb-theme', theme);
  } catch { /* localStorage can be disabled */ }
}

function applyTheme(theme) {
  const normalizedTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = normalizedTheme;
  if (themeColorMeta) themeColorMeta.setAttribute('content', normalizedTheme === 'light' ? '#fbf7ef' : '#0b1220');

  themeButtons.forEach((button) => {
    const isLight = normalizedTheme === 'light';
    button.setAttribute('aria-pressed', String(isLight));
    button.setAttribute('aria-label', isLight ? 'Activer le mode sombre' : 'Activer le mode clair');
    const text = button.querySelector('.theme-toggle__text');
    if (text) text.textContent = isLight ? 'Mode sombre' : 'Mode clair';
  });
}

themeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(nextTheme);
    persistTheme(nextTheme);
  });
});
applyTheme(document.documentElement.dataset.theme);

// ---- Header scroll state & progress bar ----
const header = document.getElementById('site-header');
const progress = document.getElementById('scroll-progress');
const backTop = document.getElementById('back-to-top');

function onScroll() {
  const y = window.scrollY;
  if (header) header.classList.toggle('scrolled', y > 24);
  if (backTop) backTop.classList.toggle('visible', y > 400);
  if (progress) {
    const h = document.documentElement;
    const max = (h.scrollHeight - h.clientHeight) || 1;
    progress.style.width = Math.min(100, (y / max) * 100) + '%';
  }
}
document.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ---- Footer year ----
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ---- Contact form: build a structured mailto ----
const contactForm = document.getElementById('contact-form');
const contactFormNote = document.getElementById('contact-form-note');

if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(contactForm);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const purpose = String(data.get('purpose') || 'Projet digital').trim();
    const organization = String(data.get('organization') || '').trim();
    const message = String(data.get('message') || '').trim();

    const subject = `[${purpose}] Contact depuis jackbrayan.com`;
    const body = [
      `Nom : ${name}`,
      `Email : ${email}`,
      organization ? `Organisation : ${organization}` : null,
      `Type de demande : ${purpose}`,
      '',
      'Message :',
      message,
    ].filter(Boolean).join('\n');

    const href = `mailto:contact@jackbrayan.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (contactFormNote) {
      contactFormNote.textContent = "Votre client mail va s'ouvrir avec un message déjà préparé.";
    }
    window.location.href = href;
  });
}

// ---- Dynamic: GitHub & Hugging Face ----
function createDynamicCard(title, description, meta, url) {
  const a = document.createElement('a');
  a.className = 'project-card card-animation';
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.innerHTML = `
    <span class="project-tag">${meta || 'Repository'}</span>
    <h3 class="project-title">${title}</h3>
    <p class="project-desc">${description || 'Projet open source.'}</p>
    <span class="project-link">Voir <i class="fas fa-arrow-up-right-from-square"></i></span>
  `;
  return a;
}

async function fetchGitHubRepos() {
  try {
    const res = await fetch('https://api.github.com/users/jackbrayan17/repos?sort=updated&per_page=100');
    if (!res.ok) return [];
    const repos = await res.json();
    return repos.filter((r) => r.description && !r.fork).slice(0, 6);
  } catch { return []; }
}

async function fetchHuggingFaceSpaces() {
  try {
    const res = await fetch('https://huggingface.co/api/spaces?author=JackBrayan17');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.slice(0, 6) : [];
  } catch { return []; }
}

async function initDynamicProjects() {
  const ghEl = document.getElementById('github-projects');
  const hfEl = document.getElementById('huggingface-projects');
  if (!ghEl && !hfEl) return;

  const [repos, spaces] = await Promise.all([fetchGitHubRepos(), fetchHuggingFaceSpaces()]);

  if (ghEl) {
    if (repos.length === 0) {
      ghEl.innerHTML = '<p class="text-sm text-cream-300">Aucun dépôt public disponible pour le moment.</p>';
    } else {
      repos.forEach((r) => {
        ghEl.appendChild(createDynamicCard(r.name, r.description, r.language || 'Repo', r.html_url));
      });
    }
  }

  if (hfEl) {
    if (spaces.length === 0) {
      hfEl.innerHTML = '<p class="text-sm text-cream-300">Aucun espace Hugging Face disponible.</p>';
    } else {
      spaces.forEach((s) => {
        const name = (s.id || '').split('/').pop() || s.id;
        const url = 'https://huggingface.co/spaces/' + s.id;
        hfEl.appendChild(createDynamicCard(name, 'Hugging Face Space', s.sdk || 'Space', url));
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', initDynamicProjects);
