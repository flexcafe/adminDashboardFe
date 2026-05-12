import { useCallback, useEffect, useMemo, useState } from "react";
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

const formatDateTime = (value: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const statusClass = (status: FacebookSubmissionStatus) => {
  if (status === "REJECTED") return "rejected";
  if (status === "APPROVED") return "completed";
  return "pending";
};

export function FacebookFollowPage() {
  const httpClient = container.resolve<HttpClient>("httpClient");
  const [submissions, setSubmissions] = useState<FacebookSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState("--");

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
          : "Failed to load Facebook follow submissions."
      );
    } finally {
      setIsLoading(false);
    }
  }, [httpClient]);

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

      showToast("Saved!");
      await loadSubmissions();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : `Failed to ${action} Facebook submission.`
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
          <p className="pageEyebrow">Facebook Follow</p>
          <h1 className="pageTitle">Facebook Follow Verification</h1>
          <p className="pageDescription">
            Review proof submissions, validate real follows, and keep the manual approval queue organized in one place.
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
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="verificationSummaryGrid">
        <div className="metricCard verificationSummaryCard verificationSummaryCardYellow">
          <div className="metricLabel">Pending Review</div>
          <div className="metricValue">{pendingCount}</div>
          <div className="metricMeta">Submissions waiting for manual approval</div>
        </div>
        <div className="metricCard verificationSummaryCard verificationSummaryCardGreen">
          <div className="metricLabel">Approved</div>
          <div className="metricValue">{approvedCount}</div>
          <div className="metricMeta">Users already awarded for Facebook follow</div>
        </div>
        <div className="metricCard verificationSummaryCard verificationSummaryCardBlue">
          <div className="metricLabel">Rejected</div>
          <div className="metricValue">{rejectedCount}</div>
          <div className="metricMeta">Proofs that did not pass review requirements</div>
        </div>
      </div>

      <div className="card verificationPanel">
        <section>
          <div className="verificationSearchRow facebookFollowToolbar">
            <div>
              <h2 className="sectionTitle">Submission Queue</h2>
              <p className="sectionDescription">
                Search by reseller, contact, or Facebook name to quickly review follow submissions and take action.
              </p>
            </div>
            <div className="verificationSearchField">
              <span className="verificationSearchIcon">
                <SearchIcon />
              </span>
              <input
                type="search"
                className="authInput verificationSearchInput"
                placeholder="Search submissions..."
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
                  <th>User</th>
                  <th>Contact</th>
                  <th>Facebook</th>
                  <th>Proof</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="verificationEmptyState">Loading submissions...</div>
                    </td>
                  </tr>
                ) : filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="verificationEmptyState">
                        {searchQuery.trim()
                          ? "No submissions match your search."
                          : "No Facebook follow submissions found."}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="verificationUserName">{item.userName}</div>
                        {item.userId ? <div className="muted">User ID: {item.userId}</div> : null}
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
                            Open profile
                          </a>
                        ) : (
                          <span className="muted">No profile link</span>
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
                            View proof
                          </a>
                        ) : (
                          <span className="muted">No proof file</span>
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
                              {savingKey === `approve-${item.id}` ? "..." : "Approve"}
                            </button>
                            <button
                              type="button"
                              className="verificationActionButton subtle danger"
                              disabled={!!savingKey}
                              onClick={() => runAction("reject", item.id)}
                            >
                              {savingKey === `reject-${item.id}` ? "..." : "Reject"}
                            </button>
                          </div>
                        ) : (
                          <span className="muted">No action</span>
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

      <p className="rewardsLastUpdated">Last updated: today at {lastUpdated}</p>
      {toastMessage ? <div className="rewardsToast">{toastMessage}</div> : null}
    </section>
  );
}
