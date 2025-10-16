(function () {
  if (document.documentElement && document.documentElement.classList) {
    document.documentElement.classList.add('has-js');
  }

  const historyApi = window.history;
  if (historyApi && 'scrollRestoration' in historyApi) {
    historyApi.scrollRestoration = 'manual';
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const titleLink = document.querySelector('.topbar__title');
    const aboutLink = document.querySelector('.topbar__about');
    const themeToggle = document.querySelector('.topbar__theme-toggle');
    const isHomePage = document.querySelector('.portfolio') !== null;
    const body = document.body || document.documentElement;
    const topbar = document.querySelector('.topbar');
    const CATEGORY_KEYS = ['film', 'photo', 'evenementiel'];
    const categoryClassNames = CATEGORY_KEYS.map((key) => `category-${key}`);
    const allCategoryButtons = Array.from(
      document.querySelectorAll('[data-category-select]')
    );
    const topbarCategoryButtons = allCategoryButtons.filter((button) =>
      button.classList.contains('topbar__nav-link')
    );
    const initialHashCategory = (() => {
      if (!window.location || typeof window.location.hash !== 'string') {
        return null;
      }
      const raw = window.location.hash.replace('#', '').toLowerCase();
      return CATEGORY_KEYS.includes(raw) ? raw : null;
    })();
    let projectController = null;
    const pendingCategoryQueue = [];
    let shouldReduceMotion = false;

    const applyBodyCategory = (category) => {
      if (!body) {
        return;
      }

      categoryClassNames.forEach((cls) => {
        body.classList.remove(cls);
      });

      if (category && CATEGORY_KEYS.includes(category)) {
        body.classList.add(`category-${category}`);
      }
    };

    const updateCategoryButtonState = (category) => {
      topbarCategoryButtons.forEach((button) => {
        const key = button.getAttribute('data-category-select');
        if (!key) {
          return;
        }

        if (key === category) {
          button.classList.add('is-active');
        } else {
          button.classList.remove('is-active');
        }
      });
    };

    const showTitleOverlay = () => {
      if (!body) {
        return null;
      }

      let overlay = document.querySelector('.transition-overlay--title');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'transition-overlay transition-overlay--title';
        overlay.setAttribute('aria-hidden', 'true');
        const title = document.createElement('span');
        title.className = 'transition-overlay__title';
        title.textContent = 'ADÈLE FARGES';
        overlay.appendChild(title);
        document.body.appendChild(overlay);
      }

      body.classList.add('is-transitioning');
      if (shouldReduceMotion) {
        overlay.classList.add('is-active');
      } else {
        overlay.classList.remove('is-active');
        void overlay.offsetWidth;
        requestAnimationFrame(() => {
          overlay.classList.add('is-active');
        });
      }

      return overlay;
    };

    const syncLocationHash = (category, options = {}) => {
      if (!isHomePage || !CATEGORY_KEYS.includes(category)) {
        return;
      }

      const desiredHash = `#${category}`;
      if (window.location) {
        const currentHash = window.location.hash || '';
        if (!options.force && currentHash === desiredHash) {
          return;
        }
      }

      try {
        if (historyApi && typeof historyApi.replaceState === 'function') {
          historyApi.replaceState(null, '', desiredHash);
          return;
        }
      } catch (error) {
        /* ignore history errors */
      }

      if (window.location) {
        window.location.hash = category;
      }
    };

    const requestCategoryActivation = (category, options = {}) => {
      if (!category || !CATEGORY_KEYS.includes(category)) {
        return;
      }

      if (projectController) {
        projectController.activate(category, options);
        return;
      }

      pendingCategoryQueue.push({ category, options });
    };

    const reduceMotionMedia =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : { matches: false, addEventListener: null, addListener: null };
    shouldReduceMotion = reduceMotionMedia.matches;

    const prefersLightMedia =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: light)')
        : null;
    const THEME_STORAGE_KEY = 'adele:theme-preference';
    const THEME_DARK = 'dark';
    const THEME_LIGHT = 'light';

    const readStoredTheme = () => {
      if (!window.localStorage) {
        return null;
      }

      try {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === THEME_DARK || stored === THEME_LIGHT) {
          return stored;
        }
      } catch (error) {
        return null;
      }

      return null;
    };

    const syncThemeToggleState = (theme) => {
      if (!themeToggle) {
        return;
      }

      const label = theme === THEME_LIGHT ? 'Activer le mode sombre' : 'Activer le mode clair';
      themeToggle.setAttribute('aria-label', label);
      themeToggle.setAttribute('aria-pressed', theme === THEME_LIGHT ? 'true' : 'false');
      themeToggle.setAttribute('data-theme', theme);
    };

    const applyTheme = (theme, options = {}) => {
      const normalized = theme === THEME_LIGHT ? THEME_LIGHT : THEME_DARK;

      if (body) {
        body.classList.remove('theme-light', 'theme-dark');
        body.classList.add(`theme-${normalized}`);
      }

      syncThemeToggleState(normalized);

      if (options.store === false) {
        return;
      }

      try {
        if (window.localStorage) {
          window.localStorage.setItem(THEME_STORAGE_KEY, normalized);
        }
      } catch (error) {
        /* ignore storage errors */
      }
    };

    const resolvePreferredTheme = () => {
      const stored = readStoredTheme();
      if (stored === THEME_DARK || stored === THEME_LIGHT) {
        return stored;
      }

      if (prefersLightMedia && prefersLightMedia.matches) {
        return THEME_LIGHT;
      }

      return THEME_DARK;
    };

    applyTheme(resolvePreferredTheme(), { store: false });

    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        const currentTheme = body && body.classList.contains('theme-light') ? THEME_LIGHT : THEME_DARK;
        const nextTheme = currentTheme === THEME_LIGHT ? THEME_DARK : THEME_LIGHT;
        applyTheme(nextTheme);
      });
    }

    if (prefersLightMedia) {
      const handleSchemeChange = (event) => {
        if (readStoredTheme()) {
          return;
        }

        applyTheme(event.matches ? THEME_LIGHT : THEME_DARK, { store: false });
      };

      try {
        if (typeof prefersLightMedia.addEventListener === 'function') {
          prefersLightMedia.addEventListener('change', handleSchemeChange);
        } else if (typeof prefersLightMedia.addListener === 'function') {
          prefersLightMedia.addListener(handleSchemeChange);
        }
      } catch (error) {
        /* ignore media listener errors */
      }
    }

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
    const LAST_CATEGORY_KEY = 'adele:last-category';
    const RETURN_SCROLL_EVENT = 'adele:return-scroll-restored';
    const MASONRY_GAP = 5;
    const MASONRY_MIN_COLUMN_WIDTH = 220;
    const MASONRY_MAX_COLUMN_WIDTH = 380;
    const MEDIA_IMAGE_VAR = '--placeholder-image';
    const MEDIA_ANIMATED_VAR = '--placeholder-animated';
    const CATEGORY_DIRECTORY_LOOKUP = CATEGORY_KEYS.reduce((accumulator, key) => {
      accumulator[key] = normalizeDirectoryPath(key);
      return accumulator;
    }, {});

    const projectMetadataCache = new Map();

    const PROJECT_MANIFEST_URL = 'pub/project-index.json';
    let projectManifestPromise = null;

    const fetchProjectManifest = async () => {
      if (projectManifestPromise) {
        return projectManifestPromise;
      }

      projectManifestPromise = (async () => {
        if (typeof fetch !== 'function') {
          return [];
        }

        try {
          const response = await fetch(PROJECT_MANIFEST_URL, { cache: 'no-store' });
          if (!response || !response.ok) {
            return [];
          }

          const data = await response.json();
          if (!Array.isArray(data)) {
            return [];
          }

          return data
            .map((entry) => {
              if (!entry) {
                return null;
              }

              const rawId = entry.id || entry.project || entry.slug || entry.name;
              const id = rawId ? `${rawId}`.trim() : '';
              if (!id) {
                return null;
              }

              const detailLink = entry.detail || entry.detailLink || entry.href || entry.page;
              const category = entry.category ? `${entry.category}`.trim() : '';

              return {
                id,
                detail: detailLink ? `${detailLink}`.trim() : `${id}.html`,
                category: category || null,
              };
            })
            .filter(Boolean);
        } catch (error) {
          return [];
        }
      })();

      return projectManifestPromise;
    };

    const createProjectSection = (template) => {
      if (template) {
        const section = template.cloneNode(true);
        section.classList.remove('project--clone', 'project--primary', 'is-visible');
        section.removeAttribute('data-project');
        section.removeAttribute('data-detail-link');
        section.removeAttribute('data-category');

        const track = section.querySelector('.media-track');
        if (track) {
          track.innerHTML = '';
          track.removeAttribute('data-media-source');
        }

        const titleEl = section.querySelector('.project-title');
        if (titleEl) {
          titleEl.textContent = 'TITRE DE PROJET';
        }

        const metaEl = section.querySelector('.project-meta');
        if (metaEl) {
          metaEl.textContent = 'Nom de Prod, 2025';
        }

        return section;
      }

      const section = document.createElement('section');
      section.className = 'project';

      const mediaStrip = document.createElement('div');
      mediaStrip.className = 'media-strip';
      const mediaTrack = document.createElement('div');
      mediaTrack.className = 'media-track';
      mediaStrip.appendChild(mediaTrack);

      const heading = document.createElement('div');
      heading.className = 'project-heading';
      const title = document.createElement('h2');
      title.className = 'project-title';
      title.textContent = 'TITRE DE PROJET';
      const meta = document.createElement('span');
      meta.className = 'project-meta';
      meta.textContent = 'Nom de Prod, 2025';
      heading.appendChild(title);
      heading.appendChild(meta);

      section.appendChild(mediaStrip);
      section.appendChild(heading);

      return section;
    };

    const ensureProjectSections = async () => {
      const projectList = document.querySelector('.projects');
      if (!projectList) {
        return [];
      }

      const manifest = await fetchProjectManifest();
      if (!manifest.length) {
        return manifest;
      }

      const primaryProjects = Array.from(
        projectList.querySelectorAll('.project:not(.project--clone)')
      );
      const template = primaryProjects.length ? primaryProjects[0] : null;
      const manifestIds = new Set();
      const sectionLookup = new Map();

      manifest.forEach((entry) => {
        const { id, detail, category } = entry;
        if (!id) {
          return;
        }

        manifestIds.add(id);

        let section = projectList.querySelector(
          `.project[data-project="${id}"]:not(.project--clone)`
        );
        if (!section) {
          section = createProjectSection(template);
          projectList.appendChild(section);
        }

        if (!section) {
          return;
        }

        section.setAttribute('data-project', id);
        section.setAttribute('data-detail-link', detail || `${id}.html`);
        if (category) {
          section.setAttribute('data-category', category);
        } else {
          section.removeAttribute('data-category');
        }

        sectionLookup.set(id, section);
      });

      primaryProjects.forEach((section) => {
        const projectId = section.getAttribute('data-project');
        if (projectId && !manifestIds.has(projectId)) {
          section.remove();
        }
      });

      const ordered = document.createDocumentFragment();
      manifest.forEach((entry) => {
        const section = sectionLookup.get(entry.id);
        if (section) {
          ordered.appendChild(section);
        }
      });

      const cloneProjects = Array.from(projectList.querySelectorAll('.project--clone'));
      cloneProjects.forEach((clone) => clone.remove());

      projectList.appendChild(ordered);

      return manifest;
    };

    const METADATA_KEY_ALIASES = {
      'titre de projet': 'title',
      'titre': 'title',
      'infos additionelles': 'info',
      'infos additionnelles': 'info',
      'infos supplementaires': 'info',
      'infos supplémentaires': 'info',
      'paragraphe': 'paragraph',
      'description': 'paragraph',
      'texte': 'paragraph',
      'credits': 'credits',
      'credit': 'credits',
      'crédits': 'credits',
      'vimeo': 'vimeo',
    };

    const normalizeMetadataKey = (key) => {
      if (!key) {
        return '';
      }
      return key
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    };

    const stripMetadataBullet = (value) => {
      if (!value) {
        return '';
      }
      return `${value}`.replace(/^\s*[-–—•*·]+\s*/, '').trim();
    };

    const extractYouTubeId = (input) => {
      if (!input) {
        return null;
      }

      const source = `${input}`.trim();
      if (!source) {
        return null;
      }

      const directMatch = source.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i
      );
      if (directMatch && directMatch[1]) {
        return directMatch[1];
      }

      const queryMatch = source.match(/[?&]v=([A-Za-z0-9_-]{6,})/i);
      if (queryMatch && queryMatch[1]) {
        return queryMatch[1];
      }

      return null;
    };

    const buildYouTubeEmbedUrl = (videoId) => {
      if (!videoId) {
        return null;
      }

      const params = new URLSearchParams({
        autoplay: '1',
        loop: '1',
        playlist: videoId,
        controls: '0',
        modestbranding: '1',
        showinfo: '0',
        rel: '0',
        mute: '0',
        playsinline: '1',
      });

      return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    };

    const normalizeVimeoUrl = (value) => {
      if (!value) {
        return null;
      }

      const raw = `${value}`.trim();
      if (!raw) {
        return null;
      }

      const youtubeId = extractYouTubeId(raw);
      if (youtubeId) {
        return `https://www.youtube.com/embed/${youtubeId}`;
      }

      const extractId = (input) => {
        const idMatch = `${input}`.match(/(?:video\/)?(\d{3,})/);
        return idMatch && idMatch[1] ? idMatch[1] : null;
      };

      if (/^https?:\/\//i.test(raw)) {
        const directMatch = raw.match(/player\.vimeo\.com\/video\/(\d{3,})/i);
        if (directMatch && directMatch[1]) {
          return `https://player.vimeo.com/video/${directMatch[1]}`;
        }

        const genericMatch = raw.match(/vimeo\.com\/(?:video\/)?(\d{3,})/i);
        if (genericMatch && genericMatch[1]) {
          return `https://player.vimeo.com/video/${genericMatch[1]}`;
        }

        const fallbackId = extractId(raw);
        if (fallbackId) {
          return `https://player.vimeo.com/video/${fallbackId}`;
        }

        return raw;
      }

      const numericMatch = raw.match(/^(\d{3,})$/);
      if (numericMatch && numericMatch[1]) {
        return `https://player.vimeo.com/video/${numericMatch[1]}`;
      }

      const embeddedId = extractId(raw);
      if (embeddedId) {
        return `https://player.vimeo.com/video/${embeddedId}`;
      }

      return null;
    };

    const buildVimeoAutoplayUrl = (url) => {
      if (!url) {
        return null;
      }

      const directYouTubeId = extractYouTubeId(url);
      if (directYouTubeId) {
        return buildYouTubeEmbedUrl(directYouTubeId);
      }

      try {
        const base = window.location && window.location.origin ? window.location.origin : 'https://example.com';
        const parsed = new URL(url, base);
        const host = parsed.hostname ? parsed.hostname.toLowerCase() : '';

        if (host.includes('youtube.com') || host.includes('youtu.be')) {
          const youtubeId = extractYouTubeId(parsed.href);
          if (youtubeId) {
            return buildYouTubeEmbedUrl(youtubeId);
          }
        }

        parsed.searchParams.set('autoplay', '1');
        parsed.searchParams.set('muted', '0');
        parsed.searchParams.set('playsinline', '1');
        parsed.searchParams.set('loop', '1');
        return parsed.toString();
      } catch (error) {
        const hasQuery = url.includes('?');
        const separator = hasQuery ? '&' : '?';
        return `${url}${separator}autoplay=1&muted=0&playsinline=1&loop=1`;
      }
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

    const parseProjectMetadataText = (text) => {
      const result = {
        title: null,
        info: null,
        paragraph: null,
        credits: [],
        vimeo: null,
      };

      if (!text) {
        return result;
      }

      const normalizedText = `${text}`.replace(/\r\n/g, '\n');
      const lines = normalizedText.split('\n');

      const paragraphLines = [];
      const creditLines = [];

      let currentKey = null;

      lines.forEach((rawLine) => {
        const line = rawLine.replace(/\r/g, '');
        const keyMatch = line.match(/^\s*([^:]+):\s*(.*)$/);
        if (keyMatch) {
          const alias = METADATA_KEY_ALIASES[normalizeMetadataKey(keyMatch[1])];
          if (alias) {
            currentKey = alias;
            const value = keyMatch[2].trim();
            if (alias === 'title') {
              result.title = value || result.title;
            } else if (alias === 'info') {
              result.info = value || result.info;
            } else if (alias === 'paragraph') {
              paragraphLines.length = 0;
              if (value) {
                paragraphLines.push(value);
              }
            } else if (alias === 'credits') {
              creditLines.length = 0;
              if (value) {
                creditLines.push(stripMetadataBullet(value));
              }
            } else if (alias === 'vimeo') {
              if (value) {
                result.vimeo = value;
              }
            }
            return;
          }
        }

        const trimmed = line.trim();
        if (!trimmed) {
          if (currentKey === 'paragraph') {
            paragraphLines.push('');
          } else if (currentKey !== 'credits') {
            currentKey = null;
          }
          return;
        }

        if (currentKey === 'title') {
          result.title = result.title ? `${result.title} ${trimmed}` : trimmed;
        } else if (currentKey === 'info') {
          result.info = result.info ? `${result.info} ${trimmed}` : trimmed;
        } else if (currentKey === 'paragraph') {
          paragraphLines.push(trimmed);
        } else if (currentKey === 'credits') {
          creditLines.push(stripMetadataBullet(trimmed));
        } else if (currentKey === 'vimeo') {
          result.vimeo = result.vimeo ? `${result.vimeo} ${trimmed}` : trimmed;
        }
      });

      const paragraph = paragraphLines
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      if (paragraph) {
        result.paragraph = paragraph;
      }

      const credits = creditLines
        .map((entry) => stripMetadataBullet(entry))
        .filter((entry) => !!entry);
      if (credits.length) {
        result.credits = credits;
      }

      return result;
    };

    const fetchProjectMetadata = async (projectId) => {
      if (!projectId) {
        return null;
      }

      if (projectMetadataCache.has(projectId)) {
        return projectMetadataCache.get(projectId);
      }

      for (let index = 0; index < CATEGORY_KEYS.length; index += 1) {
        const category = CATEGORY_KEYS[index];
        const categoryRoot = CATEGORY_DIRECTORY_LOOKUP[category] || normalizeDirectoryPath(category);
        const baseDir = normalizeDirectoryPath(`${categoryRoot}${projectId}`);
        const metadataUrl = `${baseDir}project.txt`;

        try {
          const response = await fetch(metadataUrl, { cache: 'no-store' });
          if (!response || !response.ok) {
            continue;
          }

          const text = await response.text();
          const parsed = parseProjectMetadataText(text);
          const mediaDirectory = normalizeDirectoryPath(`${baseDir}images`);
          const vimeoUrl = normalizeVimeoUrl(parsed.vimeo);
          const metadata = {
            id: projectId,
            category,
            mediaDirectory,
            title: parsed.title || null,
            info: parsed.info || null,
            paragraph: parsed.paragraph || null,
            credits: Array.isArray(parsed.credits) ? parsed.credits : [],
            vimeo: vimeoUrl,
          };

          projectMetadataCache.set(projectId, metadata);
          return metadata;
        } catch (error) {
          /* ignore this attempt and try the next category */
        }
      }

      projectMetadataCache.set(projectId, null);
      return null;
    };

    const hydrateHomeProjects = async () => {
      const sections = Array.from(document.querySelectorAll('.project[data-project]'));
      if (!sections.length) {
        return;
      }

      await Promise.all(
        sections.map(async (section) => {
          const projectId = readStringAttribute(section, 'data-project');
          if (!projectId) {
            return;
          }

          const metadata = await fetchProjectMetadata(projectId);
          if (!metadata) {
            return;
          }

          section.setAttribute('data-category', metadata.category);

          const titleEl = section.querySelector('.project-title');
          if (titleEl && metadata.title) {
            titleEl.textContent = metadata.title;
          }

          const metaEl = section.querySelector('.project-meta');
          if (metaEl && metadata.info) {
            metaEl.textContent = metadata.info;
          }

          const track = section.querySelector('.media-track');
          if (track) {
            track.setAttribute('data-media-source', metadata.mediaDirectory);
          }
        })
      );
    };

    const ensureProjectSectionsPromise = ensureProjectSections();
    const homeMetadataPromise = ensureProjectSectionsPromise.then(() => hydrateHomeProjects());
    const hydrateProjectDetailMetadata = async () => {
      const detail = document.querySelector('.project-detail[data-project]');
      if (!detail) {
        return null;
      }

      const projectId = readStringAttribute(detail, 'data-project');
      if (!projectId) {
        return null;
      }

      const metadata = await fetchProjectMetadata(projectId);
      if (!metadata) {
        return null;
      }

      detail.setAttribute('data-media-source', metadata.mediaDirectory);
      if (metadata.vimeo) {
        detail.setAttribute('data-vimeo', metadata.vimeo);
      } else {
        detail.removeAttribute('data-vimeo');
      }

      const titleEl = detail.querySelector('.project-detail__title');
      if (titleEl && metadata.title) {
        titleEl.textContent = metadata.title;
      }

      const metaEl = detail.querySelector('.project-detail__meta');
      if (metaEl && metadata.info) {
        metaEl.textContent = metadata.info;
      }

      const descriptionEl = detail.querySelector('.project-detail__description');
      if (descriptionEl && metadata.paragraph) {
        descriptionEl.textContent = metadata.paragraph;
      }

      const creditsSection = detail.querySelector('.project-detail__credits');
      const creditsList = detail.querySelector('.project-detail__credits-list');
      if (creditsList) {
        creditsList.innerHTML = '';
        if (Array.isArray(metadata.credits) && metadata.credits.length) {
          metadata.credits.forEach((entry) => {
            const item = document.createElement('li');
            item.textContent = entry;
            creditsList.appendChild(item);
          });
          if (creditsSection) {
            creditsSection.classList.remove('is-hidden');
          }
        } else if (creditsSection) {
          creditsSection.classList.add('is-hidden');
        }
      }

      if (metadata.title) {
        const currentTitle = document.title || '';
        const pieces = currentTitle.split('—');
        if (pieces.length > 1) {
          const suffix = pieces.slice(1).join('—').trim();
          document.title = suffix ? `${metadata.title} — ${suffix}` : metadata.title;
        } else {
          document.title = `${metadata.title} — Adèle Farges`;
        }
      }

      return metadata;
    };

    const detailMetadataPromise = hydrateProjectDetailMetadata();

    let updateScrollProgressBar = null;
    let animateLoopResetProgress = null;

    const getMaxScrollY = () => {
      const doc = document.documentElement;
      const body = document.body;
      const scrollElement = document.scrollingElement || doc;
      const viewportHeight = window.innerHeight || (doc ? doc.clientHeight : 0) || 0;

      const heights = [0];
      if (scrollElement && Number.isFinite(scrollElement.scrollHeight)) {
        heights.push(scrollElement.scrollHeight);
      }
      if (doc && Number.isFinite(doc.scrollHeight)) {
        heights.push(doc.scrollHeight);
      }
      if (body && Number.isFinite(body.scrollHeight)) {
        heights.push(body.scrollHeight);
      }

      const maxHeight = Math.max.apply(null, heights);
      return Math.max(maxHeight - viewportHeight, 0);
    };

    const dimensionCache = new Map();
    const mediaReadyCache = new Map();

    const ensureImageReady = (src) => {
      if (!src) {
        return Promise.resolve();
      }

      if (mediaReadyCache.has(src)) {
        return mediaReadyCache.get(src);
      }

      const extension = getMediaExtension(src);

      if (extension && VIDEO_EXTENSIONS.has(extension)) {
        const videoPromise = new Promise((resolve) => {
          const video = document.createElement('video');
          let settled = false;

          const finalize = () => {
            if (settled) {
              return;
            }
            settled = true;
            resolve(true);
          };

          video.preload = 'metadata';
          video.muted = true;
          video.playsInline = true;
          video.addEventListener('loadeddata', finalize, { once: true });
          video.addEventListener('error', finalize, { once: true });
          video.src = src;
          try {
            video.load();
          } catch (error) {
            /* ignore */
          }
          if (video.readyState >= 2) {
            finalize();
          }
        });

        mediaReadyCache.set(src, videoPromise);
        videoPromise.catch(() => {
          mediaReadyCache.delete(src);
        });

        return videoPromise;
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

      mediaReadyCache.set(src, promise);
      promise.catch(() => {
        mediaReadyCache.delete(src);
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

      const extension = getMediaExtension(src);

      if (extension && VIDEO_EXTENSIONS.has(extension)) {
        const videoPromise = new Promise((resolve) => {
          const video = document.createElement('video');
          const finalize = () => {
            const width = video.videoWidth || 0;
            const height = video.videoHeight || 0;
            if (!width || !height) {
              resolve(null);
            } else {
              resolve({ width, height });
            }
          };
          video.preload = 'metadata';
          video.addEventListener('loadedmetadata', finalize, { once: true });
          video.addEventListener('error', () => {
            resolve(null);
          });
          video.src = src;
          try {
            video.load();
          } catch (error) {
            /* ignore */
          }
          if (video.readyState >= 1 && video.videoWidth && video.videoHeight) {
            finalize();
          }
        });

        dimensionCache.set(src, videoPromise);
        videoPromise.catch(() => {
          dimensionCache.delete(src);
        });

        return videoPromise;
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

    const syncPlaceholderVideo = (element, src, options = {}) => {
      if (!element) {
        return;
      }

      const videoSrc = src ? src.trim() : '';
      let videoElement = element.querySelector('video.placeholder__video');
      const {
        muted = true,
        controls = false,
        playsInline = true,
      } = options;

      if (!videoSrc) {
        if (videoElement) {
          try {
            videoElement.pause();
          } catch (error) {
            /* ignore */
          }
          videoElement.remove();
        }
        return;
      }

      if (!videoElement) {
        videoElement = document.createElement('video');
        videoElement.className = 'placeholder__video';
        videoElement.loop = true;
        videoElement.autoplay = true;
        videoElement.preload = 'metadata';
        videoElement.setAttribute('aria-hidden', 'true');
        element.appendChild(videoElement);
      }

      if (videoElement.getAttribute('data-src') !== videoSrc) {
        videoElement.setAttribute('data-src', videoSrc);
        videoElement.src = videoSrc;
        try {
          videoElement.load();
        } catch (error) {
          /* ignore */
        }
      }

      videoElement.muted = muted;
      videoElement.volume = muted ? 0 : 1;
      videoElement.playsInline = playsInline;

      if (controls) {
        videoElement.setAttribute('controls', '');
        videoElement.removeAttribute('aria-hidden');
      } else {
        videoElement.removeAttribute('controls');
        videoElement.setAttribute('aria-hidden', 'true');
      }

      videoElement.play().catch(() => {
        /* no-op */
      });
    };

    const initializeMediaElement = (element) => {
      if (!element) {
        return;
      }

      const still = readStringAttribute(element, 'data-still');
      const animated = readStringAttribute(element, 'data-animated');
      const video = readStringAttribute(element, 'data-video');
      const aspectAttr = parseNumeric(element.getAttribute('data-aspect'));
      const isLightboxMedia = element.classList.contains('lightbox__media');

      const ensureLightboxImage = (source) => {
        const imageSource = source ? source.trim() : '';
        let imageElement = element.querySelector('img.lightbox__image');

        if (!imageSource) {
          if (imageElement) {
            imageElement.remove();
          }
          return;
        }

        if (!imageElement) {
          imageElement = document.createElement('img');
          imageElement.className = 'lightbox__image';
          imageElement.alt = '';
          imageElement.setAttribute('aria-hidden', 'true');
          imageElement.decoding = 'async';
          imageElement.loading = 'eager';
          element.appendChild(imageElement);
        }

        if (imageElement.getAttribute('src') !== imageSource) {
          imageElement.src = imageSource;
        }
      };

      const updateVideoClass = () => {
        const currentStill = readStringAttribute(element, 'data-still');
        const currentAnimated = readStringAttribute(element, 'data-animated');
        const currentVideo = readStringAttribute(element, 'data-video');
        if (isLightboxMedia) {
          if (currentVideo) {
            element.classList.add('placeholder--video');
          } else {
            element.classList.remove('placeholder--video');
          }
          return;
        }
        if (currentVideo && !currentStill && !currentAnimated) {
          element.classList.add('placeholder--video');
        } else {
          element.classList.remove('placeholder--video');
        }
      };

      const applyCurrentMedia = () => {
        const currentStill = readStringAttribute(element, 'data-still');
        const currentAnimated = readStringAttribute(element, 'data-animated');
        const currentVideo = readStringAttribute(element, 'data-video');
        const stillSource = currentStill || currentAnimated || '';
        const animatedSource = currentAnimated || currentStill || '';
        if (isLightboxMedia) {
          const imageSource = currentVideo ? '' : animatedSource || stillSource;
          if (currentVideo) {
            ensureLightboxImage(null);
            syncPlaceholderVideo(element, currentVideo, {
              muted: false,
              controls: true,
              playsInline: true,
            });
          } else {
            syncPlaceholderVideo(element, null);
            ensureLightboxImage(imageSource);
          }
          element.style.removeProperty(MEDIA_IMAGE_VAR);
          element.style.removeProperty(MEDIA_ANIMATED_VAR);
          updateVideoClass();
          return;
        }

        applyMediaVariables(element, stillSource, animatedSource);
        syncPlaceholderVideo(element, currentVideo);
        updateVideoClass();
      };

      applyCurrentMedia();

      if (Number.isFinite(aspectAttr) && aspectAttr > 0 && !isLightboxMedia) {
        element.style.setProperty('--item-aspect', `${aspectAttr}`);
      } else if (isLightboxMedia) {
        element.style.removeProperty('--item-aspect');
      }

      const primarySource = still || animated || video || null;
      if (primarySource) {
        ensureImageReady(primarySource)
          .then(() => {
            if (!element.isConnected) {
              return;
            }

            const currentStill = readStringAttribute(element, 'data-still');
            const currentAnimated = readStringAttribute(element, 'data-animated');
            const currentVideo = readStringAttribute(element, 'data-video');
            if (still && currentStill !== still) {
              return;
            }
            if (!still && animated && currentAnimated !== animated) {
              return;
            }
            if (!still && !animated && video && currentVideo !== video) {
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
      if (video) {
        ensureImageReady(video).catch(() => {
          /* ignore */
        });
      }
    };

    const LIGHTBOX_TRANSITION_MS = 360;
    let lightboxElements = null;
    let lightboxHideTimer = null;
    let lastFocusedBeforeLightbox = null;

    const resetLightboxMedia = (media) => {
      if (!media) {
        return;
      }

      media.removeAttribute('data-still');
      media.removeAttribute('data-animated');
      media.removeAttribute('data-video');
      media.removeAttribute('data-aspect');
      media.style.removeProperty('--item-aspect');
      media.style.removeProperty(MEDIA_IMAGE_VAR);
      media.style.removeProperty(MEDIA_ANIMATED_VAR);
      media.classList.remove('placeholder--video');
      const existingImage = media.querySelector('img.lightbox__image');
      if (existingImage) {
        existingImage.remove();
      }
      const existingVideo = media.querySelector('video.placeholder__video');
      if (existingVideo) {
        try {
          existingVideo.pause();
        } catch (error) {
          /* ignore */
        }
        existingVideo.muted = true;
        existingVideo.removeAttribute('data-src');
        existingVideo.removeAttribute('src');
        try {
          existingVideo.load();
        } catch (error) {
          /* ignore */
        }
        existingVideo.remove();
      }
      syncPlaceholderVideo(media, null);
    };

    const handleLightboxKeydown = (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      closeLightbox();
    };

    const ensureLightboxElements = () => {
      if (lightboxElements) {
        return lightboxElements;
      }

      const overlay = document.createElement('div');
      overlay.className = 'lightbox';
      overlay.setAttribute('aria-hidden', 'true');

      const content = document.createElement('div');
      content.className = 'lightbox__content';
      content.setAttribute('role', 'dialog');
      content.setAttribute('aria-modal', 'true');
      content.setAttribute('aria-label', 'Agrandissement du visuel du projet');

      const closeButton = document.createElement('button');
      closeButton.type = 'button';
      closeButton.className = 'lightbox__close';
      closeButton.setAttribute('aria-label', 'Fermer la visionneuse');
      const closeIcon = document.createElement('span');
      closeIcon.className = 'lightbox__close-icon';
      closeIcon.setAttribute('aria-hidden', 'true');
      closeButton.appendChild(closeIcon);

      const media = document.createElement('div');
      media.className = 'lightbox__media placeholder';
      media.setAttribute('aria-hidden', 'true');

      content.appendChild(closeButton);
      content.appendChild(media);
      overlay.appendChild(content);
      document.body.appendChild(overlay);

      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
          closeLightbox();
        }
      });

      closeButton.addEventListener('click', () => {
        closeLightbox();
      });

      overlay.addEventListener('transitionend', (event) => {
        if (event.target !== overlay) {
          return;
        }

        if (!overlay.classList.contains('is-visible')) {
          overlay.classList.remove('is-active');
        }
      });

      lightboxElements = { overlay, content, closeButton, media };
      return lightboxElements;
    };

    const closeLightbox = () => {
      const elements = ensureLightboxElements();
      const { overlay, media, content } = elements;

      if (!overlay.classList.contains('is-active')) {
        return;
      }

      overlay.classList.remove('is-visible');
      overlay.setAttribute('aria-hidden', 'true');

      if (lightboxHideTimer) {
        clearTimeout(lightboxHideTimer);
        lightboxHideTimer = null;
      }

      lightboxHideTimer = window.setTimeout(() => {
        overlay.classList.remove('is-active');
        resetLightboxMedia(media);
        content.setAttribute('aria-label', 'Agrandissement du visuel du projet');
      }, LIGHTBOX_TRANSITION_MS);

      document.removeEventListener('keydown', handleLightboxKeydown);

      if (lastFocusedBeforeLightbox && typeof lastFocusedBeforeLightbox.focus === 'function') {
        try {
          lastFocusedBeforeLightbox.focus({ preventScroll: true });
        } catch (error) {
          /* ignore */
        }
      }

      lastFocusedBeforeLightbox = null;
    };

    const openLightboxFromElement = (sourceElement) => {
      if (!sourceElement) {
        return;
      }

      const elements = ensureLightboxElements();
      const { overlay, content, closeButton, media } = elements;

      if (lightboxHideTimer) {
        clearTimeout(lightboxHideTimer);
        lightboxHideTimer = null;
      }

      resetLightboxMedia(media);

      const still = readStringAttribute(sourceElement, 'data-still');
      const animated = readStringAttribute(sourceElement, 'data-animated');
      const video = readStringAttribute(sourceElement, 'data-video');
      const aspect = readStringAttribute(sourceElement, 'data-aspect');
      const label = sourceElement.getAttribute('aria-label');

      if (still) {
        media.setAttribute('data-still', still);
      }
      if (animated) {
        media.setAttribute('data-animated', animated);
      }
      if (video) {
        media.setAttribute('data-video', video);
        media.classList.add('placeholder--video');
      } else {
        media.classList.remove('placeholder--video');
      }
      if (aspect) {
        media.setAttribute('data-aspect', aspect);
      }

      if (label) {
        content.setAttribute('aria-label', label);
      }

      initializeMediaElement(media);

      overlay.classList.add('is-active');
      overlay.setAttribute('aria-hidden', 'false');
      lastFocusedBeforeLightbox = document.activeElement;

      requestAnimationFrame(() => {
        overlay.classList.add('is-visible');
        try {
          closeButton.focus({ preventScroll: true });
        } catch (error) {
          /* ignore focus errors */
        }
      });

      document.addEventListener('keydown', handleLightboxKeydown);
    };


    if (isHomePage) {

      const progressBarElement = document.querySelector('.scroll-progress__bar');
      if (progressBarElement) {
        const state = {
          lastRendered: 0,
          target: 0,
          isAnimating: false,
          animationFrame: null,
        };

        const clampRatio = (value) => {
          if (!Number.isFinite(value)) {
            return 0;
          }
          if (value <= 0) {
            return 0;
          }
          if (value >= 1) {
            return 1;
          }
          return value;
        };

        const applyProgress = (value) => {
          const clamped = clampRatio(value);
          progressBarElement.style.transform = `scaleY(${clamped})`;
          state.lastRendered = clamped;
        };

        const stopProgressAnimation = () => {
          if (state.animationFrame !== null) {
            cancelAnimationFrame(state.animationFrame);
            state.animationFrame = null;
          }
          state.isAnimating = false;
        };

        const computeProgressRatio = (scrollValue) => {
          const maxScroll = getMaxScrollY();
          const current = Number.isFinite(scrollValue) ? Math.max(scrollValue, 0) : 0;
          const targetScroll = maxScroll * 0.5;
          const effectiveMax = targetScroll > 0 ? targetScroll : maxScroll;
          if (effectiveMax <= 0) {
            return 0;
          }
          return clampRatio(current / effectiveMax);
        };

        const animateProgress = (start, end, duration = 500) => {
          const from = clampRatio(start);
          const to = clampRatio(end);
          if (Math.abs(from - to) < 0.001) {
            stopProgressAnimation();
            applyProgress(to);
            state.target = to;
            return;
          }

          stopProgressAnimation();
          state.isAnimating = true;
          state.target = to;
          let startTime = null;

          const step = (timestamp) => {
            if (!state.isAnimating) {
              return;
            }

            const now =
              typeof timestamp === 'number'
                ? timestamp
                : typeof performance !== 'undefined' && typeof performance.now === 'function'
                ? performance.now()
                : Date.now();

            if (startTime === null) {
              startTime = now;
            }

            const elapsed = now - startTime;
            const progress = elapsed <= 0 ? 0 : elapsed >= duration ? 1 : elapsed / duration;
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = from + (to - from) * eased;
            applyProgress(value);

            if (progress < 1) {
              state.animationFrame = requestAnimationFrame(step);
            } else {
              state.isAnimating = false;
              state.animationFrame = null;
              applyProgress(to);
            }
          };

          state.animationFrame = requestAnimationFrame(step);
        };

        const update = () => {
          const current = window.scrollY || window.pageYOffset || 0;
          const ratio = computeProgressRatio(current);

          if (state.isAnimating) {
            const difference = Math.abs(ratio - state.target);
            if (difference > 0.05) {
              stopProgressAnimation();
              state.target = ratio;
              applyProgress(ratio);
            }
            return;
          }

          state.target = ratio;
          applyProgress(ratio);
        };

        animateLoopResetProgress = (startScroll, targetScroll) => {
          const computedStart = computeProgressRatio(startScroll);
          const startRatio = clampRatio(
            Math.max(computedStart, state.lastRendered)
          );
          const targetRatio = computeProgressRatio(targetScroll);
          if (startRatio <= targetRatio) {
            stopProgressAnimation();
            state.target = targetRatio;
            applyProgress(targetRatio);
            return;
          }

          animateProgress(startRatio, targetRatio, 520);
        };

        updateScrollProgressBar = () => {
          stopProgressAnimation();
          update();
        };

        update();

        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', () => {
          stopProgressAnimation();
          update();
        });
        window.addEventListener(
          'load',
          () => {
            stopProgressAnimation();
            update();
          },
          { once: true }
        );
      }

    } else {
      updateScrollProgressBar = null;
      animateLoopResetProgress = null;
    }

    const IMAGE_EXTENSIONS = new Set(['png', 'gif', 'jpg', 'jpeg', 'webp']);
    const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov']);
    const SUPPORTED_MEDIA_EXTENSIONS = new Set([
      ...IMAGE_EXTENSIONS,
      ...VIDEO_EXTENSIONS,
    ]);
    const MEDIA_EXTENSION_PATTERN = /\.([^.?#]+)(?=[?#]?)/i;

    const getMediaExtension = (src) => {
      if (!src) {
        return null;
      }
      const match = `${src}`.match(MEDIA_EXTENSION_PATTERN);
      return match && match[1] ? match[1].toLowerCase() : null;
    };

    const isImageSource = (src) => {
      const extension = getMediaExtension(src);
      return extension ? IMAGE_EXTENSIONS.has(extension) : false;
    };

    const isVideoSource = (src) => {
      const extension = getMediaExtension(src);
      return extension ? VIDEO_EXTENSIONS.has(extension) : false;
    };

    function normalizeDirectoryPath(path) {
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
    }

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
      const pathRegex = /[\w\-./%]+\.(?:png|gif|jpe?g|webp|mp4|webm|mov)(?=["'\s>/]|$)/gi;
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
        container.querySelectorAll('[data-still], [data-animated], [data-video]')
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
        const video = readStringAttribute(node, 'data-video');
        if (video) {
          inlineList.push(video);
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

        const extension = getMediaExtension(resolved);
        if (!extension || !SUPPORTED_MEDIA_EXTENSIONS.has(extension)) {
          return;
        }

        let relative = resolved;
        if (!/^https?:\/\//i.test(relative)) {
          relative = relative.replace(/^\/+/, '');
        }

        const pathWithoutQuery = relative.split(/[?#]/)[0] || relative;
        const baseKey = pathWithoutQuery.replace(/(\.[^./?#]+)$/, '');
        if (!groups.has(baseKey)) {
          groups.set(baseKey, {
            order: index,
            still: null,
            animated: null,
            video: null,
          });
        }

        const entry = groups.get(baseKey);
        if (IMAGE_EXTENSIONS.has(extension)) {
          if (extension === 'gif') {
            if (!entry.animated) {
              entry.animated = relative;
            }
            if (!entry.still) {
              entry.still = relative;
            }
          } else if (!entry.still) {
            entry.still = relative;
          }
        } else if (VIDEO_EXTENSIONS.has(extension)) {
          if (!entry.video) {
            entry.video = relative;
          }
        }
      });

      const ordered = Array.from(groups.values()).sort((a, b) => a.order - b.order);
      const results = await Promise.all(
        ordered.map(async (entry) => {
          let aspect = null;
          const sizeSource = entry.still || entry.animated || entry.video;
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
            still: entry.still,
            animated: entry.animated,
            video: entry.video,
            aspect,
          };
        })
      );

      return results.filter(
        (item) => item && (item.still || item.animated || item.video)
      );
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

            const sliderEntries = entries
              .map((entry) => {
                if (!entry) {
                  return null;
                }

                const stillImage = isImageSource(entry.still) ? entry.still : null;
                const animatedImage = isImageSource(entry.animated)
                  ? entry.animated
                  : null;

                if (!stillImage && !animatedImage) {
                  return null;
                }

                return {
                  still: stillImage,
                  animated: animatedImage,
                  aspect: entry.aspect,
                };
              })
              .filter(Boolean);

            sliderEntries.forEach((entry) => {
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

        const detailTitleElement = detail.querySelector('.project-detail__title');
        const detailTitleText = detailTitleElement
          ? detailTitleElement.textContent.trim()
          : '';

        const lightboxLabel = detailTitleText
          ? `Agrandir ${detailTitleText}`
          : 'Agrandir le visuel du projet';

        const detailTask = loadProjectMediaEntries(projectId, directory, inlineList)
          .then((entries) => {
            if (hero) {
              if (entries && entries.length) {
                const heroEntry =
                  entries.find((entry) => entry && (entry.still || entry.animated)) ||
                  entries[0];
                const heroHasImage =
                  !!(heroEntry && (heroEntry.still || heroEntry.animated));
                const defaultStill = heroHasImage
                  ? heroEntry.still || heroEntry.animated || ''
                  : '';
                const defaultAnimated = heroHasImage
                  ? heroEntry.animated || heroEntry.still || ''
                  : '';
                const defaultVideo =
                  heroEntry && !heroHasImage && heroEntry.video ? heroEntry.video : '';
                const defaultAspect =
                  heroEntry && Number.isFinite(heroEntry.aspect) && heroEntry.aspect > 0
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

                if (defaultVideo) {
                  hero.setAttribute('data-default-video', defaultVideo);
                  hero.setAttribute('data-video', defaultVideo);
                  mediaReadyPromises.push(ensureImageReady(defaultVideo));
                } else {
                  hero.removeAttribute('data-default-video');
                  hero.removeAttribute('data-video');
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
                hero.removeAttribute('data-default-video');
                hero.removeAttribute('data-default-aspect');
                hero.removeAttribute('data-still');
                hero.removeAttribute('data-animated');
                hero.removeAttribute('data-video');
                hero.removeAttribute('data-aspect');
              }
            }

            if (gallery) {
              gallery.innerHTML = '';
              if (entries && entries.length) {
                const heroStill = hero ? readStringAttribute(hero, 'data-still') : null;
                const heroAnimated = hero ? readStringAttribute(hero, 'data-animated') : null;
                const heroVideo = hero ? readStringAttribute(hero, 'data-video') : null;
                const heroCandidates = new Set();
                if (heroStill) {
                  heroCandidates.add(heroStill);
                }
                if (heroAnimated) {
                  heroCandidates.add(heroAnimated);
                }
                if (heroVideo) {
                  heroCandidates.add(heroVideo);
                }

                entries.forEach((entry) => {
                  if (!entry) {
                    return;
                  }

                  const stillMatchesHero =
                    !!(entry.still && heroCandidates.has(entry.still));
                  const animatedMatchesHero =
                    !!(entry.animated && heroCandidates.has(entry.animated));
                  const videoMatchesHero =
                    !!(entry.video && heroCandidates.has(entry.video));

                  const createGalleryItem = (options) => {
                    const { still, animated, video, aspect } = options;
                    const item = document.createElement('div');
                    const classes = ['project-detail__item', 'placeholder'];
                    if (video && !still && !animated) {
                      classes.push('placeholder--video');
                    }
                    item.className = classes.join(' ');
                    item.tabIndex = 0;
                    item.setAttribute('role', 'button');
                    item.setAttribute('aria-label', lightboxLabel);
                    if (still) {
                      item.setAttribute('data-still', still);
                      mediaReadyPromises.push(ensureImageReady(still));
                    }
                    if (animated) {
                      item.setAttribute('data-animated', animated);
                      mediaReadyPromises.push(ensureImageReady(animated));
                    }
                    if (video) {
                      item.setAttribute('data-video', video);
                      mediaReadyPromises.push(ensureImageReady(video));
                    }
                    if (Number.isFinite(aspect) && aspect > 0) {
                      item.setAttribute('data-aspect', `${aspect}`);
                    }
                    gallery.appendChild(item);
                  };

                  const includeImage =
                    (!!entry.still && !stillMatchesHero) ||
                    (!!entry.animated && !animatedMatchesHero);

                  if (includeImage) {
                    createGalleryItem({
                      still: !stillMatchesHero ? entry.still : null,
                      animated: !animatedMatchesHero ? entry.animated : null,
                      video: null,
                      aspect: entry.aspect,
                    });
                  }

                  if (entry.video && !videoMatchesHero) {
                    createGalleryItem({
                      still: null,
                      animated: null,
                      video: entry.video,
                      aspect: entry.aspect,
                    });
                  }
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

    await Promise.all([detailMetadataPromise, homeMetadataPromise]);
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
    let pendingReturnScroll = null;
    let returnScrollReady = true;

    const readStoredCategory = () => {
      if (!sessionStore) {
        return null;
      }

      try {
        const value = sessionStore.getItem(LAST_CATEGORY_KEY);
        if (CATEGORY_KEYS.includes(value)) {
          return value;
        }
      } catch (error) {
        return null;
      }

      return null;
    };

    const storeLastCategory = (category) => {
      if (!sessionStore || !CATEGORY_KEYS.includes(category)) {
        return;
      }

      try {
        sessionStore.setItem(LAST_CATEGORY_KEY, category);
      } catch (error) {
        /* ignore storage failures */
      }
    };

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
        if (payload.video && typeof payload.video === 'string') {
          data.video = payload.video;
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
        const video = parsed && typeof parsed.video === 'string' ? parsed.video : null;
        const aspectCandidate = parsed && typeof parsed.aspect === 'number' ? parsed.aspect : null;
        const aspect = Number.isFinite(aspectCandidate) ? aspectCandidate : null;
        return { still, animated, video, aspect };
      } catch (error) {
        return null;
      }
    };

    let scrollAnimationFrame = null;
    let scrollAnimationStart = null;
    let scrollAnimationResolver = null;

    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const finishScrollAnimation = () => {
      if (typeof scrollAnimationResolver === 'function') {
        const resolver = scrollAnimationResolver;
        scrollAnimationResolver = null;
        resolver();
      }
    };

    const cancelScrollAnimation = () => {
      if (scrollAnimationFrame !== null) {
        cancelAnimationFrame(scrollAnimationFrame);
        scrollAnimationFrame = null;
      }
      scrollAnimationStart = null;
      finishScrollAnimation();
    };

    const startScrollAnimation = (targetY, duration = 900) => {
      cancelScrollAnimation();

      const maxScroll = getMaxScrollY();
      const numericTarget = Number.isFinite(targetY) ? targetY : 0;
      const clampedTarget = Math.max(0, Math.min(numericTarget, maxScroll));
      const startY = window.scrollY || window.pageYOffset || 0;
      const distance = clampedTarget - startY;

      if (Math.abs(distance) < 1) {
        window.scrollTo(0, clampedTarget);
        if (typeof updateScrollProgressBar === 'function') {
          updateScrollProgressBar();
        }
        return Promise.resolve();
      }

      const effectiveDuration = Math.max(duration, 0) || 0;

      return new Promise((resolve) => {
        scrollAnimationResolver = resolve;

        const step = (timestamp) => {
          if (scrollAnimationStart === null) {
            scrollAnimationStart = timestamp;
          }

          const elapsed = timestamp - scrollAnimationStart;
          const progress =
            effectiveDuration > 0 ? Math.min(elapsed / effectiveDuration, 1) : 1;
          const eased = easeInOutCubic(progress);
          const nextY = startY + distance * eased;

          window.scrollTo(0, nextY);
          if (typeof updateScrollProgressBar === 'function') {
            updateScrollProgressBar();
          }

          if (progress >= 1) {
            scrollAnimationFrame = null;
            scrollAnimationStart = null;
            finishScrollAnimation();
          } else {
            scrollAnimationFrame = requestAnimationFrame(step);
          }
        };

        scrollAnimationFrame = requestAnimationFrame(step);
      });
    };

    const startScrollToTopAnimation = () => startScrollAnimation(0, 2000);

    if (pendingReturnScroll === null) {
      pendingReturnScroll = readStoredScrollPosition();
      returnScrollReady = pendingReturnScroll === null;
    }

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

    if (aboutLink) {
      aboutLink.addEventListener('click', () => {
        if (!sessionStore) {
          return;
        }

        try {
          const currentScroll = window.scrollY || window.pageYOffset || 0;
          sessionStore.setItem(RETURN_SCROLL_KEY, `${currentScroll}`);
        } catch (error) {
          /* ignore storage failures */
        }
      });
    }

    window.addEventListener('wheel', cancelScrollAnimation, { passive: true });
    window.addEventListener('touchstart', cancelScrollAnimation, {
      passive: true,
    });
    const resolveInitialCategory = () => {
      if (initialHashCategory && CATEGORY_KEYS.includes(initialHashCategory)) {
        return initialHashCategory;
      }

      const storedCategory = readStoredCategory();
      if (storedCategory && CATEGORY_KEYS.includes(storedCategory)) {
        return storedCategory;
      }

      return CATEGORY_KEYS[0];
    };

    const handleCategoryButtonClick = (event) => {
      const button = event.currentTarget;
      if (!button) {
        return;
      }

      const category = button.getAttribute('data-category-select');
      if (!category) {
        return;
      }

      event.preventDefault();

      if (!isHomePage) {
        storeLastCategory(category);
        showTitleOverlay();
        window.setTimeout(() => {
          window.location.href = `index.html#${category}`;
        }, 180);
        return;
      }

      requestCategoryActivation(category, { userInitiated: true });
    };

    allCategoryButtons.forEach((button) => {
      button.addEventListener('click', handleCategoryButtonClick);
    });

    const projectList = document.querySelector('.projects');
    if (projectList) {
      await homeMetadataPromise;

      const baseProjects = Array.from(projectList.children);
      if (baseProjects.length) {
        const baseDurationStart = 68;
        const durationStep = 12;

        baseProjects.forEach((project, index) => {
          project.classList.add('project--primary');
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

          const direction = index % 2 === 0 ? 'left' : 'right';
          track.dataset.baseDirection = direction;

          const duration = baseDurationStart + (index % 5) * durationStep;
          track.dataset.baseDuration = duration.toString();
        });

        const loopFragment = document.createDocumentFragment();
        baseProjects.forEach((project) => {
          const clone = project.cloneNode(true);
          clone.classList.remove('project--primary');
          clone.classList.add('project--clone');
          Array.from(clone.querySelectorAll('.placeholder')).forEach((element) => {
            initializeMediaElement(element);
          });
          loopFragment.appendChild(clone);
        });
        projectList.appendChild(loopFragment);

        const allProjects = Array.from(projectList.querySelectorAll('.project'));
        const primaryProjects = baseProjects;
        const cloneProjects = allProjects.filter((project) =>
          project.classList.contains('project--clone')
        );

        let activeCategory = null;
        let isCategoryAnimating = false;
        const localCategoryQueue = [];
        let scheduleResizeTasks = () => {};

        const dequeueNextCategory = () => {
          if (!localCategoryQueue.length || isCategoryAnimating) {
            return;
          }
          const next = localCategoryQueue.shift();
          if (!next) {
            return;
          }
          requestActivate(next.category, next.options || {});
        };

        const runCategoryTransition = (category, options = {}) => {
          if (!CATEGORY_KEYS.includes(category)) {
            isCategoryAnimating = false;
            dequeueNextCategory();
            return;
          }

          const forcing = options && options.force === true;
          if (activeCategory === category && !forcing) {
            isCategoryAnimating = false;
            updateCategoryButtonState(category);
            dequeueNextCategory();
            return;
          }

          const previouslyVisible = primaryProjects.filter((project) =>
            project.classList.contains('is-visible')
          );
          const clonesVisible = cloneProjects.filter((project) =>
            project.classList.contains('is-visible')
          );
          const newPrimary = primaryProjects.filter(
            (project) => project.getAttribute('data-category') === category
          );
          const newClones = cloneProjects.filter(
            (project) => project.getAttribute('data-category') === category
          );

          const showNewCategory = () => {
            activeCategory = category;
            updateCategoryButtonState(category);
            applyBodyCategory(category);
            storeLastCategory(category);
            syncLocationHash(category, options);
            scheduleResizeTasks();
            window.setTimeout(() => {
              scheduleResizeTasks();
            }, 0);

            if (shouldReduceMotion) {
              newPrimary.forEach((project) => project.classList.add('is-visible'));
              newClones.forEach((project) => project.classList.add('is-visible'));
              scheduleResizeTasks();
              window.setTimeout(() => {
                scheduleResizeTasks();
              }, 0);
              isCategoryAnimating = false;
              dequeueNextCategory();
              return;
            }

            newPrimary.forEach((project) => project.classList.remove('is-visible'));
            newClones.forEach((project) => project.classList.remove('is-visible'));

            newPrimary.forEach((project, index) => {
              window.setTimeout(() => {
                project.classList.add('is-visible');
              }, index * 160);
            });

            const totalDelay = newPrimary.length * 160 + 420;
            window.setTimeout(() => {
              newClones.forEach((project) => project.classList.add('is-visible'));
              scheduleResizeTasks();
              isCategoryAnimating = false;
              dequeueNextCategory();
            }, totalDelay);
          };

          const fadeOutPrevious = (callback) => {
            if (!previouslyVisible.length) {
              clonesVisible.forEach((project) => project.classList.remove('is-visible'));
              callback();
              return;
            }

            if (shouldReduceMotion) {
              previouslyVisible.forEach((project) => project.classList.remove('is-visible'));
              clonesVisible.forEach((project) => project.classList.remove('is-visible'));
              callback();
              return;
            }

            previouslyVisible
              .slice()
              .reverse()
              .forEach((project, index) => {
                window.setTimeout(() => {
                  project.classList.remove('is-visible');
                }, index * 120);
              });

            clonesVisible.forEach((project) => project.classList.remove('is-visible'));

            const totalFade = previouslyVisible.length * 120 + 360;
            window.setTimeout(callback, totalFade);
          };

          fadeOutPrevious(showNewCategory);
        };

        function requestActivate(category, options = {}) {
          if (!CATEGORY_KEYS.includes(category)) {
            return;
          }

          if (isCategoryAnimating) {
            localCategoryQueue.push({ category, options });
            return;
          }

          isCategoryAnimating = true;
          runCategoryTransition(category, options);
        }

        projectController = {
          activate: requestActivate,
          getActiveCategory: () => activeCategory,
        };

        if (pendingCategoryQueue.length) {
          const queuedSelections = pendingCategoryQueue.splice(0);
          queuedSelections.forEach(({ category, options }) => {
            requestActivate(category, options || {});
          });
        }

        const FAST_MULTIPLIER = 0.18;
        const MIN_FAST_DURATION = 0.45;
        const EDGE_ZONE_RATIO = 0.22;
        const EDGE_ZONE_MIN = 120;
        const EDGE_ZONE_MAX = 320;

        const trackStates = [];
        const trackStateMap = new WeakMap();

        const trackElements = Array.from(projectList.querySelectorAll('.media-track'));
        trackElements.forEach((track) => {
          const baseDurationAttr = parseFloat(track.dataset.baseDuration || `${baseDurationStart}`);
          const baseDuration =
            Number.isFinite(baseDurationAttr) && baseDurationAttr > 0
              ? baseDurationAttr
              : baseDurationStart;
          const baseDirectionAttr = `${track.dataset.baseDirection || 'left'}`.toLowerCase();
          const baseDirection = baseDirectionAttr === 'right' ? 1 : -1;

          const state = {
            track,
            baseDuration,
            fastDuration: Math.max(baseDuration * FAST_MULTIPLIER, MIN_FAST_DURATION),
            contentWidth: 0,
            offset: 0,
            baseSpeedAbs: 0,
            fastSpeedAbs: 0,
            speed: 0,
            mode: 'base',
            baseDirection,
            initialized: false,
          };

          trackStates.push(state);
          trackStateMap.set(track, state);
        });

        pendingReturnScroll = readStoredScrollPosition();
        returnScrollReady = pendingReturnScroll === null;

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

          if (state.mode === 'manual') {
            state.speed = 0;
            return;
          }

          if (state.mode === 'fast-right') {
            state.speed = state.fastSpeedAbs;
          } else if (state.mode === 'fast-left') {
            state.speed = -state.fastSpeedAbs;
          } else {
            state.mode = 'base';
            const direction = state.baseDirection >= 0 ? 1 : -1;
            state.speed = state.baseSpeedAbs ? state.baseSpeedAbs * direction : 0;
          }
        };

        const computeTrackMetrics = () => {
          trackStates.forEach((state) => {
            const track = state.track;
            const totalWidth = track.scrollWidth;
            const baseWidth = totalWidth / 2;
            const previousWidth = state.contentWidth;
            state.contentWidth = baseWidth || totalWidth || 0;

            if (!state.initialized) {
              state.offset = state.baseDirection > 0 ? -state.contentWidth : 0;
              state.initialized = true;
            } else if (
              previousWidth &&
              state.contentWidth &&
              previousWidth !== state.contentWidth
            ) {
              const ratio = state.offset / previousWidth;
              state.offset = ratio * state.contentWidth;
            }

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
            state.mode = 'base';
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
            state.mode = 'base';
            const direction = state.baseDirection >= 0 ? 1 : -1;
            state.speed = state.baseSpeedAbs ? state.baseSpeedAbs * direction : 0;
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
          const heroVideo = readStringAttribute(anchor, 'data-video');
          const heroAspect = parseNumeric(anchor.getAttribute('data-aspect'));

          const storedStill = heroStill || heroAnimated || heroVideo || null;
          const storedAnimated = heroAnimated || null;
          const storedVideo = heroVideo || null;

          if (projectId && (storedStill || storedAnimated || storedVideo)) {
            storeHeroData(projectId, {
              still: storedStill,
              animated: storedAnimated,
              video: storedVideo,
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

          const preloadSource = heroStill || heroAnimated || heroVideo || null;
          let preloadPromise = Promise.resolve();
          if (preloadSource) {
            preloadPromise = Promise.race([
              ensureImageReady(preloadSource),
              new Promise((resolve) => {
                window.setTimeout(resolve, 450);
              }),
            ]).catch(() => {});
          }

          const trackElement = anchor.closest('.media-track');
          const trackState = trackElement ? trackStateMap.get(trackElement) : null;
          if (trackState) {
            trackState.mode = 'manual';
            trackState.speed = 0;
          }

          const alignScrollToSelection = async () => {
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
            if (!viewportHeight) {
              return;
            }

            const rect = anchor.getBoundingClientRect();
            const currentScroll = window.scrollY || window.pageYOffset || 0;
            const anchorCenterY = currentScroll + rect.top + rect.height / 2;
            const targetY = anchorCenterY - viewportHeight / 2;

            await startScrollAnimation(targetY, 700);
          };

          const alignStripToSelection = async () => {
            if (!trackState || !trackState.track || !trackState.track.isConnected) {
              return;
            }

            const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
            if (!viewportWidth) {
              return;
            }

            const rect = anchor.getBoundingClientRect();
            const anchorCenterX = rect.left + rect.width / 2;
            const viewportCenterX = viewportWidth / 2;
            const delta = viewportCenterX - anchorCenterX;

            if (Math.abs(delta) < 1) {
              return;
            }

            const track = trackState.track;
            const currentOffset = Number.isFinite(trackState.offset) ? trackState.offset : 0;
            const targetOffset = currentOffset + delta;
            trackState.offset = targetOffset;

            await new Promise((resolve) => {
              let resolved = false;

              const cleanup = () => {
                if (resolved) {
                  return;
                }
                resolved = true;
                track.style.transition = '';
                track.removeEventListener('transitionend', onTransitionEnd);
                resolve();
              };

              const onTransitionEnd = (event) => {
                if (event.target === track && event.propertyName === 'transform') {
                  cleanup();
                }
              };

              track.addEventListener('transitionend', onTransitionEnd);

              requestAnimationFrame(() => {
                track.style.transition = 'transform 0.5s cubic-bezier(0.45, 0, 0.2, 1)';
                track.style.transform = `translateX(${targetOffset}px)`;
              });

              window.setTimeout(cleanup, 520);
            });
          };

          try {
            await alignScrollToSelection();
          } catch (error) {
            /* ignore alignment issues */
          }

          try {
            await alignStripToSelection();
          } catch (error) {
            /* ignore alignment issues */
          }

          await Promise.all([
            preloadPromise,
            new Promise((resolve) => {
              requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
              });
            }),
          ]);

          document.body.classList.add('is-transitioning');

          const rect = anchor.getBoundingClientRect();

          const clone = anchor.cloneNode(true);
          clone.classList.add('placeholder--transition');
          initializeMediaElement(clone);
          clone.style.position = 'fixed';
          clone.style.left = `${rect.left}px`;
          clone.style.top = `${rect.top}px`;
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

          const targetLeft = Math.max((viewportWidth - targetWidth) / 2, 0);
          const topbar = document.querySelector('.topbar');
          const topbarHeight = topbar ? topbar.getBoundingClientRect().height : 0;
          const detailOffset = 30;
          const targetTop = topbarHeight + detailOffset;

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
                updateEdgeMode('base');
              }
              return;
            }

            const pointerType = event.pointerType || 'mouse';
            if (pointerType === 'touch') {
              if (edgePointerActive) {
                edgePointerActive = false;
                updateEdgeMode('base');
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
              } else if (state.mode !== 'base') {
                updateEdgeMode('base');
              }
            }
          };

          const resetEdgeHover = () => {
            if (!edgePointerActive) {
              return;
            }
            edgePointerActive = false;
            updateEdgeMode('base');
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
            applyMode(state, 'base');
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
              applyMode(state, 'base');
            });
            control.addEventListener('pointerleave', (event) => {
              if (event.pointerType === 'mouse') {
                control.classList.remove('is-active');
                applyMode(state, 'base');
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
              applyMode(state, 'base');
            });

            control.addEventListener('blur', () => {
              control.classList.remove('is-active');
              applyMode(state, 'base');
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
            if (typeof animateLoopResetProgress === 'function') {
              animateLoopResetProgress(currentY, normalized);
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
            returnScrollReady = true;
            clearStoredScrollPosition();
            try {
              document.dispatchEvent(new CustomEvent(RETURN_SCROLL_EVENT));
            } catch (error) {
              /* no-op */
            }
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
        scheduleResizeTasks = () => {
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
            trackStates.forEach((state) => {
              state.offset = 0;
              state.speed = 0;
              state.mode = 'base';
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

        scheduleResizeTasks();
      }
    }

    const startInitialCategory = () => {
      if (!isHomePage) {
        return;
      }

      const targetCategory = resolveInitialCategory();
      if (!targetCategory) {
        return;
      }

      requestCategoryActivation(targetCategory, { initial: true, force: true });
    };

    if (isHomePage) {
      if (fontsReadyPromise && typeof fontsReadyPromise.then === 'function') {
        fontsReadyPromise.then(startInitialCategory).catch(startInitialCategory);
      } else if (document.readyState === 'complete') {
        startInitialCategory();
      } else {
        window.addEventListener('load', startInitialCategory, { once: true });
      }
    }

    const projectDetail = document.querySelector('.project-detail');
    if (projectDetail) {
      const backLink = projectDetail.querySelector('.project-detail__back');
      if (backLink) {
        backLink.addEventListener('click', (event) => {
          event.preventDefault();
          const lastCategory = readStoredCategory() || initialHashCategory || CATEGORY_KEYS[0];
          showTitleOverlay();
          window.setTimeout(() => {
            const fallbackHref = backLink.getAttribute('href') || 'index.html';
            const targetHref = lastCategory ? `index.html#${lastCategory}` : fallbackHref;
            window.location.href = targetHref;
          }, 180);
        });
      }

      const projectId = projectDetail.getAttribute('data-project');
      const heroFrame = projectDetail.querySelector('.project-hero__media');
      const heroPlayButton = projectDetail.querySelector('.project-hero__play');
      const heroVideoContainer = projectDetail.querySelector('.project-hero__video');
      const heroDefaults = heroFrame
        ? {
            still: readStringAttribute(heroFrame, 'data-default-still'),
            animated: readStringAttribute(heroFrame, 'data-default-animated'),
            video: readStringAttribute(heroFrame, 'data-default-video'),
            aspect: parseNumeric(heroFrame.getAttribute('data-default-aspect')),
          }
        : { still: null, animated: null, video: null, aspect: null };

      const storedHero = readHeroData(projectId) || {};
      const storedStill = storedHero.still || null;
      const storedAnimated = storedHero.animated || null;
      const storedVideo = storedHero.video || null;

      const hasStoredImage = storedStill || storedAnimated;
      const hasDefaultImage = heroDefaults.still || heroDefaults.animated;
      const heroStill =
        storedStill ||
        storedAnimated ||
        heroDefaults.still ||
        heroDefaults.animated ||
        null;
      const heroAnimated =
        storedAnimated ||
        heroDefaults.animated ||
        heroStill ||
        null;
      const heroVideo =
        !hasStoredImage && !hasDefaultImage ? storedVideo || heroDefaults.video || null : null;

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

        if (heroVideo) {
          heroFrame.setAttribute('data-video', heroVideo);
        } else {
          heroFrame.removeAttribute('data-video');
        }

        heroFrame.setAttribute('data-aspect', `${HERO_ASPECT}`);
        heroFrame.style.setProperty('--hero-aspect', `${HERO_ASPECT}`);
        applyMediaVariables(heroFrame, heroStill, heroAnimated);
        syncPlaceholderVideo(heroFrame, heroVideo);

        if (heroStill) {
          ensureImageReady(heroStill).catch(() => {});
        }
        if (heroAnimated && heroAnimated !== heroStill) {
          ensureImageReady(heroAnimated).catch(() => {});
        }
        if (heroVideo) {
          ensureImageReady(heroVideo).catch(() => {});
        }
      }

      let heroVimeoUrl = null;

      const updateVideoAvailability = (metadata) => {
        heroVimeoUrl = metadata && metadata.vimeo ? metadata.vimeo : null;

        if (heroVideoContainer) {
          if (heroVimeoUrl) {
            heroVideoContainer.dataset.vimeo = heroVimeoUrl;
          } else {
            delete heroVideoContainer.dataset.vimeo;
            if (!heroVideoContainer.hasAttribute('hidden')) {
              heroVideoContainer.setAttribute('hidden', 'hidden');
            }
            heroVideoContainer.innerHTML = '';
          }
        }

        if (heroPlayButton) {
          if (heroVimeoUrl) {
            heroPlayButton.classList.remove('is-hidden');
            heroPlayButton.removeAttribute('hidden');
          } else {
            heroPlayButton.classList.add('is-hidden');
            heroPlayButton.setAttribute('hidden', 'hidden');
          }
        }

        if (!heroVimeoUrl && heroFrame) {
          heroFrame.classList.remove('is-playing');
        }
      };

      if (detailMetadataPromise && typeof detailMetadataPromise.then === 'function') {
        detailMetadataPromise
          .then((metadata) => {
            if (metadata && metadata.category) {
              storeLastCategory(metadata.category);
            }
            updateVideoAvailability(metadata || null);
          })
          .catch(() => {
            updateVideoAvailability(null);
          });
      } else {
        updateVideoAvailability(null);
      }

      const ensureVideoIframe = () => {
        if (!heroVideoContainer || !heroVimeoUrl) {
          return null;
        }

        let iframe = heroVideoContainer.querySelector('iframe');
        const autoplayUrl = buildVimeoAutoplayUrl(heroVimeoUrl);

        if (!iframe) {
          iframe = document.createElement('iframe');
          iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
          iframe.setAttribute('allowfullscreen', '');
          iframe.setAttribute('title', 'Lecture vidéo du projet');
          iframe.src = autoplayUrl || heroVimeoUrl;
          heroVideoContainer.appendChild(iframe);
        } else if (autoplayUrl && iframe.src !== autoplayUrl) {
          iframe.src = autoplayUrl;
        }

        heroVideoContainer.removeAttribute('hidden');
        return iframe;
      };

      const beginHeroPlayback = () => {
        if (!heroFrame) {
          return;
        }
        const iframe = ensureVideoIframe();
        if (!iframe) {
          return;
        }

        heroFrame.classList.add('is-playing');
      };

      if (heroPlayButton) {
        heroPlayButton.addEventListener('click', (event) => {
          event.preventDefault();
          beginHeroPlayback();
        });

        heroPlayButton.addEventListener('keydown', (event) => {
          if (!ACTION_KEYS.has(event.key)) {
            return;
          }
          event.preventDefault();
          beginHeroPlayback();
        });
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
        if (heroDefaults.video) {
          defaultSources.add(heroDefaults.video);
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
              const videoAttr = readStringAttribute(item, 'data-video');
              return (
                (stillAttr && defaultSources.has(stillAttr)) ||
                (animatedAttr && defaultSources.has(animatedAttr)) ||
                (videoAttr && defaultSources.has(videoAttr))
              );
            });

            if (!hasDefaultEntry) {
              const fallbackItem = document.createElement('div');
              const fallbackClasses = ['project-detail__item', 'placeholder'];
              if (heroDefaults.video && !heroDefaults.still && !heroDefaults.animated) {
                fallbackClasses.push('placeholder--video');
              }
              fallbackItem.className = fallbackClasses.join(' ');

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

              if (heroDefaults.video) {
                fallbackItem.setAttribute('data-video', heroDefaults.video);
                if (
                  heroDefaults.video !== heroDefaults.still &&
                  heroDefaults.video !== heroDefaults.animated
                ) {
                  ensureImageReady(heroDefaults.video).catch(() => {});
                }
              }

              if (Number.isFinite(heroDefaults.aspect) && heroDefaults.aspect > 0) {
                fallbackItem.setAttribute('data-aspect', `${heroDefaults.aspect}`);
              }

              fallbackItem.tabIndex = 0;
              fallbackItem.setAttribute('role', 'button');
              fallbackItem.setAttribute('aria-label', lightboxLabel);

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

        const handleGalleryLightbox = (target) => {
          if (!target || !target.classList) {
            return;
          }
          openLightboxFromElement(target);
        };

        gallery.addEventListener('click', (event) => {
          const target = event.target.closest('.project-detail__item');
          if (!target) {
            return;
          }
          event.preventDefault();
          handleGalleryLightbox(target);
        });

        gallery.addEventListener('keydown', (event) => {
          if (!ACTION_KEYS.has(event.key)) {
            return;
          }
          const target = event.target.closest('.project-detail__item');
          if (!target) {
            return;
          }
          event.preventDefault();
          handleGalleryLightbox(target);
        });
      }
    }
  });
})();
