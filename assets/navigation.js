// Include the actual header height, including wrapped or expanded navigation.
document.querySelector('.portal-back-top')?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
});

const header = document.querySelector('.site-header');
if (header) {
  const updateHeaderHeight = () => {
    document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
  };
  updateHeaderHeight();
  new ResizeObserver(updateHeaderHeight).observe(header);
}

// Navigation remains fully visible without JavaScript.
const toggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
if (toggle && navigation) {
  document.documentElement.classList.add('js');
  toggle.hidden = false;
  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '메뉴 열기';
    navigation.classList.remove('open');
  };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? '메뉴 닫기' : '메뉴 열기';
    navigation.classList.toggle('open', open);
  });
  navigation.addEventListener('click', event => {
    if (event.target.closest('a')) closeMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      toggle.focus();
    }
  });
  matchMedia('(min-width: 961px)').addEventListener('change', closeMenu);
}
