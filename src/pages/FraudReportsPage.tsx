import { useCallback, useEffect, useMemo, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Check, Copy } from "lucide-react";
import { ApiLoadingState } from "@/components/ApiLoadingState";
import {
  banUser,
  confirmFraudReport,
  dismissFraudReport,
  listFraudReports,
  unbanUser,
  type ConfirmDismissPayload,
  type FraudReport,
  type FraudReportsListResponse,
} from "@/features/fraudReports/fraudReportsApi";

// ── Inline Icons ───────────────────────────────────────────────────────────────

function AlertTriangleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 9v4" />
      <path d="M10.36 3.76a2 2 0 0 1 3.28 0l7.54 12.6A2 2 0 0 1 19.54 19H4.46a2 2 0 0 1-1.64-3.06l7.54-12.6Z" />
      <circle cx="12" cy="17" r="0.5" fill="currentColor" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 21V4h7l1 2h8v10H11l-1-2H4" />
    </svg>
  );
}

function BanIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m4.93 4.93 14.14 14.14" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const getStatusBadgeClassName = (status: FraudReport["status"]) => {
  switch (status) {
    case "PENDING":
      return "rewardsBadge pending";
    case "CONFIRMED":
      return "rewardsBadge completed";
    case "DISMISSED":
      return "rewardsBadge rejected";
    default:
      return "rewardsBadge pending";
  }
};

const getStatusLabel = (status: FraudReport["status"], t: (key: string) => string) => {
  switch (status) {
    case "PENDING":
      return t("fraudReportsPage.pending");
    case "CONFIRMED":
      return t("fraudReportsPage.confirmed");
    case "DISMISSED":
      return t("fraudReportsPage.dismissed");
    default:
      return status;
  }
};

const getBannedBadgeClassName = (isBanned: boolean) => {
  return isBanned ? "rewardsBadge rejected" : "rewardsBadge completed";
};

