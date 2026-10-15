/* A local experimental structure, rendered as a rotating ribbon.
 * Source: RCSB PDB 1TIM, chain A. See assets/home/README.md for attribution.
 * The approved illustration remains visible until WebGL has rendered successfully.
 */
(() => {
  const host = document.querySelector('#protein-view');
  if (!host) return;

  const visual = host.closest('.hero-visual');
  let inView = true;
  let viewer;
  let ready = false;
  let failed = false;
  let frame = 0;
  let lastTime = 0;
  const frameInterval = 1000 / 30;
  const degreesPerSecond = 6; // One full turn per minute, independent of display refresh rate.

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
        viewer.rotate(degreesPerSecond * Math.min(elapsed, 100) / 1000, 'y');
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
      const model = viewer.addModel(pdb, 'pdb', { keepH: false });
      if (!model.selectedAtoms({ atom: 'CA' }).length) throw new Error('Empty protein model');
      viewer.setStyle({}, {
        cartoon: {
          style: 'oval', arrows: true, thickness: 0.3,
          colorfunc: atom => atom.ss === 'h' ? '#51b8f3' : atom.ss === 's' ? '#6aeaf1' : '#49b7c8'
        }
      });
      viewer.zoomTo();
      viewer.zoom(1.45);
      viewer.rotate(30, 'x');
      viewer.rotate(-25, 'z');
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
            try { viewer.resize(); } catch { showPoster(); }
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
