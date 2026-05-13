import { useMemo, useState } from "react";
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
  const [formState, setFormState] = useState<FormState>(() =>
    createInitialState(initialCategory, parentId)
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [slugTouched, setSlugTouched] = useState(Boolean(initialCategory?.slug));

  const parentSelectOptions = useMemo(
    () => parentOptions.filter((option) => !excludedParentIds.includes(option.id)),
    [excludedParentIds, parentOptions]
  );

  if (!isOpen) return null;

  const validate = () => {
    const nextErrors: FormErrors = {};
    if (!formState.name.trim()) {
      nextErrors.name = "Name is required.";
    }
    if (!slugify(formState.slug || formState.name)) {
      nextErrors.slug = "Slug is required.";
    }
    const orderNumber = Number(formState.sortOrder);
    if (!Number.isInteger(orderNumber) || orderNumber < 1) {
      nextErrors.sortOrder = "Display order must be a positive number.";
    }
    if (!formState.iconFile && formState.icon.trim()) {
      try {
        new URL(formState.icon.trim());
      } catch {
        nextErrors.icon = "Enter a valid icon/image URL.";
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
            <p className="pageEyebrow">Categories</p>
            <h2 className="sectionTitle">
              {mode === "create" ? "Create Category" : "Edit Category"}
            </h2>
            <p className="sectionDescription">
              Build your category hierarchy, control parent relationships, and keep storefront navigation organized.
            </p>
          </div>
          <button type="button" className="sliderModalClose" onClick={onClose}>
            Close
          </button>
        </div>

        <form className="sliderForm" onSubmit={handleSubmit}>
          {submitError ? <p className="authError surfaceMessage">{submitError}</p> : null}

          <div className="sliderFormGrid">
            <label className="sliderFormField">
              <span className="authLabel">Name*</span>
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
              <span className="authLabel">Slug</span>
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
              <span className="authLabel">Parent Category</span>
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
                <option value="">Root category</option>
                {parentSelectOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="sliderFormField">
              <span className="authLabel">Display Order</span>
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

            <label className="sliderFormField">
              <span className="authLabel">Category Icon</span>
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
                  Selected file: {formState.iconFile.name}
                </span>
              ) : formState.icon ? (
                <span className="sectionDescription">
                  Current icon: {formState.icon}
                </span>
              ) : (
                <span className="sectionDescription">
                  Upload PNG, JPEG, WebP, or SVG. The admin API expects the file in the `icon` field.
                </span>
              )}
              {errors.icon ? <span className="authError">{errors.icon}</span> : null}
            </label>
          </div>

          <div className="sliderModalActions">
            <button type="button" className="verificationActionButton subtle" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="verificationActionButton" disabled={isSaving}>
              {isSaving ? "Saving..." : mode === "create" ? "Create Category" : "Save Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
