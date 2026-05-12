import { useCallback, useEffect, useMemo, useState } from "react";
import { SliderFormModal } from "@/features/sliderAds/SliderFormModal";
import { SliderPreview } from "@/features/sliderAds/SliderPreview";
import {
  createSliderAd,
  deleteSliderAd,
  listSliderAds,
  type SliderAd,
  type SliderAdPayload,
  updateSliderAd,
  updateSliderSortOrder,
} from "@/features/sliderAds/sliderApi";

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ImageStackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 15 4.5-4.5a2 2 0 0 1 2.83 0L14 14l1.5-1.5a2 2 0 0 1 2.83 0L21 15" />
      <circle cx="9" cy="10" r="1.5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

const formatDateTime = (value: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const getStatusBadgeClassName = (status: SliderAd["status"]) =>
  status === "ACTIVE" ? "rewardsBadge completed" : "rewardsBadge rejected";

const moveItem = <T,>(list: T[], from: number, to: number) => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export function SliderAdsPage() {
  const [sliderAds, setSliderAds] = useState<SliderAd[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalSubmitError, setModalSubmitError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    slider: SliderAd | null;
  }>({
    isOpen: false,
    mode: "create",
    slider: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<SliderAd | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState("--");

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2200);
  }, []);

  const loadSliderAds = useCallback(async () => {
    try {
      setIsLoading(true);
      setPageError(null);
      setModalSubmitError(null);
      const items = await listSliderAds();
      setSliderAds(items);
      setLastUpdated(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to load slider ads."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSliderAds();
  }, [loadSliderAds]);

  const filteredSliderAds = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return sliderAds;

    return sliderAds.filter((item) =>
      `${item.title} ${item.linkUrl} ${item.status} ${item.sortOrder}`
        .toLowerCase()
        .includes(query)
    );
  }, [searchQuery, sliderAds]);

  const activeCount = useMemo(
    () => sliderAds.filter((item) => item.status === "ACTIVE").length,
    [sliderAds]
  );
  const isReorderDisabled = isSaving || searchQuery.trim().length > 0;

  const handleModalSubmit = async (payload: SliderAdPayload) => {
    try {
      setIsSaving(true);
      setPageError(null);
      setModalSubmitError(null);

      if (modalState.mode === "create") {
        await createSliderAd(payload);
        showToast("Slider ad created.");
      } else if (modalState.slider) {
        await updateSliderAd(modalState.slider.id, payload);
        showToast("Slider ad updated.");
      }

      setModalState({ isOpen: false, mode: "create", slider: null });
      await loadSliderAds();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save slider ad.";
      setPageError(errorMessage);
      setModalSubmitError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      setIsSaving(true);
      setPageError(null);
      setModalSubmitError(null);
      await deleteSliderAd(deleteTarget.id);
      setDeleteTarget(null);
      showToast("Slider ad deleted.");
      await loadSliderAds();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to delete slider ad."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const persistReorderedList = async (nextList: SliderAd[]) => {
    const normalized = nextList.map((item, index) => ({
      ...item,
      sortOrder: index + 1,
    }));

    setSliderAds(normalized);

    try {
      setIsSaving(true);
      setPageError(null);
      setModalSubmitError(null);
      await updateSliderSortOrder(normalized);
      showToast("Slider order updated.");
      await loadSliderAds();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to reorder slider ads."
      );
      await loadSliderAds();
    } finally {
      setIsSaving(false);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sliderAds.length) return;
    await persistReorderedList(moveItem(sliderAds, index, targetIndex));
  };

  const handleDragStart = (sliderId: string) => {
    setDraggingId(sliderId);
  };

  const handleDrop = async (targetId: string) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }

    const fromIndex = sliderAds.findIndex((item) => item.id === draggingId);
    const targetIndex = sliderAds.findIndex((item) => item.id === targetId);
    setDraggingId(null);

    if (fromIndex === -1 || targetIndex === -1) return;
    await persistReorderedList(moveItem(sliderAds, fromIndex, targetIndex));
  };

  return (
    <section className="page sliderAdsPage">
      <div className="pageHeader">
        <div>
          <p className="pageEyebrow">Slider Ads</p>
          <h1 className="pageTitle">Homepage Slider Management</h1>
          <p className="pageDescription">
            Manage promotional slider banners, preview the live carousel, and keep the homepage rotation ordered exactly how you want it.
          </p>
        </div>
        <div className="pageHeaderActions">
          <button
            type="button"
            className="verificationActionButton subtle"
            onClick={() => {
              void loadSliderAds();
            }}
            disabled={isLoading || isSaving}
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            className="verificationActionButton"
            onClick={() => {
              setModalSubmitError(null);
              setModalState({ isOpen: true, mode: "create", slider: null });
            }}
          >
            <PlusIcon />
            <span>Create Slider Ad</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 sliderAdsTopSection">
        <div className="col-span-12 lg:col-span-4 sliderAdsStatsColumn">
          <div className="metricCard rewardsSummaryCard">
            <div className="rewardsSummaryIcon rewardsSummaryIconIndigo">
              <ImageStackIcon />
            </div>
            <div className="metricLabel">Total Ads</div>
            <div className="metricValue">{sliderAds.length}</div>
            <div className="metricMeta">All slider banners in the admin library</div>
          </div>
          <div className="metricCard rewardsSummaryCard">
            <div className="rewardsSummaryIcon rewardsSummaryIconSky">
              <EyeIcon />
            </div>
            <div className="metricLabel">Live Preview</div>
            <div className="metricValue">{activeCount}</div>
            <div className="metricMeta">Active ads visible in the carousel preview</div>
          </div>
        </div>

        <section className="col-span-12 lg:col-span-8 card sliderPreviewPanel">
          <div className="sliderPreviewPanelContent">
            <div className="sliderSectionHead">
              <div>
                <h2 className="sectionTitle">Live Carousel Preview</h2>
                <p className="sectionDescription">
                  This panel simulates the homepage slider using only currently active ads.
                </p>
              </div>
            </div>
            <SliderPreview items={sliderAds} />
          </div>
        </section>
      </div>

      {pageError ? <p className="authError surfaceMessage">{pageError}</p> : null}

      <section className="card sliderTablePanel w-full">
          <div className="sliderSectionHead sliderSectionHeadSplit">
            <div>
              <h2 className="sectionTitle">Slider Ad Library</h2>
              <p className="sectionDescription">
                Reorder by dragging rows or use the arrow controls for precise adjustments.
              </p>
            </div>
            <div className="verificationSearchField sliderSearchField">
              <input
                type="search"
                className="authInput verificationSearchInput"
                placeholder="Search slider ads..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="sliderAdsTableWrap">
            <table className="verificationTable">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Image</th>
                  <th>Title</th>
                  <th>URL</th>
                  <th>Status</th>
                  <th>Created At</th>
                  <th className="verificationActionCell">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="verificationEmptyState">Loading slider ads...</div>
                    </td>
                  </tr>
                ) : filteredSliderAds.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="verificationEmptyState">
                        {searchQuery.trim()
                          ? "No slider ads match your search."
                          : "No slider ads created yet."}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSliderAds.map((item) => {
                    const fullIndex = sliderAds.findIndex(
                      (slider) => slider.id === item.id
                    );

                    return (
                      <tr
                        key={item.id}
                        draggable={!isReorderDisabled}
                        className={draggingId === item.id ? "sliderRow dragging" : "sliderRow"}
                        onDragStart={() => handleDragStart(item.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          void handleDrop(item.id);
                        }}
                      >
                        <td>
                          <div className="sliderOrderCell">
                            <span className="inlineBadge">#{item.sortOrder}</span>
                            <div className="sliderOrderButtons">
                              <button
                                type="button"
                                className="sliderReorderButton"
                                onClick={() => {
                                  void handleMove(fullIndex, -1);
                                }}
                                disabled={isReorderDisabled || fullIndex <= 0}
                              >
                                <ArrowUpIcon />
                              </button>
                              <button
                                type="button"
                                className="sliderReorderButton"
                                onClick={() => {
                                  void handleMove(fullIndex, 1);
                                }}
                                disabled={
                                  isReorderDisabled ||
                                  fullIndex === sliderAds.length - 1
                                }
                              >
                                <ArrowDownIcon />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td>
                          {item.imageUrl ? (
                            <img
                              className="sliderThumb"
                              src={item.imageUrl}
                              alt={item.title}
                            />
                          ) : (
                            <div className="sliderThumbPlaceholder">No image</div>
                          )}
                        </td>
                        <td>
                          <div className="sliderTableTitle">{item.title}</div>
                        </td>
                        <td>
                          <div className="sliderTableLink muted">
                            {item.linkUrl || "No link URL"}
                          </div>
                        </td>
                        <td>
                          <span className={getStatusBadgeClassName(item.status)}>
                            {item.status}
                          </span>
                        </td>
                        <td>{formatDateTime(item.createdAt)}</td>
                        <td className="verificationActionCell">
                          <div className="sliderActionButtons">
                            <button
                              type="button"
                              className="verificationActionButton subtle"
                              onClick={() => {
                                setModalSubmitError(null);
                                setModalState({
                                  isOpen: true,
                                  mode: "edit",
                                  slider: item,
                                });
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="verificationActionButton subtle danger"
                              onClick={() => setDeleteTarget(item)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
      </section>

      <p className="rewardsLastUpdated">Last updated: today at {lastUpdated}</p>
      {toastMessage ? <div className="rewardsToast">{toastMessage}</div> : null}

      <SliderFormModal
        key={`${modalState.mode}-${modalState.slider?.id ?? "new"}-${modalState.isOpen ? "open" : "closed"}`}
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        initialData={modalState.slider}
        isSaving={isSaving}
        submitError={modalSubmitError}
        onClose={() => {
          setModalSubmitError(null);
          setModalState({ isOpen: false, mode: "create", slider: null });
        }}
        onSubmit={handleModalSubmit}
      />

      {deleteTarget ? (
        <div className="sliderModalOverlay" role="presentation" onClick={() => setDeleteTarget(null)}>
          <div
            className="sliderConfirmDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="slider-delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="slider-delete-title" className="sectionTitle">
              Delete Slider Ad
            </h2>
            <p className="sectionDescription">
              Delete <strong>{deleteTarget.title}</strong>? This action cannot be undone.
            </p>
            <div className="sliderModalActions">
              <button
                type="button"
                className="verificationActionButton subtle"
                onClick={() => setDeleteTarget(null)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="verificationActionButton danger"
                onClick={() => {
                  void handleDelete();
                }}
                disabled={isSaving}
              >
                {isSaving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
