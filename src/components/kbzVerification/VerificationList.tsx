import { AlertCircle, ShieldCheck, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { i18n, t } = useTranslation();
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

  const formatDate = (value: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 10);
    return date.toLocaleDateString(i18n.language);
  };

  const tabLabels: Record<VerificationListTab, string> = {
    registered: t("verificationPage.registeredAccounts"),
    requested: t("verificationPage.verificationRequested"),
    moneyCheck: t("verificationPage.moneyCheck"),
    verified: t("verificationPage.verifiedUsers"),
  };

  const emptyLabels: Record<VerificationListTab, string> = {
    registered: t("verificationPage.emptyRegistered"),
    requested: t("verificationPage.emptyRequested"),
    moneyCheck: t("verificationPage.emptyMoneyCheck"),
    verified: t("verificationPage.emptyVerified"),
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

  return (
    <section className="page verificationPage">
      <div className="pageHeader">
        <div>
          <p className="pageEyebrow">{t("verificationPage.eyebrow")}</p>
          <h1 className="pageTitle">{t("verificationPage.title")}</h1>
          <p className="pageDescription">
            {t("verificationPage.description")}
          </p>
        </div>
        <div className="pageHeaderActions">
          <button
            type="button"
            className="verificationActionButton"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? t("verificationPage.refreshing") : t("common.refresh")}
          </button>
        </div>
      </div>

      <div className="verificationSummaryGrid">
        <div className="metricCard verificationSummaryCard verificationSummaryCardBlue">
          <div className="rewardsSummaryIcon rewardsSummaryIconBlue">
            <AlertCircle size={18} />
          </div>
          <div className="metricLabel">{t("verificationPage.awaitingAction")}</div>
          <div className="metricValue">{totalActionable}</div>
          <div className="metricMeta">
            {isLoading ? t("verificationPage.syncing") : t("verificationPage.needsAction")}
          </div>
        </div>
        <div className="metricCard verificationSummaryCard verificationSummaryCardYellow">
          <div className="rewardsSummaryIcon rewardsSummaryIconAmber">
            <UserCheck size={18} />
          </div>
          <div className="metricLabel">{t("verificationPage.registered")}</div>
          <div className="metricValue verificationMetricCompact">
            {registeredAccounts.length}
          </div>
          <div className="metricMeta">{t("verificationPage.registeredMeta")}</div>
        </div>
        <div className="metricCard verificationSummaryCard verificationSummaryCardGreen">
          <div className="rewardsSummaryIcon rewardsSummaryIconEmerald">
            <ShieldCheck size={18} />
          </div>
          <div className="metricLabel">{t("verificationPage.verified")}</div>
          <div className="metricValue">{verifiedUsers.length}</div>
          <div className="metricMeta">{t("verificationPage.verifiedMeta")}</div>
        </div>
      </div>

      <div className="card verificationPanel">
        <div
          className="verificationTabs"
          role="tablist"
          aria-label={t("verificationPage.sectionsLabel")}
        >
          {(Object.keys(tabLabels) as VerificationListTab[]).map((tab) => (
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
              <span className="verificationTabLabel">{tabLabels[tab]}</span>
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
                placeholder={t("verificationPage.searchPlaceholder")}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>
          <table className="verificationTable">
            <thead>
              <tr>
                <th>{t("verificationPage.userName")}</th>
                <th>{t("verificationPage.phoneNumber")}</th>
                <th>{t("verificationPage.status")}</th>
                <th>{t("verificationPage.date")}</th>
                <th className="verificationActionCell">{t("verificationPage.action")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="verificationEmptyState">
                      {searchQuery.trim() ? t("verificationPage.emptySearch") : emptyLabels[activeTab]}
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
                        {t("verificationPage.viewDetails")}
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
