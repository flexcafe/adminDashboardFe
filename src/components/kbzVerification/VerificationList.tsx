import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type {
  VerificationListTab,
  VerificationRecord,
} from "@/features/kbzVerification/types";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

type VerificationListProps = {
  activeTab: VerificationListTab;
  onTabChange: (tab: VerificationListTab) => void;
  registeredAccounts: VerificationRecord[];
  verificationRequested: VerificationRecord[];
  moneyCheckRequests: VerificationRecord[];
  verifiedUsers: VerificationRecord[];
  isLoading: boolean;
  error?: string | null;
  onRefresh: () => void;
};

const formatDate = (value: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleDateString();
};

const TAB_LABELS: Record<VerificationListTab, string> = {
  registered: "Registered Accounts",
  requested: "Verification Requested",
  moneyCheck: "Money Check",
  verified: "Verified Users",
};

const EMPTY_LABELS: Record<VerificationListTab, string> = {
  registered: "No data available.",
  requested: "No verification requests yet.",
  moneyCheck: "No money check requests yet.",
  verified: "No data available.",
};

const getStatusBadgeClassName = (status: VerificationRecord["status"]) => {
  switch (status) {
    case "REGISTERED":
      return "verificationStatusBadge registered";
    case "VERIFICATION_REQUESTED":
      return "verificationStatusBadge requested";
    case "MONEY_CHECK":
      return "verificationStatusBadge requested";
    case "VERIFIED":
      return "verificationStatusBadge verified";
    default:
      return "verificationStatusBadge";
  }
};

export function VerificationList({
  activeTab,
  onTabChange,
  registeredAccounts,
  verificationRequested,
  moneyCheckRequests,
  verifiedUsers,
  isLoading,
  error,
  onRefresh,
}: VerificationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const itemsByTab: Record<VerificationListTab, VerificationRecord[]> = {
    registered: registeredAccounts,
    requested: verificationRequested,
    moneyCheck: moneyCheckRequests,
    verified: verifiedUsers,
  };
  const baseItems = itemsByTab[activeTab];
  const items = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return baseItems;
    return baseItems.filter((item) =>
      `${item.userName} ${item.userPhoneOrEmail}`.toLowerCase().includes(query)
    );
  }, [baseItems, searchQuery]);
  const totalActionable = verificationRequested.length + moneyCheckRequests.length;

  return (
    <section className="page verificationPage">
      <div className="pageHeader">
        <div>
          <p className="pageEyebrow">Verification</p>
          <h1 className="pageTitle">KBZPay Ownership Verification</h1>
          <p className="pageDescription">
            Track registered KBZPay accounts, send transfer instructions, and
            verify completed submissions from one admin queue.
          </p>
        </div>
        <div className="pageHeaderActions">
          <button
            type="button"
            className="verificationActionButton"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="verificationSummaryGrid">
        <div className="metricCard verificationSummaryCard verificationSummaryCardBlue">
          <div className="metricLabel">Awaiting Action</div>
          <div className="metricValue">{totalActionable}</div>
          <div className="metricMeta">
            {isLoading
              ? "Syncing KBZPay queues..."
              : "Needs instruction or verification"}
          </div>
        </div>
        <div className="metricCard verificationSummaryCard verificationSummaryCardYellow">
          <div className="metricLabel">Registered</div>
          <div className="metricValue verificationMetricCompact">
            {registeredAccounts.length}
          </div>
          <div className="metricMeta">Accounts with no verification request yet</div>
        </div>
        <div className="metricCard verificationSummaryCard verificationSummaryCardGreen">
          <div className="metricLabel">Verified</div>
          <div className="metricValue">{verifiedUsers.length}</div>
          <div className="metricMeta">Completed KBZPay ownership checks</div>
        </div>
      </div>

      <div className="card verificationPanel">
        <div
          className="verificationTabs"
          role="tablist"
          aria-label="Verification sections"
        >
          {(
            Object.keys(TAB_LABELS) as VerificationListTab[]
          ).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={
                activeTab === tab ? "verificationTab active" : "verificationTab"
              }
              onClick={() => onTabChange(tab)}
            >
              <span className="verificationTabLabel">{TAB_LABELS[tab]}</span>
              <span className="verificationTabCount">
                {itemsByTab[tab].length}
              </span>
            </button>
          ))}
        </div>

        <div className="verificationTableWrap">
          <div className="verificationSearchRow">
            <div className="verificationSearchField">
              <span className="verificationSearchIcon">
                <SearchIcon />
              </span>
              <input
                type="search"
                className="authInput verificationSearchInput"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>
          <table className="verificationTable">
            <thead>
              <tr>
                <th>User Name</th>
                <th>Phone Number</th>
                <th>Status</th>
                <th>Date</th>
                <th className="verificationActionCell">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="verificationEmptyState">
                      {searchQuery.trim() ? "No users found." : EMPTY_LABELS[activeTab]}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={`${item.status}-${item.userId}`}>
                    <td>
                      <div className="verificationUserCell">
                        <span className="verificationUserName">{item.userName}</span>
                      </div>
                    </td>
                    <td>{item.userPhoneOrEmail}</td>
                    <td>
                      <span className={getStatusBadgeClassName(item.status)}>
                        {item.statusLabel}
                      </span>
                    </td>
                    <td>{formatDate(item.lastActionAt || item.createdAt)}</td>
                    <td className="verificationActionCell">
                      <Link
                        to={`/dashboard/${item.userId}`}
                        className="verificationActionButton subtle"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {error ? <p className="authError surfaceMessage">{error}</p> : null}
    </section>
  );
}
