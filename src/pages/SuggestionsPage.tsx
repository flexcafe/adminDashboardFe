import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSuggestions } from "@/features/suggestions/SuggestionsContext";
import type { Suggestion } from "@/features/suggestions/suggestionsApi";

function LightbulbIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function formatDate(value: string, locale: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(status: Suggestion["status"], t: (key: string) => string): string {
  switch (status) {
    case "PENDING":
      return t("suggestionsPage.pending");
    case "REWARDED":
      return t("suggestionsPage.rewarded");
    case "DISMISSED":
      return t("suggestionsPage.dismissed");
    default:
      return status;
  }
}

function getStatusClass(status: Suggestion["status"]): string {
  switch (status) {
    case "PENDING":
      return "suggestionsStatusBadge pending";
    case "REWARDED":
      return "suggestionsStatusBadge rewarded";
    case "DISMISSED":
      return "suggestionsStatusBadge dismissed";
    default:
      return "suggestionsStatusBadge";
  }
}

export function SuggestionsPage() {
  const { t, i18n } = useTranslation();
  const {
    suggestions,
    pendingCount,
    isLoading,
    error,
    actionLoading,
    refreshSuggestions,
    handleReward,
    handleDismiss,
  } = useSuggestions();

  // ── Reward modal state ──────────────────────────────────────────────────────
  const [rewardTarget, setRewardTarget] = useState<Suggestion | null>(null);
  const [pointsInput, setPointsInput] = useState("");
  const [rewardError, setRewardError] = useState<string | null>(null);

  const openRewardModal = (suggestion: Suggestion) => {
    setRewardTarget(suggestion);
    setPointsInput("");
    setRewardError(null);
  };

  const closeRewardModal = () => {
    setRewardTarget(null);
    setPointsInput("");
    setRewardError(null);
  };

  const parsedPoints = Number(pointsInput);
  const isPointsValid =
    pointsInput !== "" &&
    !Number.isNaN(parsedPoints) &&
    Number.isInteger(parsedPoints) &&
    parsedPoints >= 1 &&
    parsedPoints <= 10000;

  const handleConfirmReward = async () => {
    if (!rewardTarget || !isPointsValid) return;
    try {
      await handleReward(rewardTarget.id, parsedPoints);
      closeRewardModal();
    } catch {
      setRewardError(t("suggestionsPage.rewardError"));
    }
  };

  return (
    <>
      <section className="page suggestionsPage">
        {/* Page Header */}
        <div className="pageHeader">
          <div>
            <p className="pageEyebrow">{t("suggestionsPage.eyebrow")}</p>
            <h1 className="pageTitle">{t("suggestionsPage.title")}</h1>
            <p className="pageDescription">
              {t("suggestionsPage.description")}
              {pendingCount > 0 && (
                <span className="suggestionsPagePendingCount">
                  {" "}
                  &mdash; {t("suggestionsPage.pendingCount", { count: pendingCount })}
                </span>
              )}
            </p>
          </div>
          <div className="pageHeaderActions">
            <button
              type="button"
              className="verificationActionButton subtle"
              onClick={() => {
                void refreshSuggestions();
              }}
              disabled={isLoading}
            >
              {isLoading ? t("suggestionsPage.refreshing") : t("suggestionsPage.refresh")}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="card suggestionsPageCard">
          {isLoading ? (
            <div className="suggestionsPageLoading">{t("suggestionsPage.loading")}</div>
          ) : error ? (
            <div className="suggestionsPageError">
              <p>{error}</p>
              <button
                type="button"
                className="suggestionsPageRetryBtn"
                onClick={() => {
                  void refreshSuggestions();
                }}
              >
                {t("suggestionsPage.tryAgain")}
              </button>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="suggestionsPageEmpty">
              <LightbulbIcon />
              <p>{t("suggestionsPage.empty")}</p>
            </div>
          ) : (
            <div className="suggestionsPageTableWrap">
              <table className="suggestionsPageTable">
                <thead>
                  <tr>
                    <th className="suggestionsColTitle">{t("suggestionsPage.suggestionColumn")}</th>
                    <th className="suggestionsColUser">{t("suggestionsPage.userColumn")}</th>
                    <th className="suggestionsColDate">{t("suggestionsPage.dateColumn")}</th>
                    <th className="suggestionsColStatus">{t("suggestionsPage.statusColumn")}</th>
                    <th className="suggestionsColActions">{t("suggestionsPage.actionsColumn")}</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((suggestion) => (
                    <tr key={suggestion.id}>
                      <td className="suggestionsColTitle">
                        <div className="suggestionsCellTitle">
                          {suggestion.title}
                        </div>
                        {suggestion.description && (
                          <div className="suggestionsCellDescription">
                            {suggestion.description}
                          </div>
                        )}
                      </td>
                      <td className="suggestionsColUser">
                        <div className="suggestionsCellUser">
                          <span className="suggestionsCellUserName">
                            {suggestion.userName}
                          </span>
                          {suggestion.userPhoneOrEmail && (
                            <span className="suggestionsCellUserContact">
                              {suggestion.userPhoneOrEmail}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="suggestionsColDate">
                        {suggestion.createdAt
                            ? formatDate(suggestion.createdAt, i18n.language)
                            : "-"}
                      </td>
                      <td className="suggestionsColStatus">
                        <span className={getStatusClass(suggestion.status)}>
                          {getStatusLabel(suggestion.status, t)}
                        </span>
                      </td>
                      <td className="suggestionsColActions">
                        {suggestion.status === "PENDING" ? (
                          <div className="suggestionsCellActions">
                            <button
                              type="button"
                              className="suggestionsActionBtn suggestionsActionBtnReward"
                              disabled={actionLoading === suggestion.id}
                              onClick={() => {
                                openRewardModal(suggestion);
                              }}
                            >
                              {actionLoading === suggestion.id ? (
                                t("suggestionsPage.processing")
                              ) : (
                                <>
                                  <CheckCircleIcon />
                                  {t("suggestionsPage.reward")}
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              className="suggestionsActionBtn suggestionsActionBtnDismiss"
                              disabled={actionLoading === suggestion.id}
                              onClick={() => {
                                void handleDismiss(suggestion.id);
                              }}
                            >
                              {actionLoading === suggestion.id ? (
                                t("suggestionsPage.processing")
                              ) : (
                                <>
                                  <XIcon />
                                  {t("suggestionsPage.dismiss")}
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="suggestionsActionDone">
                            {suggestion.status === "REWARDED"
                              ? t("suggestionsPage.rewarded")
                              : t("suggestionsPage.dismissed")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {rewardTarget && (
        <div
          className="sliderModalOverlay"
          role="presentation"
          onClick={closeRewardModal}
        >
          <div
            className="sliderConfirmDialog suggestionsRewardDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reward-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <h2
              id="reward-modal-title"
              className="sectionTitle"
            >
              {t("suggestionsPage.rewardModalTitle")}
            </h2>
            <p className="sectionDescription">
              {t("suggestionsPage.rewardModalUser")}{" "}
              <strong>{rewardTarget.userName}</strong>
            </p>

            {/* Points input */}
            <label className="suggestionsRewardLabel">
              {t("suggestionsPage.rewardModalLabel")}
            </label>
            <input
              type="number"
              min={1}
              max={10000}
              step={1}
              value={pointsInput}
              onChange={(e) => {
                setPointsInput(e.target.value);
                setRewardError(null);
              }}
              placeholder={t("suggestionsPage.rewardModalPlaceholder")}
              className="authInput"
              autoFocus
            />

            {/* Validation error */}
            {pointsInput !== "" && !isPointsValid && (
              <p className="authError">
                {pointsInput === ""
                  ? ""
                  : Number.isNaN(parsedPoints) ||
                      !Number.isInteger(parsedPoints)
                    ? t("suggestionsPage.validationInteger")
                    : parsedPoints < 1
                      ? t("suggestionsPage.validationMin")
                      : t("suggestionsPage.validationMax")}
              </p>
            )}

            {/* API error */}
            {rewardError && (
              <p className="authError">
                {rewardError}
              </p>
            )}

            {/* Footer actions */}
            <div className="sliderModalActions" style={{ justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                type="button"
                className="verificationActionButton subtle"
                onClick={closeRewardModal}
              >
                {t("suggestionsPage.cancel")}
              </button>
              <button
                type="button"
                disabled={
                  !isPointsValid || actionLoading === rewardTarget.id
                }
                className="verificationActionButton"
                style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                onClick={() => {
                  void handleConfirmReward();
                }}
              >
                {actionLoading === rewardTarget.id ? (
                  t("suggestionsPage.processing")
                ) : (
                  <>
                    <CheckCircleIcon />
                    {t("suggestionsPage.confirmReward")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
