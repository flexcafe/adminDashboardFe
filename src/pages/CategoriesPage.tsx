import { useCallback, useEffect, useMemo, useState } from "react";
import { CategoryDetails } from "@/features/categories/CategoryDetails";
import { CategoryFormModal } from "@/features/categories/CategoryFormModal";
import { CategoryTree } from "@/features/categories/CategoryTree";
import { DeleteConfirmModal } from "@/features/categories/DeleteConfirmModal";
import {
  collectDescendantIds,
  createCategory,
  deleteCategory,
  filterCategoryTree,
  findCategoryById,
  flattenCategories,
  getAllCategoryIds,
  getCategory,
  getCategoryBreadcrumbs,
  listCategories,
  moveCategoryTree,
  type Category,
  type CategoryPayload,
  updateCategory,
} from "@/features/categories/categoriesApi";

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function BatchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="7" height="7" rx="1.5" />
      <rect x="14" y="4" width="7" height="7" rx="1.5" />
      <rect x="8.5" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 9 4.5-9 4.5-9-4.5 9-4.5Z" />
      <path d="m3 12 9 4.5 9-4.5" />
      <path d="m3 16.5 9 4.5 9-4.5" />
    </svg>
  );
}

const persistCategoryTree = async (nextTree: Category[]) => {
  const flat = flattenCategories(nextTree);
  await Promise.all(
    flat.map((category) =>
      updateCategory(category.id, {
        name: category.name,
        slug: category.slug,
        parentId: category.parentId,
        sortOrder: category.sortOrder,
        icon: category.iconUrl,
      })
    )
  );
};

