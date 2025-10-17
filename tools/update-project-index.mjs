#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const CATEGORY_DIRECTORIES = [
  { key: 'film', directory: 'film' },
  { key: 'photo', directory: 'photo' },
  { key: 'evenementiel', directory: 'evenementiel' },
];

const PROJECT_HTML_PATTERN = /^project-(\d+)\.html$/i;
const PROJECT_DIRECTORY_PATTERN = /^project-(\d+)$/i;
const MEDIA_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp4', '.webm', '.mov']);

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

const manifestPath = path.join(ROOT, 'pub', 'project-index.json');
const manifestScriptPath = path.join(ROOT, 'pub', 'project-manifest.js');
const projectTemplatePath = path.join(ROOT, 'tools', 'templates', 'project-detail.html');

const DEFAULT_DESCRIPTION =
  "Cette section présente une description détaillée du projet, incluant son périmètre, ses objectifs et ses principaux livrables. Elle expose les activités prévues, les méthodologies retenues ainsi que les résultats attendus, tout en mettant en avant le rôle et la participation du client tout au long du processus. L’implication du client — qu’il s’agisse de retours, de prises de décision ou de collaboration — sera essentielle pour garantir la réussite du projet et son alignement avec ses besoins.";

const FALLBACK_PROJECT_TEMPLATE = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{PAGE_TITLE}}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@100..900&family=Raleway:ital,wght@0,100..900;1,100..900&display=swap"
      rel="stylesheet"
    />
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body class="project-detail-page theme-dark">
    <header class="topbar">
      <div class="topbar__inner">
        <div class="topbar__identity">
          <a class="topbar__title" href="index.html">Adèle Farges</a>
          <span class="topbar__subtitle">DIRECTRICE DE PRODUCTION</span>
        </div>
        <nav class="topbar__nav" aria-label="Catégories de projets">
          <button type="button" class="topbar__nav-link" data-category-select="film">FILM</button>
          <button type="button" class="topbar__nav-link" data-category-select="photo">PHOTO</button>
          <button type="button" class="topbar__nav-link" data-category-select="evenementiel">ÉVÉNEMENTIEL</button>
        </nav>
        <div class="topbar__actions">
          <button
            type="button"
            class="topbar__theme-toggle"
            aria-label="Activer le mode clair"
          >
            <svg class="icon icon--theme" viewBox="0 0 32 32" role="img" aria-hidden="true">
              <circle class="icon--theme__sun" cx="16" cy="16" r="7"></circle>
              <path
                class="icon--theme__moon"
                d="M20.5 24.5a8.5 8.5 0 0 1 0-17 8.5 8.5 0 1 0 0 17Z"
              ></path>
              <g class="icon--theme__rays" stroke-linecap="round">
                <line x1="16" y1="3" x2="16" y2="6"></line>
                <line x1="16" y1="26" x2="16" y2="29"></line>
                <line x1="3" y1="16" x2="6" y2="16"></line>
                <line x1="26" y1="16" x2="29" y2="16"></line>
                <line x1="7.6" y1="7.6" x2="9.8" y2="9.8"></line>
                <line x1="22.2" y1="22.2" x2="24.4" y2="24.4"></line>
                <line x1="7.6" y1="24.4" x2="9.8" y2="22.2"></line>
                <line x1="22.2" y1="9.8" x2="24.4" y2="7.6"></line>
              </g>
            </svg>
          </button>
          <a class="topbar__about" href="about.html" aria-label="À propos d'Adèle Farges">
            <svg class="icon icon--info" viewBox="0 0 24 24" role="img" aria-hidden="true">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.8"></circle>
              <line x1="12" y1="10" x2="12" y2="16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></line>
              <circle cx="12" cy="7" r="1.2" fill="currentColor"></circle>
            </svg>
          </a>
        </div>
      </div>
    </header>
    <main class="project-detail" data-project="{{PROJECT_ID}}"{{MEDIA_SOURCE_ATTR}}{{VIMEO_ATTR}}>
      <div class="project-hero">
        <div class="project-hero__media placeholder">
          <button
            class="project-hero__play"
            type="button"
            aria-label="Lire la vidéo du projet"
          ></button>
          <div class="project-hero__video" hidden></div>
        </div>
      </div>
      <section class="project-detail__body">
        <div class="project-detail__heading">
          <a class="project-detail__back" href="index.html" aria-label="Retourner au portfolio">
            <svg class="icon icon--back" viewBox="0 0 24 24" role="img" aria-hidden="true">
              <polyline points="14 6 8 12 14 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></polyline>
              <line x1="9" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></line>
            </svg>
          </a>
          <div class="project-detail__heading-text">
            <h1 class="project-detail__title">{{TITLE_TEXT}}</h1>
            <span class="project-detail__meta">{{META_TEXT}}</span>
          </div>
        </div>
        <p class="project-detail__description">{{DESCRIPTION_TEXT}}</p>
      </section>
      <section class="project-detail__gallery"></section>
      <section class="project-detail__credits" aria-label="Crédits du projet">
        <h2 class="project-detail__credits-title">Crédits</h2>
        <ul class="project-detail__credits-list"></ul>
      </section>
    </main>
    <footer class="site-footer">
      <small>
        Site dev by
        <a href="https://www.motion333.com" target="_blank" rel="noopener">Motion</a>
      </small>
    </footer>
    <script src="pub/project-manifest.js" defer></script>
    <script src="script.js"></script>
  </body>
