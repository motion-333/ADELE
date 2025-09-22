(function () {
  const historyApi = window.history;
  if (historyApi && 'scrollRestoration' in historyApi) {
    historyApi.scrollRestoration = 'manual';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const titleLink = document.querySelector('.topbar__title');
    const isHomePage = document.querySelector('.portfolio') !== null;

    if (titleLink) {
      titleLink.addEventListener('click', (event) => {
        if (isHomePage) {
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }

    const projectList = document.querySelector('.projects');
    if (!projectList) {
      return;
    }

    const originalProjects = Array.from(projectList.children);
    if (!originalProjects.length) {
      return;
    }

    originalProjects.forEach((project, index) => {
      const track = project.querySelector('.media-track');
      if (!track) {
        return;
      }

      const placeholders = Array.from(track.children);
      const duplicateSet = document.createDocumentFragment();
      placeholders.forEach((placeholder) => {
        duplicateSet.appendChild(placeholder.cloneNode(true));
      });
      track.appendChild(duplicateSet);

      const duration = 4 + (index % 5) * 0.6;
      track.style.setProperty('--scroll-duration', `${duration}s`);
    });

    const afterFragment = document.createDocumentFragment();
    originalProjects.forEach((project) => {
      afterFragment.appendChild(project.cloneNode(true));
    });
    projectList.appendChild(afterFragment);

    let cycleHeight = projectList.scrollHeight / 2;

    const normalizeScrollPosition = () => {
      if (!cycleHeight) {
        return;
      }
      const scrollY = window.scrollY;
      if (scrollY >= cycleHeight) {
        isAdjusting = true;
        window.scrollTo(0, scrollY - cycleHeight);
      }
    };

    let isAdjusting = false;

    const onScroll = () => {
      if (isAdjusting) {
        isAdjusting = false;
        return;
      }
      requestAnimationFrame(normalizeScrollPosition);
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    const recalcCycleHeight = () => {
      cycleHeight = projectList.scrollHeight / 2;
      normalizeScrollPosition();
    };

    window.addEventListener('resize', recalcCycleHeight);

    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(recalcCycleHeight);
      observer.observe(projectList);
    }
  });
})();