const buildCsv = (categories: Category[]) => {
  const rows = flattenCategories(categories).map((category) => [
    category.id,
    category.name,
    category.slug,
    category.parentId || "",
    String(category.sortOrder),
    category.isActive ? "active" : "inactive",
    String(category.productCount),
  ]);

  return [
    ["id", "name", "slug", "parentId", "sortOrder", "status", "productCount"].join(","),
    ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
};

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    category: Category | null;
    parentId: string | null;
  }>({
    isOpen: false,
    mode: "create",
    category: null,
    parentId: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [batchMoveParentId, setBatchMoveParentId] = useState("__root__");
  const [lastUpdated, setLastUpdated] = useState("--");

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2200);
  }, []);

  const loadCategories = useCallback(
    async (preferredSelectionId?: string | null) => {
      try {
        setIsLoading(true);
        setPageError(null);
        const nextCategories = await listCategories(true);
        setCategories(nextCategories);

        const allIds = getAllCategoryIds(nextCategories);
        setExpandedIds((current) =>
          current.length > 0
            ? current.filter((id) => allIds.includes(id))
            : nextCategories.map((category) => category.id)
        );

        setSelectedId((current) => {
          if (preferredSelectionId && allIds.includes(preferredSelectionId)) {
            return preferredSelectionId;
          }
          if (current && allIds.includes(current)) {
            return current;
          }
          return nextCategories[0]?.id || null;
        });

        setSelectedIds((current) => current.filter((id) => allIds.includes(id)));
        setLastUpdated(
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      } catch (error) {
        setPageError(
          error instanceof Error ? error.message : "Failed to load categories."
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedCategory(null);
      return;
    }

    let isActive = true;

    const guardedRun = async () => {
      try {
        setIsDetailsLoading(true);
        setPageError(null);
        const details = await getCategory(selectedId);
        if (isActive) {
          setSelectedCategory(details);
        }
      } catch (error) {
        if (isActive) {
          setPageError(
            error instanceof Error
              ? error.message
              : "Failed to load category details."
          );
        }
      } finally {
        if (isActive) {
          setIsDetailsLoading(false);
        }
      }
    };

    void guardedRun();

    return () => {
      isActive = false;
    };
  }, [selectedId]);

  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);
  const filteredTree = useMemo(
    () => filterCategoryTree(categories, searchQuery),
    [categories, searchQuery]
  );
  const breadcrumbs = useMemo(
    () => getCategoryBreadcrumbs(categories, selectedId),
    [categories, selectedId]
  );
  const parentName =
    selectedCategory && selectedCategory.parentId
      ? findCategoryById(categories, selectedCategory.parentId)?.name || ""
      : "";
  const inactiveCount = flatCategories.filter((category) => !category.isActive).length;
  const rootCount = categories.length;
  const availableCategoryIds = new Set(flatCategories.map((category) => category.id));

  const handleFormSubmit = async (payload: CategoryPayload) => {
    try {
      setIsSaving(true);
      setModalError(null);
      setPageError(null);

      if (formState.mode === "create") {
        const response = await createCategory(payload);
        const createdId =
          typeof response.data === "object" && response.data
            ? "id" in response.data
              ? String((response.data as { id: string }).id)
              : "categoryId" in response.data
                ? String((response.data as { categoryId: string }).categoryId)
                : "_id" in response.data
                  ? String((response.data as { _id: string })._id)
                  : null
            : null;
        showToast("Category created.");
        setFormState({ isOpen: false, mode: "create", category: null, parentId: null });
        await loadCategories(createdId);
      } else if (formState.category) {
        await updateCategory(formState.category.id, payload);
        showToast("Category updated.");
        setFormState({ isOpen: false, mode: "create", category: null, parentId: null });
        await loadCategories(formState.category.id);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save category.";
      setPageError(message);
      setModalError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    try {
      setIsSaving(true);
      setPageError(null);
      await deleteCategory(categoryId);
      showToast("Category deactivated.");
      setDeleteTarget(null);
      if (selectedId === categoryId) {
        setSelectedCategory(null);
      }
      await loadCategories(selectedId === categoryId ? null : selectedId);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to deactivate category."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleTreeDragEnd = async ({
    sourceId,
    overId,
  }: {
    sourceId: string;
    overId: string;
  }) => {
    const movedId = sourceId.replace("row:", "");
    const draggedCategory = findCategoryById(categories, movedId);
    if (!draggedCategory) return;

    const descendantIds = collectDescendantIds(draggedCategory);
    const previousCategories = categories;

    let nextCategories = categories;
    if (overId.startsWith("child:")) {
      const parentId = overId.replace("child:", "");
      if (parentId === movedId || descendantIds.includes(parentId)) {
        setPageError("A category cannot be moved into itself or its own descendant.");
        return;
      }
      const parent = findCategoryById(categories, parentId);
      const insertIndex = parent?.children.length ?? 0;
      nextCategories = moveCategoryTree(categories, movedId, parentId, insertIndex);
    } else if (overId.startsWith("row:")) {
      const targetId = overId.replace("row:", "");
      if (targetId === movedId) return;
      const target = findCategoryById(categories, targetId);
      if (!target) return;
      const siblingGroup =
        target.parentId === null
          ? categories
          : findCategoryById(categories, target.parentId)?.children || [];
      const insertIndex = siblingGroup.findIndex((item) => item.id === targetId);
      nextCategories = moveCategoryTree(
        categories,
        movedId,
        target.parentId,
        insertIndex >= 0 ? insertIndex : siblingGroup.length
      );
    }

    setCategories(nextCategories);

    try {
      setIsSaving(true);
      setPageError(null);
      await persistCategoryTree(nextCategories);
      showToast("Category order updated.");
      await loadCategories(selectedId);
    } catch (error) {
      setCategories(previousCategories);
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to move category."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const selectedBatchCategories = flatCategories.filter((category) =>
    selectedIds.includes(category.id)
  );
  const invalidBatchParentIds = new Set<string>(selectedIds);
  selectedBatchCategories.forEach((category) => {
    collectDescendantIds(category).forEach((id) => invalidBatchParentIds.add(id));
  });

  const batchParentOptions = flatCategories.filter(
    (category) => !invalidBatchParentIds.has(category.id)
  );

  const exportCategories = (format: "json" | "csv") => {
    const content =
      format === "json"
        ? JSON.stringify(categories, null, 2)
        : buildCsv(categories);
    const blob = new Blob([content], {
      type: format === "json" ? "application/json" : "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `categories-export.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleBatchDeactivate = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsSaving(true);
      setPageError(null);

      const categoriesToDeactivate = [...selectedBatchCategories].sort(
        (a, b) => b.depth - a.depth || b.sortOrder - a.sortOrder
      );

      for (const category of categoriesToDeactivate) {
        await deleteCategory(category.id);
      }

      showToast("Selected categories deactivated.");
      setSelectedIds([]);
      await loadCategories(selectedId);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to deactivate selected categories."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleBatchMove = async () => {
    if (selectedIds.length === 0) return;

    const hasNestedSelection = selectedBatchCategories.some((category) =>
      collectDescendantIds(category).some((id) => selectedIds.includes(id))
    );

    if (hasNestedSelection) {
      setPageError(
        "Batch move does not support selecting a category together with one of its descendants."
      );
      return;
    }

    const nextParentId = batchMoveParentId === "__root__" ? null : batchMoveParentId;

    if (nextParentId && !availableCategoryIds.has(nextParentId)) {
      setPageError("Choose a valid destination category for the batch move.");
      return;
    }

    try {
      setIsSaving(true);
      setPageError(null);
      const destinationSiblingCount = flatCategories.filter(
        (category) =>
          category.parentId === nextParentId &&
          !selectedIds.includes(category.id)
      ).length;

      await Promise.all(
        selectedBatchCategories.map((category, index) =>
          updateCategory(category.id, {
            name: category.name,
            slug: category.slug,
            parentId: nextParentId,
            sortOrder: destinationSiblingCount + index + 1,
            icon: category.iconUrl,
          })
        )
      );
      showToast("Selected categories moved.");
      setSelectedIds([]);
      setBatchMoveParentId("__root__");
      await loadCategories(selectedId);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to move selected categories."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="page categoriesPage">
      <div className="pageHeader">
        <div>
          <p className="pageEyebrow">Categories</p>
          <h1 className="pageTitle">Category Management</h1>
          <p className="pageDescription">
            Manage category hierarchy, reorder navigation, and review category metadata in one workspace.
          </p>
        </div>
        <div className="pageHeaderActions">
          <button
            type="button"
            className="verificationActionButton subtle"
            onClick={() => {
              void loadCategories(selectedId);
            }}
            disabled={isLoading || isSaving}
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button type="button" className="verificationActionButton subtle" onClick={() => exportCategories("json")}>
            <DownloadIcon />
            <span>Export JSON</span>
          </button>
          <button type="button" className="verificationActionButton subtle" onClick={() => exportCategories("csv")}>
            <DownloadIcon />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            className="verificationActionButton"
            onClick={() => {
              setModalError(null);
              setFormState({ isOpen: true, mode: "create", category: null, parentId: null });
            }}
          >
            <PlusIcon />
            <span>Create Category</span>
          </button>
        </div>
      </div>

      <div className="categoriesSummaryGrid">
        <div className="metricCard rewardsSummaryCard">
          <div className="rewardsSummaryIcon rewardsSummaryIconIndigo">
            <BatchIcon />
          </div>
          <div className="metricLabel">Total Categories</div>
          <div className="metricValue">{flatCategories.length}</div>
          <div className="metricMeta">All root and child categories in the hierarchy</div>
        </div>
        <div className="metricCard rewardsSummaryCard">
          <div className="rewardsSummaryIcon rewardsSummaryIconRose">
            <BatchIcon />
          </div>
          <div className="metricLabel">Inactive</div>
          <div className="metricValue">{inactiveCount}</div>
          <div className="metricMeta">Soft-deleted categories shown with grayed styling</div>
        </div>
        <div className="metricCard rewardsSummaryCard">
          <div className="rewardsSummaryIcon rewardsSummaryIconSky">
            <LayersIcon />
          </div>
          <div className="metricLabel">Root Groups</div>
          <div className="metricValue">{rootCount}</div>
          <div className="metricMeta">Top-level navigation groups visible in the category tree</div>
        </div>
      </div>

      {selectedIds.length > 0 ? (
        <div className="card categoriesBatchPanel">
          <div className="categoriesBatchHeader">
            <div>
              <div className="sectionTitle">Batch Actions</div>
              <p className="sectionDescription">
                {selectedIds.length} categories selected. Use batch deactivate or move selected categories under a new parent.
              </p>
            </div>
            <div className="categoriesBatchActions">
              <label className="categoriesBatchSelect">
                <span className="authLabel">Destination</span>
                <select
                  className="authInput"
                  value={batchMoveParentId}
                  onChange={(event) => setBatchMoveParentId(event.target.value)}
                >
                  <option value="__root__">Move to root</option>
                  {batchParentOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="verificationActionButton subtle"
                disabled={isSaving || selectedIds.length === 0}
                onClick={() => {
                  void handleBatchMove();
                }}
              >
                Move Selected
              </button>
              <button
                type="button"
                className="verificationActionButton subtle danger"
                disabled={isSaving || selectedIds.length === 0}
                onClick={() => {
                  void handleBatchDeactivate();
                }}
              >
                Deactivate Selected
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pageError ? <p className="authError surfaceMessage">{pageError}</p> : null}

      <div className="categoriesLayout">
        <CategoryTree
          categories={categories}
          selectedId={selectedId}
          selectedIds={selectedIds}
          expandedIds={expandedIds}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleExpand={(categoryId) =>
            setExpandedIds((current) =>
              current.includes(categoryId)
                ? current.filter((id) => id !== categoryId)
                : [...current, categoryId]
            )
          }
          onExpandAll={() => setExpandedIds(getAllCategoryIds(filteredTree))}
          onCollapseAll={() => setExpandedIds([])}
          onSelect={setSelectedId}
          onToggleSelect={(categoryId) =>
            setSelectedIds((current) =>
              current.includes(categoryId)
                ? current.filter((id) => id !== categoryId)
                : [...current, categoryId]
            )
          }
          onSelectAllVisible={setSelectedIds}
          onClearSelection={() => setSelectedIds([])}
          onDragEnd={({ sourceId, overId }) => {
            void handleTreeDragEnd({ sourceId, overId });
          }}
        />

        <CategoryDetails
          category={selectedCategory}
          parentName={parentName}
          breadcrumbs={breadcrumbs}
          isLoading={isDetailsLoading}
          onEdit={() => {
            if (!selectedCategory) return;
            setModalError(null);
            setFormState({
              isOpen: true,
              mode: "edit",
              category: selectedCategory,
              parentId: selectedCategory.parentId,
            });
          }}
          onDelete={() => setDeleteTarget(selectedCategory)}
          onCreateChild={() => {
            if (!selectedCategory) return;
            setModalError(null);
            setFormState({
              isOpen: true,
              mode: "create",
              category: null,
              parentId: selectedCategory.id,
            });
          }}
        />
      </div>

      <p className="rewardsLastUpdated">Last updated: today at {lastUpdated}</p>
      {toastMessage ? <div className="rewardsToast">{toastMessage}</div> : null}

      <CategoryFormModal
        key={`${formState.mode}-${formState.category?.id ?? "new"}-${formState.parentId ?? "root"}-${formState.isOpen ? "open" : "closed"}`}
        isOpen={formState.isOpen}
        mode={formState.mode}
        initialCategory={formState.category}
        parentId={formState.parentId}
        parentOptions={flatCategories}
        excludedParentIds={
          formState.category
            ? [formState.category.id, ...collectDescendantIds(formState.category)]
            : []
        }
        isSaving={isSaving}
        submitError={modalError}
        onClose={() => {
          setModalError(null);
          setFormState({ isOpen: false, mode: "create", category: null, parentId: null });
        }}
        onSubmit={handleFormSubmit}
      />

      <DeleteConfirmModal
        category={deleteTarget}
        descendantNames={collectDescendantIds(deleteTarget).map((id) => findCategoryById(categories, id)?.name || id)}
        isDeleting={isSaving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          void handleDelete(deleteTarget.id);
        }}
      />
    </section>
  );
}
