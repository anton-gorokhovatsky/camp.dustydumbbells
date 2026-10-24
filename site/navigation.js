const navigation = document.querySelector('#nav1017771976');
if (navigation) {
  const toggle = navigation.querySelector('.t-menu-burger');
  const panel = navigation.querySelector('.t-menu-popover__burgermenu__sidebar');
  const labelToggle = () => {
    toggle.setAttribute('aria-label', toggle.getAttribute('aria-expanded') === 'true' ? 'Закрыть меню' : 'Открыть меню');
  };
  labelToggle();
  new MutationObserver(labelToggle).observe(toggle, {attributes: true, attributeFilter: ['aria-expanded']});
  navigation.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || toggle.getAttribute('aria-expanded') !== 'true') return;
    event.preventDefault();
    event.stopPropagation();
    toggle.click();
    toggle.focus({preventScroll: true});
  }, true);
  panel.addEventListener('click', event => {
    if (event.target.closest('a[href^="#"]')) toggle.focus({preventScroll: true});
  });
  // Reuse the same menu after the original desktop navigation leaves view.
  const record = navigation.closest('.t-rec');
  const desktopMenu = document.querySelector('#nav1016601036');
  const desktop = matchMedia('(min-width: 641px)');
  if (record && desktopMenu && document.querySelector('[data-dd-refinement="camp"]')) {
    let scheduled = false;
    const update = () => {
      scheduled = false;
      const show = desktop.matches && desktopMenu.getBoundingClientRect().bottom <= 0;
      record.classList.toggle('dd-nav-scrolled', show);
      if (desktop.matches && !show && toggle.getAttribute('aria-expanded') === 'true') toggle.click();
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(update);
    };
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule);
    desktop.addEventListener('change', schedule);
    update();
  }
}
