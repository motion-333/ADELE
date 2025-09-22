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

    const baseDurationStart = 1.8;
    const durationStep = 0.25;

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

      const duration = baseDurationStart + (index % 5) * durationStep;
      track.dataset.baseDuration = duration.toString();
    });

    const afterFragment = document.createDocumentFragment();
    originalProjects.forEach((project) => {
      afterFragment.appendChild(project.cloneNode(true));
    });
    projectList.appendChild(afterFragment);

    const reduceMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
    let shouldReduceMotion = reduceMotionMedia.matches;

    const FAST_MULTIPLIER = 0.45;
    const MIN_FAST_DURATION = 0.7;

    const trackStates = [];
    const trackStateMap = new WeakMap();

    const trackElements = Array.from(projectList.querySelectorAll('.media-track'));
    trackElements.forEach((track) => {
      const baseDurationAttr = parseFloat(track.dataset.baseDuration || `${baseDurationStart}`);
      const baseDuration =
        Number.isFinite(baseDurationAttr) && baseDurationAttr > 0
          ? baseDurationAttr
          : baseDurationStart;

      const state = {
        track,
        baseDuration,
        fastDuration: Math.max(baseDuration * FAST_MULTIPLIER, MIN_FAST_DURATION),
        contentWidth: 0,
        offset: 0,
        baseSpeedAbs: 0,
        fastSpeedAbs: 0,
        speed: 0,
        mode: 'base-left',
      };

      trackStates.push(state);
      trackStateMap.set(track, state);
    });

    const wrapOffset = (state) => {
      const width = state.contentWidth;
      if (!width) {
        state.offset = 0;
        return;
      }

      while (state.offset <= -width) {
        state.offset += width;
      }

      while (state.offset > 0) {
        state.offset -= width;
      }
    };

    const updateStateSpeeds = (state) => {
      state.fastDuration = Math.max(state.baseDuration * FAST_MULTIPLIER, MIN_FAST_DURATION);

      if (!state.contentWidth || shouldReduceMotion) {
        state.baseSpeedAbs = 0;
        state.fastSpeedAbs = 0;
        state.speed = 0;
        return;
      }

      state.baseSpeedAbs = state.contentWidth / state.baseDuration;
      state.fastSpeedAbs = state.contentWidth / state.fastDuration;

      if (state.mode === 'fast-right') {
        state.speed = state.fastSpeedAbs;
      } else if (state.mode === 'fast-left') {
        state.speed = -state.fastSpeedAbs;
      } else {
        state.mode = 'base-left';
        state.speed = -state.baseSpeedAbs;
      }
    };

    const computeTrackMetrics = () => {
      trackStates.forEach((state) => {
        const track = state.track;
        const totalWidth = track.scrollWidth;
        const baseWidth = totalWidth / 2;
        state.contentWidth = baseWidth || totalWidth || 0;

        if (!state.contentWidth) {
          state.offset = 0;
          track.style.transform = 'translateX(0)';
        } else {
          wrapOffset(state);
          track.style.transform = `translateX(${state.offset}px)`;
        }

        updateStateSpeeds(state);
      });
    };

    const applyMode = (state, mode) => {
      if (!state) {
        return;
      }

      if (shouldReduceMotion) {
        state.mode = 'base-left';
        state.speed = 0;
        return;
      }

      if (mode === 'fast-right') {
        state.mode = 'fast-right';
        state.speed = state.fastSpeedAbs || 0;
      } else if (mode === 'fast-left') {
        state.mode = 'fast-left';
        state.speed = state.fastSpeedAbs ? -state.fastSpeedAbs : 0;
      } else {
        state.mode = 'base-left';
        state.speed = state.baseSpeedAbs ? -state.baseSpeedAbs : 0;
      }
    };

    const setupHotspots = (strip) => {
      if (!strip || strip.querySelector('.media-strip__hotspot')) {
        return;
      }

      const track = strip.querySelector('.media-track');
      if (!track) {
        return;
      }

      const state = trackStateMap.get(track);
      if (!state) {
        return;
      }

      const createHotspot = (position) => {
        const hotspot = document.createElement('span');
        hotspot.className = `media-strip__hotspot media-strip__hotspot--${position}`;
        hotspot.setAttribute('aria-hidden', 'true');
        return hotspot;
      };

      const leftHotspot = createHotspot('left');
      const rightHotspot = createHotspot('right');

      const resetMode = () => applyMode(state, 'base-left');

      leftHotspot.addEventListener('pointerenter', () => applyMode(state, 'fast-left'));
      leftHotspot.addEventListener('pointerleave', resetMode);
      leftHotspot.addEventListener('pointercancel', resetMode);
      leftHotspot.addEventListener('pointerup', resetMode);

      rightHotspot.addEventListener('pointerenter', () => applyMode(state, 'fast-right'));
      rightHotspot.addEventListener('pointerleave', resetMode);
      rightHotspot.addEventListener('pointercancel', resetMode);
      rightHotspot.addEventListener('pointerup', resetMode);

      strip.append(leftHotspot, rightHotspot);
    };

    const strips = Array.from(projectList.querySelectorAll('.media-strip'));
    strips.forEach((strip) => setupHotspots(strip));

    computeTrackMetrics();

    let previousTime;
    const animateTracks = (timestamp) => {
      if (shouldReduceMotion) {
        previousTime = undefined;
        trackStates.forEach((state) => {
          if (state.offset !== 0) {
            state.offset = 0;
            state.track.style.transform = 'translateX(0)';
          }
        });
        requestAnimationFrame(animateTracks);
        return;
      }

      if (previousTime === undefined) {
        previousTime = timestamp;
        requestAnimationFrame(animateTracks);
        return;
      }

      const deltaSeconds = (timestamp - previousTime) / 1000;
      previousTime = timestamp;

      trackStates.forEach((state) => {
        if (!state.contentWidth || state.speed === 0) {
          return;
        }
        state.offset += state.speed * deltaSeconds;
        wrapOffset(state);
        state.track.style.transform = `translateX(${state.offset}px)`;
      });

      requestAnimationFrame(animateTracks);
    };

    requestAnimationFrame(animateTracks);

    const handleMotionPreferenceChange = (event) => {
      shouldReduceMotion = event.matches;

      if (shouldReduceMotion) {
        trackStates.forEach((state) => {
          state.offset = 0;
          state.speed = 0;
          state.mode = 'base-left';
          state.track.style.transform = 'translateX(0)';
        });
      } else {
        computeTrackMetrics();
        previousTime = undefined;
      }
    };

    if (typeof reduceMotionMedia.addEventListener === 'function') {
      reduceMotionMedia.addEventListener('change', handleMotionPreferenceChange);
    } else if (typeof reduceMotionMedia.addListener === 'function') {
      reduceMotionMedia.addListener(handleMotionPreferenceChange);
    }

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
      computeTrackMetrics();
    };

    window.addEventListener('resize', recalcCycleHeight);

    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(recalcCycleHeight);
      observer.observe(projectList);
    }

    window.addEventListener('load', computeTrackMetrics);
  });
})();