</html>`;

let projectTemplateCache = null;

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

const isDirectory = async (targetPath) => {
  try {
    const stats = await fs.stat(targetPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
};

const toProjectId = (input) => {
  if (!input) {
    return null;
  }

  const trimmed = `${input}`.trim();
  const htmlMatch = trimmed.match(PROJECT_HTML_PATTERN);
  if (htmlMatch) {
    return `project-${htmlMatch[1].padStart(2, '0')}`;
  }

  const dirMatch = trimmed.match(PROJECT_DIRECTORY_PATTERN);
  if (dirMatch) {
    return `project-${dirMatch[1].padStart(2, '0')}`;
  }

  return null;
};

const readJsonFile = async (filePath) => {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const normalizeDirectoryPath = (input) => {
  if (!input) {
    return '';
  }

  let normalized = `${input}`.trim().replace(/\\/g, '/');
  if (!normalized) {
    return '';
  }

  normalized = normalized.replace(/^\.\/+/, '');
  normalized = normalized.replace(/^\/+/, '');

  if (normalized && !normalized.endsWith('/')) {
    normalized = `${normalized}/`;
  }

  return normalized;
};

const escapeHtml = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return `${value}`
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const escapeAttribute = (value) => escapeHtml(value).replace(/`/g, '&#96;');

const loadProjectTemplate = async () => {
  if (projectTemplateCache !== null) {
    return projectTemplateCache;
  }

  try {
    const template = await fs.readFile(projectTemplatePath, 'utf8');
    projectTemplateCache = template;
  } catch (error) {
    projectTemplateCache = FALLBACK_PROJECT_TEMPLATE;
  }

  return projectTemplateCache;
};

const renderProjectDetailHtml = async (entry) => {
  const template = await loadProjectTemplate();
  const projectId = entry && entry.id ? `${entry.id}`.trim() : 'project-00';
  const titleText = entry && entry.title ? `${entry.title}`.trim() : 'TITRE DE PROJET';
  const metaText = entry && entry.info ? `${entry.info}`.trim() : 'Nom de Prod, 2025';
  const paragraphText =
    entry && entry.paragraph && `${entry.paragraph}`.trim()
      ? `${entry.paragraph}`.trim()
      : DEFAULT_DESCRIPTION;
  const pageTitle = `${titleText} — Adèle Farges`;
  const mediaDirectory = entry && entry.mediaDirectory ? `${entry.mediaDirectory}`.trim() : '';
  const vimeoUrl = entry && entry.vimeo ? `${entry.vimeo}`.trim() : '';

  const mediaAttr = mediaDirectory
    ? ` data-media-source="${escapeAttribute(mediaDirectory)}"`
    : '';
  const vimeoAttr = vimeoUrl ? ` data-vimeo="${escapeAttribute(vimeoUrl)}"` : '';

  const replacements = new Map([
    ['PAGE_TITLE', escapeHtml(pageTitle)],
    ['PROJECT_ID', escapeAttribute(projectId)],
    ['TITLE_TEXT', escapeHtml(titleText)],
    ['META_TEXT', escapeHtml(metaText)],
    ['DESCRIPTION_TEXT', escapeHtml(paragraphText)],
    ['MEDIA_SOURCE_ATTR', mediaAttr],
    ['VIMEO_ATTR', vimeoAttr],
  ]);

  let html = template;
  replacements.forEach((replacement, key) => {
    const pattern = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(pattern, replacement);
  });

  return html;
};

