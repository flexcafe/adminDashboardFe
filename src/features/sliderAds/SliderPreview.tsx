import { useEffect, useMemo, useState } from "react";
import type { SliderAd } from "./sliderApi";

type SliderPreviewProps = {
  items: SliderAd[];
};

const formatDisplayDate = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

export function SliderPreview({ items }: SliderPreviewProps) {
  const activeItems = useMemo(
    () => items.filter((item) => item.status === "ACTIVE"),
    [items]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedActiveIndex =
    activeItems.length > 0 ? activeIndex % activeItems.length : 0;

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
        <div className="sliderPreviewEmptyTitle">No active slider ads</div>
        <p className="sliderPreviewEmptyText">
          Active ads will appear here as a live carousel preview once enabled.
        </p>
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
            <div className="sliderPreviewPlaceholder">No image available</div>
          )}
          <div className="sliderPreviewOverlay">
            <span className="inlineBadge">#{activeItem.sortOrder}</span>
            <div className="sliderPreviewContent">
              <h3 className="sliderPreviewTitle">{activeItem.title}</h3>
              {activeItem.linkUrl ? (
                <p className="sliderPreviewMeta">{activeItem.linkUrl}</p>
              ) : (
                <p className="sliderPreviewMeta">No link URL provided</p>
              )}
              {activeItem.startsAt || activeItem.endsAt ? (
                <p className="sliderPreviewDates">
                  {activeItem.startsAt
                    ? `Starts ${formatDisplayDate(activeItem.startsAt)}`
                    : "Starts anytime"}
                  {activeItem.endsAt
                    ? ` | Ends ${formatDisplayDate(activeItem.endsAt)}`
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
        aria-label="Slider preview slides"
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
