// Early theme bootstrapping. Keep this external so CSP does not need inline scripts.
(function () {
  var stored = null;
  try {
    var raw = localStorage.getItem('yks_coach_theme_fast');
    if (!raw) {
      raw = localStorage.getItem('yks_coach_storage');
      if (raw) {
        var parsed = JSON.parse(raw);
        stored = parsed && parsed.state ? parsed.state.theme : null;
      }
    } else {
      stored = raw;
    }
  } catch (e) {
    stored = null;
  }

  var isDark = stored !== 'light';
  var html = document.documentElement;
  html.classList.add(isDark ? 'dark' : 'light');
  html.classList.remove(isDark ? 'light' : 'dark');
  html.style.colorScheme = isDark ? 'dark' : 'light';
  html.style.backgroundColor = isDark ? '#0A0A0A' : '#F8F8F8';
})();