const ensureManifestScriptTag = async (filePath) => {
  let content;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    return;
  }

  if (content.includes('pub/project-manifest.js')) {
    return;
  }

  const scriptPattern = /([ \t]*)<script\s+src="script\.js"[^>]*><\/script>/i;
  if (!scriptPattern.test(content)) {
    return;
  }

  const updated = content.replace(
    scriptPattern,
    (match, indent = '') =>
      `${indent}<script src="pub/project-manifest.js" defer></script>\n${indent}<script src="script.js"></script>`
  );

  if (updated !== content) {
    await fs.writeFile(filePath, updated, 'utf8');
  }
};

const ensureProjectDetailPage = async (entry) => {
  if (!entry || !entry.id) {
    return;
  }

  const detailFile = entry.detail ? `${entry.detail}`.trim() : `${entry.id}.html`;
  if (!detailFile) {
    return;
  }

  const targetPath = path.join(ROOT, detailFile);
  let exists = true;
  try {
    await fs.access(targetPath);
  } catch (error) {
    exists = false;
  }

  if (!exists) {
    const html = await renderProjectDetailHtml(entry);
    await fs.writeFile(targetPath, `${html}\n`, 'utf8');
  }

  await ensureManifestScriptTag(targetPath);
};

const collectMediaFiles = async (basePath) => {
  const traverse = async (segments = []) => {
    const targetPath = path.join(basePath, ...segments);
    let children = [];
    try {
      children = await fs.readdir(targetPath, { withFileTypes: true });
    } catch (error) {
      return [];
    }

    const results = [];

    for (const child of children) {
      if (child.name.startsWith('.')) {
        continue;
      }

      const nextSegments = [...segments, child.name];

      if (child.isDirectory()) {
        const nested = await traverse(nextSegments);
        results.push(...nested);
        continue;
      }

      const ext = path.extname(child.name).toLowerCase();
      if (!MEDIA_EXTENSIONS.has(ext)) {
        continue;
      }

      const relativePath = nextSegments.join('/');
      results.push(relativePath);
    }

    return results;
  };

  const collected = await traverse();
  const unique = Array.from(new Set(collected));
  return unique.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
};

const writeMediaListFile = async (directoryPath, files) => {
  if (!directoryPath) {
    return;
  }

  try {
    await fs.mkdir(directoryPath, { recursive: true });
    const targetPath = path.join(directoryPath, '_list.json');
    const payload = {
      files: Array.isArray(files) ? files : [],
    };
    const serialised = JSON.stringify(payload, null, 2);
    await fs.writeFile(targetPath, `${serialised}\n`, 'utf8');
  } catch (error) {
    /* ignore write issues */
  }
};

const sortProjects = (entries) => {
  return [...entries].sort((a, b) => {
    const aMatch = a.id.match(/(\d+)/);
    const bMatch = b.id.match(/(\d+)/);
    const aValue = aMatch ? parseInt(aMatch[1], 10) : Number.MAX_SAFE_INTEGER;
    const bValue = bMatch ? parseInt(bMatch[1], 10) : Number.MAX_SAFE_INTEGER;
    if (aValue !== bValue) {
      return aValue - bValue;
    }
    return a.id.localeCompare(b.id);
  });
};

const collectProjectHtml = async () => {
  const entries = new Map();

  let directoryEntries = [];
  try {
    directoryEntries = await fs.readdir(ROOT, { withFileTypes: true });
  } catch (error) {
    return entries;
  }

  directoryEntries
    .filter((item) => item.isFile() && PROJECT_HTML_PATTERN.test(item.name))
    .forEach((item) => {
      const id = toProjectId(item.name);
      if (!id) {
        return;
      }
      entries.set(id, {
        id,
        detail: item.name,
        category: null,
      });
    });

  return entries;
};

