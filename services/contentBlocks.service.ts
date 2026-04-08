import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { defaultTextBlocks } from '@/data/textBlocks';
import { db } from '@/lib/firebase';
import type { ContentTextBlock, TemplateDocument } from '@/types/domain';
import type { ContentLocaleSettings } from '@/types/content';
import { firestoreCollections } from '@/types/domain';

const CONTENT_DOC_ID = 'ui-text-blocks';

function normalizeBlocks(blocks: ContentTextBlock[]): ContentTextBlock[] {
  return [...blocks]
    .filter((entry) => Boolean(entry?.key) && Boolean(entry?.label))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

export function getDefaultContentBlocks(): ContentTextBlock[] {
  return defaultTextBlocks.map((entry, index) => ({
    key: entry.key,
    group: entry.group,
    label: entry.label,
    description: entry.description,
    text: entry.text,
    isActive: true,
    sortOrder: index + 1,
  }));
}

export async function fetchContentBlocks(): Promise<{ blocks: ContentTextBlock[]; localeSettings?: Partial<ContentLocaleSettings> }> {
  try {
    const ref = doc(db, firestoreCollections.templates, CONTENT_DOC_ID);
    const snapshot = await getDoc(ref);

    if (snapshot.exists()) {
      const payload = snapshot.data() as TemplateDocument<{ blocks: ContentTextBlock[]; localeSettings?: Partial<ContentLocaleSettings> }>;
      const blocks = payload?.content?.blocks;
      if (Array.isArray(blocks) && blocks.length) {
        return { blocks: normalizeBlocks(blocks), localeSettings: payload?.content?.localeSettings };
      }
    }
  } catch {
    // fallback to defaults
  }

  return { blocks: getDefaultContentBlocks() };
}

export async function persistContentBlocks(blocks: ContentTextBlock[], localeSettings?: Partial<ContentLocaleSettings>) {
  const normalized = normalizeBlocks(blocks);

  await setDoc(doc(db, firestoreCollections.templates, CONTENT_DOC_ID), {
    id: CONTENT_DOC_ID,
    category: 'pageContent',
    name: 'UI Textbausteine',
    version: 1,
    isActive: true,
    updatedAt: serverTimestamp(),
    content: {
      blocks: normalized,
      ...(localeSettings ? { localeSettings } : {}),
    },
  }, { merge: true });
}

export function createTextResolver(blocks: ContentTextBlock[]) {
  const lookup = new Map(blocks.filter((entry) => entry.isActive).map((entry) => [entry.key, entry.text]));

  return {
    keys: blocks.map((entry) => entry.key),
    resolve: (key: string) => lookup.get(key),
  };
}
