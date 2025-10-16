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
  await writeManifest(result);

  const added = result.length;
  process.stdout.write(`Updated ${path.relative(ROOT, manifestPath)} with ${added} project${added === 1 ? '' : 's'}.\n`);
};

main().catch((error) => {
  process.stderr.write(`Failed to update project index: ${error.message}\n`);
  process.exitCode = 1;
});
