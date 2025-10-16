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

const manifestPath = path.join(ROOT, 'pub', 'project-index.json');

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

            const imagesDirectory = path.join(basePath, child.name, 'images');
            let mediaFiles = [];
            if (await isDirectory(imagesDirectory)) {
              mediaFiles = await collectMediaFiles(imagesDirectory);
              await writeMediaListFile(imagesDirectory, mediaFiles);
            }

            if (mediaFiles.length) {
              manifestEntry.media = mediaFiles;
            }

            entries.set(id, manifestEntry);
          })
      );
    })
  );

  return entries;
};

const mergeEntries = (base, override) => {
  const merged = new Map(base);
  override.forEach((value, key) => {
    const baseEntry = base.get(key);
    const baseMedia =
      baseEntry && Array.isArray(baseEntry.media) && baseEntry.media.length ? baseEntry.media : null;
    const overrideMedia = Array.isArray(value.media) && value.media.length ? value.media : null;

    merged.set(key, {
      id: value.id,
      detail: value.detail || (baseEntry ? baseEntry.detail : `${value.id}.html`),
      category: value.category || (baseEntry ? baseEntry.category : null),
      media: overrideMedia || baseMedia || null,
    });
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
      const media = Array.isArray(entry.media)
        ? entry.media
            .map((item) => `${item}`.trim())
            .filter((item) => item && MEDIA_EXTENSIONS.has(path.extname(item).toLowerCase()))
        : [];

      return {
        id,
        detail: detail ? `${detail}`.trim() : `${id}.html`,
        category: category || null,
        media,
      };
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
