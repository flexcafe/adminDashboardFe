import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiLoadingState } from "@/components/ApiLoadingState";
import { CategoryDetails } from "@/features/categories/CategoryDetails";
import { CategoryFormModal } from "@/features/categories/CategoryFormModal";
import { CategoryTree } from "@/features/categories/CategoryTree";
import { DeleteConfirmModal } from "@/features/categories/DeleteConfirmModal";
import { savePageContext } from "@/features/aiAssistant/pageContextStore";
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

const getReorderChanges = (previousTree: Category[], nextTree: Category[]) => {
  const previousFlat = flattenCategories(previousTree);
  const nextFlat = flattenCategories(nextTree);
  const previousById = new Map(
    previousFlat.map((category) => [
      category.id,
      { parentId: category.parentId, sortOrder: category.sortOrder },
    ])
  );

  return nextFlat.filter((category) => {
    const previous = previousById.get(category.id);
    if (!previous) return true;
    return (
      previous.parentId !== category.parentId ||
      previous.sortOrder !== category.sortOrder
    );
  });
};

const persistReorderedCategories = async (
  previousTree: Category[],
  nextTree: Category[]
) => {
  const changedCategories = getReorderChanges(previousTree, nextTree);
  if (changedCategories.length === 0) return;

  await Promise.all(
    changedCategories.map((category) =>
      updateCategory(category.id, {
        parentId: category.parentId,
        sortOrder: category.sortOrder,
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
  const { t } = useTranslation();
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
          error instanceof Error ? error.message : t("categoriesPage.loadError")
        );
      } finally {
        setIsLoading(false);
      }
    },
    [t]
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
              : t("categoriesPage.detailsLoadError")
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
  }, [selectedId, t]);

  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);
  const filteredTree = useMemo(
    () => filterCategoryTree(categories, searchQuery),
    [categories, searchQuery]
  );
  const breadcrumbs = useMemo(
    () => getCategoryBreadcrumbs(categories, selectedId),
    [categories, selectedId]
  );
  const selectedCategoryFromTree = useMemo(
    () => findCategoryById(categories, selectedId),
    [categories, selectedId]
  );
  const parentName =
    selectedCategory && selectedCategory.parentId
      ? findCategoryById(categories, selectedCategory.parentId)?.name || ""
      : "";
  const inactiveCount = flatCategories.filter((category) => !category.isActive).length;
  const rootCount = categories.length;
  const availableCategoryIds = new Set(flatCategories.map((category) => category.id));

  useEffect(() => {
    const currentCategory = selectedCategoryFromTree ?? selectedCategory;
    const currentChildren = currentCategory?.children ?? [];

    savePageContext("/categories", {
      page: "categories",
      summary: {
        totalCategories: flatCategories.length,
        inactiveCategories: inactiveCount,
        rootCategories: rootCount,
      },
      selectedCategory: currentCategory
        ? {
            id: currentCategory.id,
            name: currentCategory.name,
            slug: currentCategory.slug,
            parentId: currentCategory.parentId,
            parentName:
              currentCategory.parentId
                ? findCategoryById(categories, currentCategory.parentId)?.name || null
                : null,
            isActive: currentCategory.isActive,
            productCount: currentCategory.productCount,
            sortOrder: currentCategory.sortOrder,
            childCount: currentChildren.length,
            directChildren: currentChildren.map((child) => ({
              id: child.id,
              name: child.name,
              slug: child.slug,
              isActive: child.isActive,
              productCount: child.productCount,
            })),
            breadcrumbs: breadcrumbs.map((item) => item.name),
          }
        : null,
      visibleCategoryNames: flatCategories.map((category) => category.name),
    });
  }, [
    breadcrumbs,
    categories,
    flatCategories,
    inactiveCount,
    rootCount,
    selectedCategory,
    selectedCategoryFromTree,
  ]);

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
        showToast(t("categoriesPage.createdToast"));
        setFormState({
          isOpen: false,
          mode: "create",
          category: null,
          parentId: null,
        });
        await loadCategories(createdId);
      } else if (formState.category) {
        await updateCategory(formState.category.id, payload);
        showToast(t("categoriesPage.updatedToast"));
        setFormState({
          isOpen: false,
          mode: "create",
          category: null,
          parentId: null,
        });
        await loadCategories(formState.category.id);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("categoriesPage.saveError");
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
      showToast(t("categoriesPage.deactivatedToast"));
      setDeleteTarget(null);
      if (selectedId === categoryId) {
        setSelectedCategory(null);
      }
      await loadCategories(selectedId === categoryId ? null : selectedId);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : t("categoriesPage.deactivateError")
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
    const sourceParentId = draggedCategory.parentId;
    const sourceSiblingGroup =
      sourceParentId === null
        ? categories
        : findCategoryById(categories, sourceParentId)?.children || [];
    const sourceIndex = sourceSiblingGroup.findIndex((item) => item.id === movedId);

    let nextCategories = categories;
    if (overId.startsWith("child:")) {
      const parentId = overId.replace("child:", "");
      if (parentId === movedId || descendantIds.includes(parentId)) {
        setPageError(t("categoriesPage.selfMoveError"));
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
      const targetIndex = siblingGroup.findIndex((item) => item.id === targetId);
      const insertIndex =
        sourceParentId === target.parentId &&
        sourceIndex >= 0 &&
        targetIndex > sourceIndex
          ? targetIndex - 1
          : targetIndex;
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
      await persistReorderedCategories(previousCategories, nextCategories);
      showToast(t("categoriesPage.reorderToast"));
      await loadCategories(selectedId);
    } catch (error) {
      setCategories(previousCategories);
      setPageError(
        error instanceof Error ? error.message : t("categoriesPage.moveError")
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

      showToast(t("categoriesPage.batchDeactivatedToast"));
      setSelectedIds([]);
      await loadCategories(selectedId);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : t("categoriesPage.batchDeactivateError")
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
      setPageError(t("categoriesPage.batchNestedError"));
      return;
    }

    const nextParentId = batchMoveParentId === "__root__" ? null : batchMoveParentId;

    if (nextParentId && !availableCategoryIds.has(nextParentId)) {
      setPageError(t("categoriesPage.invalidDestinationError"));
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
            parentId: nextParentId,
            sortOrder: destinationSiblingCount + index + 1,
          })
        )
      );
      showToast(t("categoriesPage.batchMovedToast"));
      setSelectedIds([]);
      setBatchMoveParentId("__root__");
      await loadCategories(selectedId);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : t("categoriesPage.batchMoveError")
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="page categoriesPage">
      <div className="pageHeader">
        <div>
          <p className="pageEyebrow">{t("categoriesPage.eyebrow")}</p>
          <h1 className="pageTitle">{t("categoriesPage.title")}</h1>
          <p className="pageDescription">{t("categoriesPage.description")}</p>
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
            {isLoading ? t("categoriesPage.refreshing") : t("common.refresh")}
          </button>
          <button type="button" className="verificationActionButton subtle" onClick={() => exportCategories("json")}>
            <DownloadIcon />
            <span>{t("categoriesPage.exportJson")}</span>
          </button>
          <button type="button" className="verificationActionButton subtle" onClick={() => exportCategories("csv")}>
            <DownloadIcon />
            <span>{t("categoriesPage.exportCsv")}</span>
          </button>
          <button
            type="button"
            className="verificationActionButton"
            onClick={() => {
              setModalError(null);
              setFormState({
                isOpen: true,
                mode: "create",
                category: null,
                parentId: null,
              });
            }}
          >
            <PlusIcon />
            <span>{t("categoriesPage.createCategory")}</span>
          </button>
        </div>
      </div>

      <div className="categoriesSummaryGrid">
        <div className="metricCard rewardsSummaryCard">
          <div className="rewardsSummaryIcon rewardsSummaryIconIndigo">
            <BatchIcon />
          </div>
          <div className="metricLabel">{t("categoriesPage.totalCategories")}</div>
          <div className="metricValue">{flatCategories.length}</div>
          <div className="metricMeta">
            {t("categoriesPage.totalCategoriesMeta")}
          </div>
        </div>
        <div className="metricCard rewardsSummaryCard">
          <div className="rewardsSummaryIcon rewardsSummaryIconRose">
            <BatchIcon />
          </div>
          <div className="metricLabel">{t("categoriesPage.inactive")}</div>
          <div className="metricValue">{inactiveCount}</div>
          <div className="metricMeta">{t("categoriesPage.inactiveMeta")}</div>
        </div>
        <div className="metricCard rewardsSummaryCard">
          <div className="rewardsSummaryIcon rewardsSummaryIconSky">
            <LayersIcon />
          </div>
          <div className="metricLabel">{t("categoriesPage.rootGroups")}</div>
          <div className="metricValue">{rootCount}</div>
          <div className="metricMeta">{t("categoriesPage.rootGroupsMeta")}</div>
        </div>
      </div>

      {selectedIds.length > 0 ? (
        <div className="card categoriesBatchPanel">
          <div className="categoriesBatchHeader">
            <div>
              <div className="sectionTitle">{t("categoriesPage.batchActions")}</div>
              <p className="sectionDescription">
                {t("categoriesPage.batchDescription", {
                  count: selectedIds.length,
                })}
              </p>
            </div>
            <div className="categoriesBatchActions">
              <label className="categoriesBatchSelect">
                <span className="authLabel">{t("categoriesPage.destination")}</span>
                <select
                  className="authInput"
                  value={batchMoveParentId}
                  onChange={(event) => setBatchMoveParentId(event.target.value)}
                >
                  <option value="__root__">{t("categoriesPage.moveToRoot")}</option>
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
                {t("categoriesPage.moveSelected")}
              </button>
              <button
                type="button"
                className="verificationActionButton subtle danger"
                disabled={isSaving || selectedIds.length === 0}
                onClick={() => {
                  void handleBatchDeactivate();
                }}
              >
                {t("categoriesPage.deactivateSelected")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pageError ? <p className="authError surfaceMessage">{pageError}</p> : null}

      {isLoading && categories.length === 0 ? (
        <div className="card">
          <ApiLoadingState
            label={t("categoriesPage.loading", {
              defaultValue: "Loading categories…",
            })}
          />
        </div>
      ) : (
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
      )}

      <p className="rewardsLastUpdated">
        {t("categoriesPage.lastUpdated", { time: lastUpdated })}
      </p>
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
          setFormState({
            isOpen: false,
            mode: "create",
            category: null,
            parentId: null,
          });
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
