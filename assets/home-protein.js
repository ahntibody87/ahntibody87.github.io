/* A local experimental structure, rendered as a rotating ribbon.
 * Source: RCSB PDB 1ATP, kinase, inhibitor peptide and ATP. See assets/home/README.md.
 * The poster is captured from this renderer at exactly the initial orientation.
 */
(() => {
  const host = document.querySelector('#protein-view');
  if (!host) return;

  const visual = host.closest('.hero-visual');
  let inView = true;
  let viewer;
  let horizontalRadius;
  let verticalRadius;
  let ready = false;
  let failed = false;
  let frame = 0;
  let lastTime = 0;
  const frameInterval = 1000 / 30;
  const degreesPerSecond = 6; // One full turn per minute, independent of display refresh rate.
  const axisLength = Math.hypot(0.93, 0.32, 0.18);
  const rotationAxis = { x: 0.93 / axisLength, y: 0.32 / axisLength, z: 0.18 / axisLength };

  function fitModel() {
    const aspect = host.clientWidth / Math.max(1, host.clientHeight);
    // Full oblique-axis rotation envelope, ribbon/stick thickness and an 3% inset.
    // 3Dmol 2.5.5 orthographic half-width = distance * tan(fov).
    const halfWidth = Math.max(horizontalRadius + 3, (verticalRadius + 3) * aspect) / 0.97;
    const view = viewer.getView();
    view[3] = 150 - halfWidth / Math.tan(20 * Math.PI / 180);
    viewer.setView(view);
  }

  function stopLoop() {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
  }

  function showPoster() {
    failed = true;
    ready = false;
    stopLoop();
    visual.classList.remove('protein-ready');
  }

  function tick(time) {
    frame = 0;
    if (!ready || !inView || document.hidden) return;
    if (!lastTime) lastTime = time;
    const elapsed = time - lastTime;
    if (elapsed >= frameInterval) {
      // Avoid a large rotation jump after a long frame or background suspension.
      try {
        viewer.rotate(degreesPerSecond * Math.min(elapsed, 100) / 1000, rotationAxis);
      } catch {
        showPoster();
        return;
      }
      lastTime = time;
    }
    frame = requestAnimationFrame(tick);
  }

  function syncMotion() {
    stopLoop();
    if (ready && inView && !document.hidden) {
      frame = requestAnimationFrame(tick);
    }
  }

  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('pagehide', stopLoop);
  window.addEventListener('pageshow', syncMotion);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      syncMotion();
    }, { threshold: 0 }).observe(host.closest('.hero'));
  }

  function loadRenderer() {
    if (window.$3Dmol) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = host.dataset.rendererSrc;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    });
  }

  async function initialise() {
    try {
      const [, response] = await Promise.all([
        loadRenderer(),
        fetch(host.dataset.modelSrc, { signal: AbortSignal.timeout(15000) })
      ]);
      if (!response.ok) throw new Error('Protein data unavailable');
      const pdb = await response.text();
      if (!pdb.includes('ATOM')) throw new Error('Invalid protein data');

      viewer = window.$3Dmol.createViewer(host, {
        backgroundColor: '#030c14', backgroundAlpha: 0,
        antialias: true, upscale: false, nomouse: true, orthographic: true, disableFog: true,
        cartoonQuality: 6
      });
      viewer.setCameraParameters({ fov: 20, z: 150 });
      const model = viewer.addModel(pdb, 'pdb', { keepH: false });
      if (!model.selectedAtoms({ atom: 'CA' }).length) throw new Error('Empty protein model');
      viewer.setStyle({ hetflag: false }, {
        cartoon: {
          style: 'oval', arrows: true, thickness: 0.3,
          colorfunc: atom => atom.chain === 'I' ? '#8da9c9' : atom.ss === 's' ? '#73dedf' : atom.ss === 'h' ? '#50a8d5' : '#4bb9c5'
        }
      });
      viewer.setStyle({ resn: 'ATP' }, { stick: { radius: 0.23, color: '#d1a363' } });
      viewer.setStyle({ resn: 'MN' }, { sphere: { radius: 0.75, color: '#e6bb76' } });
      viewer.zoomTo();
      const center = viewer.getView().slice(0, 3).map(value => -value);
      const atoms = model.selectedAtoms({});
      // Rodrigues' formula: each projected coordinate is c + a*cos(t) + b*sin(t).
      // Its analytic maximum is |c| + hypot(a,b), valid for every turn angle.
      const n = rotationAxis;
      const envelopes = atoms.map(atom => {
        const x = atom.x - center[0], y = atom.y - center[1], z = atom.z - center[2];
        const dot = n.x*x + n.y*y + n.z*z;
        const cx = n.x*dot, cy = n.y*dot;
        return [Math.abs(cx) + Math.hypot(x-cx, n.y*z-n.z*y),
          Math.abs(cy) + Math.hypot(y-cy, n.z*x-n.x*z)];
      });
      horizontalRadius = Math.max(...envelopes.map(p => p[0]));
      verticalRadius = Math.max(...envelopes.map(p => p[1]));
      viewer.rotate(20, rotationAxis);
      fitModel();
      viewer.render();
      const canvas = host.querySelector('canvas');
      if (!canvas) throw new Error('No WebGL canvas');
      canvas.setAttribute('aria-hidden', 'true');
      canvas.addEventListener('webglcontextlost', showPoster);

      ready = true;
      visual.classList.add('protein-ready');
      syncMotion();

      if ('ResizeObserver' in window) {
        new ResizeObserver(() => {
          if (!failed) {
            try { viewer.resize(); fitModel(); } catch { showPoster(); }
          }
        }).observe(host);
      }
    } catch {
      // The page and course navigation remain useful when WebGL or a fetch fails.
      showPoster();
    }
  }

  // Let the first image/text paint before parsing the optional molecular renderer.
  if ('requestIdleCallback' in window) requestIdleCallback(initialise, { timeout: 1500 });
  else setTimeout(initialise, 100);
})();
