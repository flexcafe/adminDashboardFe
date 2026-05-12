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
import { useMemo } from "react";
import type { Category, FlatCategory } from "./categoriesApi";
import {
  filterCategoryTree,
  flattenCategories,
} from "./categoriesApi";

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

function TreeChildDropZone({ categoryId }: { categoryId: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `child:${categoryId}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={isOver ? "categoryTreeChildZone active" : "categoryTreeChildZone"}
    >
      Drop to nest
    </div>
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
            {category.childCount === 0 ? "•" : isExpanded || searchActive ? "−" : "+"}
          </button>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(event) => {
              event.stopPropagation();
              onToggleSelect(category.id);
            }}
          />
          <span className="categoryTreeFolder" aria-hidden="true">
            📁
          </span>
          <div className="categoryTreeText">
            <span className="categoryTreeName">{category.name}</span>
            <span className="categoryTreeSlug">{category.slug || "No slug"}</span>
          </div>
        </div>

        <div className="categoryTreeRowActions">
          <span className="categoryTreeCountBadge">{category.productCount}</span>
          <button
            type="button"
            className={isDragging ? "categoryTreeDragHandle dragging" : "categoryTreeDragHandle"}
            {...attributes}
            {...listeners}
            onClick={(event) => event.stopPropagation()}
          >
            Drag
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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const searchActive = searchQuery.trim().length > 0;
  const filteredTree = useMemo(
    () => filterCategoryTree(categories, searchQuery),
    [categories, searchQuery]
  );
  const visibleTree = useMemo(() => {
    if (searchActive) return flattenCategories(filteredTree);

    const visit = (nodes: Category[], depth = 0, path: string[] = []): FlatCategory[] =>
      nodes.flatMap((node) => {
        const nextPath = [...path, node.id];
        const flatNode: FlatCategory = {
          ...node,
          depth,
          path: nextPath,
          childCount: node.children.length,
        };

        const children =
          expandedIds.includes(node.id)
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
          <p className="pageEyebrow">Categories</p>
          <h2 className="sectionTitle">Category Tree</h2>
          <p className="sectionDescription">
            Expand categories, drag items to reorder, or drop into the nest zone to move under a new parent.
          </p>
        </div>
      </div>

      <div className="categoriesTreeControls">
        <input
          type="search"
          className="authInput"
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <div className="categoriesTreeActions">
          <button type="button" className="verificationActionButton subtle" onClick={onExpandAll}>
            Expand All
          </button>
          <button type="button" className="verificationActionButton subtle" onClick={onCollapseAll}>
            Collapse All
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
            <span>Select visible</span>
          </label>
        </div>
      </div>

      {visibleTree.length === 0 ? (
        <div className="categoriesEmptyState">
          No categories found. Create your first category to start building the tree.
        </div>
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