const collectProjectDirectories = async (htmlEntries = new Map()) => {
  const entries = new Map();

  await Promise.all(
    CATEGORY_DIRECTORIES.map(async ({ key, directory }) => {
      const basePath = path.join(ROOT, directory);
      let children = [];
      try {
        children = await fs.readdir(basePath, { withFileTypes: true });
      } catch (error) {
        return;
      }

      await Promise.all(
        children
          .filter((child) => child.isDirectory() && PROJECT_DIRECTORY_PATTERN.test(child.name))
          .map(async (child) => {
            const id = toProjectId(child.name);
            if (!id) {
              return;
            }

            const numericPart = child.name.replace(/[^0-9]/g, '').padStart(2, '0');
            const inferredName = `project-${numericPart}.html`;
            const htmlEntry = htmlEntries.get(id);
            const detail = htmlEntry && htmlEntry.detail ? htmlEntry.detail : inferredName;
            const manifestEntry = {
              id,
              category: key,
              detail,
            };

            const metadataPath = path.join(basePath, child.name, 'project.txt');
            let metadata = null;
            try {
              const rawMetadata = await fs.readFile(metadataPath, 'utf8');
              metadata = parseProjectMetadataText(rawMetadata);
            } catch (error) {
              metadata = null;
            }

            if (metadata) {
              if (metadata.title) {
                manifestEntry.title = metadata.title;
              }
              if (metadata.info) {
                manifestEntry.info = metadata.info;
              }
              if (metadata.paragraph) {
                manifestEntry.paragraph = metadata.paragraph;
              }
              if (Array.isArray(metadata.credits) && metadata.credits.length) {
                manifestEntry.credits = metadata.credits;
              }
              if (metadata.vimeo) {
                manifestEntry.vimeo = metadata.vimeo;
              }
            }

            const imagesDirectory = path.join(basePath, child.name, 'images');
            let mediaFiles = [];
            if (await isDirectory(imagesDirectory)) {
              mediaFiles = await collectMediaFiles(imagesDirectory);
              await writeMediaListFile(imagesDirectory, mediaFiles);
            }

            const relativeImagesDirectory = normalizeDirectoryPath(
              path.posix.join(directory, child.name, 'images')
            );
            if (relativeImagesDirectory) {
              manifestEntry.mediaDirectory = relativeImagesDirectory;
            }

            if (mediaFiles.length) {
              manifestEntry.media = mediaFiles.map((file) => file.replace(/\\/g, '/'));
            }

            entries.set(id, manifestEntry);
          })
      );
    })
  );

  return entries;
};

const hasTextValue = (value) => {
  if (value === null || value === undefined) {
    return false;
  }
  return `${value}`.trim().length > 0;
};

const mergeEntries = (base, override) => {
  const merged = new Map(base);
  override.forEach((value, key) => {
    const existing = merged.get(key) || base.get(key) || {};
    const result = { ...existing };

    result.id = value.id || existing.id || key;

    if (hasTextValue(value.detail)) {
      result.detail = value.detail;
    } else if (!result.detail) {
      result.detail = `${result.id}.html`;
    }

    if (hasTextValue(value.category)) {
      result.category = value.category;
    }

    if (hasTextValue(value.mediaDirectory)) {
      result.mediaDirectory = value.mediaDirectory;
    }

    if (hasTextValue(value.title)) {
      result.title = value.title;
    }

    if (hasTextValue(value.info)) {
      result.info = value.info;
    }

    if (hasTextValue(value.paragraph)) {
      result.paragraph = value.paragraph;
    }

    if (hasTextValue(value.vimeo)) {
      result.vimeo = value.vimeo;
    }

    if (Array.isArray(value.credits) && value.credits.length) {
      result.credits = value.credits;
    } else if (!Array.isArray(result.credits)) {
      result.credits = Array.isArray(existing.credits) ? existing.credits : [];
    }

    if (Array.isArray(value.media) && value.media.length) {
      result.media = value.media;
    } else if (!Array.isArray(result.media) || !result.media.length) {
      result.media = Array.isArray(existing.media) ? existing.media : [];
    }

    merged.set(key, result);
  });
  return merged;
};

