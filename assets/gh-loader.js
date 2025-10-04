(function(){
  if (window.__coffeeAuthLoader) return;
  window.__coffeeAuthLoader = true;

  function computeBase(){
    var isGh = location.hostname.endsWith("github.io");
    var parts = location.pathname.split("/").filter(Boolean);
    if (!isGh) return "/";
    return parts.length ? ("/" + parts[0] + "/") : "/";
  }
  var BASE = computeBase();

  function load(src, cb){
    var s = document.createElement("script");
    s.src = src; s.defer = true;
    s.onload = function(){ cb && cb(); };
    s.onerror = function(){ console.error("[loader] Failed to load:", src); };
    document.body.appendChild(s);
  }

  // make modal always on top
  var style = document.createElement("style");
  style.textContent = ".auth-modal-backdrop{z-index:2147483647!important}";
  document.head.appendChild(style);

  // chain: supabase -> env.js -> auth.js
  load("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", function(){
    load(BASE + "assets/env.js", function(){
      load(BASE + "assets/auth.js");
    });
  });
})();