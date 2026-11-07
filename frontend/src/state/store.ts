import { create } from "zustand";
import type { Project, Curve } from "../mathematics/types";
import {
  freshProject,
  newCurve,
  parseProject,
  validateProject,
} from "./project";
export const storageKey = "mathverse-x:project:v1";
let initial = freshProject(),
  startupWarning = "";
try {
  const saved = localStorage.getItem(storageKey);
  if (saved) initial = parseProject(saved);
} catch {
  startupWarning =
    "Could not restore the saved project. A new workspace was opened.";
}
interface WorkspaceState {
  project: Project;
  past: Project[];
  future: Project[];
  warning: string;
  update: (patch: Partial<Project>, history?: boolean) => void;
  curve: (id: string, patch: Partial<Curve>) => void;
  add: () => void;
  remove: (id: string) => void;
  replace: (project: Project) => void;
  undo: () => void;
  redo: () => void;
  clearWarning: () => void;
}
export const useWorkspace = create<WorkspaceState>((set, get) => ({
  project: initial,
  past: [],
  future: [],
  warning: startupWarning,
  update: (patch, history = true) =>
    set((s) => ({
      project: { ...s.project, ...patch },
      past: history ? [...s.past, s.project].slice(-80) : s.past,
      future: history ? [] : s.future,
    })),
  curve: (id, patch) =>
    get().update({
      curves: get().project.curves.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    }),
  add: () => {
    const p = get().project;
    if (p.curves.length >= 20) {
      set({ warning: "Maximum of 20 curves reached." });
      return;
    }
    const c = newCurve(p.curves.length);
    get().update({ curves: [...p.curves, c], selectedId: c.id });
  },
  remove: (id) => {
    const p = get().project,
      curves = p.curves.filter((c) => c.id !== id);
    get().update({
      curves,
      selectedId: p.selectedId === id ? (curves[0]?.id ?? "") : p.selectedId,
    });
  },
  replace: (project) => {
    const valid = validateProject(project);
    get().update(valid);
  },
  undo: () =>
    set((s) =>
      s.past.length
        ? {
            project: s.past[s.past.length - 1],
            past: s.past.slice(0, -1),
            future: [s.project, ...s.future].slice(0, 80),
          }
        : {},
    ),
  redo: () =>
    set((s) =>
      s.future.length
        ? {
            project: s.future[0],
            past: [...s.past, s.project].slice(-80),
            future: s.future.slice(1),
          }
        : {},
    ),
  clearWarning: () => set({ warning: "" }),
}));
