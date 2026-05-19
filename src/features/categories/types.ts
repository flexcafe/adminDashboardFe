import type { Category, FlatCategory } from "./categoriesApi";

export type CategoryFilter =
  | "all"
  | "with-products"
  | "empty"
  | "active"
  | "visible";

export type SaveState = "idle" | "dirty" | "saving" | "saved";

export type FilterChip = {
  key: CategoryFilter;
  label: string;
  count: number;
};

export type CategoryDraft = {
  name: string;
  slug: string;
  parentId: string;
  imageUrl: string;
  description: string;
  sortOrder: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  isActive: boolean;
  isVisible: boolean;
};

export type BulkAction =
  | "set-active"
  | "set-inactive"
  | "set-visible"
  | "set-hidden"
  | "change-parent"
  | "delete";

export type BulkActionOption = {
  value: BulkAction;
  label: string;
};

export type UndoToastState = {
  message: string;
  onUndo: () => void;
};

export type PendingUndoState = {
  timeoutId: number;
  previousTree: Category[];
  previousSelectedId: string | null;
  previousSelectedIds: string[];
  commit: () => Promise<void>;
};

export type CategoryTreeItem = FlatCategory;

