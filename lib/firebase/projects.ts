import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  addDoc,
  orderBy,
  query,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from './client';
import { Project, Section, Row } from '@/lib/types';
import { uid } from '@/lib/utils';

const projectsCol = collection(db, 'projects');

function toProject(id: string, data: DocumentData): Project {
  return {
    id,
    name: data.name ?? '',
    archived: !!data.archived,
    activity: data.activity ?? [],
    created_at: data.created_at ?? '',
    cover_url: data.cover_url ?? null,
    deleted_at: data.deleted_at ?? null,
    sections: (data.sections ?? []) as Section[],
  };
}

export async function listProjects(): Promise<Project[]> {
  const snap = await getDocs(query(projectsCol, orderBy('created_at', 'desc')));
  return snap.docs.map((d) => toProject(d.id, d.data()));
}

export async function getProject(id: string): Promise<Project | null> {
  const snap = await getDoc(doc(projectsCol, id));
  return snap.exists() ? toProject(snap.id, snap.data()) : null;
}

export async function createProject(input: {
  name: string;
  sections?: Section[];
  cover_url?: string | null;
}): Promise<Project> {
  const payload = {
    name: input.name,
    archived: false,
    activity: [] as string[],
    created_at: new Date().toISOString(),
    cover_url: input.cover_url ?? null,
    deleted_at: null as string | null,
    sections: input.sections ?? [],
  };
  const docRef = await addDoc(projectsCol, payload);
  return { id: docRef.id, ...payload };
}

export async function updateProject(
  id: string,
  patch: Partial<Omit<Project, 'id' | 'sections'>>,
): Promise<void> {
  await updateDoc(doc(projectsCol, id), patch);
}

export async function deleteProject(id: string): Promise<void> {
  await deleteDoc(doc(projectsCol, id));
}

async function mutateSections(
  projectId: string,
  mutate: (sections: Section[]) => Section[],
): Promise<Section[]> {
  const docRef = doc(projectsCol, projectId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Project not found.');
  const current = (snap.data().sections ?? []) as Section[];
  const next = mutate(current);
  await updateDoc(docRef, { sections: next });
  return next;
}

export async function addSection(projectId: string, name: string): Promise<Section[]> {
  return mutateSections(projectId, (sections) => [
    ...sections,
    {
      id: uid(),
      position: sections.length,
      name,
      yarn_name: null,
      yarn_weight: null,
      yarn_colour: null,
      hook_size: null,
      rows: [],
    },
  ]);
}

export async function updateSection(
  projectId: string,
  sectionId: string,
  updates: Partial<Omit<Section, 'id' | 'rows'>>,
): Promise<Section[]> {
  return mutateSections(projectId, (sections) =>
    sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s)),
  );
}

export async function deleteSection(projectId: string, sectionId: string): Promise<Section[]> {
  return mutateSections(projectId, (sections) => sections.filter((s) => s.id !== sectionId));
}

export async function addRow(
  projectId: string,
  sectionId: string,
  data: { note: string | null; stitch_count: number | null },
): Promise<Section[]> {
  return mutateSections(projectId, (sections) =>
    sections.map((s) => {
      if (s.id !== sectionId) return s;
      const rowCount = s.rows.length;
      const title = rowCount === 0 ? 'Base' : `Row ${rowCount}`;
      const row: Row = {
        id: uid(),
        position: rowCount,
        title,
        note: data.note,
        stitch_count: data.stitch_count,
        done: false,
      };
      return { ...s, rows: [...s.rows, row] };
    }),
  );
}

export async function updateRow(
  projectId: string,
  sectionId: string,
  rowId: string,
  patch: Partial<Omit<Row, 'id'>>,
): Promise<Section[]> {
  return mutateSections(projectId, (sections) =>
    sections.map((s) =>
      s.id === sectionId
        ? { ...s, rows: s.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) }
        : s,
    ),
  );
}

export async function deleteRow(
  projectId: string,
  sectionId: string,
  rowId: string,
): Promise<Section[]> {
  return mutateSections(projectId, (sections) =>
    sections.map((s) =>
      s.id === sectionId ? { ...s, rows: s.rows.filter((r) => r.id !== rowId) } : s,
    ),
  );
}

export async function duplicateRow(
  projectId: string,
  sectionId: string,
  rowId: string,
): Promise<Section[]> {
  return mutateSections(projectId, (sections) =>
    sections.map((s) => {
      if (s.id !== sectionId) return s;
      const source = s.rows.find((r) => r.id === rowId);
      if (!source) return s;
      const insertPos = source.position + 1;
      const reindexed = s.rows.map((r) =>
        r.position >= insertPos ? { ...r, position: r.position + 1 } : r,
      );
      const newRow: Row = {
        id: uid(),
        position: insertPos,
        title: source.title,
        note: source.note,
        stitch_count: source.stitch_count,
        done: false,
      };
      const merged = [...reindexed, newRow].sort((a, b) => a.position - b.position);
      return { ...s, rows: merged };
    }),
  );
}

export async function reorderRows(
  projectId: string,
  sectionId: string,
  rows: Row[],
): Promise<Section[]> {
  return mutateSections(projectId, (sections) =>
    sections.map((s) => (s.id === sectionId ? { ...s, rows } : s)),
  );
}

export async function uploadCover(projectId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const storageRef = ref(storage, `pattern-covers/${projectId}/cover.${ext}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function deleteCover(coverUrl: string): Promise<void> {
  try {
    await deleteObject(ref(storage, coverUrl));
  } catch {
    // Cover file may already be gone; nothing to clean up.
  }
}
