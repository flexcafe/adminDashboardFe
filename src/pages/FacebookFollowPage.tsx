import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import container from "@/core/infrastructure/di/container";
import { HttpClient } from "@/core/infrastructure/api/HttpClient";
import { API_ENDPOINTS } from "@/core/infrastructure/api/constants";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

type ApiResponse<T> = {
  message?: string;
  code?: number;
  data?: T;
};

type FacebookSubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";

type FacebookSubmission = {
  id: string;
  userId: string;
  userName: string;
  contact: string;
  facebookName: string;
  facebookProfileUrl: string;
  proofImageUrl: string;
  submittedAt: string;
  status: FacebookSubmissionStatus;
};

const toText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const toRecordArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object"
    );
  }

  if (value && typeof value === "object") {
    const root = value as Record<string, unknown>;
    const candidates = [
      root.items,
      root.rows,
      root.submissions,
      root.records,
      root.data,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.filter(
          (item): item is Record<string, unknown> =>
            !!item && typeof item === "object"
        );
      }
    }
  }

  return [];
};

const normalizeStatus = (value: unknown): FacebookSubmissionStatus => {
  const status = toText(value).trim().toUpperCase();
  if (status === "APPROVED" || status === "REJECTED") return status;
  return "PENDING";
};

const normalizeSubmission = (
  item: Record<string, unknown>
): FacebookSubmission | null => {
  const id =
    toText(item.id) ||
    toText(item.submissionId) ||
    toText(item._id) ||
    toText(item.requestId);

  if (!id) return null;

  return {
    id,
    userId: toText(item.userId) || toText(item.user_id),
    userName:
      toText(item.userName) ||
      toText(item.name) ||
      toText(item.nickname) ||
      "Unknown user",
    contact:
      toText(item.phone) ||
      toText(item.email) ||
      toText(item.userPhoneOrEmail) ||
      "-",
    facebookName:
      toText(item.facebookName) ||
      toText(item.facebookProfileName) ||
      toText(item.profileName) ||
      "-",
    facebookProfileUrl:
      toText(item.facebookProfileUrl) ||
      toText(item.profileUrl) ||
      toText(item.facebookUrl) ||
      toText(item.followUrl),
    proofImageUrl:
      toText(item.proofImageUrl) ||
      toText(item.screenshotUrl) ||
      toText(item.imageUrl) ||
      toText(item.proofUrl) ||
      toText(item.image),
    submittedAt:
      toText(item.submittedAt) ||
      toText(item.createdAt) ||
      toText(item.requestedAt),
    status: normalizeStatus(item.status),
  };
};

const statusClass = (status: FacebookSubmissionStatus) => {
  if (status === "REJECTED") return "rejected";
  if (status === "APPROVED") return "completed";
  return "pending";
};

