// Minimal page i18n (RU/EN)
(function(){
  const dict = {
    ru: {
      nav_about:'Обо мне', nav_recipes:'Рецепты', nav_news:'Новости',
      nav_packs:'Пачки', nav_gallery:'Галерея', ui_theme:'Тема',
      hero_badge:'☕ Привет! Я Федя — веду кофейный блог',
      hero_title:'Новости, рецепты и коллекция пачек — всё про кофе',
      hero_lead:'Пишу об актуальном в индустрии, делюсь проверенными рецептами (V60, эспрессо, аэропресс) и веду каталог любимых пачек с заметками о вкусе.'
    },
    en: {
      nav_about:'About', nav_recipes:'Recipes', nav_news:'News',
      nav_packs:'Bags', nav_gallery:'Gallery', ui_theme:'Theme',
      hero_badge:"☕ Hi! I'm Fedya — running a coffee blog",
      hero_title:'News, recipes & bag collection — all about coffee',
      hero_lead:'I cover industry news, share recipes (V60, espresso, AeroPress) and keep a catalog of my favorite bags with tasting notes.'
    }
  };
  const lang = localStorage.getItem('lang') || 'ru';
  document.documentElement.lang = lang;
  function apply(){
    const d = dict[document.documentElement.lang]||{};
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n'); if(d[key]) el.textContent = d[key];
    });
    const label = document.getElementById('langLabel'); if(label) label.textContent = document.documentElement.lang.toUpperCase();
  }
  window.__toggleLang = function(){
    const next = document.documentElement.lang === 'ru' ? 'en' : 'ru';
    localStorage.setItem('lang', next);
    document.documentElement.lang = next;
    apply();
  };
  apply();
})();
