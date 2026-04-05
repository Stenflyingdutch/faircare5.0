import { getAdminProjectId, getGoogleAccessToken } from '@/services/server/admin/google-auth';

export type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
};

export type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { nullValue: null }
  | { timestampValue: string }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }
  | { arrayValue: { values?: FirestoreValue[] } };

function baseUrl() {
  return `https://firestore.googleapis.com/v1/projects/${getAdminProjectId()}/databases/(default)/documents`;
}

export function encodeFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((entry) => encodeFirestoreValue(entry)) } };
  }
  if (typeof value === 'object') {
    const fields = Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, encodeFirestoreValue(entry)]),
    );
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

export function decodeFirestoreValue(value?: FirestoreValue): unknown {
  if (!value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map((item) => decodeFirestoreValue(item));
  if ('mapValue' in value) {
    const fields = value.mapValue.fields ?? {};
    return Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, decodeFirestoreValue(field)]));
  }
  return null;
}

function toDocumentMask(fields?: string[]) {
  if (!fields?.length) return '';
  return fields.map((field) => `mask.fieldPaths=${encodeURIComponent(field)}`).join('&');
}

export async function getDocument(path: string, fields?: string[]) {
  const token = await getGoogleAccessToken();
  const mask = toDocumentMask(fields);
  const queryString = mask ? `?${mask}` : '';
  const response = await fetch(`${baseUrl()}/${path}${queryString}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Dokument konnte nicht geladen werden (${response.status}).`);
  return (await response.json()) as FirestoreDocument;
}

export async function patchDocument(path: string, payload: Record<string, unknown>) {
  const token = await getGoogleAccessToken();
  const fields = Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, encodeFirestoreValue(value)]));
  const updateMask = Object.keys(payload).map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join('&');
  const response = await fetch(`${baseUrl()}/${path}?${updateMask}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Dokument konnte nicht aktualisiert werden (${response.status}): ${text}`);
  }
}

export async function deleteDocument(path: string) {
  const token = await getGoogleAccessToken();
  const response = await fetch(`${baseUrl()}/${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw new Error(`Dokument konnte nicht gelöscht werden (${response.status}): ${text}`);
  }
}

export async function runQuery(collectionId: string, options?: {
  filters?: Array<{ field: string; op?: 'EQUAL'; value: unknown }>;
  orderBy?: { field: string; direction?: 'ASCENDING' | 'DESCENDING' };
  limit?: number;
  fromParentPath?: string;
}) {
  const token = await getGoogleAccessToken();
  const from = [{ collectionId }];
  const whereFilters = (options?.filters ?? []).map((filter) => ({
    fieldFilter: {
      field: { fieldPath: filter.field },
      op: filter.op ?? 'EQUAL',
      value: encodeFirestoreValue(filter.value),
    },
  }));
  const where = whereFilters.length > 1
    ? { compositeFilter: { op: 'AND', filters: whereFilters } }
    : whereFilters[0];

  const payload = {
    structuredQuery: {
      from,
      ...(where ? { where } : {}),
      ...(options?.orderBy ? {
        orderBy: [{ field: { fieldPath: options.orderBy.field }, direction: options.orderBy.direction ?? 'ASCENDING' }],
      } : {}),
      ...(options?.limit ? { limit: options.limit } : {}),
    },
  };

  const parentPath = options?.fromParentPath ? `/${options.fromParentPath}` : '';
  const response = await fetch(`${baseUrl()}${parentPath}:runQuery`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Abfrage fehlgeschlagen (${response.status}): ${text}`);
  }

  const result = (await response.json()) as Array<{ document?: FirestoreDocument }>;
  return result.map((entry) => entry.document).filter(Boolean) as FirestoreDocument[];
}

export function getDocumentId(name: string) {
  const parts = name.split('/');
  return parts[parts.length - 1] ?? '';
}
