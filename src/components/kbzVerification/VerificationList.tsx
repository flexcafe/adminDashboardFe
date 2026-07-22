import { AlertCircle, ShieldCheck, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type {
  VerificationListTab,
  VerificationRecord,
} from "@/features/kbzVerification/types";
import type {
  VerificationQueueErrors,
  VerificationQueueLoading,
} from "@/features/kbzVerification/VerificationWorkflowContext";

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
  loadingByQueue: VerificationQueueLoading;
  error?: string | null;
  errorsByQueue?: VerificationQueueErrors;
  onRefresh: () => void;
};

const getRowActionLabel = (
  status: VerificationRecord["status"],
  t: (key: string) => string
) => {
  switch (status) {
    case "VERIFICATION_REQUESTED":
      return t("verificationPage.actionSendInstruction");
    case "MONEY_CHECK":
      return t("verificationPage.actionVerify");
    default:
      return t("verificationPage.viewDetails");
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
  loadingByQueue,
  error,
  errorsByQueue,
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
  const isActiveTabLoading = loadingByQueue[activeTab];
  const activeTabError = errorsByQueue?.[activeTab] ?? null;
  const items = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return baseItems;
    return baseItems.filter((item) =>
      `${item.userName} ${item.userPhoneOrEmail} ${item.kbzPayPhoneNumber ?? ""} ${item.kbzTransactionId ?? ""} ${item.accountName ?? ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [baseItems, searchQuery]);
  const totalActionable = verificationRequested.length + moneyCheckRequests.length;
  const showTransactionColumn = activeTab === "moneyCheck" || activeTab === "verified";
  const columnCount = showTransactionColumn ? 6 : 5;

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

  const tabHints: Record<VerificationListTab, string> = {
    registered: t("verificationPage.tabHintRegistered"),
    requested: t("verificationPage.tabHintRequested"),
    moneyCheck: t("verificationPage.tabHintMoneyCheck"),
    verified: t("verificationPage.tabHintVerified"),
  };

  const emptyLabels: Record<VerificationListTab, string> = {
    registered: t("verificationPage.emptyRegistered"),
    requested: t("verificationPage.emptyRequested"),
    moneyCheck: t("verificationPage.emptyMoneyCheck"),
    verified: t("verificationPage.emptyVerified"),
  };

  const loadingLabels: Record<VerificationListTab, string> = {
    registered: t("verificationPage.loadingRegistered"),
    requested: t("verificationPage.loadingRequested"),
    moneyCheck: t("verificationPage.loadingMoneyCheck"),
    verified: t("verificationPage.loadingVerified"),
  };

  const getStatusBadgeClassName = (status: VerificationRecord["status"]) => {
    switch (status) {
      case "REGISTERED":
        return "verificationStatusBadge registered";
      case "VERIFICATION_REQUESTED":
        return "verificationStatusBadge requested";
      case "MONEY_CHECK":
        return "verificationStatusBadge moneyCheck";
      case "VERIFIED":
        return "verificationStatusBadge verified";
      default:
        return "verificationStatusBadge";
    }
  };

  const flowSteps = [
    {
      key: "request",
      title: t("verificationPage.flowStepRequest"),
      text: t("verificationPage.flowStepRequestText"),
      active: activeTab === "requested",
    },
    {
      key: "instruction",
      title: t("verificationPage.flowStepInstruction"),
      text: t("verificationPage.flowStepInstructionText"),
      active: activeTab === "requested",
    },
    {
      key: "transfer",
      title: t("verificationPage.flowStepTransfer"),
      text: t("verificationPage.flowStepTransferText"),
      active: activeTab === "moneyCheck",
    },
    {
      key: "verify",
      title: t("verificationPage.flowStepVerify"),
      text: t("verificationPage.flowStepVerifyText"),
      active: activeTab === "moneyCheck",
    },
  ] as const;

  const renderMetricValue = (value: number, queueLoading: boolean) => {
    if (queueLoading && value === 0) {
      return <span className="verificationMetricLoading">{t("common.loading")}</span>;
    }
    return value;
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

      <div className="card verificationFlowGuide" aria-label={t("verificationPage.flowTitle")}>
        <div className="sectionHeader verificationFlowGuideHeader">
          <div>
            <div className="sectionTitle">{t("verificationPage.flowTitle")}</div>
            <p className="sectionDescription">{t("verificationPage.flowDescription")}</p>
          </div>
          <span className="verificationAmountChip">{t("verificationPage.transferAmount")}</span>
        </div>
        <div className="verificationFlowSteps">
          {flowSteps.map((step, index) => (
            <div
              key={step.key}
              className={step.active ? "verificationFlowStep active" : "verificationFlowStep"}
            >
              <span className="verificationFlowStepNumber">{index + 1}</span>
              <div>
                <div className="verificationFlowStepTitle">{step.title}</div>
                <p className="verificationFlowStepText">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="verificationSummaryGrid">
        <button
          type="button"
          className={`metricCard verificationSummaryCard verificationSummaryCardBlue${
            activeTab === "requested" || activeTab === "moneyCheck" ? " isActive" : ""
          }`}
          onClick={() => onTabChange(verificationRequested.length ? "requested" : "moneyCheck")}
        >
          <div className="rewardsSummaryIcon rewardsSummaryIconBlue">
            <AlertCircle size={18} />
          </div>
          <div className="metricLabel">{t("verificationPage.awaitingAction")}</div>
          <div className="metricValue">
            {renderMetricValue(
              totalActionable,
              loadingByQueue.requested || loadingByQueue.moneyCheck
            )}
          </div>
          <div className="metricMeta">
            {loadingByQueue.requested || loadingByQueue.moneyCheck
              ? t("verificationPage.syncing")
              : t("verificationPage.needsAction")}
          </div>
        </button>
        <button
          type="button"
          className={`metricCard verificationSummaryCard verificationSummaryCardYellow${
            activeTab === "registered" ? " isActive" : ""
          }`}
          onClick={() => onTabChange("registered")}
        >
          <div className="rewardsSummaryIcon rewardsSummaryIconAmber">
            <UserCheck size={18} />
          </div>
          <div className="metricLabel">{t("verificationPage.registered")}</div>
          <div className="metricValue verificationMetricCompact">
            {renderMetricValue(registeredAccounts.length, loadingByQueue.registered)}
          </div>
          <div className="metricMeta">
            {loadingByQueue.registered
              ? t("verificationPage.loadingRegistered")
              : t("verificationPage.registeredMeta")}
          </div>
        </button>
        <button
          type="button"
          className={`metricCard verificationSummaryCard verificationSummaryCardGreen${
            activeTab === "verified" ? " isActive" : ""
          }`}
          onClick={() => onTabChange("verified")}
        >
          <div className="rewardsSummaryIcon rewardsSummaryIconEmerald">
            <ShieldCheck size={18} />
          </div>
          <div className="metricLabel">{t("verificationPage.verified")}</div>
          <div className="metricValue">
            {renderMetricValue(verifiedUsers.length, loadingByQueue.verified)}
          </div>
          <div className="metricMeta">
            {loadingByQueue.verified
              ? t("verificationPage.loadingVerified")
              : t("verificationPage.verifiedMeta")}
          </div>
        </button>
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
              <span className="verificationTabStep">
                {tab === "registered" ? "1" : tab === "requested" ? "2" : tab === "moneyCheck" ? "3" : "4"}
              </span>
              <span className="verificationTabLabel">{tabLabels[tab]}</span>
              <span className="verificationTabCount">
                {loadingByQueue[tab] && itemsByTab[tab].length === 0
                  ? "…"
                  : itemsByTab[tab].length}
              </span>
            </button>
          ))}
        </div>

        <div className={`verificationTableWrap${isActiveTabLoading ? " isLoading" : ""}`}>
          <div className="verificationSearchRow">
            <p className="verificationTabHint">{tabHints[activeTab]}</p>
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
                disabled={isActiveTabLoading && items.length === 0}
              />
            </div>
          </div>
          {isActiveTabLoading ? (
            <div className="verificationLoadingBanner" aria-live="polite">
              {loadingLabels[activeTab]}
            </div>
          ) : null}
          <table className="verificationTable">
            <thead>
              <tr>
                <th>{t("verificationPage.userName")}</th>
                <th>{t("verificationPage.kbzPayPhone")}</th>
                <th>{t("verificationPage.status")}</th>
                {showTransactionColumn ? (
                  <th>{t("verificationPage.transactionId")}</th>
                ) : null}
                <th>{t("verificationPage.date")}</th>
                <th className="verificationActionCell">{t("verificationPage.action")}</th>
              </tr>
            </thead>
            <tbody>
              {isActiveTabLoading && items.length === 0 ? (
                <tr>
                  <td colSpan={columnCount}>
                    <div className="verificationEmptyState verificationLoadingState">
                      <span className="verificationLoadingSpinner" aria-hidden="true" />
                      <span>{loadingLabels[activeTab]}</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={columnCount}>
                    <div className="verificationEmptyState">
                      {activeTabError
                        ? activeTabError
                        : searchQuery.trim()
                          ? t("verificationPage.emptySearch")
                          : emptyLabels[activeTab]}
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={`${item.status}-${item.userId}`}
                    className={
                      item.canSendInstruction || item.canVerify
                        ? "verificationRowActionable"
                        : undefined
                    }
                  >
                    <td>
                      <div className="verificationUserCell">
                        <span className="verificationUserName">{item.userName || "-"}</span>
                        {item.accountName && item.accountName !== item.userName ? (
                          <span className="verificationUserMeta">{item.accountName}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>{item.kbzPayPhoneNumber || item.userPhoneOrEmail || "-"}</td>
                    <td>
                      <span className={getStatusBadgeClassName(item.status)}>
                        {item.statusLabel}
                      </span>
                    </td>
                    {showTransactionColumn ? (
                      <td>
                        <span className="verificationTxnId">
                          {item.kbzTransactionId || "-"}
                        </span>
                      </td>
                    ) : null}
                    <td>{formatDate(item.lastActionAt || item.createdAt)}</td>
                    <td className="verificationActionCell">
                      <Link
                        to={`/dashboard/${item.userId}`}
                        className={
                          item.canSendInstruction || item.canVerify
                            ? "verificationActionButton"
                            : "verificationActionButton subtle"
                        }
                      >
                        {getRowActionLabel(item.status, t)}
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
