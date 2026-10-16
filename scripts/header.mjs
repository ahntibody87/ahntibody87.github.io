// One navigation template for the home, classrooms, units and activities.
export function siteHeader(site, url = '/') {
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const links = [{ url: '/', label: 'Home' }, ...site.courses.map(c => ({url: `/${c.id}/`, label: (c.home || c).english}))];
  return `<header class="site-header"><div class="header-inner"><a class="wordmark" href="/" aria-label="ATLL 홈" lang="en"><svg class="brand-antibody" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="40" height="40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M10.5 6.5 12 11.5 16 16 20 11.5 21.5 6.5M16 16v9.5" stroke-width="2.5"/><path d="m6.5 8.5 1.6 4.6 2.4 2.4m15-7-1.6 4.6-2.4 2.4" stroke-width="1.8"/></svg><span>ATLL</span></a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="navigation" hidden>메뉴 열기</button><nav id="navigation" aria-label="현재 위치">${links.map(link => {
    const active = link.url === '/' ? url === '/' : url.startsWith(link.url);
    return `<a href="${link.url}" lang="en"${active ? ` class="active" aria-current="${url === link.url ? 'page' : 'location'}"` : ''}>${esc(link.label)}</a>`;
  }).join('')}</nav></div></header>`;
}