export function FacebookFollowPage() {
  const { i18n, t } = useTranslation();
  const httpClient = container.resolve<HttpClient>("httpClient");
  const [submissions, setSubmissions] = useState<FacebookSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState("--");

  const formatDateTime = (value: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(i18n.language);
  };

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  }, []);

  const loadSubmissions = useCallback(async () => {
    try {
      setIsLoading(true);
      setPageError(null);
      const response = await httpClient.get<ApiResponse<unknown>>(
        API_ENDPOINTS.DASHBOARD_FACEBOOK_FOLLOW.BASE
      );

      const normalized = toRecordArray(response?.data)
        .map((item) => normalizeSubmission(item))
        .filter((item): item is FacebookSubmission => !!item)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

      setSubmissions(normalized);
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
          : t("facebookFollowPage.loadError")
      );
    } finally {
      setIsLoading(false);
    }
  }, [httpClient, t]);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  const runAction = async (
    action: "approve" | "reject",
    submissionId: string
  ) => {
    try {
      setSavingKey(`${action}-${submissionId}`);
      setPageError(null);

      if (action === "approve") {
        await httpClient.post<ApiResponse<unknown>>(
          API_ENDPOINTS.DASHBOARD_FACEBOOK_FOLLOW.APPROVE(submissionId)
        );
      } else {
        await httpClient.post<ApiResponse<unknown>>(
          API_ENDPOINTS.DASHBOARD_FACEBOOK_FOLLOW.REJECT(submissionId)
        );
      }

      showToast(t("facebookFollowPage.saved"));
      await loadSubmissions();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : t(
              action === "approve"
                ? "facebookFollowPage.approveError"
                : "facebookFollowPage.rejectError"
            )
      );
    } finally {
      setSavingKey(null);
    }
  };

  const pendingCount = useMemo(
    () => submissions.filter((item) => item.status === "PENDING").length,
    [submissions]
  );

  const approvedCount = useMemo(
    () => submissions.filter((item) => item.status === "APPROVED").length,
    [submissions]
  );

  const rejectedCount = useMemo(
    () => submissions.filter((item) => item.status === "REJECTED").length,
    [submissions]
  );

  const filteredSubmissions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return submissions;

    return submissions.filter((item) =>
      `${item.userName} ${item.contact} ${item.facebookName} ${item.userId}`.toLowerCase().includes(query)
    );
  }, [searchQuery, submissions]);

  return (
    <section className="page verificationPage">
      <div className="pageHeader">
        <div>
          <p className="pageEyebrow">{t("facebookFollowPage.eyebrow")}</p>
          <h1 className="pageTitle">{t("facebookFollowPage.title")}</h1>
          <p className="pageDescription">
            {t("facebookFollowPage.description")}
          </p>
        </div>
        <div className="pageHeaderActions">
          <button
            type="button"
            className="verificationActionButton"
            onClick={() => {
              void loadSubmissions();
            }}
            disabled={isLoading || !!savingKey}
          >
            {isLoading ? t("facebookFollowPage.refreshing") : t("common.refresh")}
          </button>
        </div>
      </div>

      <div className="verificationSummaryGrid">
        <div className="metricCard verificationSummaryCard verificationSummaryCardYellow">
          <div className="metricLabel">{t("facebookFollowPage.pendingReview")}</div>
          <div className="metricValue">{pendingCount}</div>
          <div className="metricMeta">{t("facebookFollowPage.pendingReviewMeta")}</div>
        </div>
        <div className="metricCard verificationSummaryCard verificationSummaryCardGreen">
          <div className="metricLabel">{t("facebookFollowPage.approved")}</div>
          <div className="metricValue">{approvedCount}</div>
          <div className="metricMeta">{t("facebookFollowPage.approvedMeta")}</div>
        </div>
        <div className="metricCard verificationSummaryCard verificationSummaryCardBlue">
          <div className="metricLabel">{t("facebookFollowPage.rejected")}</div>
          <div className="metricValue">{rejectedCount}</div>
          <div className="metricMeta">{t("facebookFollowPage.rejectedMeta")}</div>
        </div>
      </div>

      <div className="card verificationPanel">
        <section>
          <div className="verificationSearchRow facebookFollowToolbar">
            <div>
              <h2 className="sectionTitle">{t("facebookFollowPage.queueTitle")}</h2>
              <p className="sectionDescription">
                {t("facebookFollowPage.queueDescription")}
              </p>
            </div>
            <div className="verificationSearchField">
              <span className="verificationSearchIcon">
                <SearchIcon />
              </span>
              <input
                type="search"
                className="authInput verificationSearchInput"
                placeholder={t("facebookFollowPage.searchPlaceholder")}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>

          {pageError ? <p className="authError surfaceMessage facebookFollowError">{pageError}</p> : null}

          <div className="verificationTableWrap">
            <table className="verificationTable">
              <thead>
                <tr>
                  <th>{t("facebookFollowPage.user")}</th>
                  <th>{t("facebookFollowPage.contact")}</th>
                  <th>{t("facebookFollowPage.facebook")}</th>
                  <th>{t("facebookFollowPage.proof")}</th>
                  <th>{t("facebookFollowPage.status")}</th>
                  <th>{t("facebookFollowPage.submitted")}</th>
                  <th>{t("facebookFollowPage.action")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="verificationEmptyState">{t("facebookFollowPage.loading")}</div>
                    </td>
                  </tr>
                ) : filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="verificationEmptyState">
                        {searchQuery.trim()
                          ? t("facebookFollowPage.emptySearch")
                          : t("facebookFollowPage.emptyDefault")}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="verificationUserName">{item.userName}</div>
                        {item.userId ? <div className="muted">{t("facebookFollowPage.userId", { id: item.userId })}</div> : null}
                      </td>
                      <td>{item.contact}</td>
                      <td>
                        <div>{item.facebookName}</div>
                        {item.facebookProfileUrl ? (
                          <a
                            href={item.facebookProfileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="facebookFollowLink"
                          >
                            {t("facebookFollowPage.openProfile")}
                          </a>
                        ) : (
                          <span className="muted">{t("facebookFollowPage.noProfileLink")}</span>
                        )}
                      </td>
                      <td>
                        {item.proofImageUrl ? (
                          <a
                            href={item.proofImageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="facebookFollowLink"
                          >
                            {t("facebookFollowPage.viewProof")}
                          </a>
                        ) : (
                          <span className="muted">{t("facebookFollowPage.noProofFile")}</span>
                        )}
                      </td>
                      <td>
                        <span className={`rewardsBadge ${statusClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{formatDateTime(item.submittedAt)}</td>
                      <td className="verificationActionCell">
                        {item.status === "PENDING" ? (
                          <div className="rewardsInlineActions facebookFollowActions">
                            <button
                              type="button"
                              className="verificationActionButton"
                              disabled={!!savingKey}
                              onClick={() => runAction("approve", item.id)}
                            >
                              {savingKey === `approve-${item.id}` ? "..." : t("facebookFollowPage.approve")}
                            </button>
                            <button
                              type="button"
                              className="verificationActionButton subtle danger"
                              disabled={!!savingKey}
                              onClick={() => runAction("reject", item.id)}
                            >
                              {savingKey === `reject-${item.id}` ? "..." : t("facebookFollowPage.reject")}
                            </button>
                          </div>
                        ) : (
                          <span className="muted">{t("facebookFollowPage.noAction")}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <p className="rewardsLastUpdated">{t("facebookFollowPage.lastUpdated", { time: lastUpdated })}</p>
      {toastMessage ? <div className="rewardsToast">{toastMessage}</div> : null}
    </section>
  );
}