const getBannedLabel = (isBanned: boolean, t: (key: string) => string) => {
  return isBanned ? t("fraudReportsPage.banned") : t("fraudReportsPage.notBanned");
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const truncateId = (id: string): string => {
  if (id.length <= 10) return id;
  return `${id.slice(0, 6)}...${id.slice(-4)}`;
};

// ── Page Component ─────────────────────────────────────────────────────────────

export function FraudReportsPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<FraudReportsListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "confirm" | "dismiss" | "ban" | "unban";
    report: FraudReport | null;
  } | null>(null);
  const [reporterMessage, setReporterMessage] = useState("");
  const [blockReportedUser, setBlockReportedUser] = useState(false);

  const closeConfirmDialog = () => {
    setConfirmDialog(null);
    setReporterMessage("");
    setBlockReportedUser(false);
  };

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2200);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setPageError(null);
      const result = await listFraudReports();
      setData(result);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : t("fraudReportsPage.loadError")
      );
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredReports = useMemo(() => {
    if (!data) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return data.reports;

    return data.reports.filter(
      (item) =>
        `${item.reporterName} ${item.reportedUserName} ${item.reason} ${item.description}`
          .toLowerCase()
          .includes(query)
    );
  }, [searchQuery, data]);

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleConfirmAction = async () => {
    if (!confirmDialog || !confirmDialog.report) return;

    const { report, type } = confirmDialog;

    try {
      setIsSaving(true);
      setPageError(null);

      const trimmedReporterMessage = reporterMessage.trim();
      const payload: ConfirmDismissPayload = trimmedReporterMessage
        ? { reporterMessage: trimmedReporterMessage }
        : {};

      switch (type) {
        case "confirm":
          await confirmFraudReport(report.id, payload);
          if (blockReportedUser) {
            await banUser(report.reportedUserId);
          }
          showToast(t("fraudReportsPage.confirmedToast"));
          break;
        case "dismiss":
          await dismissFraudReport(report.id, payload);
          showToast(t("fraudReportsPage.dismissedToast"));
          break;
        case "ban": {
          const banResult = await banUser(report.reportedUserId);
          showToast(t("fraudReportsPage.bannedToast"));
          // Update the local record with the authoritative isBanned value from the API response
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  reports: prev.reports.map((r) =>
                    r.reportedUserId === banResult.userId
                      ? { ...r, isReportedUserBanned: banResult.isBanned }
                      : r
                  ),
                }
              : prev
          );
          break;
        }
        case "unban": {
          const unbanResult = await unbanUser(report.reportedUserId);
          showToast(t("fraudReportsPage.unbannedToast"));
          // Update the local record with the authoritative isBanned value from the API response
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  reports: prev.reports.map((r) =>
                    r.reportedUserId === unbanResult.userId
                      ? { ...r, isReportedUserBanned: unbanResult.isBanned }
                      : r
                  ),
                }
              : prev
          );
          break;
        }
      }

      closeConfirmDialog();

      // For confirm/dismiss we need to reload because the report status changes.
      // For ban/unban we skip reloading because we already updated the local state
      // with the authoritative isBanned value from the API response, and the list
      // endpoint may not immediately reflect the change.
      if (type === "confirm" || type === "dismiss") {
        await loadData();
      }
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : t("fraudReportsPage.actionError")
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const reports = data?.reports ?? [];
  const pendingCount = data?.pendingCount ?? 0;
  const confirmedCount = data?.confirmedCount ?? 0;
  const dismissedCount = data?.dismissedCount ?? 0;

  return (
    <section className="page fraudReportsPage">
      {/* Page Header */}
      <div className="pageHeader">
        <div>
          <p className="pageEyebrow">{t("fraudReportsPage.eyebrow")}</p>
          <h1 className="pageTitle">{t("fraudReportsPage.title")}</h1>
          <p className="pageDescription">{t("fraudReportsPage.description")}</p>
        </div>
        <div className="pageHeaderActions">
          <button
            type="button"
            className="verificationActionButton subtle"
            onClick={() => {
              void loadData();
            }}
            disabled={isLoading || isSaving}
          >
            {isLoading ? t("fraudReportsPage.refreshing") : t("common.refresh")}
          </button>
        </div>
      </div>

      <div className="fraudReportsContent">
        {/* Stats Cards */}
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <div className="metricCard rewardsSummaryCard">
            <div className="rewardsSummaryIcon rewardsSummaryIconAmber">
              <AlertTriangleIcon />
            </div>
            <div className="metricLabel">{t("fraudReportsPage.totalReports")}</div>
            <div className="metricValue">{reports.length}</div>
            <div className="metricMeta">{t("fraudReportsPage.totalReportsMeta")}</div>
          </div>
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <div className="metricCard rewardsSummaryCard">
            <div className="rewardsSummaryIcon rewardsSummaryIconAmber">
              <FlagIcon />
            </div>
            <div className="metricLabel">{t("fraudReportsPage.pendingReports")}</div>
            <div className="metricValue">{pendingCount}</div>
            <div className="metricMeta">{t("fraudReportsPage.pendingReportsMeta")}</div>
          </div>
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <div className="metricCard rewardsSummaryCard">
            <div className="rewardsSummaryIcon rewardsSummaryIconGreen">
              <CheckCircleIcon />
            </div>
            <div className="metricLabel">{t("fraudReportsPage.confirmedReports")}</div>
            <div className="metricValue">{confirmedCount}</div>
            <div className="metricMeta">{t("fraudReportsPage.confirmedReportsMeta")}</div>
          </div>
          </div>
          <div className="col-span-12 sm:col-span-6 lg:col-span-3">
            <div className="metricCard rewardsSummaryCard">
            <div className="rewardsSummaryIcon rewardsSummaryIconRed">
              <XCircleIcon />
            </div>
            <div className="metricLabel">{t("fraudReportsPage.dismissedReports")}</div>
            <div className="metricValue">{dismissedCount}</div>
            <div className="metricMeta">{t("fraudReportsPage.dismissedReportsMeta")}</div>
              </div>
            </div>
        </div>

        {/* Error message */}
        {pageError ? <p className="authError surfaceMessage">{pageError}</p> : null}

        {/* Reports Table */}
        <section className="card w-full fraudReportsTableCard">
          <div className="sliderSectionHead sliderSectionHeadSplit">
          <div>
            <h2 className="sectionTitle">{t("fraudReportsPage.listTitle")}</h2>
            <p className="sectionDescription">
              {t("fraudReportsPage.listDescription")}
            </p>
          </div>
          <div className="verificationSearchField sliderSearchField">
            <input
              type="search"
              className="authInput verificationSearchInput"
              placeholder={t("fraudReportsPage.searchPlaceholder")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="sliderAdsTableWrap">
          <table className="verificationTable">
            <thead>
              <tr>
                <th>{t("fraudReportsPage.reporterColumn")}</th>
                <th>{t("fraudReportsPage.reportedUserColumn")}</th>
                <th>{t("fraudReportsPage.reasonColumn")}</th>
                <th>{t("fraudReportsPage.statusColumn")}</th>
                <th>{t("fraudReportsPage.bannedColumn")}</th>
                <th className="verificationActionCell">{t("fraudReportsPage.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6}>
                    <ApiLoadingState label={t("fraudReportsPage.loading")} compact />
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="verificationEmptyState">
                      {searchQuery.trim()
                        ? t("fraudReportsPage.emptySearch")
                        : t("fraudReportsPage.emptyDefault")}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <div className="sliderTableTitle">{report.reporterName}</div>
                      <div className="muted text-xs fraudIdRow">
                        <span className="fraudTruncatedId">{truncateId(report.reporterUserId)}</span>
                        <button
                          type="button"
                          className="fraudCopyIdBtn"
                          title="Copy reporter ID"
                          onClick={() => {
                            void navigator.clipboard.writeText(report.reporterUserId);
                            setCopiedId(`reporter-${report.id}`);
                            window.setTimeout(() => setCopiedId(null), 1500);
                          }}
                        >
                          {copiedId === `reporter-${report.id}` ? (
                            <Check size={12} />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="sliderTableTitle">{report.reportedUserName}</div>
                      <div className="muted text-xs fraudIdRow">
                        <span className="fraudTruncatedId">{truncateId(report.reportedUserId)}</span>
                        <button
                          type="button"
                          className="fraudCopyIdBtn"
                          title="Copy reported user ID"
                          onClick={() => {
                            void navigator.clipboard.writeText(report.reportedUserId);
                            setCopiedId(`reported-${report.id}`);
                            window.setTimeout(() => setCopiedId(null), 1500);
                          }}
                        >
                          {copiedId === `reported-${report.id}` ? (
                            <Check size={12} />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td>
                      {report.fraudType ? (
                        <span className="fraudTypeBadge">
                          {report.fraudType.replace(/_/g, " ")}
                        </span>
                      ) : null}
                      {report.description ? (
                        <div className="fraudTypeDescription">
                          {report.description}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span className={getStatusBadgeClassName(report.status)}>
                        {getStatusLabel(report.status, t)}
                      </span>
                    </td>
                    <td>
                      <span className={getBannedBadgeClassName(report.isReportedUserBanned)}>
                        {getBannedLabel(report.isReportedUserBanned, t)}
                      </span>
                    </td>
                    <td className="verificationActionCell">
                      <div className="sliderActionButtons">
                        {report.status === "PENDING" ? (
                          <>
                            <button
                              type="button"
                              className="verificationActionButton subtle"
                              onClick={() =>
                                setConfirmDialog({ type: "confirm", report })
                              }
                              disabled={isSaving}
                              title={t("fraudReportsPage.confirmTitle")}
                            >
                              <CheckCircleIcon />
                              <span>{t("fraudReportsPage.confirm")}</span>
                            </button>
                            <button
                              type="button"
                              className="verificationActionButton subtle danger"
                              onClick={() =>
                                setConfirmDialog({ type: "dismiss", report })
                              }
                              disabled={isSaving}
                              title={t("fraudReportsPage.dismissTitle")}
                            >
                              <XCircleIcon />
                              <span>{t("fraudReportsPage.dismiss")}</span>
                            </button>
                          </>
                        ) : null}
                        {report.isReportedUserBanned ? (
                          <button
                            type="button"
                            className="verificationActionButton subtle"
                            onClick={() =>
                              setConfirmDialog({ type: "unban", report })
                            }
                            disabled={isSaving}
                            title={t("fraudReportsPage.unbanTitle")}
                          >
                            <span>{t("fraudReportsPage.unban")}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="verificationActionButton subtle danger"
                            onClick={() =>
                              setConfirmDialog({ type: "ban", report })
                            }
                            disabled={isSaving}
                            title={t("fraudReportsPage.banTitle")}
                          >
                            <BanIcon />
                            <span>{t("fraudReportsPage.ban")}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      </div>

      {/* Toast */}
      {toastMessage ? <div className="rewardsToast">{toastMessage}</div> : null}

      {/* Confirmation Dialog */}
      {confirmDialog ? (
        <div
          className="sliderModalOverlay"
          role="presentation"
          onClick={closeConfirmDialog}
        >
          <div
            className="sliderConfirmDialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fraud-report-confirm-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="fraud-report-confirm-title" className="sectionTitle">
              {confirmDialog.type === "confirm"
                ? `${t("fraudReportsPage.confirmTitle")}: ${confirmDialog.report?.reporterName ?? ""}`
                : confirmDialog.type === "dismiss"
                  ? `${t("fraudReportsPage.dismissTitle")}: ${confirmDialog.report?.reporterName ?? ""}`
                  : confirmDialog.type === "ban"
                    ? `${t("fraudReportsPage.banTitle")}: ${confirmDialog.report?.reportedUserName ?? ""}`
                    : `${t("fraudReportsPage.unbanTitle")}: ${confirmDialog.report?.reportedUserName ?? ""}`}
            </h2>
            <p className="sectionDescription">
              {confirmDialog.type === "confirm" ? (
                <Trans
                  i18nKey="fraudReportsPage.confirmDescription"
                  values={{
                    reporter: confirmDialog.report?.reporterName,
                    reported: confirmDialog.report?.reportedUserName,
                  }}
                  components={{ strong: <strong /> }}
                />
              ) : confirmDialog.type === "dismiss" ? (
                <Trans
                  i18nKey="fraudReportsPage.dismissDescription"
                  values={{
                    reporter: confirmDialog.report?.reporterName,
                    reported: confirmDialog.report?.reportedUserName,
                  }}
                  components={{ strong: <strong /> }}
                />
              ) : confirmDialog.type === "ban" ? (
                <Trans
                  i18nKey="fraudReportsPage.banDescription"
                  values={{
                    user: confirmDialog.report?.reportedUserName,
                  }}
                  components={{ strong: <strong /> }}
                />
              ) : (
                <Trans
                  i18nKey="fraudReportsPage.unbanDescription"
                  values={{
                    user: confirmDialog.report?.reportedUserName,
                  }}
                  components={{ strong: <strong /> }}
                />
              )}
            </p>

            {(confirmDialog.type === "confirm" || confirmDialog.type === "dismiss") && (
              <div className="fraudConfirmForm">
                <div className="fraudFormField">
                  <label className="fraudFormLabel" htmlFor="reporter-message">
                    {t("fraudReportsPage.reporterMessageLabel")}
                  </label>
                  <textarea
                    id="reporter-message"
                    className="authInput fraudFormTextarea"
                    rows={3}
                    maxLength={2000}
                    placeholder={t("fraudReportsPage.reporterMessagePlaceholder")}
                    value={reporterMessage}
                    onChange={(e) => setReporterMessage(e.target.value)}
                    disabled={isSaving}
                  />
                  <span className="fraudFormCharCount">
                    {reporterMessage.length}/2000
                  </span>
                </div>
                <div className="fraudFormField fraudFormCheckboxField">
                  <label className="fraudFormCheckboxLabel">
                    <input
                      type="checkbox"
                      className="fraudFormCheckbox"
                      checked={blockReportedUser}
                      onChange={(e) => setBlockReportedUser(e.target.checked)}
                      disabled={isSaving}
                    />
                    <span>{t("fraudReportsPage.blockReportedUserLabel")}</span>
                  </label>
                </div>
              </div>
            )}

            <div className="sliderModalActions">
              <button
                type="button"
                className="verificationActionButton subtle"
                onClick={closeConfirmDialog}
                disabled={isSaving}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className={[
                  "verificationActionButton",
                  confirmDialog.type === "ban"
                    ? "danger"
                    : confirmDialog.type === "unban" || confirmDialog.type === "confirm"
                      ? "success"
                      : "subtle",
                ].join(" ")}
                onClick={() => {
                  void handleConfirmAction();
                }}
                disabled={isSaving}
              >
                {isSaving
                  ? t("fraudReportsPage.processing")
                  : confirmDialog.type === "confirm"
                    ? t("fraudReportsPage.confirm")
                    : confirmDialog.type === "dismiss"
                      ? t("fraudReportsPage.dismiss")
                      : confirmDialog.type === "ban"
                        ? t("fraudReportsPage.ban")
                        : t("fraudReportsPage.unban")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
