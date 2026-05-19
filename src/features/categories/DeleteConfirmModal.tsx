import { Trans, useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  if (!category) return null;

  return (
    <div className="sliderModalOverlay" role="presentation" onClick={onClose}>
      <div className="sliderConfirmDialog" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <h2 className="sectionTitle">{t("categoryDelete.title")}</h2>
        <p className="sectionDescription">
          <Trans
            i18nKey="categoryDelete.description"
            values={{ name: category.name }}
            components={{ strong: <strong /> }}
          />
        </p>
        {descendantNames.length > 0 ? (
          <div className="categoriesDeleteWarning">
            <div className="authError">{t("categoryDelete.childrenWarning")}</div>
            <ul className="categoriesDeleteList">
              {descendantNames.slice(0, 8).map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="sliderModalActions">
          <button type="button" className="verificationActionButton subtle" onClick={onClose} disabled={isDeleting}>
            {t("common.cancel")}
          </button>
          <button type="button" className="verificationActionButton danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? t("categoryDelete.deactivating") : t("categoryDetails.deactivate")}
          </button>
        </div>
      </div>
    </div>
  );
}
