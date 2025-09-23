(function () {
  const historyApi = window.history;
  if (historyApi && 'scrollRestoration' in historyApi) {
    historyApi.scrollRestoration = 'manual';
  }

  document.addEventListener('DOMContentLoaded', async () => {
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

    const placeholderSelector = '.placeholder[data-project]';
    const HERO_WIDTH_RATIO = 0.95;
    const HERO_MAX_WIDTH = 1200;
    const HERO_ASPECT = 16 / 9;
    const RETURN_SCROLL_KEY = 'adele:return-scroll';
    const INTRO_PLAYED_KEY = 'adele:intro-played';
    const MASONRY_GAP = 5;
    const MASONRY_MIN_COLUMN_WIDTH = 220;
    const MASONRY_MAX_COLUMN_WIDTH = 380;
    const HOVER_GIF_SELECTOR = '[data-hover-gif]';
    const HOVER_GIF_ACTIVE_CLASS = 'gif-icon--active';

    const MEDIA_IMAGE_VAR = '--placeholder-image';
    const MEDIA_ANIMATED_VAR = '--placeholder-animated';

    const dimensionCache = new Map();
    const imageReadyCache = new Map();

    const ensureImageReady = (src) => {
      if (!src) {
        return Promise.resolve();
      }

      if (imageReadyCache.has(src)) {
        return imageReadyCache.get(src);
      }

      const promise = new Promise((resolve) => {
        const image = new Image();
        let settled = false;

        const finalize = () => {
          if (settled) {
            return;
          }
          settled = true;
          resolve(true);
        };

        const decodeOrResolve = () => {
          if (typeof image.decode === 'function') {
            image
              .decode()
              .then(finalize)
              .catch(finalize);
          } else {
            finalize();
          }
        };

        image.decoding = 'async';
        image.addEventListener('load', decodeOrResolve, { once: true });
        image.addEventListener(
          'error',
          () => {
            finalize();
          },
          { once: true }
        );
        image.src = src;

        if (image.complete) {
          decodeOrResolve();
        }
      });

      imageReadyCache.set(src, promise);
      promise.catch(() => {
        imageReadyCache.delete(src);
      });

      return promise;
    };

    const loadImageDimensions = (src) => {
      if (!src) {
        return Promise.resolve(null);
      }
      if (dimensionCache.has(src)) {
        return dimensionCache.get(src);
      }

      const promise = new Promise((resolve) => {
        const image = new Image();
        image.decoding = 'async';
        image.onload = () => {
          const width = image.naturalWidth || image.width || 0;
          const height = image.naturalHeight || image.height || 0;
          if (!width || !height) {
            resolve(null);
          } else {
            resolve({ width, height });
          }
        };
        image.onerror = () => {
          resolve(null);
        };
        image.src = src;
      });

      dimensionCache.set(src, promise);
      promise.catch(() => {
        dimensionCache.delete(src);
      });

      return promise;
    };

    const parseNumeric = (value) => {
      if (value === null || value === undefined) {
        return null;
      }
      const trimmed = `${value}`.trim();
      if (!trimmed) {
        return null;
      }
      const parsed = parseFloat(trimmed);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const readStringAttribute = (element, attribute) => {
      if (!element) {
        return null;
      }
      const value = element.getAttribute(attribute);
      if (!value) {
        return null;
      }
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    };

    const applyMediaVariables = (element, stillSrc, animatedSrc) => {
      if (!element) {
        return;
      }

      const still = stillSrc ? stillSrc.trim() : '';
      const animated = animatedSrc ? animatedSrc.trim() : '';
      const fallbackStill = still || animated;

      if (fallbackStill) {
        element.style.setProperty(MEDIA_IMAGE_VAR, `url("${fallbackStill}")`);
      } else {
        element.style.removeProperty(MEDIA_IMAGE_VAR);
      }

      if (animated) {
        const animatedValue = still
          ? `url("${animated}"), url("${still}")`
          : `url("${animated}")`;
        element.style.setProperty(MEDIA_ANIMATED_VAR, animatedValue);
      } else if (fallbackStill) {
        element.style.setProperty(MEDIA_ANIMATED_VAR, `url("${fallbackStill}")`);
      } else {
        element.style.removeProperty(MEDIA_ANIMATED_VAR);
      }
    };

    const initializeMediaElement = (element) => {
      if (!element) {
        return;
      }

      const still = readStringAttribute(element, 'data-still');
      const animated = readStringAttribute(element, 'data-animated');
      const aspectAttr = parseNumeric(element.getAttribute('data-aspect'));

      const applyCurrentMedia = () => {
        applyMediaVariables(element, still, animated || still);
      };

      applyCurrentMedia();

      if (Number.isFinite(aspectAttr) && aspectAttr > 0) {
        element.style.setProperty('--item-aspect', `${aspectAttr}`);
      }

      const primarySource = still || animated || null;
      if (primarySource) {
        ensureImageReady(primarySource)
          .then(() => {
            if (!element.isConnected) {
              return;
            }

            const currentStill = readStringAttribute(element, 'data-still');
            const currentAnimated = readStringAttribute(element, 'data-animated');
            if (still && currentStill !== still) {
              return;
            }
            if (!still && animated && currentAnimated !== animated) {
              return;
            }

            applyCurrentMedia();
          })
          .catch(() => {
            /* ignore preload failures */
          });
      }

      if (animated && animated !== still) {
        ensureImageReady(animated).catch(() => {
          /* ignore */
        });
      }
    };

    const setupHoverGif = (container) => {
      if (!container) {
        return;
      }

      const gifSrc = container.getAttribute('data-hover-gif');
      const canvas = container.querySelector('canvas');
      const animatedImage = container.querySelector('img');

      if (
        !gifSrc ||
        !canvas ||
        !animatedImage ||
        typeof canvas.getContext !== 'function'
      ) {
        return;
      }

      const context = canvas.getContext('2d');
      if (!context) {
        return;
      }

      const tintCanvasFrame = () => {
        const width = canvas.width;
        const height = canvas.height;

        if (!width || !height) {
          return;
        }

        try {
          const imageData = context.getImageData(0, 0, width, height);
          const data = imageData.data;

          for (let index = 0; index < data.length; index += 4) {
            const alpha = data[index + 3];
            if (!alpha) {
              continue;
            }

            const red = data[index];
            const green = data[index + 1];
            const blue = data[index + 2];
            const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

            if (luminance > 0.92) {
              data[index + 3] = 0;
              continue;
            }

            data[index] = 240;
            data[index + 1] = 234;
            data[index + 2] = 214;
            const boostedAlpha = Math.min(255, alpha + 40);
            data[index + 3] = boostedAlpha;
          }

          context.clearRect(0, 0, width, height);
          context.putImageData(imageData, 0, 0);
        } catch (error) {
          /* ignore errors from inaccessible canvas */
        }
      };

      const loader = new Image();
      loader.decoding = 'async';
      loader.src = gifSrc;

      ensureImageReady(gifSrc).catch(() => {});

      const drawFirstFrame = () => {
        const width = loader.naturalWidth || loader.width || 0;
        const height = loader.naturalHeight || loader.height || 0;

        if (!width || !height) {
          return;
        }

        canvas.width = width;
        canvas.height = height;
        context.clearRect(0, 0, width, height);
        context.drawImage(loader, 0, 0, width, height);
        tintCanvasFrame();
      };

      if (loader.complete) {
        drawFirstFrame();
      } else {
        loader.addEventListener('load', drawFirstFrame, { once: true });
      }

      const activate = () => {
          if (shouldReduceMotion) {
          return;
        }

        if (!container.classList.contains(HOVER_GIF_ACTIVE_CLASS)) {
          container.classList.add(HOVER_GIF_ACTIVE_CLASS);
        }

        animatedImage.decoding = 'async';
        animatedImage.src = `${gifSrc}?frame=${Date.now()}`;
      };

      const deactivate = () => {
        container.classList.remove(HOVER_GIF_ACTIVE_CLASS);
        animatedImage.removeAttribute('src');
      };

      container.addEventListener('mouseenter', activate);
      container.addEventListener('mouseleave', deactivate);
      container.addEventListener('focusin', activate);
      container.addEventListener('focusout', deactivate);

      container.__hoverGifDeactivate = deactivate;
    };

    const hoverGifContainers = document.querySelectorAll(HOVER_GIF_SELECTOR);
    hoverGifContainers.forEach((container) => {
      setupHoverGif(container);
    });

    const SUPPORTED_MEDIA_EXTENSIONS = new Set(['png', 'gif']);

    const normalizeDirectoryPath = (path) => {
      if (!path) {
        return '';
      }
      let normalized = `${path}`.trim();
      if (!normalized) {
        return '';
      }
      normalized = normalized.replace(/\\/g, '/');
      if (normalized.startsWith('./')) {
        normalized = normalized.slice(2);
      }
      normalized = normalized.replace(/^\/+/, '');
      if (normalized && !normalized.endsWith('/')) {
        normalized += '/';
      }
      return normalized;
    };

    const sanitizeFileEntry = (entry) => {
      if (entry === null || entry === undefined) {
        return null;
      }
      let value = `${entry}`.trim();
      if (!value) {
        return null;
      }
      value = value.replace(/\\/g, '/');
      if (/^https?:\/\//i.test(value)) {
        return value;
      }
      value = value.replace(/^\.\/+/, '');
      value = value.replace(/^\/+/, '');
      return value;
    };

    const resolveMediaPath = (directory, file) => {
      const sanitizedFile = sanitizeFileEntry(file);
      if (!sanitizedFile) {
        return null;
      }
      if (/^https?:\/\//i.test(sanitizedFile)) {
        return sanitizedFile;
      }
      const dir = normalizeDirectoryPath(directory);
      if (!dir) {
        return sanitizedFile;
      }
      let relative = sanitizedFile;
      if (relative.startsWith(dir)) {
        relative = relative.slice(dir.length);
      }
      relative = relative.replace(/^\/+/, '');
      return `${dir}${relative}`;
    };

    const extractFileCandidate = (value) => {
      if (typeof value === 'string') {
        return value;
      }
      if (value && typeof value === 'object') {
        if (typeof value.url === 'string') {
          return value.url;
        }
        if (typeof value.path === 'string') {
          return value.path;
        }
        if (typeof value.file === 'string') {
          return value.file;
        }
      }
      return null;
    };

    const parseListFromData = (data) => {
      if (Array.isArray(data)) {
        return data;
      }
      if (data && typeof data === 'object') {
        if (Array.isArray(data.files)) {
          return data.files;
        }
        if (Array.isArray(data.items)) {
          return data.items;
        }
        if (Array.isArray(data.images)) {
          return data.images;
        }
      }
      return [];
    };

    const parseListFromText = (text) => {
      if (!text) {
        return [];
      }
      const matches = new Set();
      const anchorRegex = /href\s*=\s*['"]([^'"]+)['"]/gi;
      let match = anchorRegex.exec(text);
      while (match) {
        matches.add(match[1]);
        match = anchorRegex.exec(text);
      }
      const pathRegex = /[\w\-./%]+\.(?:png|gif)(?=["'\s>/]|$)/gi;
      let pathMatch = pathRegex.exec(text);
      while (pathMatch) {
        matches.add(pathMatch[0]);
        pathMatch = pathRegex.exec(text);
      }
      return Array.from(matches);
    };

    const fetchDirectoryFileNames = async (directory) => {
      if (!directory) {
        return [];
      }
      const dir = normalizeDirectoryPath(directory);
      if (!dir) {
        return [];
      }

      const jsonCandidates = ['index.json', 'manifest.json', '_images.json', '_list.json'];
      for (let index = 0; index < jsonCandidates.length; index += 1) {
        const candidate = jsonCandidates[index];
        try {
          const response = await fetch(`${dir}${candidate}`, { cache: 'no-store' });
          if (!response || !response.ok) {
            continue;
          }
          const data = await response.json();
          const list = parseListFromData(data);
          if (list.length) {
            return list;
          }
        } catch (error) {
          /* ignore and continue */
        }
      }

      const textCandidates = [`${dir}`, `${dir}?index`, `${dir}?list`, `${dir}?format=html`];
      for (let index = 0; index < textCandidates.length; index += 1) {
        const url = textCandidates[index];
        try {
          const response = await fetch(url, { cache: 'no-store' });
          if (!response || !response.ok) {
            continue;
          }

          const contentType = response.headers ? response.headers.get('content-type') || '' : '';
          if (contentType.includes('application/json')) {
            try {
              const data = await response.json();
              const list = parseListFromData(data);
              if (list.length) {
                return list;
              }
              continue;
            } catch (error) {
              /* fall back to text parsing */
            }
          }

          const text = await response.text();
          const list = parseListFromText(text);
          if (list.length) {
            return list;
          }
        } catch (error) {
          /* ignore and continue */
        }
      }

      return [];
    };

    const collectInlineMediaList = (container) => {
      if (!container) {
        return [];
      }

      const inlineList = [];

      const manifestScript = container.querySelector('script[data-media-manifest]');
      if (manifestScript) {
        try {
          const parsed = JSON.parse(manifestScript.textContent || '[]');
          const fromScript = parseListFromData(parsed);
          fromScript.forEach((entry) => {
            inlineList.push(entry);
          });
        } catch (error) {
          /* no-op */
        }
      }

      const inlinePlaceholders = Array.from(
        container.querySelectorAll('[data-still], [data-animated]')
      );
      inlinePlaceholders.forEach((node) => {
        const still = readStringAttribute(node, 'data-still');
        const animated = readStringAttribute(node, 'data-animated');
        if (still) {
          inlineList.push(still);
        }
        if (animated) {
          inlineList.push(animated);
        }
      });

      return inlineList;
    };

    const assembleMediaEntries = async (directory, fileList) => {
      if (!Array.isArray(fileList) || !fileList.length) {
        return [];
      }

      const dir = normalizeDirectoryPath(directory);
      const groups = new Map();

      fileList.forEach((raw, index) => {
        const candidate = extractFileCandidate(raw);
        const resolved = resolveMediaPath(dir, candidate);
        if (!resolved) {
          return;
        }

        const extensionMatch = resolved.match(/\.([^.?#]+)(?=[?#]?)/);
        const extension = extensionMatch ? extensionMatch[1].toLowerCase() : '';
        if (!SUPPORTED_MEDIA_EXTENSIONS.has(extension)) {
          return;
        }

        let relative = resolved;
        if (!/^https?:\/\//i.test(relative)) {
          relative = relative.replace(/^\/+/, '');
        }

        const pathWithoutQuery = relative.split(/[?#]/)[0] || relative;
        const baseKey = pathWithoutQuery.replace(/(\.[^./?#]+)$/, '');
        if (groups.has(baseKey)) {
          const existing = groups.get(baseKey);
          if (extension === 'png' && !existing.png) {
            existing.png = relative;
          } else if (extension === 'gif' && !existing.gif) {
            existing.gif = relative;
          }
        } else {
          groups.set(baseKey, {
            order: index,
            png: extension === 'png' ? relative : null,
            gif: extension === 'gif' ? relative : null,
          });
        }
      });

      const ordered = Array.from(groups.values()).sort((a, b) => a.order - b.order);
      const results = await Promise.all(
        ordered.map(async (entry) => {
          const still = entry.png || entry.gif || null;
          const animated = entry.gif || null;

          let aspect = null;
          const sizeSource = entry.png || entry.gif;
          if (sizeSource) {
            try {
              const dimensions = await loadImageDimensions(sizeSource);
              if (dimensions && dimensions.width && dimensions.height) {
                aspect = dimensions.width / dimensions.height;
              }
            } catch (error) {
              aspect = null;
            }
          }

          return {
            still,
            animated,
            aspect,
          };
        })
      );

      return results.filter((item) => item && (item.still || item.animated));
    };

    const projectMediaCache = new Map();

    const loadProjectMediaEntries = async (projectId, directory, inlineList) => {
      const key = directory ? normalizeDirectoryPath(directory) : projectId || '';
      if (key && projectMediaCache.has(key)) {
        return projectMediaCache.get(key);
      }

      let remoteList = [];
      if (directory) {
        try {
          remoteList = await fetchDirectoryFileNames(directory);
        } catch (error) {
          remoteList = [];
        }
      }

      const fallbackList = Array.isArray(inlineList) ? inlineList : [];
      const rawList = remoteList.length ? remoteList : fallbackList;
      const entries = await assembleMediaEntries(directory, rawList);

      if (key) {
        projectMediaCache.set(key, entries);
      }

      return entries;
    };

    const initializeProjectMedia = async () => {
      const tasks = [];
      const mediaReadyPromises = [];

      const projectSections = Array.from(document.querySelectorAll('.project[data-project]'));
      projectSections.forEach((section) => {
        const track = section.querySelector('.media-track');
        if (!track) {
          return;
        }

        const projectId = readStringAttribute(section, 'data-project');
        const directoryAttr = readStringAttribute(track, 'data-media-source');
        const directory = directoryAttr || (projectId ? `${projectId}/images/` : null);
        const detailLink =
          readStringAttribute(track, 'data-detail-link') ||
          readStringAttribute(section, 'data-detail-link') ||
          (projectId ? `${projectId}.html` : '#');

        const inlineList = collectInlineMediaList(track);

        const label = (() => {
          const titleEl = section.querySelector('.project-title');
          const metaEl = section.querySelector('.project-meta');
          const titleText = titleEl ? titleEl.textContent.trim() : '';
          const metaText = metaEl ? metaEl.textContent.trim() : '';
          if (titleText && metaText) {
            return `Découvrir ${titleText} — ${metaText}`;
          }
          if (titleText) {
            return `Découvrir ${titleText}`;
          }
          return "Découvrir le projet";
        })();

        const task = loadProjectMediaEntries(projectId, directory, inlineList)
          .then((entries) => {
            if (!track) {
              return [];
            }

            track.innerHTML = '';

            if (!entries || !entries.length) {
              return [];
            }

            entries.forEach((entry) => {
              const placeholder = document.createElement('a');
              placeholder.className = 'placeholder';
              placeholder.href = detailLink || '#';
              if (projectId) {
                placeholder.dataset.project = projectId;
              }
              placeholder.setAttribute('aria-label', label);

              if (entry.still) {
                placeholder.setAttribute('data-still', entry.still);
                mediaReadyPromises.push(ensureImageReady(entry.still));
              }
              if (entry.animated) {
                placeholder.setAttribute('data-animated', entry.animated);
                mediaReadyPromises.push(ensureImageReady(entry.animated));
              }
              if (Number.isFinite(entry.aspect) && entry.aspect > 0) {
                placeholder.setAttribute('data-aspect', `${entry.aspect}`);
              }

              track.appendChild(placeholder);
            });

            return entries;
          })
          .catch(() => []);

        tasks.push(task);
      });

      const detail = document.querySelector('.project-detail[data-project]');
      if (detail) {
        const projectId = readStringAttribute(detail, 'data-project');
        const directoryAttr = readStringAttribute(detail, 'data-media-source');
        const directory = directoryAttr || (projectId ? `${projectId}/images/` : null);
        const inlineList = collectInlineMediaList(detail);
        const hero = detail.querySelector('.project-hero__media');
        const gallery = detail.querySelector('.project-detail__gallery');

        const detailTask = loadProjectMediaEntries(projectId, directory, inlineList)
          .then((entries) => {
            if (hero) {
              if (entries && entries.length) {
                const heroEntry = entries[0];
                const defaultStill = heroEntry.still || heroEntry.animated || '';
                const defaultAnimated = heroEntry.animated || heroEntry.still || '';
                const defaultAspect =
                  Number.isFinite(heroEntry.aspect) && heroEntry.aspect > 0
                    ? `${heroEntry.aspect}`
                    : '';

                if (defaultStill) {
                  hero.setAttribute('data-default-still', defaultStill);
                  hero.setAttribute('data-still', defaultStill);
                  mediaReadyPromises.push(ensureImageReady(defaultStill));
                } else {
                  hero.removeAttribute('data-default-still');
                  hero.removeAttribute('data-still');
                }

                if (defaultAnimated) {
                  hero.setAttribute('data-default-animated', defaultAnimated);
                  hero.setAttribute('data-animated', defaultAnimated);
                  if (defaultAnimated !== defaultStill) {
                    mediaReadyPromises.push(ensureImageReady(defaultAnimated));
                  }
                } else {
                  hero.removeAttribute('data-default-animated');
                  hero.removeAttribute('data-animated');
                }

                if (defaultAspect) {
                  hero.setAttribute('data-default-aspect', defaultAspect);
                  hero.setAttribute('data-aspect', defaultAspect);
                } else {
                  hero.removeAttribute('data-default-aspect');
                  hero.removeAttribute('data-aspect');
                }
              } else {
                hero.removeAttribute('data-default-still');
                hero.removeAttribute('data-default-animated');
                hero.removeAttribute('data-default-aspect');
                hero.removeAttribute('data-still');
                hero.removeAttribute('data-animated');
                hero.removeAttribute('data-aspect');
              }
            }

            if (gallery) {
              gallery.innerHTML = '';
              if (entries && entries.length) {
                const heroStill = hero ? readStringAttribute(hero, 'data-still') : null;
                const heroAnimated = hero ? readStringAttribute(hero, 'data-animated') : null;
                const heroCandidates = new Set();
                if (heroStill) {
                  heroCandidates.add(heroStill);
                }
                if (heroAnimated) {
                  heroCandidates.add(heroAnimated);
                }

                entries.forEach((entry) => {
                  const candidateKey = entry.still || entry.animated;
                  if (candidateKey && heroCandidates.has(candidateKey)) {
                    return;
                  }

                  const item = document.createElement('div');
                  item.className = 'project-detail__item placeholder';
                  if (entry.still) {
                    item.setAttribute('data-still', entry.still);
                    mediaReadyPromises.push(ensureImageReady(entry.still));
                  }
                  if (entry.animated) {
                    item.setAttribute('data-animated', entry.animated);
                    mediaReadyPromises.push(ensureImageReady(entry.animated));
                  }
                  if (Number.isFinite(entry.aspect) && entry.aspect > 0) {
                    item.setAttribute('data-aspect', `${entry.aspect}`);
                  }
                  gallery.appendChild(item);
                });
              }
            }

            return entries;
          })
          .catch(() => []);

        tasks.push(detailTask);
      }

      await Promise.all(tasks);
      if (mediaReadyPromises.length) {
        await Promise.allSettled(mediaReadyPromises);
      }
    };

    await initializeProjectMedia();

    const mediaPlaceholders = document.querySelectorAll('.placeholder');
    mediaPlaceholders.forEach((element) => {
      initializeMediaElement(element);
    });

    const heroStorageKey = (projectId) => `adele:project-hero:${projectId}`;

    const safeStorageAccess = (type) => {
      try {
        const storage = window[type];
        if (!storage) {
          return null;
        }
        const testKey = `__adeleStorageTest__${type}`;
        storage.setItem(testKey, '1');
        storage.removeItem(testKey);
        return storage;
      } catch (error) {
        return null;
      }
    };

    const sessionStore = safeStorageAccess('sessionStorage');
    const persistentStore = sessionStore;

    const storeHeroData = (projectId, payload) => {
      if (!projectId || !sessionStore) {
        return;
      }

      const data = {};
      if (payload && typeof payload === 'object') {
        if (payload.still && typeof payload.still === 'string') {
          data.still = payload.still;
        }
        if (payload.animated && typeof payload.animated === 'string') {
          data.animated = payload.animated;
        }
        if (Number.isFinite(payload.aspect) && payload.aspect > 0) {
          data.aspect = payload.aspect;
        }
      }

      try {
        sessionStore.setItem(heroStorageKey(projectId), JSON.stringify(data));
      } catch (error) {
        /* no-op */
      }
    };

    const readHeroData = (projectId) => {
      if (!projectId || !sessionStore) {
        return null;
      }

      let raw;
      try {
        raw = sessionStore.getItem(heroStorageKey(projectId));
      } catch (error) {
        return null;
      }

      if (!raw) {
        return null;
      }

      try {
        const parsed = JSON.parse(raw);
        const still = parsed && typeof parsed.still === 'string' ? parsed.still : null;
        const animated = parsed && typeof parsed.animated === 'string' ? parsed.animated : null;
        const aspectCandidate = parsed && typeof parsed.aspect === 'number' ? parsed.aspect : null;
        const aspect = Number.isFinite(aspectCandidate) ? aspectCandidate : null;
        return { still, animated, aspect };
      } catch (error) {
        return null;
      }
    };

    const hasIntroPlayed = () => {
      if (!persistentStore) {
        return false;
      }

      try {
        return persistentStore.getItem(INTRO_PLAYED_KEY) === '1';
      } catch (error) {
        return false;
      }
    };

    const rememberIntroPlayed = () => {
      if (!persistentStore) {
        return;
      }

      try {
        persistentStore.setItem(INTRO_PLAYED_KEY, '1');
      } catch (error) {
        /* no-op */
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
      const introAlreadyPlayed = hasIntroPlayed();

      const hideAndRememberIntro = () => {
        rememberIntroPlayed();
        hideIntroElement();
      };

      if (!introTitle || !titleLink) {
        hideAndRememberIntro();
      } else if (shouldReduceMotion || introAlreadyPlayed) {
        hideAndRememberIntro();
      } else {
        let introSequenceStarted = false;

        const startIntro = () => {
          if (introSequenceStarted || !intro || intro.classList.contains('intro--hidden')) {
            return;
          }
          introSequenceStarted = true;
          rememberIntroPlayed();

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
            const clone = placeholder.cloneNode(true);
            initializeMediaElement(clone);
            duplicateSet.appendChild(clone);
          });
          track.appendChild(duplicateSet);

          const duration = baseDurationStart + (index % 5) * durationStep;
          track.dataset.baseDuration = duration.toString();
        });

        const loopFragment = document.createDocumentFragment();
        baseProjects.forEach((project) => {
          const clone = project.cloneNode(true);
          Array.from(clone.querySelectorAll('.placeholder')).forEach((element) => {
            initializeMediaElement(element);
          });
          loopFragment.appendChild(clone);
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
          if (!sessionStore) {
            return null;
          }

          try {
            const raw = sessionStore.getItem(RETURN_SCROLL_KEY);
            if (raw === null) {
              return null;
            }

            const value = parseFloat(raw);
            if (!Number.isFinite(value) || value < 0) {
              try {
                sessionStore.removeItem(RETURN_SCROLL_KEY);
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
          if (!sessionStore) {
            return;
          }

          try {
            sessionStore.removeItem(RETURN_SCROLL_KEY);
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

        const beginProjectNavigation = async (anchor) => {
          if (!anchor || isProjectNavigationActive) {
            return;
          }

          const href = anchor.getAttribute('href');
          if (!href) {
            return;
          }

          const projectId = anchor.getAttribute('data-project');
          const heroStill = readStringAttribute(anchor, 'data-still');
          const heroAnimated = readStringAttribute(anchor, 'data-animated');
          const heroAspect = parseNumeric(anchor.getAttribute('data-aspect'));

          if (projectId && (heroStill || heroAnimated)) {
            storeHeroData(projectId, {
              still: heroStill || null,
              animated: heroAnimated || null,
              aspect: Number.isFinite(heroAspect) && heroAspect > 0 ? heroAspect : HERO_ASPECT,
            });
          }

          if (sessionStore) {
            try {
              const currentScroll = window.scrollY || window.pageYOffset || 0;
              sessionStore.setItem(RETURN_SCROLL_KEY, `${currentScroll}`);
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

          const preloadSource = heroStill || heroAnimated || null;
          if (preloadSource) {
            try {
              await Promise.race([
                ensureImageReady(preloadSource),
                new Promise((resolve) => {
                  window.setTimeout(resolve, 450);
                }),
              ]);
            } catch (error) {
              /* ignore preload issues */
            }
          }

          const clone = anchor.cloneNode(true);
          clone.classList.add('placeholder--transition');
          initializeMediaElement(clone);
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
          const detailOffset = 30;
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

        const bindPlaceholderNavigation = () => {
          const placeholders = Array.from(
            projectList.querySelectorAll(placeholderSelector)
          );
          placeholders.forEach((placeholder) => {
            if (placeholder.dataset.transitionBound === 'true') {
              return;
            }

            placeholder.dataset.transitionBound = 'true';

            placeholder.addEventListener('click', (event) => {
              if (
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }
              event.preventDefault();
              beginProjectNavigation(placeholder);
            });

            placeholder.addEventListener('keydown', (event) => {
              if (!ACTION_KEYS.has(event.key)) {
                return;
              }
              event.preventDefault();
              beginProjectNavigation(placeholder);
            });
          });
        };

        bindPlaceholderNavigation();

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
            hoverGifContainers.forEach((container) => {
              if (typeof container.__hoverGifDeactivate === 'function') {
                container.__hoverGifDeactivate();
              }
            });
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
            still: readStringAttribute(heroFrame, 'data-default-still'),
            animated: readStringAttribute(heroFrame, 'data-default-animated'),
            aspect: parseNumeric(heroFrame.getAttribute('data-default-aspect')),
          }
        : { still: null, animated: null, aspect: null };

      const storedHero = readHeroData(projectId) || {};
      const heroStill = storedHero.still || heroDefaults.still || null;
      const heroAnimated = storedHero.animated || heroDefaults.animated || heroStill;

      if (heroFrame) {
        if (heroStill) {
          heroFrame.setAttribute('data-still', heroStill);
        } else {
          heroFrame.removeAttribute('data-still');
        }

        if (heroAnimated) {
          heroFrame.setAttribute('data-animated', heroAnimated);
        } else {
          heroFrame.removeAttribute('data-animated');
        }

        heroFrame.setAttribute('data-aspect', `${HERO_ASPECT}`);
        heroFrame.style.setProperty('--hero-aspect', `${HERO_ASPECT}`);
        applyMediaVariables(heroFrame, heroStill, heroAnimated);

        if (heroStill) {
          ensureImageReady(heroStill).catch(() => {});
        }
        if (heroAnimated && heroAnimated !== heroStill) {
          ensureImageReady(heroAnimated).catch(() => {});
        }
      }

      const gallery = projectDetail.querySelector('.project-detail__gallery');
      if (gallery) {
        const heroSources = new Set();
        if (heroStill) {
          heroSources.add(heroStill);
        }
        if (heroAnimated) {
          heroSources.add(heroAnimated);
        }

        if (heroSources.size) {
          Array.from(gallery.querySelectorAll('.project-detail__item')).forEach((item) => {
            const stillAttr = readStringAttribute(item, 'data-still');
            const animatedAttr = readStringAttribute(item, 'data-animated');
            if (
              (stillAttr && heroSources.has(stillAttr)) ||
              (animatedAttr && heroSources.has(animatedAttr))
            ) {
              item.remove();
            }
          });
        }

        const defaultSources = new Set();
        if (heroDefaults.still) {
          defaultSources.add(heroDefaults.still);
        }
        if (heroDefaults.animated) {
          defaultSources.add(heroDefaults.animated);
        }

        if (defaultSources.size) {
          const matchesSelected = Array.from(heroSources).some((src) =>
            defaultSources.has(src)
          );

          if (!matchesSelected) {
            const hasDefaultEntry = Array.from(
              gallery.querySelectorAll('.project-detail__item')
            ).some((item) => {
              const stillAttr = readStringAttribute(item, 'data-still');
              const animatedAttr = readStringAttribute(item, 'data-animated');
              return (
                (stillAttr && defaultSources.has(stillAttr)) ||
                (animatedAttr && defaultSources.has(animatedAttr))
              );
            });

            if (!hasDefaultEntry) {
              const fallbackItem = document.createElement('div');
              fallbackItem.className = 'project-detail__item placeholder';

              if (heroDefaults.still) {
                fallbackItem.setAttribute('data-still', heroDefaults.still);
                ensureImageReady(heroDefaults.still).catch(() => {});
              }

              if (heroDefaults.animated) {
                fallbackItem.setAttribute('data-animated', heroDefaults.animated);
                if (heroDefaults.animated !== heroDefaults.still) {
                  ensureImageReady(heroDefaults.animated).catch(() => {});
                }
              }

              if (Number.isFinite(heroDefaults.aspect) && heroDefaults.aspect > 0) {
                fallbackItem.setAttribute('data-aspect', `${heroDefaults.aspect}`);
              }

              gallery.insertBefore(fallbackItem, gallery.firstChild);
              initializeMediaElement(fallbackItem);
            }
          }
        }

        const parseAspectValue = (raw) => {
          if (raw === null || raw === undefined) {
            return null;
          }
          const value = `${raw}`.trim();
          if (!value) {
            return null;
          }
          const parsed = parseFloat(value);
          return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
        };

        const readAspectRatio = (item) => {
          if (!item) {
            return 1;
          }

          const dataAttr = parseAspectValue(item.getAttribute('data-aspect'));
          if (dataAttr) {
            return dataAttr;
          }

          const inlineValue = parseAspectValue(item.style.getPropertyValue('--item-aspect'));
          if (inlineValue) {
            return inlineValue;
          }

          if (window.getComputedStyle) {
            const computedValue = parseAspectValue(
              window.getComputedStyle(item).getPropertyValue('--item-aspect')
            );
            if (computedValue) {
              return computedValue;
            }
          }

          return 1;
        };

        const applyMasonryLayout = () => {
          const items = Array.from(gallery.querySelectorAll('.project-detail__item'));
          gallery.classList.add('is-masonry');
          gallery.classList.remove('is-ready');

          if (!items.length) {
            gallery.style.height = '0px';
            return;
          }

          const containerWidth = gallery.clientWidth;
          if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
            return;
          }

          const gap = MASONRY_GAP;
          const tentativeColumns = Math.max(
            1,
            Math.floor((containerWidth + gap) / (MASONRY_MIN_COLUMN_WIDTH + gap))
          );
          let columnCount = Math.min(tentativeColumns, items.length);
          columnCount = Math.max(columnCount, 1);

          let columnWidth =
            (containerWidth - gap * (columnCount - 1)) / Math.max(columnCount, 1);

          if (columnWidth > MASONRY_MAX_COLUMN_WIDTH && items.length > columnCount) {
            const adjustedColumns = Math.min(
              items.length,
              Math.max(
                columnCount,
                Math.floor((containerWidth + gap) / (MASONRY_MAX_COLUMN_WIDTH + gap))
              )
            );
            if (adjustedColumns > columnCount) {
              columnCount = adjustedColumns;
              columnWidth =
                (containerWidth - gap * (columnCount - 1)) / Math.max(columnCount, 1);
            }
          }

          if (!Number.isFinite(columnWidth) || columnWidth <= 0) {
            columnWidth = containerWidth;
            columnCount = 1;
          }

          const columnHeights = new Array(columnCount).fill(0);

          items.forEach((item) => {
            const aspectRatio = readAspectRatio(item);
            const itemHeight = columnWidth / (aspectRatio > 0 ? aspectRatio : 1);

            let targetColumn = 0;
            for (let index = 1; index < columnCount; index += 1) {
              if (columnHeights[index] < columnHeights[targetColumn]) {
                targetColumn = index;
              }
            }

            const x = targetColumn * (columnWidth + gap);
            const y = columnHeights[targetColumn];

            item.style.width = `${columnWidth}px`;
            item.style.height = `${itemHeight}px`;
            item.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            item.style.opacity = '1';

            columnHeights[targetColumn] = y + itemHeight + gap;
          });

          const maxHeight = columnHeights.reduce(
            (currentMax, height) => (height > currentMax ? height : currentMax),
            0
          );
          const finalHeight = maxHeight > 0 ? maxHeight - gap : 0;
          gallery.style.height = `${finalHeight > 0 ? finalHeight : 0}px`;
          gallery.classList.add('is-ready');
        };

        let masonryFrame = null;
        const scheduleMasonryLayout = () => {
          if (masonryFrame !== null) {
            cancelAnimationFrame(masonryFrame);
          }
          masonryFrame = requestAnimationFrame(() => {
            masonryFrame = null;
            applyMasonryLayout();
          });
        };

        scheduleMasonryLayout();

        if (typeof window.ResizeObserver === 'function') {
          if (
            gallery.__masonryObserver &&
            typeof gallery.__masonryObserver.disconnect === 'function'
          ) {
            gallery.__masonryObserver.disconnect();
          }

          const resizeObserver = new ResizeObserver(() => {
            scheduleMasonryLayout();
          });
          resizeObserver.observe(gallery);
          gallery.__masonryObserver = resizeObserver;
        }

        window.addEventListener('resize', scheduleMasonryLayout);

        if (fontsReadyPromise && typeof fontsReadyPromise.then === 'function') {
          fontsReadyPromise
            .then(() => {
              scheduleMasonryLayout();
            })
            .catch(() => {
              scheduleMasonryLayout();
            });
        }

        window.addEventListener('load', () => {
          scheduleMasonryLayout();
        });
      }
    }
  });
})();
