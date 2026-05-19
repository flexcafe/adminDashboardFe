import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Category, CategoryPayload } from "./categoriesApi";

type CategoryFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialCategory?: Category | null;
  parentId?: string | null;
  parentOptions: Category[];
  excludedParentIds?: string[];
  isSaving: boolean;
  submitError?: string | null;
  onClose: () => void;
  onSubmit: (payload: CategoryPayload) => Promise<void>;
};

type FormState = {
  name: string;
  slug: string;
  parentId: string;
  sortOrder: string;
  icon: string;
  iconFile: File | null;
  description: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const createInitialState = (
  initialCategory?: Category | null,
  parentId?: string | null
): FormState => ({
  name: initialCategory?.name || "",
  slug: initialCategory?.slug || "",
  parentId: initialCategory?.parentId || parentId || "",
  sortOrder: String(initialCategory?.sortOrder ?? 1),
  icon: initialCategory?.iconUrl || "",
  iconFile: null,
  description: initialCategory?.description || "",
  metaTitle: initialCategory?.metaTitle || "",
  metaDescription: initialCategory?.metaDescription || "",
  metaKeywords: initialCategory?.metaKeywords.join(", ") || "",
});

export function CategoryFormModal({
  isOpen,
  mode,
  initialCategory,
  parentId,
  parentOptions,
  excludedParentIds = [],
  isSaving,
  submitError,
  onClose,
  onSubmit,
}: CategoryFormModalProps) {
  const { t } = useTranslation();
  const [formState, setFormState] = useState<FormState>(() =>
    createInitialState(initialCategory, parentId)
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [slugTouched, setSlugTouched] = useState(Boolean(initialCategory?.slug));
  const previewUrl = useMemo(() => {
    if (formState.iconFile) {
      return URL.createObjectURL(formState.iconFile);
    }

    return formState.icon.trim() || "";
  }, [formState.icon, formState.iconFile]);

  const parentSelectOptions = useMemo(
    () => parentOptions.filter((option) => !excludedParentIds.includes(option.id)),
    [excludedParentIds, parentOptions]
  );

  if (!isOpen) return null;

  const validate = () => {
    const nextErrors: FormErrors = {};
    if (!formState.name.trim()) {
      nextErrors.name = t("categoryForm.nameRequired");
    }
    if (!slugify(formState.slug || formState.name)) {
      nextErrors.slug = t("categoryForm.slugRequired");
    }
    const orderNumber = Number(formState.sortOrder);
    if (!Number.isInteger(orderNumber) || orderNumber < 1) {
      nextErrors.sortOrder = t("categoryForm.sortOrderRequired");
    }
    if (!formState.iconFile && formState.icon.trim()) {
      try {
        new URL(formState.icon.trim());
      } catch {
        nextErrors.icon = t("categoryForm.invalidIconUrl");
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) return;

    await onSubmit({
      name: formState.name,
      slug: slugify(formState.slug || formState.name),
      parentId: formState.parentId || null,
      sortOrder: Number(formState.sortOrder),
      icon: formState.icon,
      iconFile: formState.iconFile,
      description: formState.description,
      metaTitle: formState.metaTitle,
      metaDescription: formState.metaDescription,
      metaKeywords: formState.metaKeywords
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="sliderModalOverlay" role="presentation" onClick={onClose}>
      <div className="sliderModal categoriesModal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="sliderModalHeader">
          <div>
            <p className="pageEyebrow">{t("categoryForm.eyebrow")}</p>
            <h2 className="sectionTitle">
              {mode === "create"
                ? t("categoryForm.createTitle")
                : t("categoryForm.editTitle")}
            </h2>
            <p className="sectionDescription">{t("categoryForm.description")}</p>
          </div>
          <button type="button" className="sliderModalClose" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>

        <form className="sliderForm" onSubmit={handleSubmit}>
          {submitError ? <p className="authError surfaceMessage">{submitError}</p> : null}

          <div className="sliderFormGrid">
            <label className="sliderFormField">
              <span className="authLabel">{t("categoryForm.name")}</span>
              <input
                className="authInput"
                value={formState.name}
                onChange={(event) => {
                  const nextName = event.target.value;
                  setFormState((current) => ({
                    ...current,
                    name: nextName,
                    slug: slugTouched ? current.slug : slugify(nextName),
                  }));
                  setErrors((current) => ({ ...current, name: undefined }));
                }}
              />
              {errors.name ? <span className="authError">{errors.name}</span> : null}
            </label>

            <label className="sliderFormField">
              <span className="authLabel">{t("categoryForm.slug")}</span>
              <input
                className="authInput"
                value={formState.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  setFormState((current) => ({
                    ...current,
                    slug: slugify(event.target.value),
                  }));
                  setErrors((current) => ({ ...current, slug: undefined }));
                }}
              />
              {errors.slug ? <span className="authError">{errors.slug}</span> : null}
            </label>

            <label className="sliderFormField">
              <span className="authLabel">{t("categoryForm.parentCategory")}</span>
              <select
                className="authInput"
                value={formState.parentId}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    parentId: event.target.value,
                  }))
                }
              >
                <option value="">{t("categoryForm.rootCategory")}</option>
                {parentSelectOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="sliderFormField">
              <span className="authLabel">{t("categoryForm.displayOrder")}</span>
              <input
                className="authInput"
                type="number"
                min={1}
                value={formState.sortOrder}
                onChange={(event) => {
                  setFormState((current) => ({
                    ...current,
                    sortOrder: event.target.value,
                  }));
                  setErrors((current) => ({ ...current, sortOrder: undefined }));
                }}
              />
              {errors.sortOrder ? <span className="authError">{errors.sortOrder}</span> : null}
            </label>

            <div className="categoryFormIconRow">
              <label className="sliderFormField categoryFormIconField">
                <span className="authLabel">{t("categoryForm.categoryIcon")}</span>
                <input
                  className="authInput"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0] || null;
                    setFormState((current) => ({
                      ...current,
                      iconFile: nextFile,
                    }));
                    setErrors((current) => ({ ...current, icon: undefined }));
                  }}
                />
                {formState.iconFile ? (
                  <span className="sectionDescription">
                    {t("categoryForm.selectedFile", {
                      name: formState.iconFile.name,
                    })}
                  </span>
                ) : formState.icon ? (
                  <span className="sectionDescription">
                    {t("categoryForm.currentIcon", { value: formState.icon })}
                  </span>
                ) : (
                  <span className="sectionDescription">
                    {t("categoryForm.iconHelp")}
                  </span>
                )}
                {errors.icon ? <span className="authError">{errors.icon}</span> : null}
              </label>

              <div className="sliderFormField categoryFormPreviewField">
                <span className="authLabel">{t("categoryForm.iconPreview")}</span>
                <div className="categoryFormPreviewBox">
                  {previewUrl ? (
                    <img
                      className="categoryFormPreviewImage"
                      src={previewUrl}
                      alt={t("categoryForm.previewAlt")}
                    />
                  ) : (
                    <span className="categoryFormPreviewEmpty">
                      {t("categoryForm.noImage")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="sliderModalActions">
            <button type="button" className="verificationActionButton subtle" onClick={onClose} disabled={isSaving}>
              {t("common.cancel")}
            </button>
            <button type="submit" className="verificationActionButton" disabled={isSaving}>
              {isSaving
                ? t("categoryForm.saving")
                : mode === "create"
                  ? t("categoriesPage.createCategory")
                  : t("categoryForm.saveCategory")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
