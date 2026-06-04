import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Category, FlatCategory } from "./categoriesApi";
import { filterCategoryTree, flattenCategories } from "./categoriesApi";

type CategoryTreeProps = {
  categories: Category[];
  selectedId: string | null;
  selectedIds: string[];
  expandedIds: string[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onToggleExpand: (categoryId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onSelect: (categoryId: string) => void;
  onToggleSelect: (categoryId: string) => void;
  onSelectAllVisible: (categoryIds: string[]) => void;
  onClearSelection: () => void;
  onDragEnd: (result: { sourceId: string; overId: string }) => void;
};

type TreeRowProps = {
  category: FlatCategory;
  isExpanded: boolean;
  isSelected: boolean;
  isChecked: boolean;
  searchActive: boolean;
  onSelect: (categoryId: string) => void;
  onToggleExpand: (categoryId: string) => void;
  onToggleSelect: (categoryId: string) => void;
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={expanded ? "m6 15 6-6 6 6" : "m9 6 6 6-6 6"} />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" />
    </svg>
  );
}

function DragIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="7" r="1.2" />
      <circle cx="15" cy="7" r="1.2" />
      <circle cx="9" cy="12" r="1.2" />
      <circle cx="15" cy="12" r="1.2" />
      <circle cx="9" cy="17" r="1.2" />
      <circle cx="15" cy="17" r="1.2" />
    </svg>
  );
}

function TreeChildDropZone({ categoryId }: { categoryId: string }) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({
    id: `child:${categoryId}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={isOver ? "categoryTreeChildZone active" : "categoryTreeChildZone"}
    >
      {t("categoryTree.dropInside")}
    </div>
  );
}

function TreeRowImage({
  imageCandidates,
  fallbackLabel,
}: {
  imageCandidates: string[];
  fallbackLabel: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const currentImageSrc = imageCandidates[imageIndex] || "";

  if (imageCandidates.length === 0) {
    return (
      <span className="categoryTreeFolder" aria-hidden="true">
        <FolderIcon />
      </span>
    );
  }

  return (
    <span className="categoryTreeImageWrap" aria-hidden="true">
      {imageFailed ? (
        <span className="categoryTreeImageFallback">
          <FolderIcon />
        </span>
      ) : (
        <img
          className="categoryTreeImage"
          src={currentImageSrc}
          alt={fallbackLabel}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            if (imageIndex < imageCandidates.length - 1) {
              setImageIndex((current) => current + 1);
              return;
            }
            setImageFailed(true);
          }}
        />
      )}
    </span>
  );
}

function TreeRow({
  category,
  isExpanded,
  isSelected,
  isChecked,
  searchActive,
  onSelect,
  onToggleExpand,
  onToggleSelect,
}: TreeRowProps) {
  const { t } = useTranslation();
  const imageCandidates = useMemo(() => {
    const candidates = [category.iconUrl, category.imageUrl]
      .map((value) => value.trim())
      .filter(Boolean);
    return Array.from(new Set(candidates));
  }, [category.iconUrl, category.imageUrl]);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `row:${category.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="categoryTreeRowWrap">
      <div
        className={
          isSelected
            ? category.isActive
              ? "categoryTreeRow active"
              : "categoryTreeRow active inactive"
            : category.isActive
              ? "categoryTreeRow"
              : "categoryTreeRow inactive"
        }
        onClick={() => onSelect(category.id)}
      >
        <div className="categoryTreeRowLead" style={{ paddingLeft: `${category.depth * 18}px` }}>
          <button
            type="button"
            className="categoryTreeExpandButton"
            onClick={(event) => {
              event.stopPropagation();
              onToggleExpand(category.id);
            }}
            disabled={category.childCount === 0 || searchActive}
          >
            {category.childCount === 0 ? <span className="categoryTreeExpandDot" /> : <ChevronIcon expanded={isExpanded || searchActive} />}
          </button>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(event) => {
              event.stopPropagation();
              onToggleSelect(category.id);
            }}
          />
          <TreeRowImage
            key={`${category.id}-${imageCandidates.join("|")}`}
            imageCandidates={imageCandidates}
            fallbackLabel=""
          />
          <div className="categoryTreeText">
            <span className="categoryTreeName">{category.name}</span>
            <span className="categoryTreeSlug">
              {category.slug || t("categoryTree.noSlug")}
            </span>
          </div>
        </div>

        <div className="categoryTreeRowActions">
          <span className="categoryTreeCountBadge">{category.productCount}</span>
          <button
            type="button"
            className={isDragging ? "categoryTreeDragHandle dragging" : "categoryTreeDragHandle"}
            aria-label={t("categoryTree.reorder", { name: category.name })}
            {...attributes}
            {...listeners}
            onClick={(event) => event.stopPropagation()}
          >
            <DragIcon />
          </button>
        </div>
      </div>
      <TreeChildDropZone categoryId={category.id} />
    </div>
  );
}

