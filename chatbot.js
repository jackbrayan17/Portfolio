document.addEventListener('DOMContentLoaded', () => {
  const shell = document.querySelector('.chatbot-shell');
  const launcher = document.getElementById('chatbot-launcher');
  const panel = document.getElementById('chatbot-panel');
  const closeButton = document.getElementById('chatbot-close');
  const log = document.getElementById('chat-log');
  const suggestions = document.getElementById('chatbot-suggestions');
  const form = document.getElementById('chatbot-form');
  const input = document.getElementById('user-input');

  if (!shell || !launcher || !panel || !closeButton || !log || !suggestions || !form || !input) return;

  const listFormatter = typeof Intl !== 'undefined' && typeof Intl.ListFormat === 'function'
    ? new Intl.ListFormat('fr', { style: 'long', type: 'conjunction' })
    : null;
  const dragStorageKey = 'jb-chatbot-position';
  const viewportPadding = 12;
  const dragThreshold = 6;
  let dragSession = null;

  const state = {
    isOpen: false,
    booted: false,
    lastIntent: 'default',
    lastProjectId: '',
    discussedProjects: [],
    isDragging: false,
    suppressLauncherClick: false,
  };

  const profile = buildProfile();
  const projectKnowledge = buildProjectKnowledge(profile.projects);
  const quickOpeners = Array.from(document.querySelectorAll('[data-chatbot-open]'));

  function cleanText(value = '') {
    return String(value).replace(/\s+/g, ' ').trim();
  }

  function normalizeText(value = '') {
    return cleanText(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’]/g, "'")
      .replace(/[^a-z0-9@.+/#\- ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function slugify(value = '') {
    return normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function escapeHtml(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function linkifyText(value = '') {
    return escapeHtml(value)
      .replace(
        /https?:\/\/[^\s<]+/g,
        (url) => `<a href="${url}" target="_blank" rel="noopener">${url.replace(/^https?:\/\//, '')}</a>`,
      )
      .replace(/\n/g, '<br>');
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function choose(values) {
    if (!Array.isArray(values) || values.length === 0) return '';
    return values[Math.floor(Math.random() * values.length)];
  }

  function formatList(values, limit = values.length) {
    const items = unique(values).slice(0, limit);
    if (items.length === 0) return '';
    if (listFormatter) return listFormatter.format(items);
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} et ${items[1]}`;
    return `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`;
  }

  function buildProfile() {
    const statCards = Array.from(document.querySelectorAll('.stat-card'));
    const stats = statCards.reduce((accumulator, card) => {
      const label = normalizeText(card.querySelector('.stat-label')?.textContent || '');
      const value = cleanText(card.querySelector('.stat-value')?.textContent || '');
      accumulator[label] = value;
      return accumulator;
    }, {});

    const skillGroups = Array.from(document.querySelectorAll('#skills .skill-card')).map((card) => ({
      name: cleanText(card.querySelector('.skill-title')?.textContent || ''),
      items: Array.from(card.querySelectorAll('.skill-list li')).map((item) => cleanText(item.textContent)),
    }));

    const projects = Array.from(document.querySelectorAll('#projects .project-card'))
      .filter((card) => !card.closest('#github-projects') && !card.closest('#huggingface-projects'))
      .map((card) => {
        const name = cleanText(card.querySelector('.project-title')?.textContent || '');
        const url = card.getAttribute('href') || '';
        let domain = '';

        try {
          domain = new URL(url, window.location.href).hostname.replace(/^www\./, '');
        } catch (error) {
          domain = url;
        }

        return {
          id: slugify(name),
          name,
          tag: cleanText(card.querySelector('.project-tag')?.textContent || ''),
          summary: cleanText(card.querySelector('.project-desc')?.textContent || ''),
          url,
          domain,
        };
      });

    const experience = Array.from(document.querySelectorAll('#experience .timeline-item')).map((item) => ({
      title: cleanText(item.querySelector('.timeline-title')?.textContent || ''),
      date: cleanText(item.querySelector('.timeline-date')?.textContent || ''),
      org: cleanText(item.querySelector('.timeline-org')?.textContent || ''),
      bullets: Array.from(item.querySelectorAll('.timeline-list li')).map((bullet) => cleanText(bullet.textContent)),
    }));

    const education = Array.from(document.querySelectorAll('#education .edu-card')).map((card) => ({
      year: cleanText(card.querySelector('.edu-year')?.textContent || ''),
      title: cleanText(card.querySelector('.edu-title')?.textContent || ''),
      school: cleanText(card.querySelector('.edu-school')?.textContent || ''),
      detail: cleanText(card.querySelector('.edu-detail')?.textContent || ''),
    }));

    const socials = Array.from(document.querySelectorAll('#contact .social-icon')).map((link) => ({
      label: cleanText(link.getAttribute('aria-label') || ''),
      url: link.getAttribute('href') || '',
    }));

    const email = (document.querySelector('#contact a[href^="mailto:"]')?.getAttribute('href') || 'mailto:contact@jackbrayan.com').replace(/^mailto:/, '');
    const phoneDisplay = cleanText(document.querySelector('#contact a[href^="tel:"] .contact-value')?.textContent || '+237 694 10 35 85');
    const phoneLink = (document.querySelector('#contact a[href^="tel:"]')?.getAttribute('href') || 'tel:+237694103585').replace(/^tel:/, '');
    const whatsapp = document.querySelector('#contact a[href^="https://wa.me/"]')?.getAttribute('href') || 'https://wa.me/237694103585';

    return {
      fullName: cleanText(document.querySelector('meta[name="author"]')?.getAttribute('content') || 'Eyoum Atock Jean-Jacques Brayan'),
      shortName: cleanText(document.querySelector('#site-header .font-serif')?.textContent || 'Jack Brayan'),
      role: cleanText(document.querySelector('#experience .timeline-title')?.textContent || "Responsable de la Cellule de l'Innovation"),
      headline: 'Responsable de la Cellule Innovation · Ingénieur logiciel full-stack · IA & Big Data',
      company: 'NAUMUR SARL',
      location: 'Yaoundé, Cameroun',
      yearsExperience: stats['annees d experience'] || '5+',
      deliveredProjects: stats['projets livres'] || '20+',
      stackBreadth: stats['stack maitrisee'] || '15+',
      skills: skillGroups,
      projects,
      experience,
      education,
      socials,
      socialMap: socials.reduce((accumulator, item) => {
        accumulator[normalizeText(item.label)] = item.url;
        return accumulator;
      }, {}),
      contact: {
        email,
        phoneDisplay,
        phoneLink,
        whatsapp,
      },
      hackathonInstagram: 'https://www.instagram.com/hackathon.eeuez/',
      hackathonSite: 'https://hackathon.eeuez-market.com/',
      cvFr: `${window.location.origin}/cv_JB_FR.pdf`,
      cvEn: `${window.location.origin}/cv_JB_EN.pdf`,
    };
  }

  function buildProjectKnowledge(projects) {
    const byId = projects.reduce((accumulator, project) => {
      accumulator[project.id] = project;
      return accumulator;
    }, {});

    return {
      'call-app-naumur': {
        ...byId['call-app-naumur'],
        aliases: [/\bcall app naumur\b/, /\bcall app\b/, /\bpadesce\b/, /\benquetes de satisfaction\b/],
        stack: ['Django', 'Data', 'suivi opérationnel'],
        detail: "C'est le logiciel interne utilisé pour piloter les enquêtes de satisfaction PADESCE et le suivi des appels opératrices / PME.",
        impact: "C'est un projet très orienté terrain, données et exécution opérationnelle.",
      },
      'veyrys-com': {
        ...byId['veyrys-com'],
        aliases: [/\bveyrys\b/, /\bveyrys\.com\b/],
        stack: ['React', 'e-commerce', 'marketing digital'],
        detail: "Veyrys est une plateforme e-commerce mode homme sur laquelle j'interviens aussi côté analyse des données publicitaires et campagnes sponsorisées.",
        impact: "C'est un bon exemple de croisement entre produit, acquisition et performance marketing.",
      },
      'eeuez-market': {
        ...byId['eeuez-market'],
        aliases: [/\beeuez market\b/, /\beeuez-market\b/, /\beeuez market\.com\b/],
        stack: ['Laravel', 'e-commerce', 'SEO'],
        detail: "EEUEZ-Market est une plateforme e-commerce qui connecte marchands, coursiers et clients avec un vrai enjeu produit et référencement.",
        impact: "C'est l'un des projets les plus complets du portfolio côté marketplace.",
      },
      'hackathon-eeuez-2026': {
        ...byId['hackathon-eeuez-2026'],
        aliases: [/\bhackathon\b/, /\bhackathon eeuez\b/, /\beeuez 2026\b/],
        stack: ['événement tech', 'IA', 'coordination produit'],
        detail: "J'ai conçu et organisé le Hackathon EEUEZ 2026 autour du thème « Créer, Transformer et Lancer » avec 5 équipes collaboratives.",
        impact: "L'idée n'était pas juste l'événement, mais la création de vraies solutions digitales africaines avec présence web dédiée.",
      },
      zevaba: {
        ...byId.zevaba,
        aliases: [/\bzevaba\b/],
        stack: ['Django', 'réseau social', 'cPanel'],
        detail: "Zevaba est un réseau social intellectuel centré sur le partage de contenus académiques et professionnels.",
        impact: "C'est un projet qui montre bien ma capacité à aller au-delà de la vitrine marketing pour construire un vrai produit social.",
      },
      'mubaku-loan-appraisal': {
        ...byId['mubaku-loan-appraisal'],
        aliases: [/\bmubaku loan\b/, /\bloan appraisal\b/, /\bloanguard\b/, /\bappraisal\b/],
        stack: ['Django', 'fintech', 'tableau de bord décisionnel'],
        detail: "Mubaku Loan Appraisal est une application d'évaluation de prêts avec moteur d'analyse et dashboard décisionnel.",
        impact: "Le projet touche à la fois au métier, à la donnée et à la fiabilité du produit.",
      },
      'on-black-streetwear': {
        ...byId['on-black-streetwear'],
        aliases: [/\bon black\b/, /\bon-black\b/, /\bstreetwear\b/],
        stack: ['React', 'TailwindCSS', 'WhatsApp commerce'],
        detail: "On Black Streetwear est une vitrine e-commerce en React/Tailwind avec tunnel de commande orienté WhatsApp.",
        impact: "C'est un projet pensé pour aller vite, être propre visuellement et convertir simplement.",
      },
      'eeuez-job': {
        ...byId['eeuez-job'],
        aliases: [/\beeuez job\b/, /\beeuez-job\b/],
        stack: ['Laravel', 'recrutement', 'plateforme métier'],
        detail: "EEUEZ-Job est un portail de recrutement qui rapproche candidats et recruteurs dans une logique produit claire.",
        impact: "C'est une extension naturelle de mon travail sur des plateformes utiles et concrètes.",
      },
      'eeuez-menu': {
        ...byId['eeuez-menu'],
        aliases: [/\beeuez menu\b/, /\beeuez-menu\b/, /\bmenu qr\b/, /\bqr code\b/],
        stack: ['web app', 'hospitality', 'QR'],
        detail: "EEUEZ-Menu sert à digitaliser les menus restaurant avec QR codes et parcours de commande simplifié.",
        impact: "Le projet répond à un besoin métier simple avec une UX directe.",
      },
      'mubaku-hightech': {
        ...byId['mubaku-hightech'],
        aliases: [/\bmubaku hightech\b/, /\bhightech mubaku\b/],
        stack: ['landing page', 'responsive', 'branding tech'],
        detail: "Mubaku HighTech est une landing page moderne et responsive pour valoriser des services technologiques.",
        impact: "C'est plus branding que logiciel métier, mais ça montre la polyvalence design + intégration.",
      },
      naumur: {
        ...byId.naumur,
        aliases: [/\bnaumur\.com\b/, /\bsite naumur\b/, /\bsite institutionnel\b/],
        stack: ['Next.js', 'corporate', 'innovation'],
        detail: "Le site NAUMUR porte une dimension institutionnelle, orientée data, opérations et innovation.",
        impact: "Il sert aussi de vitrine crédible pour l'activité et l'écosystème de l'entreprise.",
      },
    };
  }

  function projectById(projectId) {
    return projectKnowledge[projectId] || null;
  }

  function findProjectFromMessage(message) {
    const normalized = normalizeText(message);
    return Object.values(projectKnowledge).find(
      (project) => Array.isArray(project.aliases) && project.aliases.some((pattern) => pattern.test(normalized)),
    ) || null;
  }

  function findSocial(label) {
    return profile.socialMap[normalizeText(label)] || '';
  }

  function rememberProject(projectId) {
    if (!projectId) return;
    state.lastProjectId = projectId;
    state.discussedProjects = unique([projectId, ...state.discussedProjects]).slice(0, 8);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getLauncherDimensions() {
    return {
      width: launcher.offsetWidth || 66,
      height: launcher.offsetHeight || 66,
    };
  }

  function clampShellPosition(left, top) {
    const { width, height } = getLauncherDimensions();
    const maxLeft = Math.max(viewportPadding, window.innerWidth - width - viewportPadding);
    const maxTop = Math.max(viewportPadding, window.innerHeight - height - viewportPadding);

    return {
      left: clamp(left, viewportPadding, maxLeft),
      top: clamp(top, viewportPadding, maxTop),
    };
  }

  function saveShellPosition(position) {
    try {
      localStorage.setItem(dragStorageKey, JSON.stringify(position));
    } catch (error) {
      // Ignore browsers that block storage.
    }
  }

  function loadShellPosition() {
    try {
      const saved = JSON.parse(localStorage.getItem(dragStorageKey) || 'null');
      if (!saved || !Number.isFinite(saved.left) || !Number.isFinite(saved.top)) return null;
      return saved;
    } catch (error) {
      return null;
    }
  }

  function getCurrentShellPosition() {
    const rect = shell.getBoundingClientRect();
    return clampShellPosition(rect.left, rect.top);
  }

  function updateShellPlacement(position = getCurrentShellPosition()) {
    const { width: launcherWidth, height: launcherHeight } = getLauncherDimensions();
    const panelWidth = panel.offsetWidth || 416;
    const panelHeight = panel.offsetHeight || 620;
    const spaceRight = window.innerWidth - (position.left + launcherWidth) - viewportPadding;
    const spaceLeft = position.left - viewportPadding;
    const spaceBelow = window.innerHeight - (position.top + launcherHeight) - viewportPadding;
    const spaceAbove = position.top - viewportPadding;

    shell.dataset.chatbotHorizontal = spaceRight >= panelWidth || spaceRight >= spaceLeft ? 'right' : 'left';
    shell.dataset.chatbotVertical = spaceBelow >= panelHeight || spaceBelow >= spaceAbove ? 'down' : 'up';
  }

  function applyShellPosition(left, top, options = {}) {
    const nextPosition = clampShellPosition(left, top);
    shell.style.left = `${nextPosition.left}px`;
    shell.style.top = `${nextPosition.top}px`;
    shell.style.right = 'auto';
    shell.style.bottom = 'auto';
    updateShellPlacement(nextPosition);

    if (options.persist) saveShellPosition(nextPosition);

    return nextPosition;
  }

  function syncShellToViewport(options = {}) {
    const current = getCurrentShellPosition();
    return applyShellPosition(current.left, current.top, options);
  }

  function initializeShellPosition() {
    const saved = loadShellPosition();

    if (saved) {
      applyShellPosition(saved.left, saved.top);
      return;
    }

    updateShellPlacement(getCurrentShellPosition());
  }

  function setDragging(nextState) {
    state.isDragging = Boolean(nextState);
    shell.dataset.dragging = String(state.isDragging);
  }

  function startLauncherDrag(event) {
    if (event.button !== 0 && event.pointerType !== 'touch') return;

    const origin = getCurrentShellPosition();
    dragSession = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: origin.left,
      originTop: origin.top,
      moved: false,
    };

    state.suppressLauncherClick = false;
    launcher.setPointerCapture?.(event.pointerId);
  }

  function moveLauncher(event) {
    if (!dragSession || event.pointerId !== dragSession.pointerId) return;

    const deltaX = event.clientX - dragSession.startX;
    const deltaY = event.clientY - dragSession.startY;

    if (!dragSession.moved && Math.hypot(deltaX, deltaY) < dragThreshold) return;

    event.preventDefault();
    dragSession.moved = true;
    setDragging(true);
    applyShellPosition(dragSession.originLeft + deltaX, dragSession.originTop + deltaY);
  }

  function stopLauncherDrag(event) {
    if (!dragSession || (event && event.pointerId !== dragSession.pointerId)) return;

    if (dragSession.moved) {
      state.suppressLauncherClick = true;
      saveShellPosition(getCurrentShellPosition());
    }

    launcher.releasePointerCapture?.(dragSession.pointerId);
    dragSession = null;
    setDragging(false);
  }

  function setOpen(nextState) {
    state.isOpen = Boolean(nextState);
    panel.classList.toggle('is-open', state.isOpen);
    panel.setAttribute('aria-hidden', String(!state.isOpen));
    launcher.setAttribute('aria-expanded', String(state.isOpen));
    updateShellPlacement();
  }

  function openChat(options = {}) {
    if (!state.booted) bootChat();
    setOpen(true);
    if (options.prefill) {
      input.value = options.prefill;
      autoResizeInput();
    }
    window.requestAnimationFrame(() => input.focus());
  }

  function closeChat() {
    setOpen(false);
    launcher.focus();
  }

  function autoResizeInput() {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 136)}px`;
  }

  function scrollChatToBottom() {
    log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
  }

  function createMessageElement(content, sender, options = {}) {
    const message = document.createElement('article');
    message.className = `chatbot-message chatbot-message--${sender}`;

    const label = document.createElement('span');
    label.className = 'chatbot-message__label';
    label.textContent = sender === 'assistant' ? 'Jack' : 'Vous';

    const bubble = document.createElement('div');
    bubble.className = 'chatbot-bubble';

    if (options.typing) {
      bubble.innerHTML = `
        <span class="chatbot-typing" aria-label="Jack est en train d'écrire">
          <span></span>
          <span></span>
          <span></span>
        </span>
      `;
    } else {
      bubble.innerHTML = linkifyText(content);
    }

    message.append(label, bubble);
    return message;
  }

  function appendMessage(content, sender, options = {}) {
    const element = createMessageElement(content, sender, options);
    log.appendChild(element);
    scrollChatToBottom();
    return element;
  }

  function renderSuggestions(items) {
    suggestions.innerHTML = '';

    items.forEach((item) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chatbot-chip';
      chip.textContent = item;
      chip.addEventListener('click', () => {
        input.value = item;
        autoResizeInput();
        form.requestSubmit();
      });
      suggestions.appendChild(chip);
    });
  }

  function defaultSuggestions() {
    return [
      'Quelles sont tes stacks principales ?',
      'Parle-moi de Zevaba',
      'Quels sont tes réseaux sociaux ?',
      'Comment te contacter ?',
    ];
  }

  function greetingMessage() {
    return "Salut, je suis Jack. Tu peux me poser une question directe sur mes compétences, mes projets, ma stack, mes réseaux, mon parcours ou la meilleure façon de me contacter.";
  }

  function bootChat() {
    state.booted = true;
    appendMessage(greetingMessage(), 'assistant');
    renderSuggestions(defaultSuggestions());
  }

  function withTyping(response) {
    const typingMessage = appendMessage('', 'assistant', { typing: true });
    const delay = Math.max(420, Math.min(1400, response.text.length * 12));

    window.setTimeout(() => {
      typingMessage.remove();
      appendMessage(response.text, 'assistant');
      renderSuggestions(response.suggestions);
    }, delay);
  }

  function responseForGreeting() {
    return {
      text: choose([
        "Salut. Si tu veux aller droit au but, demande-moi un projet précis, ma stack backend/frontend ou mes réseaux.",
        "Hello. Je peux te répondre clairement sur mes projets en production, mes compétences, mon rôle chez NAUMUR ou mes contacts.",
        "Bonjour. Tu peux me challenger sur mes stacks, mes projets, mon parcours ou mes réseaux sociaux.",
      ]),
      suggestions: defaultSuggestions(),
      intent: 'greeting',
    };
  }

  function responseForAbout() {
    return {
      text: [
        `Je suis ${profile.fullName}, plus connu comme ${profile.shortName}.`,
        `Je suis basé à ${profile.location} et j'occupe aujourd'hui le poste de ${profile.role} chez ${profile.company}.`,
        "Mon terrain principal, c'est le full-stack, l'IA, la data et la mise en production de produits digitaux utiles.",
      ].join('\n\n'),
      suggestions: [
        'Que fais-tu chez NAUMUR ?',
        'Quelles sont tes stacks principales ?',
        'Quels projets sont les plus représentatifs ?',
        'Quelle est ta formation ?',
      ],
      intent: 'about',
    };
  }

  function responseForPersonality() {
    return {
      text: [
        "Si je résume mon profil humainement: je suis très orienté exécution, structuration et impact concret.",
        "J'aime cadrer les sujets, faire monter une équipe en compétence, garder une bonne exigence technique, puis transformer une idée en produit exploitable.",
        "Côté soft skills, le portfolio met surtout en avant le leadership, la créativité, l'esprit critique, avec une vraie aisance en français et en anglais.",
      ].join('\n\n'),
      suggestions: [
        'Parle-moi de ton expérience',
        'Quels sont tes projets phares ?',
        'Quelles langues parles-tu ?',
        'Comment te contacter ?',
      ],
      intent: 'personality',
    };
  }

  function responseForSkills() {
    const backend = profile.skills.find((group) => normalizeText(group.name).includes('backend'))?.items || [];
    const frontend = profile.skills.find((group) => normalizeText(group.name).includes('frontend'))?.items || [];
    const data = profile.skills.find((group) => normalizeText(group.name).includes('data'))?.items || [];
    const cloud = profile.skills.find((group) => normalizeText(group.name).includes('devops'))?.items || [];

    return {
      text: [
        "Je suis clairement full-stack, avec une base backend assez forte.",
        `Côté serveur, je travaille surtout avec ${formatList(backend, 6)}. Côté interface, on retrouve ${formatList(frontend, 5)}.`,
        `Pour la data et l'IA, j'utilise ${formatList(data, 6)}. Et sur l'infra, je tourne avec ${formatList(cloud, 5)}.`,
      ].join('\n\n'),
      suggestions: [
        'Et côté backend ?',
        'Et côté frontend ?',
        "Et pour la data / l'IA ?",
        'Et pour le cloud ?',
      ],
      intent: 'skills',
    };
  }

  function responseForBackend() {
    return {
      text: [
        "Sur le backend, mes bases les plus visibles sont Python, Django, FastAPI, Flask, Laravel et Node.js.",
        "Les exemples les plus concrets du portfolio: Call App Naumur, Zevaba et Mubaku Loan Appraisal côté Django, puis EEUEZ-Market et EEUEZ-Job côté Laravel.",
        "J'aime surtout les backends qui tiennent bien en prod et qui restent lisibles quand le produit commence à grossir.",
      ].join('\n\n'),
      suggestions: [
        'Parle-moi de Zevaba',
        'Parle-moi de EEUEZ-Market',
        'Et côté frontend ?',
        'Quels projets sont en production ?',
      ],
      intent: 'backend',
    };
  }

  function responseForFrontend() {
    return {
      text: [
        "Côté frontend, je travaille surtout avec React, Next.js, TailwindCSS, HTML/CSS et JavaScript.",
        "Sur le portfolio, ça se voit bien avec Veyrys, On Black Streetwear et plusieurs interfaces orientées responsive/performance. Le site institutionnel NAUMUR est aussi un bon repère côté Next.js.",
        "J'aime les interfaces propres, rapides et utiles, pas juste jolies.",
      ].join('\n\n'),
      suggestions: [
        'Parle-moi de On Black Streetwear',
        'Parle-moi de Veyrys',
        'Et côté backend ?',
        'Comment tu gères la partie UI/UX ?',
      ],
      intent: 'frontend',
    };
  }

  function responseForDataAndAI() {
    return {
      text: [
        "Sur la data et l'IA, je combine surtout analyse, visualisation et outillage pratique.",
        "Le portfolio cite Pandas, NumPy, Streamlit, la data viz, SSIS / SSAS et Flourish. Dans mes missions, ça se traduit par le suivi PADESCE, la consolidation d'indicateurs et la veille sur des outils comme Claude, Codex, Antigravity et NotebookLLM.",
        "Je suis plus orienté IA appliquée et workflow utile que démonstration gadget.",
      ].join('\n\n'),
      suggestions: [
        'Que fais-tu chez NAUMUR ?',
        'Parle-moi de Call App Naumur',
        'Et pour le cloud ?',
        'Quelle est ta formation ?',
      ],
      intent: 'data-ai',
    };
  }

  function responseForCloud() {
    return {
      text: [
        "Côté cloud et déploiement, je travaille avec AWS EC2, Docker, cPanel, Vercel et Render.",
        "Le cas le plus parlant dans le portfolio, c'est l'administration de la machine virtuelle AWS chez NAUMUR: 128 Go de RAM, 1 To SSD, avec configuration, monitoring, optimisation de performances et sécurité.",
        "Je déploie aussi des produits web concrets sur cPanel et des fronts plus légers sur Vercel.",
      ].join('\n\n'),
      suggestions: [
        'Parle-moi de Zevaba',
        'Et côté backend ?',
        'Quels projets sont en production ?',
        'Comment te contacter ?',
      ],
      intent: 'cloud',
    };
  }

  function responseForMicrosoft() {
    return {
      text: [
        "Oui, j'interviens aussi sur la partie Microsoft admin.",
        "Chez NAUMUR, le portfolio mentionne l'administration Microsoft 365: gestion des utilisateurs, licences, canaux Teams et politiques de sécurité.",
        "Donc je ne suis pas limité au code pur; je couvre aussi l'environnement opérationnel autour des équipes.",
      ].join('\n\n'),
      suggestions: [
        'Que fais-tu chez NAUMUR ?',
        'Quelles sont tes stacks principales ?',
        'Quels sont tes projets phares ?',
        'Comment te contacter ?',
      ],
      intent: 'microsoft',
    };
  }

  function responseForSEO() {
    return {
      text: [
        "Oui, j'ai aussi une vraie dimension SEO / marketing digital.",
        "Ça ressort sur EEUEZ-Market avec l'intégration SEO, sur Veyrys avec l'analyse des campagnes sponsorisées, et dans mon parcours avec l'attestation en marketing digital.",
        "Je vois ça comme un prolongement logique du produit: on ne livre pas seulement une app, on pense aussi acquisition et visibilité.",
      ].join('\n\n'),
      suggestions: [
        'Parle-moi de EEUEZ-Market',
        'Parle-moi de Veyrys',
        'Quels sont tes projets phares ?',
        'Comment te contacter ?',
      ],
      intent: 'seo',
    };
  }

  function responseForTech(techId) {
    const techResponses = {
      django: [
        "Django fait clairement partie de mes bases solides.",
        "Sur le portfolio, on le retrouve sur Call App Naumur, Zevaba et Mubaku Loan Appraisal. J'aime Django quand il faut aller vite sans sacrifier la structure du produit.",
      ],
      laravel: [
        "Laravel est surtout visible chez moi sur les plateformes EEUEZ.",
        "EEUEZ-Market et EEUEZ-Job montrent bien comment je l'utilise sur des produits métier et e-commerce.",
      ],
      react: [
        "React fait partie de mon socle front.",
        "Les cas les plus visibles ici: Veyrys et On Black Streetwear, avec une logique de boutique/vitrine rapide et responsive.",
      ],
      'next.js': [
        "Next.js apparaît surtout sur le site institutionnel NAUMUR.",
        "Je l'utilise quand j'ai besoin d'un rendu propre, rapide et crédible côté corporate.",
      ],
      fastapi: [
        "FastAPI fait partie de ma boîte à outils backend.",
        "Le portfolio le positionne dans ma stack serveur, aux côtés de Django et Flask, pour des cas où j'ai besoin d'API rapides et bien structurées.",
      ],
      python: [
        "Python est l'une de mes technos de base.",
        "Entre Django, FastAPI, Flask et la partie data/IA, c'est probablement l'un des fils rouges les plus forts de mon profil.",
      ],
      aws: [
        "Oui, je travaille avec AWS.",
        "Le point le plus concret sur le portfolio: l'administration d'une VM AWS chez NAUMUR, avec configuration, monitoring, optimisation et sécurité.",
      ],
      docker: [
        "Docker est dans ma stack DevOps / Cloud.",
        "Je l'utilise comme brique de fiabilisation et de déploiement, surtout quand je veux garder un environnement propre et reproductible.",
      ],
    };

    return {
      text: techResponses[techId].join('\n\n'),
      suggestions: [
        'Quels projets utilisent cette stack ?',
        'Et côté backend ?',
        'Et côté cloud ?',
        'Quels sont tes projets phares ?',
      ],
      intent: `tech-${techId}`,
    };
  }

  function responseForProjects(excludeKnown = false) {
    const featuredIds = ['call-app-naumur', 'zevaba', 'eeuez-market', 'mubaku-loan-appraisal', 'on-black-streetwear', 'naumur'];
    let selected = featuredIds.filter((projectId) => projectById(projectId));

    if (excludeKnown) {
      selected = selected.filter((projectId) => !state.discussedProjects.includes(projectId));
      if (selected.length === 0) selected = featuredIds.filter((projectId) => projectById(projectId));
    }

    const lines = selected.slice(0, 4).map((projectId) => {
      const project = projectById(projectId);
      return `- ${project.name} : ${project.detail || project.summary}`;
    });

    selected.slice(0, 4).forEach(rememberProject);

    return {
      text: [
        "Si je devais mettre en avant les plus représentatifs, je te citerais ceux-là:",
        lines.join('\n'),
        "Ils montrent bien l'équilibre entre produit métier, e-commerce, réseau social, data et delivery concret.",
      ].join('\n\n'),
      suggestions: [
        'Parle-moi de Call App Naumur',
        'Parle-moi de EEUEZ-Market',
        'Parle-moi de Zevaba',
        'Un autre projet marquant',
      ],
      intent: 'projects',
    };
  }

  function responseForProject(project) {
    rememberProject(project.id);

    return {
      text: [
        `${choose(["Oui, bien sûr.", "Oui.", "Carrément.", "Avec plaisir."])} ${project.name}, c'est ${project.detail || project.summary}`,
        `Sur ce sujet, la logique dominante est ${formatList(project.stack || [project.tag])}. ${project.impact || ''}`.trim(),
        project.url ? `Lien direct : ${project.url}` : '',
      ].filter(Boolean).join('\n\n'),
      suggestions: [
        'Quelle stack utilises-tu sur ce projet ?',
        'Un autre projet marquant',
        'Quelles sont tes stacks principales ?',
        'Comment te contacter ?',
      ],
      intent: 'project',
      projectId: project.id,
    };
  }

  function responseForExperience() {
    const highlights = profile.experience.slice(0, 4).map((entry) => `- ${entry.title} (${entry.date}) chez ${entry.org}`);

    return {
      text: [
        `J'ai ${profile.yearsExperience} d'expérience affichées sur le portfolio, avec ${profile.deliveredProjects} projets livrés.`,
        "Les repères les plus visibles sont:",
        highlights.join('\n'),
        "Le fil rouge, c'est le mélange entre leadership technique, construction produit et mise en production.",
      ].join('\n\n'),
      suggestions: [
        'Que fais-tu chez NAUMUR ?',
        'Quels projets sont les plus représentatifs ?',
        'Quelle est ta formation ?',
        'Parle-moi du hackathon EEUEZ',
      ],
      intent: 'experience',
    };
  }

  function responseForNaumur() {
    return {
      text: [
        `Chez ${profile.company}, je suis ${profile.role}.`,
        "Concrètement, je pilote la cellule innovation, j'encadre des stagiaires, j'organise la veille technologique, j'administre l'environnement Microsoft 365 et je coordonne le développement de logiciels internes et externes.",
        "Le portfolio mentionne aussi la gestion de Call App Naumur, l'administration d'une VM AWS et la mise en place de workflows autour des outils IA.",
      ].join('\n\n'),
      suggestions: [
        'Parle-moi de Call App Naumur',
        'Et côté cloud ?',
        'Quelles sont tes stacks principales ?',
        'Quels projets sont en production ?',
      ],
      intent: 'naumur',
    };
  }

  function responseForHackathon() {
    rememberProject('hackathon-eeuez-2026');

    return {
      text: [
        "Le Hackathon EEUEZ 2026 est l'un des projets les plus personnels du portfolio.",
        "Je l'ai conçu et organisé le 11 février 2026 autour du thème « Créer, Transformer et Lancer », avec coordination des ateliers, encadrement de 5 équipes et présence digitale dédiée.",
        `Le site de l'événement est ${profile.hackathonSite} et l'Instagram associé est ${profile.hackathonInstagram}.`,
      ].join('\n\n'),
      suggestions: [
        'Parle-moi de tes autres projets',
        'Quels sont tes réseaux sociaux ?',
        'Que fais-tu chez NAUMUR ?',
        'Comment te contacter ?',
      ],
      intent: 'hackathon',
      projectId: 'hackathon-eeuez-2026',
    };
  }

  function responseForEducation() {
    const lines = profile.education.map((entry) => `- ${entry.title} — ${entry.school} (${entry.year})`);

    return {
      text: [
        "Mon parcours académique est assez cohérent avec ce que je fais aujourd'hui.",
        lines.join('\n'),
        "Le socle, c'est génie logiciel + Big Data / IA, avec un prolongement concret côté marketing digital.",
      ].join('\n\n'),
      suggestions: [
        "Et sur la data / l'IA ?",
        'Parle-moi de ton expérience',
        'Quelles langues parles-tu ?',
        'Comment te contacter ?',
      ],
      intent: 'education',
    };
  }

  function responseForLanguages() {
    return {
      text: [
        "Je travaille en français et en anglais, les deux sont indiqués comme excellents sur le portfolio.",
        "C'est utile autant pour la communication projet que pour la veille, les docs techniques et les échanges à l'international.",
      ].join('\n\n'),
      suggestions: [
        'Parle-moi de ta personnalité',
        'Quelles sont tes stacks principales ?',
        'Comment te contacter ?',
        'Quels sont tes réseaux sociaux ?',
      ],
      intent: 'languages',
    };
  }

  function responseForLocation() {
    return {
      text: [
        `Je suis basé à ${profile.location}.`,
        "Le site précise aussi que je suis disponible pour des missions, collaborations et échanges internationaux.",
      ].join('\n\n'),
      suggestions: [
        'Es-tu disponible pour une mission ?',
        'Comment te contacter ?',
        'Quels sont tes réseaux sociaux ?',
        'Parle-moi de ton parcours',
      ],
      intent: 'location',
    };
  }

  function responseForAvailability() {
    return {
      text: [
        "Oui, je suis positionné sur des demandes de projet digital, recrutement, consultation et partenariat.",
        `Le plus direct, c'est de m'écrire à ${profile.contact.email}, de m'appeler au ${profile.contact.phoneDisplay} ou de passer par WhatsApp: ${profile.contact.whatsapp}`,
        "Si le besoin est sérieux, le formulaire du site structure déjà bien la prise de contact.",
      ].join('\n\n'),
      suggestions: [
        'Comment te contacter ?',
        'Quels sont tes réseaux sociaux ?',
        'Quels projets sont en production ?',
        'Quelles sont tes stacks principales ?',
      ],
      intent: 'availability',
    };
  }

  function responseForContact() {
    return {
      text: [
        `Tu peux me joindre par email à ${profile.contact.email}.`,
        `Par téléphone: ${profile.contact.phoneDisplay}.`,
        `Et sur WhatsApp ici: ${profile.contact.whatsapp}`,
      ].join('\n\n'),
      suggestions: [
        'Quels sont tes réseaux sociaux ?',
        'Es-tu disponible pour une mission ?',
        'Télécharger ton CV',
        'Parle-moi de tes projets',
      ],
      intent: 'contact',
    };
  }

  function responseForSocials() {
    return {
      text: [
        'Tu peux me retrouver ici:',
        `- GitHub : ${findSocial('GitHub')}`,
        `- LinkedIn : ${findSocial('LinkedIn')}`,
        `- Hugging Face : ${findSocial('Hugging Face')}`,
        `- Instagram : ${findSocial('Instagram')}`,
        `- TikTok : ${findSocial('TikTok')}`,
      ].join('\n'),
      suggestions: [
        'Donne-moi ton GitHub',
        'Donne-moi ton LinkedIn',
        'Comment te contacter ?',
        'Parle-moi de tes projets',
      ],
      intent: 'socials',
    };
  }

  function responseForSpecificSocial(network) {
    const labelMap = {
      github: 'GitHub',
      linkedin: 'LinkedIn',
      huggingface: 'Hugging Face',
      instagram: 'Instagram',
      tiktok: 'TikTok',
    };

    const label = labelMap[network];
    const url = findSocial(label);

    return {
      text: url
        ? `${label}, c'est ici: ${url}`
        : `Je n'ai pas trouvé de lien ${label} dans le portfolio actuel.`,
      suggestions: [
        'Quels sont tes réseaux sociaux ?',
        'Comment te contacter ?',
        'Parle-moi de tes projets',
        'Télécharger ton CV',
      ],
      intent: `social-${network}`,
    };
  }

  function responseForCV() {
    return {
      text: [
        `Le CV français est disponible ici: ${profile.cvFr}`,
        `Le CV anglais est disponible ici: ${profile.cvEn}`,
      ].join('\n\n'),
      suggestions: [
        'Comment te contacter ?',
        'Quels sont tes réseaux sociaux ?',
        'Quelles sont tes stacks principales ?',
        'Parle-moi de ton parcours',
      ],
      intent: 'cv',
    };
  }

  function responseForThanks() {
    return {
      text: choose([
        "Avec plaisir. Si tu veux, je peux maintenant te parler d'un projet précis comme Zevaba, Call App Naumur ou EEUEZ-Market.",
        "Avec plaisir. Tu peux m'emmener sur un projet, une stack, mon rôle chez NAUMUR ou mes réseaux.",
        "Pas de souci. Si tu veux aller plus loin, demande-moi un projet précis ou ma stack par domaine.",
      ]),
      suggestions: [
        'Parle-moi de Zevaba',
        'Parle-moi de Call App Naumur',
        'Quelles sont tes stacks principales ?',
        'Comment te contacter ?',
      ],
      intent: 'thanks',
    };
  }

  function responseForFallback() {
    return {
      text: [
        "Je préfère rester précis sur ce qui apparaît vraiment dans mon portfolio.",
        "Tu peux me demander mon rôle chez NAUMUR, mes stacks, un projet précis comme Zevaba ou EEUEZ-Market, mes réseaux sociaux, mon parcours ou la meilleure façon de me contacter.",
      ].join('\n\n'),
      suggestions: defaultSuggestions(),
      intent: 'fallback',
    };
  }

  function detectIntent(message) {
    const normalized = normalizeText(message);
    const project = findProjectFromMessage(normalized);

    if (project && !/\b(autre|encore)\b/.test(normalized)) {
      if (project.id === 'hackathon-eeuez-2026') return responseForHackathon();
      return responseForProject(project);
    }

    if (state.lastProjectId && /\b(ce projet|sur ce projet|ce produit|sur ce produit)\b/.test(normalized)) {
      const lastProject = projectById(state.lastProjectId);
      if (lastProject) return responseForProject(lastProject);
    }

    if (/\b(merci|thanks|thank you)\b/.test(normalized)) return responseForThanks();
    if (/\b(salut|bonjour|bonsoir|hello|hi|hey)\b/.test(normalized)) return responseForGreeting();
    if (/\b(qui es tu|qui est jack|presente toi|parle moi de toi|who are you|tell me about yourself)\b/.test(normalized)) return responseForAbout();
    if (/\b(personnalite|personne|humain|soft skills|soft skill|temperament|profil humain)\b/.test(normalized)) return responseForPersonality();
    if (/\b(naumur)\b/.test(normalized) && !/\bnaumur\.com\b/.test(normalized)) return responseForNaumur();
    if (/\b(hackathon)\b/.test(normalized)) return responseForHackathon();
    if (/\b(experience|parcours|role|poste|job|travail)\b/.test(normalized)) return responseForExperience();
    if (/\b(education|formation|master|licence|etudes|diplome)\b/.test(normalized)) return responseForEducation();
    if (/\b(langue|langues|anglais|francais|english|french)\b/.test(normalized)) return responseForLanguages();
    if (/\b(yaounde|cameroun|ou es tu base|where are you based|localisation)\b/.test(normalized)) return responseForLocation();
    if (/\b(disponible|availability|mission|consultation|partenariat|recrutement|hire|freelance)\b/.test(normalized)) return responseForAvailability();
    if (/\b(contact|email|mail|telephone|tel|whatsapp|joindre|appeler)\b/.test(normalized)) return responseForContact();
    if (/\b(reseaux|reseau social|socials|social media)\b/.test(normalized)) return responseForSocials();
    if (/\b(github)\b/.test(normalized)) return responseForSpecificSocial('github');
    if (/\b(linkedin)\b/.test(normalized)) return responseForSpecificSocial('linkedin');
    if (/\b(hugging ?face)\b/.test(normalized)) return responseForSpecificSocial('huggingface');
    if (/\b(instagram)\b/.test(normalized)) return responseForSpecificSocial('instagram');
    if (/\b(tiktok|tik tok)\b/.test(normalized)) return responseForSpecificSocial('tiktok');
    if (/\b(cv|resume|curriculum)\b/.test(normalized)) return responseForCV();
    if (/\b(backend|api|serveur)\b/.test(normalized)) return responseForBackend();
    if (/\b(frontend|front end|ui|ux|interface)\b/.test(normalized)) return responseForFrontend();
    if (/\b(data|ia|ai|big data|pandas|numpy|streamlit|visualisation|flourish|ssis|ssas)\b/.test(normalized)) return responseForDataAndAI();
    if (/\b(cloud|devops|aws|docker|vercel|render|cpanel|deployment|deploiement)\b/.test(normalized)) return responseForCloud();
    if (/\b(microsoft|m365|teams|sharepoint|licence)\b/.test(normalized)) return responseForMicrosoft();
    if (/\b(seo|marketing|analytics|scraping|selenium)\b/.test(normalized)) return responseForSEO();
    if (/\b(django)\b/.test(normalized)) return responseForTech('django');
    if (/\b(laravel)\b/.test(normalized)) return responseForTech('laravel');
    if (/\b(react)\b/.test(normalized)) return responseForTech('react');
    if (/\b(next\.?js|nextjs)\b/.test(normalized)) return responseForTech('next.js');
    if (/\b(fastapi)\b/.test(normalized)) return responseForTech('fastapi');
    if (/\b(python)\b/.test(normalized)) return responseForTech('python');
    if (/\b(aws)\b/.test(normalized)) return responseForTech('aws');
    if (/\b(docker)\b/.test(normalized)) return responseForTech('docker');
    if (/\b(competence|competences|skills|stack|stacks|expertise|technos|technologies)\b/.test(normalized)) return responseForSkills();
    if (/\b(projet|projets|project|projects)\b/.test(normalized)) return responseForProjects(/\b(autre|encore|plus)\b/.test(normalized));

    if (state.lastIntent === 'projects' && /\b(autre|encore|plus)\b/.test(normalized)) {
      return responseForProjects(true);
    }

    return responseForFallback();
  }

  function handleSubmit(event) {
    event.preventDefault();
    const value = cleanText(input.value);
    if (!value) return;

    appendMessage(value, 'user');
    input.value = '';
    autoResizeInput();

    const response = detectIntent(value);
    state.lastIntent = response.intent;
    if (response.projectId) rememberProject(response.projectId);
    withTyping(response);
  }

  launcher.addEventListener('pointerdown', startLauncherDrag);
  launcher.addEventListener('pointermove', moveLauncher);
  launcher.addEventListener('pointerup', stopLauncherDrag);
  launcher.addEventListener('pointercancel', stopLauncherDrag);
  launcher.addEventListener('lostpointercapture', stopLauncherDrag);
  launcher.addEventListener('click', (event) => {
    if (state.suppressLauncherClick) {
      event.preventDefault();
      state.suppressLauncherClick = false;
      return;
    }
    if (state.isOpen) {
      closeChat();
      return;
    }
    openChat();
  });

  closeButton.addEventListener('click', closeChat);
  quickOpeners.forEach((button) => {
    button.addEventListener('click', () => openChat());
  });

  form.addEventListener('submit', handleSubmit);
  input.addEventListener('input', autoResizeInput);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.isOpen) closeChat();
  });

  window.addEventListener('resize', () => {
    syncShellToViewport();
    autoResizeInput();
  });

  document.addEventListener('click', (event) => {
    if (!state.isOpen) return;
    const target = event.target;
    if (
      panel.contains(target) ||
      launcher.contains(target) ||
      target.closest('[data-chatbot-open]')
    ) {
      return;
    }
    closeChat();
  });

  initializeShellPosition();
  setDragging(false);
  autoResizeInput();
});
