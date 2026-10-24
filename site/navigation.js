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
}
