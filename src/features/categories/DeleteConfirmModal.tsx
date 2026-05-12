import type { Category } from "./categoriesApi";

type DeleteConfirmModalProps = {
  category: Category | null;
  descendantNames: string[];
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmModal({
  category,
  descendantNames,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!category) return null;

  return (
    <div className="sliderModalOverlay" role="presentation" onClick={onClose}>
      <div className="sliderConfirmDialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2 className="sectionTitle">Deactivate Category</h2>
        <p className="sectionDescription">
          Deactivating <strong>{category.name}</strong> will soft-delete it and make it unavailable for new products.
        </p>
        {descendantNames.length > 0 ? (
          <div className="categoriesDeleteWarning">
            <div className="authError">
              This category has child categories. The API may reject the request until children are moved or deactivated first.
            </div>
            <ul className="categoriesDeleteList">
              {descendantNames.slice(0, 8).map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="sliderModalActions">
          <button type="button" className="verificationActionButton subtle" onClick={onClose} disabled={isDeleting}>
            Cancel
          </button>
          <button type="button" className="verificationActionButton danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Deactivating..." : "Deactivate"}
          </button>
        </div>
      </div>
    </div>
  );
}
