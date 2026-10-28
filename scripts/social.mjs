// Static metadata is readable by link scrapers without JavaScript or course entry.
export function socialMeta({url,title,description}){
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const image='https://ahntibody87.github.io/assets/social/atll-share-v1.png';
  const alt='ATLL · Ahntibody’s Lifescience Lab · 생명과학을 탐구하는 인터랙티브 실험실';
  return `<meta property="og:type" content="website">
  <meta property="og:locale" content="ko_KR">
  <meta property="og:site_name" content="ATLL · Ahntibody’s Lifescience Lab">
  <meta property="og:url" content="${esc(new URL(url,'https://ahntibody87.github.io').href)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image" content="${image}">
  <meta property="og:image:secure_url" content="${image}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${alt}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${image}">
  <meta name="twitter:image:alt" content="${alt}">`;
}
