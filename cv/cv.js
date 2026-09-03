/* Shared toolbar for every CV page — hidden when printing */
(function () {
  var PAIRS = {
    '01_Ingenieur-GenAI_FR.html': '01_GenAI-Engineer_EN.html',
    '02_Ingenieur-Full-Stack_FR.html': '02_Full-Stack-Engineer_EN.html',
    '03_Ingenieur-Data_FR.html': '03_Data-Engineer_EN.html',
    '04_Ingenieur-Forward-Development_FR.html': '04_Forward-Development-Engineer_EN.html',
    '05_Architecte-Solutions_FR.html': '05_Solutions-Architect_EN.html',
    '06_Developpeur-Full-Stack-Laravel_FR.html': '06_Laravel-Full-Stack-Developer_EN.html'
  };
  var EN_TO_FR = {};
  Object.keys(PAIRS).forEach(function (k) { EN_TO_FR[PAIRS[k]] = k; });

  var path = location.pathname.split('/').pop();
  var isFR = /_FR\.html$/i.test(path);
  var altName = isFR ? PAIRS[path] : EN_TO_FR[path];

  var bar = document.createElement('div');
  bar.id = 'cv-toolbar';
  bar.innerHTML =
    '<a href="./" class="cv-btn">&larr; ' + (isFR ? 'Tous les CV' : 'All CVs') + '</a>' +
    '<a href="' + altName + '" class="cv-btn">' + (isFR ? 'English version' : 'Version française') + '</a>' +
    '<button type="button" class="cv-btn cv-btn--primary" id="cv-print">' +
      (isFR ? 'Imprimer / Enregistrer en PDF' : 'Print / Save as PDF') + '</button>';
  document.body.appendChild(bar);

  var css = document.createElement('style');
  css.textContent =
    '#cv-toolbar{position:fixed;right:16px;bottom:16px;display:flex;flex-direction:column;gap:8px;z-index:9999;font-family:Arial,sans-serif}' +
    '.cv-btn{display:inline-block;padding:9px 14px;border-radius:8px;border:1px solid #0b4f8a;background:#fff;color:#0b4f8a;' +
      'font-size:9.5pt;text-decoration:none;text-align:center;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.12)}' +
    '.cv-btn--primary{background:#0b4f8a;color:#fff}' +
    '@media print{#cv-toolbar{display:none!important}}';
  document.head.appendChild(css);

  document.getElementById('cv-print').addEventListener('click', function () { window.print(); });
  if (/[?&]print/.test(location.search)) {
    window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 400); });
  }
})();
