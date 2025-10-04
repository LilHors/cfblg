// Theme toggle + active nav + misc
(function(){
  const pref = localStorage.getItem('mode');
  if(pref === 'light'){ document.documentElement.classList.add('light'); }
  document.getElementById('modeBtn')?.addEventListener('click', ()=>{
    document.documentElement.classList.toggle('light');
    localStorage.setItem('mode', document.documentElement.classList.contains('light') ? 'light':'dark');
  });
  document.getElementById('langBtn')?.addEventListener('click', ()=> window.__toggleLang && window.__toggleLang());
  // active nav by pathname
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a').forEach(a=>{
    const href = a.getAttribute('href');
    if(href === path) a.classList.add('active');
  });
  // year
  const y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();
})();