export function CategoryTree({
  categories,
  selectedId,
  selectedIds,
  expandedIds,
  searchQuery,
  onSearchChange,
  onToggleExpand,
  onExpandAll,
  onCollapseAll,
  onSelect,
  onToggleSelect,
  onSelectAllVisible,
  onClearSelection,
  onDragEnd,
}: CategoryTreeProps) {
  const { t } = useTranslation();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );
  const searchActive = searchQuery.trim().length > 0;
  const filteredTree = useMemo(
    () => filterCategoryTree(categories, searchQuery),
    [categories, searchQuery]
  );
  const visibleTree = useMemo(() => {
    if (searchActive) return flattenCategories(filteredTree);

    const visit = (
      nodes: Category[],
      depth = 0,
      path: string[] = []
    ): FlatCategory[] =>
      nodes.flatMap((node) => {
        const nextPath = [...path, node.id];
        const flatNode: FlatCategory = {
          ...node,
          depth,
          path: nextPath,
          childCount: node.children.length,
        };

        const children = expandedIds.includes(node.id)
          ? visit(node.children, depth + 1, nextPath)
          : [];

        return [flatNode, ...children];
      });

    return visit(filteredTree);
  }, [expandedIds, filteredTree, searchActive]);

  const rowIds = visibleTree.map((category) => `row:${category.id}`);
  const allVisibleSelected =
    visibleTree.length > 0 &&
    visibleTree.every((category) => selectedIds.includes(category.id));
  const activeVisibleCount = visibleTree.filter((category) => category.isActive).length;

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over?.id) return;
    onDragEnd({
      sourceId: String(event.active.id),
      overId: String(event.over.id),
    });
  };

  return (
    <section className="card categoriesTreePanel">
      <div className="categoriesTreeHeader">
        <div>
          <p className="pageEyebrow">{t("categoriesPage.eyebrow")}</p>
          <h2 className="sectionTitle">{t("categoryTree.title")}</h2>
          <p className="sectionDescription">{t("categoryTree.description")}</p>
        </div>
      </div>

      <div className="categoriesTreeControls">
        <label className="categoriesSearchField">
          <span className="categoriesSearchIcon">
            <SearchIcon />
          </span>
          <input
            type="search"
            className="authInput categoriesSearchInput"
            placeholder={t("categoryTree.searchPlaceholder")}
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        <div className="categoriesTreeStats">
          <span className="inlineBadge">
            {t("categoryTree.visible", { count: visibleTree.length })}
          </span>
          <span className="inlineBadge">
            {t("categoryTree.active", { count: activeVisibleCount })}
          </span>
          <span className="inlineBadge">
            {t("categoryTree.selected", { count: selectedIds.length })}
          </span>
        </div>
        <div className="categoriesTreeActions">
          <button type="button" className="verificationActionButton subtle" onClick={onExpandAll}>
            {t("categoryTree.expandAll")}
          </button>
          <button type="button" className="verificationActionButton subtle" onClick={onCollapseAll}>
            {t("categoryTree.collapseAll")}
          </button>
        </div>
        <div className="categoriesTreeBulkBar">
          <label className="categoriesTreeSelectAll">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={(event) =>
                event.target.checked
                  ? onSelectAllVisible(visibleTree.map((category) => category.id))
                  : onClearSelection()
              }
            />
            <span>{t("categoryTree.selectVisible")}</span>
          </label>
          {searchActive ? (
            <span className="categoriesTreeHint">{t("categoryTree.searchHint")}</span>
          ) : null}
        </div>
      </div>

      {visibleTree.length === 0 ? (
        <div className="categoriesEmptyState">{t("categoryTree.empty")}</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
            <div className="categoryTreeList">
              {visibleTree.map((category) => (
                <TreeRow
                  key={category.id}
                  category={category}
                  isExpanded={expandedIds.includes(category.id)}
                  isSelected={selectedId === category.id}
                  isChecked={selectedIds.includes(category.id)}
                  searchActive={searchActive}
                  onSelect={onSelect}
                  onToggleExpand={onToggleExpand}
                  onToggleSelect={onToggleSelect}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
