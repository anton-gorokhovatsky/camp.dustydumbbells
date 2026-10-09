// Native links keep their URL/history semantics. This module adds orientation,
// a predictable disclosure and a useful keyboard destination.
export function setupNavigation(reduced) {
  const root = document.documentElement;
  const menu = document.querySelector('.site-menu');
  const toggle = menu.querySelector('.menu-toggle');
  const label = toggle.querySelector('.menu-label');
  const navigation = document.querySelector('#site-navigation');
  const masthead = document.querySelector('.masthead');
  const links = [...navigation.querySelectorAll('a')];
  const groups = [links, [...document.querySelectorAll('.week-nav a')], [...document.querySelectorAll('.guide-contents a')]];
  let motion;
  let closing = false;
  let scrollFrame = 0;
  let lastScroll = Math.max(0, window.scrollY);
  let direction = 0;
  let directionStart = lastScroll;
  let keyboardNavigation = false;
  document.addEventListener('keydown', () => { keyboardNavigation = true; }, true);
  document.addEventListener('pointerdown', () => { keyboardNavigation = false; }, true);

  // One measured clearance serves anchors and keyboard destinations, including
  // enlarged text. It does not reserve the same space a second time per anchor.
  new ResizeObserver(() => {
    root.style.setProperty('--nav-clearance', `${Math.ceil(masthead.getBoundingClientRect().height + 16)}px`);
  }).observe(masthead);

  function fitMenu() {
    const viewport = window.visualViewport;
    const bottom = viewport ? viewport.height + viewport.offsetTop : window.innerHeight;
    const height = Math.max(0, bottom - navigation.getBoundingClientRect().top - 16);
    navigation.style.setProperty('--menu-height', `${height}px`);
  }

  function closeMenu(returnFocus = false, animate = true) {
    if (menu.dataset.open !== 'true') {
      if (returnFocus) toggle.focus({ preventScroll: true });
      return;
    }
    motion?.cancel();
    closing = true;
    toggle.setAttribute('aria-expanded', 'false');
    label.textContent = 'Меню';
    navigation.inert = true;
    if (returnFocus || navigation.contains(document.activeElement)) toggle.focus({ preventScroll: true });
    function finish() {
      menu.dataset.open = 'false';
      navigation.hidden = true;
      closing = false;
      motion = null;
    }
    if (reduced.matches || !animate) { finish(); return; }
    motion = navigation.animate([
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-6px)' }
    ], { duration: 160, easing: 'cubic-bezier(.2,.7,.2,1)' });
    motion.finished.then(finish).catch(() => {});
  }

  function openMenu() {
    motion?.cancel();
    motion = null;
    closing = false;
    masthead.dataset.reading = 'false';
    menu.dataset.open = 'true';
    navigation.hidden = false;
    navigation.inert = false;
    toggle.setAttribute('aria-expanded', 'true');
    label.textContent = 'Закрыть';
    fitMenu();
    if (!reduced.matches) motion = navigation.animate([
      { opacity: 0, transform: 'translateY(-8px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration: 240, easing: 'cubic-bezier(.2,.7,.2,1)' });
  }

  navigation.hidden = true;
  navigation.inert = true;
  menu.dataset.ready = 'true';
  menu.dataset.open = 'false';
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    if (menu.dataset.open !== 'true' || closing) openMenu(); else closeMenu();
  });
  menu.addEventListener('focusin', () => { masthead.dataset.reading = 'false'; });
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.dataset.open === 'true') {
      event.preventDefault(); closeMenu(true);
    } else if (event.target === toggle && event.key === 'ArrowDown') {
      event.preventDefault(); openMenu(); links[0].focus();
    }
  });
  menu.addEventListener('focusout', event => {
    if (event.relatedTarget && !menu.contains(event.relatedTarget)) closeMenu(false, false);
  });
  document.addEventListener('pointerdown', event => {
    if (!menu.contains(event.target)) closeMenu(false);
  });
  window.addEventListener('resize', () => { if (menu.dataset.open === 'true') fitMenu(); });
  window.visualViewport?.addEventListener('resize', () => { if (menu.dataset.open === 'true') fitMenu(); });
  reduced.addEventListener('change', () => {
    motion?.cancel();
    if (closing) closeMenu(false, false);
  });

  function headingFor(target) {
    const id = target.getAttribute('aria-labelledby');
    return (id && document.getElementById(id)) || target;
  }
  function focusDestination(target, keyboard = keyboardNavigation) {
    const destination = headingFor(target);
    if (!destination.hasAttribute('tabindex')) destination.setAttribute('tabindex', '-1');
    destination.dataset.navigationFocus = keyboard ? 'keyboard' : 'pointer';
    destination.focus({ preventScroll: true });
  }
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.getAttribute('target') || link.hasAttribute('download')) return;
    const url = new URL(link.href, location.href);
    if (!url.hash || url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return;
    let target;
    try { target = document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch { return; }
    if (!target) return;
    event.preventDefault();
    closeMenu(false, false);
    // Later listeners reveal guide/hotel content before the native smooth scroll.
    queueMicrotask(() => {
      if (location.hash !== url.hash) history.pushState(null, '', url.hash);
      target.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'start' });
      focusDestination(target, event.detail === 0);
      requestPosition();
    });
  });
  window.addEventListener('popstate', () => {
    closeMenu(false, false);
    // Hash listeners reveal a closed guide topic before its heading gets focus.
    requestAnimationFrame(() => {
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)) || 'top'; } catch { return; }
      const target = document.getElementById(id);
      if (target) focusDestination(target);
      requestPosition();
    });
  });

  function updatePosition() {
    scrollFrame = 0;
    const position = Math.max(0, window.scrollY);
    const nextDirection = Math.sign(position - lastScroll);
    if (nextDirection && nextDirection !== direction) {
      direction = nextDirection;
      directionStart = lastScroll;
    }
    const menuHasKeyboardFocus = menu.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
    if (position <= 24 || menu.dataset.open === 'true' || menuHasKeyboardFocus) {
      masthead.dataset.reading = 'false';
    } else if (Math.abs(position - directionStart) >= 16) {
      if (direction < 0) masthead.dataset.reading = 'false';
      else masthead.dataset.reading = 'true';
    }
    lastScroll = position;
    masthead.dataset.scrolled = String(position > 24);
    // Orientation is independent of the disclosure's current visibility.
    const line = masthead.offsetHeight + 48;
    for (const group of groups) {
      let current = null;
      for (const link of group) {
        const target = document.getElementById(link.hash.slice(1));
        if (!target) continue;
        if (target.getBoundingClientRect().top <= line) current = link;
      }
      const lastTarget = group.length && document.getElementById(group.at(-1).hash.slice(1));
      if (lastTarget && lastTarget.getBoundingClientRect().bottom < line) current = null;
      // Week anchors are headings; their section contains the complete week.
      if (group[0]?.closest('.week-nav')) {
        current = group.find(link => {
          const section = document.getElementById(link.hash.slice(1))?.closest('.program-week');
          const box = section?.getBoundingClientRect();
          return box && box.top <= line && box.bottom > line;
        }) || null;
      }
      for (const link of group) {
        if (link === current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }
  }
  function requestPosition() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updatePosition);
  }
  window.addEventListener('scroll', requestPosition, { passive: true });
  window.addEventListener('resize', requestPosition);
  window.addEventListener('hashchange', requestPosition);
  document.addEventListener('toggle', requestPosition, true);
  updatePosition();
  // Initial deep links stay immediate; subsequent native anchor clicks are smooth.
  requestAnimationFrame(() => { root.dataset.navigationReady = 'true'; });
}
