// The appearance (dark or light) before the window is first drawn, so it never flashes the other one.
(function () {
  var t = new URLSearchParams(location.search).get('theme');
  document.documentElement.dataset.theme = t === 'light' ? 'light' : 'dark';
})();
