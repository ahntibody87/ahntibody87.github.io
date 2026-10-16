// Home-only state; course destinations and the shared navigation stay unchanged.
(() => {
  const hero = document.querySelector('.hero');
  const intro = hero.querySelector('.hero-content');
  const courses = hero.querySelector('.hero-courses');
  const enter = document.querySelector('#enter-lab');
  const back = courses.querySelector('.course-back');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let changing = false;

  async function switchView(showCourses) {
    if (changing || showCourses === !courses.hidden) return;
    changing = true;
    const outgoing = showCourses ? intro : courses;
    const incoming = showCourses ? courses : intro;
    outgoing.inert = true;
    const animate = async (element, frames, options) => {
      if (reducedMotion.matches) return;
      const animation = element.animate(frames, options);
      await animation.finished;
    };
    await animate(outgoing, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-out' });
    outgoing.hidden = true;
    incoming.hidden = false;
    incoming.inert = false;
    hero.classList.toggle('courses-open', showCourses);
    hero.setAttribute('aria-labelledby', showCourses ? 'courses-title' : 'lab-title');
    enter.setAttribute('aria-expanded', String(showCourses));
    (showCourses ? back : enter).focus({ preventScroll: true });
    // Keep the active Hero in view even after scrolling on a small screen.
    window.scrollTo({ top: 0, behavior: 'instant' });
    const elements = showCourses
      ? [back, courses.querySelector('.section-heading'), ...courses.querySelectorAll('.course-card')]
      : [intro];
    await Promise.all(elements.map((element, index) => animate(element,
      [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }],
      { duration: 360, delay: showCourses ? Math.max(0, index - 2) * 80 : 0, easing: 'ease-out', fill: 'backwards' }
    )));
    changing = false;
  }
  enter.addEventListener('click', () => switchView(true));
  back.addEventListener('click', () => switchView(false));
})();
