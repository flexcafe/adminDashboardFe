import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ApiLoadingState } from "@/components/ApiLoadingState";
import {
  actionContentReport,
  addFilterKeyword,
  deactivateFilterKeyword,
  dismissContentReport,
  listContentReports,
  listFilterKeywords,
  type ContentReport,
  type ContentReportStatus,
  type FilterKeyword,
} from "@/features/contentModeration/contentModerationApi";

type Tab = "reports" | "keywords";
type ReportAction = "action" | "dismiss";

const humanize = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDate = (value: string, locale: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const shortId = (value: string) =>
  value.length > 13 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 21V4h8l1.5 2H20v10h-7l-1.5-2H5" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5h16M7 12h10M10 19h4" />
    </svg>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const { t } = useTranslation();
  return (
    <div className="moderationEmpty">
      {tab === "reports" ? <FlagIcon /> : <FilterIcon />}
      <strong>
        {tab === "reports"
          ? t("contentModerationPage.noReportsTitle")
          : t("contentModerationPage.noKeywordsTitle")}
      </strong>
      <span>
        {tab === "reports"
          ? t("contentModerationPage.noReportsDescription")
          : t("contentModerationPage.noKeywordsDescription")}
      </span>
    </div>
  );
}

export function ContentModerationPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>("reports");
  const [status, setStatus] = useState<ContentReportStatus>("PENDING");
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const [reports, setReports] = useState<ContentReport[]>([]);
  const [keywords, setKeywords] = useState<FilterKeyword[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportActionError, setReportActionError] = useState<string | null>(null);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<ContentReport | null>(null);
  const [reportAction, setReportAction] = useState<ReportAction>("action");
  const [adminNote, setAdminNote] = useState("");
  const [reporterMessage, setReporterMessage] = useState("");
  const [ejectUser, setEjectUser] = useState(true);
  const [keywordInput, setKeywordInput] = useState("");
  const [deactivateTarget, setDeactivateTarget] = useState<FilterKeyword | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setReports(await listContentReports(status));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("contentModerationPage.loadReportsError"));
    } finally {
      setIsLoading(false);
    }
  }, [status, t]);

  const loadKeywords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setKeywords(await listFilterKeywords());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("contentModerationPage.loadKeywordsError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    setSuccess(null);
    if (tab === "reports") void loadReports();
    else void loadKeywords();
  }, [loadKeywords, loadReports, tab]);

  useEffect(() => {
    if (!isStatusMenuOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!statusMenuRef.current?.contains(event.target as Node)) {
        setIsStatusMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [isStatusMenuOpen]);

  const pendingCount = useMemo(
    () => reports.filter((report) => report.status === "PENDING").length,
    [reports]
  );

  const openReportModal = (report: ContentReport, action: ReportAction) => {
    setActionTarget(report);
    setReportAction(action);
    setAdminNote("");
    setReporterMessage(
      action === "action"
        ? t("contentModerationPage.actionReporterMessage")
        : t("contentModerationPage.dismissReporterMessage")
    );
    setEjectUser(true);
    setReportActionError(null);
  };

  const closeReportModal = () => {
    if (isSubmitting) return;
    setActionTarget(null);
    setReportActionError(null);
  };

  const submitReportAction = async () => {
    if (!actionTarget) return;
    setIsSubmitting(true);
    setReportActionError(null);
    try {
      if (reportAction === "action") {
        await actionContentReport(actionTarget.id, {
              ejectUser,
              adminNote: adminNote.trim() || undefined,
              reporterMessage: reporterMessage.trim() || undefined,
            });
      } else {
        await dismissContentReport(actionTarget.id, {
          adminNote: adminNote.trim() || undefined,
          reporterMessage: reporterMessage.trim() || undefined,
        });
      }
      setActionTarget(null);
      setSuccess(
        t(
          reportAction === "action"
            ? "contentModerationPage.actionSuccess"
            : "contentModerationPage.dismissSuccess"
        )
      );
      await loadReports();
    } catch (submitError) {
      setReportActionError(submitError instanceof Error ? submitError.message : t("contentModerationPage.actionError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitKeyword = async (event: React.FormEvent) => {
    event.preventDefault();
    const keyword = keywordInput.trim();
    if (keyword.length < 2 || keyword.length > 100) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await addFilterKeyword(keyword);
      setKeywordInput("");
      setSuccess(t("contentModerationPage.keywordAddedSuccess"));
      await loadKeywords();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("contentModerationPage.addKeywordError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setIsSubmitting(true);
    setDeactivateError(null);
    try {
      await deactivateFilterKeyword(deactivateTarget.id);
      setDeactivateTarget(null);
      setSuccess(t("contentModerationPage.keywordDeactivatedSuccess"));
      await loadKeywords();
    } catch (submitError) {
      setDeactivateError(submitError instanceof Error ? submitError.message : t("contentModerationPage.deactivateError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <section className="page moderationPage">
        <div className="pageHeader">
          <div>
            <p className="pageEyebrow">{t("contentModerationPage.eyebrow")}</p>
            <h1 className="pageTitle">{t("contentModerationPage.title")}</h1>
            <p className="pageDescription">
              {t("contentModerationPage.description")}
            </p>
          </div>
          <div className="pageHeaderActions">
            <button
              type="button"
              className="verificationActionButton subtle"
              disabled={isLoading}
              onClick={() => void (tab === "reports" ? loadReports() : loadKeywords())}
            >
              {isLoading
                ? t("contentModerationPage.refreshing")
                : t("contentModerationPage.refresh")}
            </button>
          </div>
        </div>

        <div className="moderationTabs" role="tablist" aria-label={t("contentModerationPage.tabsLabel")}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "reports"}
            className={tab === "reports" ? "active" : ""}
            onClick={() => setTab("reports")}
          >
            <FlagIcon />
            {t("contentModerationPage.reportsTab")}
            {status === "PENDING" && pendingCount > 0 ? (
              <span className="moderationTabCount">{pendingCount}</span>
            ) : null}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "keywords"}
            className={tab === "keywords" ? "active" : ""}
            onClick={() => setTab("keywords")}
          >
            <FilterIcon />
            {t("contentModerationPage.keywordsTab")}
          </button>
        </div>

        <div className="card moderationCard">
          <div className="moderationToolbar">
            <div>
              <h2 className="sectionTitle">
                {tab === "reports"
                  ? t("contentModerationPage.reviewQueue")
                  : t("contentModerationPage.keywordFilters")}
              </h2>
              <p className="sectionDescription">
                {tab === "reports"
                  ? t("contentModerationPage.reviewQueueDescription")
                  : t("contentModerationPage.keywordFiltersDescription")}
              </p>
            </div>
            {tab === "reports" ? (
              <div className="moderationStatusFilter">
                <span>{t("contentModerationPage.status")}</span>
                <div className="moderationStatusMenu" ref={statusMenuRef}>
                  <button
                    type="button"
                    className="moderationStatusTrigger"
                    aria-haspopup="listbox"
                    aria-expanded={isStatusMenuOpen}
                    onClick={() => setIsStatusMenuOpen((open) => !open)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setIsStatusMenuOpen(false);
                    }}
                  >
                    {t(`contentModerationPage.statuses.${status}`)}
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="m6 8 4 4 4-4" />
                    </svg>
                  </button>
                  {isStatusMenuOpen ? (
                    <div className="moderationStatusOptions" role="listbox" aria-label={t("contentModerationPage.statusFilterLabel")}>
                      {(["PENDING", "ACTIONED", "DISMISSED"] as const).map((option) => (
                        <button
                          type="button"
                          key={option}
                          role="option"
                          aria-selected={status === option}
                          className={status === option ? "selected" : ""}
                          onClick={() => {
                            setStatus(option);
                            setIsStatusMenuOpen(false);
                          }}
                        >
                          {t(`contentModerationPage.statuses.${option}`)}
                          {status === option ? <span aria-hidden="true">✓</span> : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <form className="moderationKeywordForm" onSubmit={submitKeyword}>
                <label htmlFor="moderation-keyword">{t("contentModerationPage.newKeyword")}</label>
                <div>
                  <input
                    id="moderation-keyword"
                    className="authInput"
                    value={keywordInput}
                    minLength={2}
                    maxLength={100}
                    placeholder={t("contentModerationPage.keywordPlaceholder")}
                    onChange={(event) => setKeywordInput(event.target.value)}
                  />
                  <button
                    type="submit"
                    className="verificationActionButton"
                    disabled={isSubmitting || keywordInput.trim().length < 2}
                  >
                    {isSubmitting
                      ? t("contentModerationPage.adding")
                      : t("contentModerationPage.addKeyword")}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="moderationFeedback" aria-live="polite">
            {error ? <div className="moderationAlert error">{error}</div> : null}
            {success ? <div className="moderationAlert success">{success}</div> : null}
          </div>

          {isLoading ? (
            <ApiLoadingState label={t("contentModerationPage.loading")} />
          ) : tab === "reports" ? (
            reports.length === 0 ? <EmptyState tab="reports" /> : (
              <div className="moderationTableWrap">
                <table className="moderationTable">
                  <thead>
                    <tr>
                      <th>{t("contentModerationPage.reportColumn")}</th>
                      <th>{t("contentModerationPage.usersColumn")}</th>
                      <th>{t("contentModerationPage.targetColumn")}</th>
                      <th>{t("contentModerationPage.submittedColumn")}</th>
                      <th>{t("contentModerationPage.statusColumn")}</th>
                      <th>{t("contentModerationPage.actionsColumn")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id}>
                        <td>
                          <strong>{t(`contentModerationPage.reasons.${report.reason}`, { defaultValue: humanize(report.reason) })}</strong>
                          <span className="moderationCellSub">{report.details || t("contentModerationPage.noDetails")}</span>
                          <code title={report.id}>{shortId(report.id)}</code>
                        </td>
                        <td>
                          <span>{t("contentModerationPage.reportedUser", { name: report.reportedUserNickname })}</span>
                          <span className="moderationCellSub">{t("contentModerationPage.reportedBy", { name: report.reporterNickname })}</span>
                        </td>
                        <td>
                          <strong>{t(`contentModerationPage.targets.${report.targetType}`)}</strong>
                          <code title={report.targetId}>{shortId(report.targetId)}</code>
                        </td>
                        <td>{formatDate(report.createdAt, i18n.language)}</td>
                        <td><span className={`moderationBadge ${report.status.toLowerCase()}`}>{t(`contentModerationPage.statuses.${report.status}`)}</span></td>
                        <td>
                          {report.status === "PENDING" ? (
                            <div className="moderationActions">
                              <button type="button" className="moderationButton danger" onClick={() => openReportModal(report, "action")}>{t("contentModerationPage.takeAction")}</button>
                              <button type="button" className="moderationButton" onClick={() => openReportModal(report, "dismiss")}>{t("contentModerationPage.dismiss")}</button>
                            </div>
                          ) : <span className="moderationCellSub">{t("contentModerationPage.resolved")}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : keywords.length === 0 ? <EmptyState tab="keywords" /> : (
            <div className="moderationTableWrap">
              <table className="moderationTable keywords">
                <thead><tr><th>{t("contentModerationPage.keywordColumn")}</th><th>{t("contentModerationPage.addedColumn")}</th><th>{t("contentModerationPage.statusColumn")}</th><th>{t("contentModerationPage.actionsColumn")}</th></tr></thead>
                <tbody>
                  {keywords.map((keyword) => (
                    <tr key={keyword.id}>
                      <td><strong>{keyword.keyword}</strong><code title={keyword.id}>{shortId(keyword.id)}</code></td>
                      <td>{formatDate(keyword.createdAt, i18n.language)}</td>
                      <td><span className={`moderationBadge ${keyword.isActive ? "actioned" : "dismissed"}`}>{keyword.isActive ? t("contentModerationPage.active") : t("contentModerationPage.inactive")}</span></td>
                      <td>
                        {keyword.isActive ? (
                          <button type="button" className="moderationButton dangerOutline" onClick={() => {
                            setDeactivateError(null);
                            setDeactivateTarget(keyword);
                          }}>{t("contentModerationPage.deactivate")}</button>
                        ) : <span className="moderationCellSub">{t("contentModerationPage.deactivated")}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {actionTarget ? (
          <motion.div className="sliderModalOverlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeReportModal}>
            <motion.div
              className="sliderConfirmDialog moderationDialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="moderation-dialog-title"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={(event) => event.stopPropagation()}
            >
              <h2 id="moderation-dialog-title" className="sectionTitle">
                {reportAction === "action"
                  ? t("contentModerationPage.removeDialogTitle")
                  : t("contentModerationPage.dismissDialogTitle")}
              </h2>
              <p className="sectionDescription">
                {t(`contentModerationPage.reasons.${actionTarget.reason}`, { defaultValue: humanize(actionTarget.reason) })} ·{" "}
                {t(`contentModerationPage.targets.${actionTarget.targetType}`)} · {actionTarget.reportedUserNickname}
              </p>
              {reportAction === "action" ? (
                <label className="moderationCheckbox">
                  <input type="checkbox" checked={ejectUser} onChange={(event) => setEjectUser(event.target.checked)} />
                  <span><strong>{t("contentModerationPage.ejectUser")}</strong><small>{t("contentModerationPage.ejectUserHelp")}</small></span>
                </label>
              ) : null}
              <label className="moderationField" htmlFor="moderation-admin-note">
                <span>{t("contentModerationPage.adminNote")}</span>
                <textarea id="moderation-admin-note" maxLength={2000} value={adminNote} onChange={(event) => setAdminNote(event.target.value)} autoFocus />
                <small>{adminNote.length}/2000</small>
              </label>
              <label className="moderationField" htmlFor="moderation-reporter-message">
                <span>{t("contentModerationPage.reporterMessage")}</span>
                <textarea id="moderation-reporter-message" maxLength={2000} value={reporterMessage} onChange={(event) => setReporterMessage(event.target.value)} />
                <small>{reporterMessage.length}/2000</small>
              </label>
              {reportActionError ? <div className="moderationAlert error" role="alert">{reportActionError}</div> : null}
              <div className="sliderModalActions">
                <button type="button" className="verificationActionButton subtle" disabled={isSubmitting} onClick={closeReportModal}>{t("contentModerationPage.cancel")}</button>
                <button type="button" className={`verificationActionButton ${reportAction === "action" ? "danger" : ""}`} disabled={isSubmitting} onClick={() => void submitReportAction()}>
                  {isSubmitting
                    ? t("contentModerationPage.processing")
                    : reportAction === "action"
                      ? t("contentModerationPage.removeContent")
                      : t("contentModerationPage.dismissReport")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
        {deactivateTarget ? (
          <motion.div className="sliderModalOverlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => {
            if (!isSubmitting) {
              setDeactivateTarget(null);
              setDeactivateError(null);
            }
          }}>
            <motion.div className="sliderConfirmDialog moderationDialog compact" role="dialog" aria-modal="true" aria-labelledby="deactivate-keyword-title" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} onClick={(event) => event.stopPropagation()}>
              <h2 id="deactivate-keyword-title" className="sectionTitle">{t("contentModerationPage.deactivateTitle", { keyword: deactivateTarget.keyword })}</h2>
              <p className="sectionDescription">{t("contentModerationPage.deactivateDescription")}</p>
              {deactivateError ? <div className="moderationAlert error" role="alert">{deactivateError}</div> : null}
              <div className="sliderModalActions">
                <button type="button" className="verificationActionButton subtle" disabled={isSubmitting} onClick={() => {
                  setDeactivateTarget(null);
                  setDeactivateError(null);
                }}>{t("contentModerationPage.cancel")}</button>
                <button type="button" className="verificationActionButton danger" disabled={isSubmitting} onClick={() => void confirmDeactivate()}>{isSubmitting ? t("contentModerationPage.deactivating") : t("contentModerationPage.deactivate")}</button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
