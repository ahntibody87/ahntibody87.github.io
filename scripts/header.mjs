// One navigation template for the home, classrooms, units and activities.
export function siteHeader(site, url = '/') {
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const links = [{ url: '/', label: 'Home' }, ...site.courses.map(c => ({url: `/${c.id}/`, label: (c.home || c).english}))];
  return `<header class="site-header"><div class="header-inner"><a class="wordmark" href="/" aria-label="ATLL 홈" lang="en">ATLL<span class="brand-dot" aria-hidden="true"></span></a><button class="menu-toggle" type="button" aria-expanded="false" aria-controls="navigation" hidden>메뉴 열기</button><nav id="navigation" aria-label="현재 위치">${links.map(link => {
    const active = link.url === '/' ? url === '/' : url.startsWith(link.url);
    return `<a href="${link.url}" lang="en"${active ? ` class="active" aria-current="${url === link.url ? 'page' : 'location'}"` : ''}>${esc(link.label)}</a>`;
  }).join('')}</nav></div></header>`;
}