const normaliseManifest = (manifest) => {
  if (!Array.isArray(manifest)) {
    return [];
  }

  return manifest
    .map((entry) => {
      if (!entry) {
        return null;
      }

      const id = toProjectId(entry.id || entry.project || entry.slug || entry.name);
      if (!id) {
        return null;
      }

      const detail = entry.detail || entry.detailLink || entry.href || entry.page;
      const category = entry.category ? `${entry.category}`.trim() : '';
      const mediaDirectory = normalizeDirectoryPath(entry.mediaDirectory || entry.mediaPath || '');
      const media = Array.isArray(entry.media)
        ? entry.media
            .map((item) => `${item}`.trim())
            .filter((item) => item && MEDIA_EXTENSIONS.has(path.extname(item).toLowerCase()))
        : [];

      const credits = Array.isArray(entry.credits)
        ? entry.credits.map((credit) => `${credit}`.trim()).filter((credit) => !!credit)
        : [];

      const title = hasTextValue(entry.title) ? `${entry.title}`.trim() : null;
      const info = hasTextValue(entry.info) ? `${entry.info}`.trim() : null;
      const paragraph = hasTextValue(entry.paragraph) ? `${entry.paragraph}`.trim() : null;
      const vimeo = hasTextValue(entry.vimeo) ? `${entry.vimeo}`.trim() : null;

      const normalised = {
        id,
        detail: detail ? `${detail}`.trim() : `${id}.html`,
        category: category || null,
      };

      if (mediaDirectory) {
        normalised.mediaDirectory = mediaDirectory;
      }

      if (media.length) {
        normalised.media = media;
      }

      if (title) {
        normalised.title = title;
      }

      if (info) {
        normalised.info = info;
      }

      if (paragraph) {
        normalised.paragraph = paragraph;
      }

      if (credits.length) {
        normalised.credits = credits;
      }

      if (vimeo) {
        normalised.vimeo = vimeo;
      }

      return normalised;
    })
    .filter(Boolean);
};

const writeManifest = async (entries) => {
  const sanitised = entries.map((entry) => {
    const normalised = {
      id: entry.id,
      detail: entry.detail,
      category: entry.category,
    };

    if (hasTextValue(entry.mediaDirectory)) {
      normalised.mediaDirectory = normalizeDirectoryPath(entry.mediaDirectory);
    }

    if (hasTextValue(entry.title)) {
      normalised.title = entry.title;
    }

    if (hasTextValue(entry.info)) {
      normalised.info = entry.info;
    }

    if (hasTextValue(entry.paragraph)) {
      normalised.paragraph = entry.paragraph;
    }

    if (Array.isArray(entry.credits) && entry.credits.length) {
      normalised.credits = entry.credits;
    }

    if (hasTextValue(entry.vimeo)) {
      normalised.vimeo = entry.vimeo;
    }

    if (Array.isArray(entry.media) && entry.media.length) {
      normalised.media = entry.media;
    }

    return normalised;
  });

  const serialised = JSON.stringify(sanitised, null, 2);
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, `${serialised}\n`, 'utf8');
  return sanitised;
};

const writeManifestScript = async (entries) => {
  const payload = `window.__ADELE_PROJECT_MANIFEST__ = Object.freeze(${JSON.stringify(
    entries,
    null,
    2
  )});\n`;
  await fs.mkdir(path.dirname(manifestScriptPath), { recursive: true });
  await fs.writeFile(manifestScriptPath, payload, 'utf8');
};

const main = async () => {
  const [existingManifest, htmlEntries] = await Promise.all([
    readJsonFile(manifestPath),
    collectProjectHtml(),
  ]);

  const directoryEntries = await collectProjectDirectories(htmlEntries);

  const normalisedExisting = normaliseManifest(existingManifest);
  const existingMap = new Map(normalisedExisting.map((entry) => [entry.id, entry]));

  const merged = mergeEntries(htmlEntries, directoryEntries);
  const finalEntries = mergeEntries(merged, existingMap);

  const result = sortProjects(Array.from(finalEntries.values()));
  const sanitised = await writeManifest(result);
  await writeManifestScript(sanitised);

  await ensureManifestScriptTag(path.join(ROOT, 'index.html'));
  await Promise.all(sanitised.map((entry) => ensureProjectDetailPage(entry)));

  const added = sanitised.length;
  process.stdout.write(`Updated ${path.relative(ROOT, manifestPath)} with ${added} project${added === 1 ? '' : 's'}.\n`);
};

main().catch((error) => {
  process.stderr.write(`Failed to update project index: ${error.message}\n`);
  process.exitCode = 1;
});
