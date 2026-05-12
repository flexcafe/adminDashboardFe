import { useEffect, useMemo, useState } from "react";
import type { SliderAd, SliderAdPayload, SliderAdStatus } from "./sliderApi";

type SliderFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialData?: SliderAd | null;
  isSaving: boolean;
  submitError?: string | null;
  onClose: () => void;
  onSubmit: (payload: SliderAdPayload) => Promise<void>;
};

type FormState = {
  title: string;
  linkUrl: string;
  sortOrder: string;
  status: SliderAdStatus;
  startsAt: string;
  endsAt: string;
  file: File | null;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const formatForDateTimeLocalInput = (value?: string) => {
  if (!value?.trim()) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const createInitialState = (initialData?: SliderAd | null): FormState => ({
  title: initialData?.title || "",
  linkUrl: initialData?.linkUrl || "",
  sortOrder:
    initialData?.sortOrder !== undefined ? String(initialData.sortOrder) : "1",
  status: initialData?.status || "ACTIVE",
  startsAt: formatForDateTimeLocalInput(initialData?.startsAt),
  endsAt: formatForDateTimeLocalInput(initialData?.endsAt),
  file: null,
});

export function SliderFormModal({
  isOpen,
  mode,
  initialData,
  isSaving,
  submitError,
  onClose,
  onSubmit,
}: SliderFormModalProps) {
  const [formState, setFormState] = useState<FormState>(() =>
    createInitialState(initialData)
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const previewUrl = useMemo(
    () => (formState.file ? URL.createObjectURL(formState.file) : null),
    [formState.file]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const resolvedPreviewUrl = useMemo(() => {
    if (previewUrl) return previewUrl;
    return initialData?.imageUrl || "";
  }, [initialData?.imageUrl, previewUrl]);
  const backendLinkUrlError =
    submitError && submitError.toLowerCase().includes("linkurl")
      ? submitError
      : null;

  if (!isOpen) return null;

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    if (!formState.title.trim()) {
      nextErrors.title = "Title is required.";
    }

    if (!formState.linkUrl.trim()) {
      nextErrors.linkUrl = "Link URL is required.";
    }

    if (mode === "create" && !formState.file) {
      nextErrors.file = "Image is required for new slider ads.";
    }

    if (formState.linkUrl.trim()) {
      try {
        new URL(formState.linkUrl.trim());
      } catch {
        nextErrors.linkUrl = "Enter a valid URL including https://";
      }
    }

    const orderNumber = Number(formState.sortOrder);
    if (!Number.isInteger(orderNumber) || orderNumber < 1) {
      nextErrors.sortOrder = "Order must be a positive number.";
    }

    if (formState.startsAt && formState.endsAt) {
      const starts = new Date(formState.startsAt);
      const ends = new Date(formState.endsAt);
      if (starts.getTime() > ends.getTime()) {
        nextErrors.endsAt = "End date must be after start date.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateForm()) return;

    await onSubmit({
      file: formState.file,
      title: formState.title,
      linkUrl: formState.linkUrl,
      sortOrder: Number(formState.sortOrder),
      status: formState.status,
      startsAt: formState.startsAt,
      endsAt: formState.endsAt,
    });
  };

  return (
    <div className="sliderModalOverlay" role="presentation" onClick={onClose}>
      <div
        className="sliderModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="slider-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sliderModalHeader">
          <div>
            <p className="pageEyebrow">Slider Ads</p>
            <h2 id="slider-modal-title" className="sectionTitle">
              {mode === "create" ? "Create New Slider Ad" : "Edit Slider Ad"}
            </h2>
            <p className="sectionDescription">
              Upload artwork, set the display order, and control whether the ad appears in the live slider.
            </p>
          </div>
          <button type="button" className="sliderModalClose" onClick={onClose}>
            Close
          </button>
        </div>

        <form className="sliderForm" onSubmit={handleSubmit}>
          {submitError && !backendLinkUrlError ? (
            <p className="authError surfaceMessage">{submitError}</p>
          ) : null}
          <div className="sliderFormGrid">
            <label className="sliderFormField">
              <span className="authLabel">Title</span>
              <input
                className="authInput"
                type="text"
                value={formState.title}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                onInput={() =>
                  setErrors((current) => ({ ...current, title: undefined }))
                }
                placeholder="Homepage campaign headline"
              />
              {errors.title ? <span className="authError">{errors.title}</span> : null}
            </label>

            <label className="sliderFormField">
              <span className="authLabel">Link URL</span>
              <input
                className="authInput"
                type="url"
                value={formState.linkUrl}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    linkUrl: event.target.value,
                  }))
                }
                onInput={() =>
                  setErrors((current) => ({ ...current, linkUrl: undefined }))
                }
                placeholder="https://example.com/promo"
              />
              {errors.linkUrl || backendLinkUrlError ? (
                <span className="authError">
                  {errors.linkUrl || backendLinkUrlError}
                </span>
              ) : null}
            </label>

            <label className="sliderFormField">
              <span className="authLabel">Order</span>
              <input
                className="authInput"
                type="number"
                min={1}
                value={formState.sortOrder}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    sortOrder: event.target.value,
                  }))
                }
                onInput={() =>
                  setErrors((current) => ({ ...current, sortOrder: undefined }))
                }
              />
              {errors.sortOrder ? <span className="authError">{errors.sortOrder}</span> : null}
            </label>

            <label className="sliderFormField sliderToggleField">
              <span className="authLabel">Status</span>
              <button
                type="button"
                className={
                  formState.status === "ACTIVE"
                    ? "sliderToggle active"
                    : "sliderToggle"
                }
                onClick={() =>
                  setFormState((current) => ({
                    ...current,
                    status: current.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                  }))
                }
              >
                <span className="sliderToggleKnob" />
                <span className="sliderToggleLabel">
                  {formState.status === "ACTIVE" ? "Active" : "Inactive"}
                </span>
              </button>
            </label>

            <label className="sliderFormField">
              <span className="authLabel">Starts At</span>
              <input
                className="authInput"
                type="datetime-local"
                value={formState.startsAt}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    startsAt: event.target.value,
                  }))
                }
                onInput={() =>
                  setErrors((current) => ({ ...current, endsAt: undefined }))
                }
              />
            </label>

            <label className="sliderFormField">
              <span className="authLabel">Ends At</span>
              <input
                className="authInput"
                type="datetime-local"
                value={formState.endsAt}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    endsAt: event.target.value,
                  }))
                }
                onInput={() =>
                  setErrors((current) => ({ ...current, endsAt: undefined }))
                }
              />
              {errors.endsAt ? <span className="authError">{errors.endsAt}</span> : null}
            </label>
          </div>

          <div className="sliderUploadPanel">
            <label className="sliderUploadField">
              <span className="authLabel">Slider Image</span>
              <input
                className="authInput"
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    file: event.target.files?.[0] || null,
                  }))
                }
                onInput={() =>
                  setErrors((current) => ({ ...current, file: undefined }))
                }
              />
              <span className="sectionDescription">
                {mode === "create"
                  ? "Upload a landscape image for the homepage slider."
                  : "Choose a new image only if you want to replace the current one."}
              </span>
              {errors.file ? <span className="authError">{errors.file}</span> : null}
            </label>

            <div className="sliderUploadPreview">
              {resolvedPreviewUrl ? (
                <img
                  className="sliderUploadPreviewImage"
                  src={resolvedPreviewUrl}
                  alt={formState.title || "Slider preview"}
                />
              ) : (
                <div className="sliderUploadPreviewEmpty">
                  Image preview will appear here before you save.
                </div>
              )}
            </div>
          </div>

          <div className="sliderModalActions">
            <button
              type="button"
              className="verificationActionButton subtle"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="verificationActionButton"
              disabled={isSaving}
            >
              {isSaving
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create Slider Ad"
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
