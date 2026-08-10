document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.hero-prices strong, .price, .final b').forEach((element) => {
    const value = element.textContent.replace(/\s+/g, ' ').trim();
    if (value.includes('299')) element.textContent = 'À partir de 299 €';
    if (value.includes('399')) element.textContent = 'À partir de 399 €';
  });

  const disclosure = document.querySelector('.fineprint');
  if (disclosure) {
    const payment = document.createElement('p');
    payment.className = 'fineprint payment-terms';
    payment.innerHTML = '<strong>Modalités de paiement :</strong> 40 % d’avance au démarrage du projet, puis 60 % à la fin du contrat.';
    disclosure.insertAdjacentElement('afterend', payment);
  }
});
