import { Copy, Eye, EyeOff, Link2, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Category } from "./categoriesApi";
import type { CategoryDraft, SaveState } from "./types";

type CategoryEditFormProps = {
  category: Category | null;
  draft: CategoryDraft;
  parentOptions: Category[];
  breadcrumbs: Category[];
  saveState: SaveState;
  onDraftChange: (updates: Partial<CategoryDraft>) => void;
  onSelectBreadcrumb: (id: string) => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export function CategoryEditForm({
  category,
  draft,
  parentOptions,
  breadcrumbs,
  saveState,
  onDraftChange,
  onSelectBreadcrumb,
  onCancel,
  onSave,
  onDelete,
}: CategoryEditFormProps) {
  const [parentSearch, setParentSearch] = useState("");

  const filteredParents = useMemo(() => {
    const query = parentSearch.trim().toLowerCase();
    if (!query) return parentOptions;
    return parentOptions.filter((option) =>
      `${option.name} ${option.slug}`.toLowerCase().includes(query)
    );
  }, [parentOptions, parentSearch]);

  if (!category) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center rounded-[32px] border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="max-w-sm">
          <h3 className="text-xl font-semibold text-slate-900">
            Select a category to edit
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Choose a category from the tree to open the form and manage hierarchy, metadata, and visibility.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        {breadcrumbs.map((crumb, index) => (
          <button
            key={crumb.id}
            type="button"
            onClick={() => onSelectBreadcrumb(crumb.id)}
            className="inline-flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <span>{crumb.name}</span>
            {index < breadcrumbs.length - 1 ? <span>&gt;</span> : null}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {category.name}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={draft.isActive ? "inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700" : "inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"}>
              {draft.isActive ? "Active" : "Inactive"}
            </span>
            <span className={draft.isVisible ? "inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700" : "inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500"}>
              {draft.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {draft.isVisible ? "Visible" : "Hidden"}
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {category.productCount} products
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Updated {formatDate(category.updatedAt)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
          {saveState === "saving"
            ? "Saving..."
            : saveState === "saved"
              ? "Saved"
              : saveState === "dirty"
                ? "Unsaved changes"
                : "Up to date"}
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Name
          </span>
          <input
            value={draft.name}
            onChange={(event) => onDraftChange({ name: event.target.value })}
            className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Slug
          </span>
          <input
            value={draft.slug}
            onChange={(event) => onDraftChange({ slug: event.target.value })}
            className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
          />
        </label>

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Parent Category
          </span>
          <input
            value={parentSearch}
            onChange={(event) => setParentSearch(event.target.value)}
            placeholder="Search parent path"
            className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
          />
          <select
            value={draft.parentId}
            onChange={(event) => onDraftChange({ parentId: event.target.value })}
            className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
          >
            <option value="">Root</option>
            {filteredParents.map((option) => (
              <option key={option.id} value={option.id}>
                {option.parentId ? `${option.parentId} > ${option.name}` : option.name}
              </option>
            ))}
          </select>
        </div>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Display Order
          </span>
          <input
            type="number"
            min={1}
            value={draft.sortOrder}
            onChange={(event) => onDraftChange({ sortOrder: event.target.value })}
            className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
          />
        </label>

        <div className="lg:col-span-2">
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Image URL
            </span>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_120px]">
              <div className="flex gap-2">
                <input
                  value={draft.imageUrl}
                  onChange={(event) => onDraftChange({ imageUrl: event.target.value })}
                  className="h-12 flex-1 rounded-2xl border border-slate-200 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(draft.imageUrl);
                  }}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>
              <div className="flex h-28 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {draft.imageUrl ? (
                  <img
                    src={draft.imageUrl}
                    alt={draft.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Link2 className="h-6 w-6 text-slate-300" />
                )}
              </div>
            </div>
          </div>
        </div>

        <label className="space-y-2 lg:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Description
          </span>
          <textarea
            rows={3}
            value={draft.description}
            onChange={(event) => onDraftChange({ description: event.target.value })}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400"
          />
        </label>
      </div>

      <div className="mt-8 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          <Save className="h-4 w-4" />
          Save
        </button>
      </div>
    </div>
  );
}

