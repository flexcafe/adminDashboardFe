import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  isSliderAdCurrentlyActive,
  type SliderAd,
} from "./sliderApi";

type SliderPreviewProps = {
  items: SliderAd[];
};

export function SliderPreview({ items }: SliderPreviewProps) {
  const { i18n, t } = useTranslation();
  const activeItems = useMemo(
    () => items.filter((item) => isSliderAdCurrentlyActive(item)),
    [items]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedActiveIndex =
    activeItems.length > 0 ? activeIndex % activeItems.length : 0;

  const formatDisplayDate = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(i18n.language);
  };

  useEffect(() => {
    if (activeItems.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % activeItems.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [activeItems.length]);

  if (activeItems.length === 0) {
    return (
      <div className="sliderPreviewEmpty">
        <div className="sliderPreviewEmptyTitle">{t("sliderPreview.emptyTitle")}</div>
        <p className="sliderPreviewEmptyText">{t("sliderPreview.emptyText")}</p>
      </div>
    );
  }

  const activeItem = activeItems[normalizedActiveIndex];

  return (
    <div className="sliderPreviewCard">
      <div className="sliderPreviewFrame">
        <div className="sliderPreviewViewport">
          {activeItem.imageUrl ? (
            <img
              className="sliderPreviewImage"
              src={activeItem.imageUrl}
              alt={activeItem.title}
            />
          ) : (
            <div className="sliderPreviewPlaceholder">{t("sliderPreview.noImage")}</div>
          )}
          <div className="sliderPreviewOverlay">
            <span className="sliderPreviewOrder">#{activeItem.sortOrder}</span>
            <div className="sliderPreviewContent">
              <h3 className="sliderPreviewTitle">{activeItem.title}</h3>
              {activeItem.linkUrl ? (
                <p className="sliderPreviewMeta">{activeItem.linkUrl}</p>
              ) : (
                <p className="sliderPreviewMeta">{t("sliderPreview.noLink")}</p>
              )}
              {activeItem.startsAt || activeItem.endsAt ? (
                <p className="sliderPreviewDates">
                  {activeItem.startsAt
                    ? t("sliderPreview.starts", {
                        date: formatDisplayDate(activeItem.startsAt),
                      })
                    : t("sliderPreview.startsAnytime")}
                  {activeItem.endsAt
                    ? ` | ${t("sliderPreview.ends", {
                        date: formatDisplayDate(activeItem.endsAt),
                      })}`
                    : ""}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div
        className="sliderPreviewDots"
        role="tablist"
        aria-label={t("sliderPreview.slidesLabel")}
      >
        {activeItems.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={index === normalizedActiveIndex}
            className={
              index === normalizedActiveIndex
                ? "sliderPreviewDot active"
                : "sliderPreviewDot"
            }
            onClick={() => setActiveIndex(index)}
          >
            <span className="srOnly">{item.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
