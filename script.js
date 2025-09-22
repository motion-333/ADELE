(function () {
  const historyApi = window.history;
  if (historyApi && 'scrollRestoration' in historyApi) {
    historyApi.scrollRestoration = 'manual';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const titleLink = document.querySelector('.topbar__title');
    const isHomePage = document.querySelector('.portfolio') !== null;

    const reduceMotionMedia =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : { matches: false, addEventListener: null, addListener: null };
    let shouldReduceMotion = reduceMotionMedia.matches;

    const fontsReadyPromise =
      document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function'
        ? document.fonts.ready
        : null;

    const ACTION_KEYS = new Set(['Enter', ' ']);

    const placeholderSelector = '.placeholder[data-project][data-hero-class]';
    const HERO_WIDTH_RATIO = 0.95;
    const HERO_MAX_WIDTH = 1200;
    const HERO_ASPECT = 16 / 9;
    const RETURN_SCROLL_KEY = 'adele:return-scroll';

    const collectPlaceholderVariants = (element) =>
      element
        ? Array.from(element.classList).filter((className) =>
            typeof className === 'string' && className.startsWith('placeholder--')
          )
        : [];

    const swapPlaceholderVariant = (element, targetClass) => {
      if (!element) {
        return;
      }
      const existing = collectPlaceholderVariants(element);
      existing.forEach((className) => {
        element.classList.remove(className);
      });
      if (targetClass) {
        element.classList.add(targetClass);
      }
    };

    const heroStorageKey = (projectId) => `adele:project-hero:${projectId}`;

    const canUseHeroStorage = (() => {
      try {
        const testKey = '__adeleHeroTest__';
        window.sessionStorage.setItem(testKey, '1');
        window.sessionStorage.removeItem(testKey);
        return true;
      } catch (error) {
        return false;
      }
    })();

    const storeHeroData = (projectId, heroClass, ratio) => {
      if (!projectId || !canUseHeroStorage) {
        return;
      }

      const payload = {};
      if (heroClass) {
        payload.heroClass = heroClass;
      }

      if (Number.isFinite(ratio) && ratio > 0) {
        payload.ratio = ratio;
      }

      try {
        window.sessionStorage.setItem(heroStorageKey(projectId), JSON.stringify(payload));
      } catch (error) {
        /* no-op */
      }
    };

    const readHeroData = (projectId) => {
      if (!projectId || !canUseHeroStorage) {
        return null;
      }

      let raw;
      try {
        raw = window.sessionStorage.getItem(heroStorageKey(projectId));
      } catch (error) {
        return null;
      }

      if (!raw) {
        return null;
      }

      try {
        const parsed = JSON.parse(raw);
        const heroClass = typeof parsed.heroClass === 'string' ? parsed.heroClass : null;
        const ratioCandidate = parsed && typeof parsed === 'object' ? parsed.ratio : null;
        const ratio = Number.isFinite(ratioCandidate) ? ratioCandidate : null;
        return { heroClass, ratio };
      } catch (error) {
        return null;
      }
    };

    let scrollAnimationFrame = null;
    let scrollAnimationStart = null;

    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const cancelScrollAnimation = () => {
      if (scrollAnimationFrame !== null) {
        cancelAnimationFrame(scrollAnimationFrame);
        scrollAnimationFrame = null;
      }
      scrollAnimationStart = null;
    };

    const startScrollToTopAnimation = () => {
      cancelScrollAnimation();

      const startY = window.scrollY || window.pageYOffset || 0;
      if (startY <= 0) {
        return;
      }

      const duration = 2000;

      const step = (timestamp) => {
        if (scrollAnimationStart === null) {
          scrollAnimationStart = timestamp;
        }

        const elapsed = timestamp - scrollAnimationStart;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeInOutCubic(progress);
        const nextY = startY * (1 - eased);

        window.scrollTo(0, nextY);

        if (progress < 1) {
          scrollAnimationFrame = requestAnimationFrame(step);
        } else {
          cancelScrollAnimation();
        }
      };

      scrollAnimationFrame = requestAnimationFrame(step);
    };

    if (titleLink) {
      titleLink.addEventListener('click', (event) => {
        if (isHomePage) {
          event.preventDefault();
          if (shouldReduceMotion) {
            window.scrollTo(0, 0);
          } else {
            startScrollToTopAnimation();
          }
        }
      });
    }

    window.addEventListener('wheel', cancelScrollAnimation, { passive: true });
    window.addEventListener('touchstart', cancelScrollAnimation, {
      passive: true,
    });

    const intro = document.querySelector('.intro');
    const introTitle = intro ? intro.querySelector('.intro__title') : null;

    const hideIntroElement = () => {
      if (intro && !intro.classList.contains('intro--hidden')) {
        intro.classList.add('intro--hidden');
      }
    };

    if (intro) {
      const INTRO_HOLD_MS = 1000;
      const INTRO_ANIM_MS = 1100;
      const INTRO_FADE_DELAY_MS = INTRO_HOLD_MS + INTRO_ANIM_MS + 150;

      if (!introTitle || !titleLink) {
        hideIntroElement();
      } else if (shouldReduceMotion) {
        hideIntroElement();
      } else {
        let introSequenceStarted = false;

        const startIntro = () => {
          if (introSequenceStarted || !intro || intro.classList.contains('intro--hidden')) {
            return;
          }
          introSequenceStarted = true;

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (!intro || intro.classList.contains('intro--hidden')) {
                return;
              }

              const introRect = introTitle.getBoundingClientRect();
              const targetRect = titleLink.getBoundingClientRect();

              const introCenterX = introRect.left + introRect.width / 2;
              const introCenterY = introRect.top + introRect.height / 2;
              const targetCenterX = targetRect.left + targetRect.width / 2;
              const targetCenterY = targetRect.top + targetRect.height / 2;

              const deltaX = targetCenterX - introCenterX;
              const deltaY = targetCenterY - introCenterY;
              const scale = introRect.width > 0 ? targetRect.width / introRect.width : 1;

              intro.style.setProperty('--intro-translate-x', `${deltaX}px`);
              intro.style.setProperty('--intro-translate-y', `${deltaY}px`);
              intro.style.setProperty('--intro-scale', `${scale}`);

              intro.classList.add('intro--running');

              window.setTimeout(() => {
                if (intro && !intro.classList.contains('intro--hidden')) {
                  intro.classList.add('intro--fade');
                }
              }, INTRO_FADE_DELAY_MS);
            });
          });
        };

        intro.addEventListener('transitionend', (event) => {
          if (event.target === intro && event.propertyName === 'opacity') {
            hideIntroElement();
          }
        });

        const fontsReady = fontsReadyPromise;
        if (fontsReady && typeof fontsReady.then === 'function') {
          fontsReady.then(startIntro).catch(startIntro);
        } else if (document.readyState === 'complete') {
          startIntro();
        } else {
          window.addEventListener('load', startIntro, { once: true });
        }
      }
    }

    const projectList = document.querySelector('.projects');
    if (projectList) {
      const baseProjects = Array.from(projectList.children);
      if (baseProjects.length) {
        const baseDurationStart = 12;
        const durationStep = 1.5;

        baseProjects.forEach((project, index) => {
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

        const loopFragment = document.createDocumentFragment();
        baseProjects.forEach((project) => {
          loopFragment.appendChild(project.cloneNode(true));
        });
        projectList.appendChild(loopFragment);

        const FAST_MULTIPLIER = 0.45;
        const MIN_FAST_DURATION = 0.7;
        const EDGE_ZONE_RATIO = 0.16;
        const EDGE_ZONE_MIN = 80;
        const EDGE_ZONE_MAX = 240;

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

        const readStoredScrollPosition = () => {
          if (!canUseHeroStorage) {
            return null;
          }

          try {
            const raw = window.sessionStorage.getItem(RETURN_SCROLL_KEY);
            if (raw === null) {
              return null;
            }

            const value = parseFloat(raw);
            if (!Number.isFinite(value) || value < 0) {
              try {
                window.sessionStorage.removeItem(RETURN_SCROLL_KEY);
              } catch (error) {
                /* no-op */
              }
              return null;
            }

            return value;
          } catch (error) {
            return null;
          }
        };

        const clearStoredScrollPosition = () => {
          if (!canUseHeroStorage) {
            return;
          }

          try {
            window.sessionStorage.removeItem(RETURN_SCROLL_KEY);
          } catch (error) {
            /* no-op */
          }
        };

        let pendingReturnScroll = readStoredScrollPosition();

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

        let isProjectNavigationActive = false;

        const beginProjectNavigation = (anchor) => {
          if (!anchor || isProjectNavigationActive) {
            return;
          }

          const href = anchor.getAttribute('href');
          if (!href) {
            return;
          }

          const projectId = anchor.getAttribute('data-project');
          const heroClass = anchor.getAttribute('data-hero-class');

          if (projectId || heroClass) {
            storeHeroData(projectId, heroClass, HERO_ASPECT);
          }

          if (canUseHeroStorage) {
            try {
              const currentScroll = window.scrollY || window.pageYOffset || 0;
              window.sessionStorage.setItem(RETURN_SCROLL_KEY, `${currentScroll}`);
            } catch (error) {
              /* no-op */
            }
          }

          if (shouldReduceMotion) {
            window.location.href = href;
            return;
          }

          isProjectNavigationActive = true;
          document.body.classList.add('is-transitioning');

          const scrollX = window.scrollX || window.pageXOffset || 0;
          const scrollY = window.scrollY || window.pageYOffset || 0;
          const rect = anchor.getBoundingClientRect();

          const clone = anchor.cloneNode(true);
          clone.classList.add('placeholder--transition');
          clone.style.position = 'fixed';
          clone.style.left = `${rect.left + scrollX}px`;
          clone.style.top = `${rect.top + scrollY}px`;
          clone.style.width = `${rect.width}px`;
          clone.style.height = `${rect.height}px`;
          clone.style.margin = '0';
          clone.style.transition =
            'left 0.65s cubic-bezier(0.65, 0, 0.35, 1), top 0.65s cubic-bezier(0.65, 0, 0.35, 1), width 0.65s cubic-bezier(0.65, 0, 0.35, 1), height 0.65s cubic-bezier(0.65, 0, 0.35, 1)';
          clone.setAttribute('aria-hidden', 'true');

          const overlay = document.createElement('div');
          overlay.className = 'transition-overlay';
          document.body.appendChild(overlay);
          document.body.appendChild(clone);

          const viewportWidth =
            window.innerWidth || document.documentElement.clientWidth || rect.width;
          const viewportHeight =
            window.innerHeight || document.documentElement.clientHeight || rect.height;

          let targetWidth = Math.min(viewportWidth * HERO_WIDTH_RATIO, HERO_MAX_WIDTH);
          let targetHeight = targetWidth / HERO_ASPECT;
          const maxHeight = viewportHeight * 0.9;
          if (targetHeight > maxHeight) {
            targetHeight = maxHeight;
            targetWidth = targetHeight * HERO_ASPECT;
          }

          const targetLeft = scrollX + (viewportWidth - targetWidth) / 2;
          const topbar = document.querySelector('.topbar');
          const topbarHeight = topbar ? topbar.getBoundingClientRect().height : 0;
          const rootFontSize =
            parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
          const minPadding = 5 * rootFontSize;
          const preferredPadding = viewportWidth * 0.12;
          const maxPadding = 8 * rootFontSize;
          const detailOffset = Math.min(Math.max(minPadding, preferredPadding), maxPadding);
          const targetTop = scrollY + topbarHeight + detailOffset;

          requestAnimationFrame(() => {
            overlay.classList.add('is-active');
            clone.style.left = `${targetLeft}px`;
            clone.style.top = `${targetTop}px`;
            clone.style.width = `${targetWidth}px`;
            clone.style.height = `${targetHeight}px`;
          });

          window.setTimeout(() => {
            window.location.href = href;
          }, 700);
        };

        projectList.addEventListener('click', (event) => {
          const target = event.target.closest(placeholderSelector);
          if (!target) {
            return;
          }
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
          }
          event.preventDefault();
          beginProjectNavigation(target);
        });

        projectList.addEventListener('keydown', (event) => {
          if (!ACTION_KEYS.has(event.key)) {
            return;
          }
          const target = event.target.closest(placeholderSelector);
          if (!target) {
            return;
          }
          event.preventDefault();
          beginProjectNavigation(target);
        });

        const setupControls = (strip) => {
          if (!strip || strip.dataset.controlsReady === 'true') {
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

          const updateEdgeMode = (mode) => {
            if (state.mode === mode) {
              return;
            }
            applyMode(state, mode);
          };

          let edgePointerActive = false;

          const handleEdgePointerMove = (event) => {
            if (shouldReduceMotion) {
              if (edgePointerActive) {
                edgePointerActive = false;
                updateEdgeMode('base-left');
              }
              return;
            }

            const pointerType = event.pointerType || 'mouse';
            if (pointerType === 'touch') {
              if (edgePointerActive) {
                edgePointerActive = false;
                updateEdgeMode('base-left');
              }
              return;
            }

            const rect = strip.getBoundingClientRect();
            if (!rect || rect.width === 0) {
              return;
            }

            const edgeWidth = Math.min(
              Math.max(rect.width * EDGE_ZONE_RATIO, EDGE_ZONE_MIN),
              EDGE_ZONE_MAX
            );
            const x = event.clientX;

            if (Number.isFinite(x)) {
              edgePointerActive = true;
              if (x <= rect.left + edgeWidth) {
                updateEdgeMode('fast-right');
              } else if (x >= rect.right - edgeWidth) {
                updateEdgeMode('fast-left');
              } else if (state.mode !== 'base-left') {
                updateEdgeMode('base-left');
              }
            }
          };

          const resetEdgeHover = () => {
            if (!edgePointerActive) {
              return;
            }
            edgePointerActive = false;
            updateEdgeMode('base-left');
          };

          strip.addEventListener('pointerenter', handleEdgePointerMove);
          strip.addEventListener('pointermove', handleEdgePointerMove);
          strip.addEventListener('pointerleave', resetEdgeHover);
          strip.addEventListener('pointercancel', resetEdgeHover);

          const createControl = (direction) => {
            const control = document.createElement('button');
            control.type = 'button';
            control.className = `media-strip__control media-strip__control--${direction}`;
            const label =
              direction === 'left'
                ? 'Faire défiler les médias vers la droite'
                : 'Faire défiler les médias vers la gauche';
            control.setAttribute('aria-label', label);
            control.innerHTML =
              direction === 'left'
                ? '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><polyline points="14 6 8 12 14 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                : '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><polyline points="10 6 16 12 10 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            return control;
          };

          const leftControl = createControl('left');
          const rightControl = createControl('right');

          const beginFastMode = (mode, control, pointerId) => {
            applyMode(state, mode);
            control.classList.add('is-active');
            if (
              typeof control.setPointerCapture === 'function' &&
              pointerId !== undefined
            ) {
              try {
                control.setPointerCapture(pointerId);
              } catch (error) {
                // no-op
              }
            }
          };

          const endFastMode = (control, pointerId) => {
            control.classList.remove('is-active');
            applyMode(state, 'base-left');
            if (
              pointerId !== undefined &&
              typeof control.releasePointerCapture === 'function' &&
              typeof control.hasPointerCapture === 'function' &&
              control.hasPointerCapture(pointerId)
            ) {
              control.releasePointerCapture(pointerId);
            }
          };

          const attachControlHandlers = (control, mode) => {
            control.addEventListener('pointerdown', (event) => {
              event.preventDefault();
              beginFastMode(mode, control, event.pointerId);
            });

            const reset = (event) => {
              endFastMode(control, event ? event.pointerId : undefined);
            };

            control.addEventListener('pointerup', reset);
            control.addEventListener('pointercancel', reset);
            control.addEventListener('lostpointercapture', () => {
              control.classList.remove('is-active');
              applyMode(state, 'base-left');
            });
            control.addEventListener('pointerleave', (event) => {
              if (event.pointerType === 'mouse') {
                control.classList.remove('is-active');
                applyMode(state, 'base-left');
              }
            });

            control.addEventListener('keydown', (event) => {
              if (!ACTION_KEYS.has(event.key)) {
                return;
              }
              event.preventDefault();
              if (!control.classList.contains('is-active')) {
                control.classList.add('is-active');
                applyMode(state, mode);
              }
            });

            control.addEventListener('keyup', (event) => {
              if (!ACTION_KEYS.has(event.key)) {
                return;
              }
              event.preventDefault();
              control.classList.remove('is-active');
              applyMode(state, 'base-left');
            });

            control.addEventListener('blur', () => {
              control.classList.remove('is-active');
              applyMode(state, 'base-left');
            });
          };

          attachControlHandlers(leftControl, 'fast-right');
          attachControlHandlers(rightControl, 'fast-left');

          strip.append(leftControl, rightControl);
          strip.dataset.controlsReady = 'true';
        };

        const strips = Array.from(projectList.querySelectorAll('.media-strip'));
        strips.forEach((strip) => setupControls(strip));

        let loopHeight = 0;
        let isLoopAdjusting = false;
        let lastKnownScrollY = window.scrollY || window.pageYOffset || 0;

        const updateLoopHeight = () => {
          const totalHeight = projectList.scrollHeight;
          loopHeight = totalHeight / 2;
        };

        const adjustLoopScroll = (targetY) => {
          isLoopAdjusting = true;
          window.scrollTo(0, targetY);
          lastKnownScrollY = targetY;
          window.requestAnimationFrame(() => {
            isLoopAdjusting = false;
          });
        };

        const handleLoopScroll = () => {
          if (isLoopAdjusting) {
            return;
          }

          if (loopHeight <= 0) {
            lastKnownScrollY = window.scrollY || window.pageYOffset || 0;
            return;
          }

          const currentY = window.scrollY || window.pageYOffset || 0;

          if (currentY > lastKnownScrollY && currentY >= loopHeight) {
            let normalized = currentY % loopHeight;
            if (!Number.isFinite(normalized)) {
              normalized = 0;
            }
            adjustLoopScroll(normalized);
            return;
          }

          lastKnownScrollY = currentY;
        };

        window.addEventListener('scroll', handleLoopScroll, { passive: true });

        const runResizeTasks = () => {
          computeTrackMetrics();
          updateLoopHeight();
          if (pendingReturnScroll !== null) {
            const viewportHeight =
              window.innerHeight || document.documentElement.clientHeight || 0;
            const maxScroll = Math.max(projectList.scrollHeight - viewportHeight, 0);
            let target = Math.max(Math.min(pendingReturnScroll, maxScroll), 0);
            if (loopHeight > 0 && target >= loopHeight) {
              const normalized = target % loopHeight;
              target = Number.isFinite(normalized) ? normalized : 0;
            }
            adjustLoopScroll(target);
            pendingReturnScroll = null;
            clearStoredScrollPosition();
            return;
          }
          const currentY = window.scrollY || window.pageYOffset || 0;
          if (loopHeight > 0 && currentY >= loopHeight) {
            let normalized = currentY % loopHeight;
            if (!Number.isFinite(normalized)) {
              normalized = 0;
            }
            if (!isLoopAdjusting && Math.abs(normalized - currentY) > 1) {
              adjustLoopScroll(normalized);
              return;
            }
            lastKnownScrollY = normalized;
          } else {
            lastKnownScrollY = currentY;
          }
        };

        let resizeFrame = null;
        const scheduleResizeTasks = () => {
          if (resizeFrame !== null) {
            return;
          }

          resizeFrame = requestAnimationFrame(() => {
            resizeFrame = null;
            runResizeTasks();
          });
        };

        window.addEventListener('resize', scheduleResizeTasks);

        runResizeTasks();

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
            cancelScrollAnimation();
            hideIntroElement();
            trackStates.forEach((state) => {
              state.offset = 0;
              state.speed = 0;
              state.mode = 'base-left';
              state.track.style.transform = 'translateX(0)';
            });
            lastKnownScrollY = window.scrollY || window.pageYOffset || 0;
          } else {
            previousTime = undefined;
            runResizeTasks();
          }
        };

        if (typeof reduceMotionMedia.addEventListener === 'function') {
          reduceMotionMedia.addEventListener('change', handleMotionPreferenceChange);
        } else if (typeof reduceMotionMedia.addListener === 'function') {
          reduceMotionMedia.addListener(handleMotionPreferenceChange);
        }

        if (fontsReadyPromise && typeof fontsReadyPromise.then === 'function') {
          fontsReadyPromise
            .then(() => {
              scheduleResizeTasks();
            })
            .catch(() => {
              scheduleResizeTasks();
            });
        }

        window.addEventListener('load', () => {
          scheduleResizeTasks();
        });
      }
    }

    const projectDetail = document.querySelector('.project-detail');
    if (projectDetail) {
      const projectId = projectDetail.getAttribute('data-project');
      const heroFrame = projectDetail.querySelector('.project-hero__media');
      const heroDefaults = heroFrame
        ? {
            className: heroFrame.getAttribute('data-default-hero') || null,
          }
        : { className: null };

      const storedHero = readHeroData(projectId);
      const heroClassToUse =
        (storedHero && storedHero.heroClass) || heroDefaults.className || null;

      if (heroFrame) {
        swapPlaceholderVariant(heroFrame, heroClassToUse);
        heroFrame.style.setProperty('--hero-aspect', `${HERO_ASPECT}`);
      }

      const gallery = projectDetail.querySelector('.project-detail__gallery');
      if (gallery && heroClassToUse) {
        const duplicateHero = gallery.querySelector(
          `[data-media-class="${heroClassToUse}"]`
        );
        if (duplicateHero) {
          duplicateHero.remove();
        }
      }
    }
  });
})();
