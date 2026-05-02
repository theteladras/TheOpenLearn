try {
  var k = "openlearn-splash-dismissed";
  if (sessionStorage.getItem(k))
    document.documentElement.classList.add("splash-skip");
} catch (e) {}
