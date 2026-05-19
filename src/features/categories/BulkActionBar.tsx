import type { Category } from "./categoriesApi";

type BulkActionBarProps = {
  count: number;
  parentOptions: Category[];
  parentId: string;
  onParentChange: (value: string) => void;
  onChangeParent: () => void;
  onDelete: () => void;
  onSetActive: () => void;
  onSetInactive: () => void;
  onSetVisible: () => void;
  onSetHidden: () => void;
};

export function BulkActionBar({
  count,
  parentOptions,
  parentId,
  onParentChange,
  onChangeParent,
  onDelete,
  onSetActive,
  onSetInactive,
  onSetVisible,
  onSetHidden,
}: BulkActionBarProps) {
  return (
    <div className="fixed bottom-4 left-1/2 z-40 flex w-[min(1100px,calc(100%-2rem))] -translate-x-1/2 flex-col gap-4 rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-900">
          {count} categories selected
        </p>
        <p className="text-sm text-slate-500">
          Bulk actions apply only to the currently visible selection.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-2">
          <select
            value={parentId}
            onChange={(event) => onParentChange(event.target.value)}
            className="min-w-40 bg-transparent px-2 text-sm text-slate-700 outline-none"
          >
            <option value="">Select new parent</option>
            <option value="__root__">Root</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onChangeParent}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Change parent
          </button>
        </div>

        <button
          type="button"
          onClick={onSetActive}
          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Set active
        </button>
        <button
          type="button"
          onClick={onSetInactive}
          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Set inactive
        </button>
        <button
          type="button"
          onClick={onSetVisible}
          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Set visible
        </button>
        <button
          type="button"
          onClick={onSetHidden}
          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Set hidden
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
        >
          Delete selected
        </button>
      </div>
    </div>
  );
}

