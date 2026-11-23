(() => {
  const menu = document.querySelector('.menu');
  const nav = document.querySelector('header nav');
  menu?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', open);
  });
  document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', () => nav?.classList.remove('open')));

  const track = (name, params = {}) => {
    window.gtag?.('event', name, params);
    window.dataLayer?.push({ event: name, ...params });
  };
  track('view_content', { content_name: 'automatisation_landing' });
  document.querySelectorAll('[data-cta]').forEach((a) => a.addEventListener('click', () => track('cta_click', { cta: a.dataset.cta })));

  const form = document.getElementById('devis-form');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('.quote-step'));
  const progressSteps = Array.from(document.querySelectorAll('.quote-progress span'));
  const stepLabel = document.getElementById('quote-step-label');
  const note = document.getElementById('devis-form-note');
  const result = document.getElementById('quote-result');
  const resultRef = document.getElementById('quote-result-ref');
  const resultWhatsapp = document.getElementById('quote-result-whatsapp');
  const DRAFT_KEY = 'jb-devis-draft';

  let current = 0;

  const LANG = document.documentElement.lang === 'en' ? 'en' : 'fr';
  const STRINGS = {
    fr: {
      stepTitles: ['Votre entreprise', 'Vos défis & besoins', 'Projet & budget'],
      stepFormat: (i, total, title) => `Étape ${i}/${total} — ${title}`,
      needsRequired: 'Merci de cocher au moins un besoin à automatiser.',
      sending: '<i class="fa-solid fa-circle-notch fa-spin"></i> Envoi en cours...',
      genericError: "Impossible d'envoyer la demande.",
      fallbackError: "Le serveur email n'est pas encore configuré. Contactez-nous sur WhatsApp : +237 694 10 35 85.",
      whatsappText: (id) => `Bonjour Jack, je viens de recevoir mon devis ${id} et je souhaite en discuter.`,
    },
    en: {
      stepTitles: ['Your business', 'Your challenges & needs', 'Project & budget'],
      stepFormat: (i, total, title) => `Step ${i}/${total} — ${title}`,
      needsRequired: 'Please select at least one need to automate.',
      sending: '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending...',
      genericError: 'Unable to send your request.',
      fallbackError: 'The email server is not configured yet. Contact us on WhatsApp: +237 694 10 35 85.',
      whatsappText: (id) => `Hi Jack, I just received my quote ${id} and I'd like to discuss it.`,
    },
  }[LANG];

  function showStep(index) {
    steps.forEach((step, i) => step.classList.toggle('active', i === index));
    progressSteps.forEach((span, i) => {
      span.classList.toggle('done', i < index);
      span.classList.toggle('active', i === index);
    });
    if (stepLabel) stepLabel.textContent = STRINGS.stepFormat(index + 1, steps.length, STRINGS.stepTitles[index] || '');
    current = index;
    form.querySelector('.quote-step.active')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function validateStep(index) {
    const step = steps[index];
    const fields = step.querySelectorAll('input, select, textarea');
    let valid = true;
    fields.forEach((field) => {
      if (field.type === 'checkbox' && field.name === 'needs') return;
      if (!field.checkValidity()) {
        valid = false;
      }
    });
    if (!valid) {
      step.querySelector('input:invalid, select:invalid, textarea:invalid')?.reportValidity();
    }
    if (index === 1) {
      const anyNeed = Array.from(form.querySelectorAll('input[name="needs"]:checked')).length > 0;
      if (!anyNeed) {
        if (note) {
          note.classList.add('form-note--error');
          note.textContent = STRINGS.needsRequired;
        }
        valid = false;
      }
    }
    return valid;
  }

  form.querySelectorAll('[data-next]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!validateStep(current)) return;
      if (note) { note.textContent = ''; note.classList.remove('form-note--error'); }
      track('form_step', { step: current + 1 });
      saveDraft();
      showStep(Math.min(current + 1, steps.length - 1));
    });
  });

  form.querySelectorAll('[data-prev]').forEach((btn) => {
    btn.addEventListener('click', () => showStep(Math.max(current - 1, 0)));
  });

  function saveDraft() {
    try {
      const data = new FormData(form);
      const obj = {};
      data.forEach((value, key) => {
        if (key === 'needs') {
          obj.needs = obj.needs || [];
          obj.needs.push(value);
        } else {
          obj[key] = value;
        }
      });
      localStorage.setItem(DRAFT_KEY, JSON.stringify(obj));
    } catch (error) { /* localStorage unavailable */ }
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      Object.entries(obj).forEach(([key, value]) => {
        if (key === 'needs') {
          const values = Array.isArray(value) ? value : [value];
          form.querySelectorAll('input[name="needs"]').forEach((input) => {
            input.checked = values.includes(input.value);
          });
          return;
        }
        const field = form.querySelector(`[name="${key}"]`);
        if (field && field.type !== 'checkbox') field.value = value;
      });
    } catch (error) { /* ignore corrupt draft */ }
  }

  restoreDraft();
  form.addEventListener('focusin', () => track('form_start', { form_name: 'devis' }), { once: true });
  form.querySelectorAll('input, select, textarea').forEach((field) => field.addEventListener('input', saveDraft));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validateStep(current)) return;

    const endpoint = form.dataset.endpoint || 'api/devis.php';
    const formData = new FormData(form);
    const payload = {};
    formData.forEach((value, key) => {
      if (key === 'needs') {
        payload.needs = payload.needs || [];
        payload.needs.push(value);
      } else {
        payload[key] = value;
      }
    });

    const submitButton = form.querySelector('[data-submit]');
    const defaultText = submitButton ? submitButton.innerHTML : '';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = STRINGS.sending;
    }
    if (note) { note.textContent = ''; note.classList.remove('form-note--error', 'form-note--success'); }

    fetch(endpoint, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.ok !== true) {
          throw new Error(data.message || STRINGS.genericError);
        }
        track('generate_lead', { form_name: 'devis', submission_id: data.submissionId });
        try { localStorage.removeItem(DRAFT_KEY); } catch (error) { /* ignore */ }
        if (resultRef) resultRef.textContent = data.submissionId || '';
        if (resultWhatsapp) {
          resultWhatsapp.href = `https://wa.me/237694103585?text=${encodeURIComponent(STRINGS.whatsappText(data.submissionId || ''))}`;
        }
        form.closest('.quote-wrap')?.querySelectorAll('.quote-progress, .quote-step-label, .quote-form').forEach((el) => {
          el.style.display = 'none';
        });
        result?.classList.add('active');
      })
      .catch((error) => {
        if (note) {
          note.classList.add('form-note--error');
          note.textContent = error.message || STRINGS.fallbackError;
        }
      })
      .finally(() => {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.innerHTML = defaultText;
        }
      });
  });

  showStep(0);
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
