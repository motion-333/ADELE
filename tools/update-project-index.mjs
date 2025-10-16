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

const manifestPath = path.join(ROOT, 'pub', 'project-index.json');

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
    merged.set(key, {
      id: value.id,
      detail: value.detail || (base.get(key) ? base.get(key).detail : `${value.id}.html`),
      category: value.category || (base.get(key) ? base.get(key).category : null),
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

      return {
        id,
        detail: detail ? `${detail}`.trim() : `${id}.html`,
        category: category || null,
      };
    })
    .filter(Boolean);
};

const writeManifest = async (entries) => {
  const serialised = JSON.stringify(entries, null, 2);
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
