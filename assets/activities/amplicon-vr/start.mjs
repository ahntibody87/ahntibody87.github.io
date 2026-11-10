const lab = document.getElementById('amp-lab');

if (new URLSearchParams(location.search).get('room') === 'preview') {
  const {mountWalkthrough} = await import('./walkthrough/walkthrough.mjs?v=2');
  mountWalkthrough(lab);
} else {
  const {createPerspective} = await import('./room.mjs?v=5');
  lab.perspective = createPerspective();
  await import('../amplicon/lab.mjs?v=vr5');
}
