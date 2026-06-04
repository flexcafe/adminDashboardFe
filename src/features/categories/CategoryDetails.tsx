import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Category } from "./categoriesApi";

function CategoryDetailsMedia({
  mediaCandidates,
  imageUnavailableLabel,
  categoryImageAlt,
}: {
  mediaCandidates: string[];
  imageUnavailableLabel: string;
  categoryImageAlt: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const mediaUrl = mediaCandidates[imageIndex] || "";

  if (mediaCandidates.length === 0) return null;

  return (
    <div className="categoriesDetailsMedia">
      {imageFailed ? (
        <div className="categoriesDetailsImageFallback">
          {imageUnavailableLabel}
        </div>
      ) : (
        <img
          className="categoriesDetailsImage"
          src={mediaUrl}
          alt={categoryImageAlt}
          referrerPolicy="no-referrer"
          onError={() => {
            if (imageIndex < mediaCandidates.length - 1) {
              setImageIndex((current) => current + 1);
              return;
            }
            setImageFailed(true);
          }}
        />
      )}
    </div>
  );
}

type CategoryDetailsProps = {
  category: Category | null;
  parentName: string;
  breadcrumbs: Category[];
  isLoading: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onCreateChild: () => void;
};

export function CategoryDetails({
  category,
  parentName,
  breadcrumbs,
  isLoading,
  onEdit,
  onDelete,
  onCreateChild,
}: CategoryDetailsProps) {
  const { i18n, t } = useTranslation();
  const mediaCandidates = useMemo(() => {
    if (!category) return [];
    const candidates = [category.iconUrl, category.imageUrl]
      .map((value) => value.trim())
      .filter(Boolean);
    return Array.from(new Set(candidates));
  }, [category]);

  const formatDateTime = (value: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(i18n.language);
  };

  if (isLoading) {
    return (
      <section className="card categoriesDetailsPanel">
        <div className="categoriesEmptyState">{t("categoryDetails.loading")}</div>
      </section>
    );
  }

  if (!category) {
    return (
      <section className="card categoriesDetailsPanel">
        <div className="categoriesEmptyState">{t("categoryDetails.empty")}</div>
      </section>
    );
  }

  return (
      <section className="card categoriesDetailsPanel">
        <div className="categoriesDetailsHero">
        <CategoryDetailsMedia
          key={`${category.id}-${mediaCandidates.join("|")}`}
          mediaCandidates={mediaCandidates}
          imageUnavailableLabel={t("categoryDetails.imageUnavailable")}
          categoryImageAlt={t("categoryDetails.categoryImageAlt", {
            name: category.name,
          })}
        />
        <div className="categoriesDetailsHeroContent">
          <div className="categoriesDetailsTopline">
            <span className="pageEyebrow">{t("categoryDetails.title")}</span>
            <span
              className={
                category.isActive
                  ? "statusPill categoriesStatusPill"
                  : "statusPill categoriesStatusPill inactive"
              }
            >
              {category.isActive
                ? t("categoryDetails.active")
                : t("categoryDetails.inactive")}
            </span>
          </div>
          <h2 className="sectionTitle categoriesDetailsTitle">{category.name}</h2>
          <div className="categoriesBreadcrumbs">
            {breadcrumbs.map((item, index) => (
              <span key={item.id} className="categoriesBreadcrumbItem">
                {index > 0 ? <span className="categoriesBreadcrumbSep">/</span> : null}
                {item.name}
              </span>
            ))}
          </div>
          <p className="sectionDescription">{t("categoryDetails.heroDescription")}</p>
        </div>

        <div className="categoriesDetailsActions">
          <button type="button" className="verificationActionButton subtle" onClick={onEdit}>
            {t("categoryDetails.edit")}
          </button>
          <button type="button" className="verificationActionButton subtle" onClick={onCreateChild}>
            {t("categoryDetails.createChild")}
          </button>
          <button type="button" className="verificationActionButton subtle danger" onClick={onDelete}>
            {t("categoryDetails.deactivate")}
          </button>
        </div>
      </div>

      <div className="categoriesOverviewGrid">
        <div className="detailItem categoriesOverviewCard">
          <span className="detailLabel">{t("categoryDetails.parent")}</span>
          <span className="detailValue">
            {parentName || t("categoryDetails.rootCategory")}
          </span>
        </div>
        <div className="detailItem categoriesOverviewCard">
          <span className="detailLabel">{t("categoryDetails.displayOrder")}</span>
          <span className="detailValue">{category.sortOrder}</span>
        </div>
        <div className="detailItem categoriesOverviewCard">
          <span className="detailLabel">{t("categoryDetails.productsLinked")}</span>
          <span className="detailValue">{category.productCount}</span>
        </div>
        <div className="detailItem categoriesOverviewCard">
          <span className="detailLabel">{t("categoryDetails.lastUpdated")}</span>
          <span className="detailValue">{formatDateTime(category.updatedAt)}</span>
        </div>
      </div>

      <div className="categoriesDetailsSection">
        <div className="sectionHeader">
          <div>
            <div className="sectionTitle">{t("categoryDetails.coreInformation")}</div>
            <p className="sectionDescription">
              {t("categoryDetails.coreInformationDescription")}
            </p>
          </div>
        </div>
        <div className="categoriesDetailsGrid">
          <label className="sliderFormField">
            <span className="authLabel">{t("categoryDetails.name")}</span>
            <input className="authInput" value={category.name} readOnly />
          </label>
          <label className="sliderFormField">
            <span className="authLabel">{t("categoryDetails.slug")}</span>
            <input className="authInput" value={category.slug || "-"} readOnly />
          </label>
          <label className="sliderFormField">
            <span className="authLabel">
              {t("categoryDetails.parentCategory")}
            </span>
            <input
              className="authInput"
              value={parentName || t("categoryDetails.rootCategory")}
              readOnly
            />
          </label>
          <label className="sliderFormField">
            <span className="authLabel">{t("categoryDetails.imageIconUrl")}</span>
            <input
              className="authInput"
              value={category.iconUrl || category.imageUrl || "-"}
              readOnly
            />
          </label>
        </div>
      </div>

      <div className="categoriesDetailsSection">
        <div className="sectionHeader">
          <div>
            <div className="sectionTitle">{t("categoryDetails.auditInformation")}</div>
            <p className="sectionDescription">
              {t("categoryDetails.auditInformationDescription")}
            </p>
          </div>
        </div>
        <div className="categoriesMetaGrid">
          <div className="detailItem">
            <span className="detailLabel">{t("categoryDetails.createdAt")}</span>
            <span className="detailValue">{formatDateTime(category.createdAt)}</span>
          </div>
          <div className="detailItem">
            <span className="detailLabel">{t("categoryDetails.updatedAt")}</span>
            <span className="detailValue">{formatDateTime(category.updatedAt)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
