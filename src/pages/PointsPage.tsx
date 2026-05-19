import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import container from "@/core/infrastructure/di/container";
import { HttpClient } from "@/core/infrastructure/api/HttpClient";
import { API_ENDPOINTS } from "@/core/infrastructure/api/constants";

function CoinsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 16c0 1.66 2.24 3 5 3s5-1.34 5-3" />
      <path d="M7 12c0 1.66 2.24 3 5 3s5-1.34 5-3" />
      <ellipse cx="12" cy="8" rx="5" ry="3" />
    </svg>
  );
}

function AwardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="5" />
      <path d="m8.21 13.89-1.6 6.11L12 17l5.39 3-1.6-6.12" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      <path d="M3 7h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H3" />
      <path d="M16 12h.01" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

type ApiResponse<T> = {
  message?: string;
  code?: number;
  data?: T;
};

type UserListPayload = {
  users?: unknown[];
  totalCounts?: number;
};

type StarConfig = {
  starCount: number;
  pointsAwarded: number | null;
};

type RankConfig = {
  tier: string;
  minPoints: number | null;
  maxPoints: number | null;
  label: string;
  badgeUrl: string;
  sortOrder: number;
};

type WithdrawalStatus = "PENDING" | "APPROVED" | "REJECTED" | "TRANSFERRED";
type WithdrawalFilter = WithdrawalStatus | "ALL";
type WithdrawalAction = "approve" | "reject" | "mark-paid";

type WithdrawalItem = {
  id: string;
  userName: string;
  userPhoneOrEmail: string;
  requestedPoints: number;
  estimatedAmount: number;
  status: WithdrawalStatus;
  createdAt: string;
  adminNote: string;
  kbzTransferRef: string;
};

type WithdrawalDraft = {
  adminNote: string;
  kbzTransferRef: string;
};

const DEFAULT_RANK_CONFIGS: RankConfig[] = [
  { tier: "NEWBIE", minPoints: 0, maxPoints: 499, label: "Newbie", badgeUrl: "", sortOrder: 1 },
  { tier: "BRONZE", minPoints: 500, maxPoints: 999, label: "Bronze", badgeUrl: "", sortOrder: 2 },
  { tier: "SILVER", minPoints: 1000, maxPoints: 1999, label: "Silver", badgeUrl: "", sortOrder: 3 },
  { tier: "GOLD", minPoints: 2000, maxPoints: 4999, label: "Gold", badgeUrl: "", sortOrder: 4 },
  { tier: "VIP", minPoints: 5000, maxPoints: null, label: "VIP", badgeUrl: "", sortOrder: 5 },
];

const WITHDRAWAL_FILTERS: WithdrawalFilter[] = ["ALL", "PENDING", "APPROVED", "REJECTED", "TRANSFERRED"];

const toText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const toOptionalNonNegativeNumber = (value: string): number | null => {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, parsed);
};

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = toNumber(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toRecordArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  }
  if (value && typeof value === "object") {
    const obj = value as { items?: unknown; configs?: unknown; withdrawals?: unknown };
    const inner = Array.isArray(obj.items)
      ? obj.items
      : Array.isArray(obj.configs)
        ? obj.configs
        : obj.withdrawals;
    if (Array.isArray(inner)) {
      return inner.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
    }
  }
  return [];
};

const statusClass = (status: WithdrawalStatus) => {
  if (status === "PENDING") return "pending";
  if (status === "REJECTED") return "rejected";
  return "completed";
};

const normalizeRankConfigs = (items: RankConfig[]) => {
  if (items.length === 0) return DEFAULT_RANK_CONFIGS;
  return items.sort((a, b) => a.sortOrder - b.sortOrder);
};

export function PointsPage() {
  const { i18n, t } = useTranslation();
  const httpClient = container.resolve<HttpClient>("httpClient");
  const [activeTab, setActiveTab] = useState<"config" | "withdrawals">("config");
  const [starConfigs, setStarConfigs] = useState<StarConfig[]>([]);
  const [rankConfigs, setRankConfigs] = useState<RankConfig[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [withdrawalDrafts, setWithdrawalDrafts] = useState<Record<string, WithdrawalDraft>>({});
  const [selectedWithdrawalIds, setSelectedWithdrawalIds] = useState<string[]>([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState<WithdrawalFilter>("ALL");
  const [totalResellers, setTotalResellers] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("--");
  const [pageError, setPageError] = useState<string | null>(null);

  const formatMMK = (value: number) =>
    `${value.toLocaleString(i18n.language)} MMK`;

  const formatDate = (value: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 10);
    return date.toLocaleDateString(i18n.language);
  };

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  }, []);

  const updateWithdrawalDraft = useCallback((withdrawalId: string, patch: Partial<WithdrawalDraft>) => {
    setWithdrawalDrafts((prev) => ({
      ...prev,
      [withdrawalId]: {
        adminNote: prev[withdrawalId]?.adminNote ?? "",
        kbzTransferRef: prev[withdrawalId]?.kbzTransferRef ?? "",
        ...patch,
      },
    }));
  }, []);

  const loadStarConfigs = useCallback(async () => {
    const response = await httpClient.get<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_POINTS.STAR_CONFIG);
    const normalized = toRecordArray(response?.data)
      .map((item) => ({
        starCount: toNumber(item.starCount),
        pointsAwarded: toNullableNumber(item.pointsAwarded),
      }))
      .filter((item) => item.starCount > 0)
      .sort((a, b) => a.starCount - b.starCount);

    const pointsByStar = new Map(normalized.map((item) => [item.starCount, item.pointsAwarded]));
    const completedRows: StarConfig[] = Array.from({ length: 5 }, (_, index) => {
      const starCount = index + 1;
      return {
        starCount,
        pointsAwarded: pointsByStar.get(starCount) ?? null,
      };
    });
    setStarConfigs(completedRows);
  }, [httpClient]);

  const loadRankConfigs = useCallback(async () => {
    const response = await httpClient.get<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_POINTS.RANK_CONFIG);
    const normalized = toRecordArray(response?.data)
      .map((item) => ({
        tier: toText(item.tier) || "UNKNOWN",
        minPoints: toNullableNumber(item.minPoints),
        maxPoints: toNullableNumber(item.maxPoints),
        label: toText(item.label) || toText(item.tier),
        badgeUrl: toText(item.badgeUrl),
        sortOrder: toNumber(item.sortOrder),
      }))
      .filter((item) => item.tier.trim().length > 0);

    setRankConfigs(normalizeRankConfigs(normalized));
  }, [httpClient]);

  const loadWithdrawals = useCallback(async () => {
    const params = withdrawalFilter === "ALL" ? undefined : { status: withdrawalFilter };
    const response = await httpClient.get<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_WITHDRAWALS.BASE, { params });
    const normalized = toRecordArray(response?.data)
      .map((item) => {
        const id = toText(item.id) || toText(item.withdrawalId);
        if (!id) return null;
        const rawStatus = toText(item.status).toUpperCase();
        const status = ["PENDING", "APPROVED", "REJECTED", "TRANSFERRED"].includes(rawStatus)
          ? (rawStatus as WithdrawalStatus)
          : "PENDING";

        return {
          id,
          userName: toText(item.userName) || toText(item.nickname) || toText(item.name) || "Unknown",
          userPhoneOrEmail: toText(item.phone) || toText(item.email) || toText(item.kbzPayPhone) || "-",
          requestedPoints: toNumber(item.requestedPoints || item.points),
          estimatedAmount: toNumber(item.estimatedAmount || item.amount),
          status,
          createdAt: toText(item.createdAt),
          adminNote: toText(item.adminNote),
          kbzTransferRef: toText(item.kbzTransferRef || item.transferReference),
        };
      })
      .filter((item): item is WithdrawalItem => !!item);

    setWithdrawals(normalized);
    setSelectedWithdrawalIds((prev) => prev.filter((id) => normalized.some((item) => item.id === id)));
    setWithdrawalDrafts((prev) => {
      const next: Record<string, WithdrawalDraft> = {};
      normalized.forEach((item) => {
        next[item.id] = {
          adminNote: prev[item.id]?.adminNote ?? item.adminNote,
          kbzTransferRef: prev[item.id]?.kbzTransferRef ?? item.kbzTransferRef,
        };
      });
      return next;
    });
  }, [httpClient, withdrawalFilter]);

  const loadResellers = useCallback(async () => {
    const response = await httpClient.get<ApiResponse<UserListPayload>>(API_ENDPOINTS.USERS.GET_LIST, {
      params: {
        take: 1,
        skip: 0,
        role: "STAFF",
      },
    });
    setTotalResellers(toNumber(response?.data?.totalCounts));
  }, [httpClient]);

  const loadAll = useCallback(async () => {
    setPageError(null);
    try {
      setIsLoading(true);
      const results = await Promise.allSettled([
        loadStarConfigs(),
        loadRankConfigs(),
        loadWithdrawals(),
        loadResellers(),
      ]);
      const failedLoads = results.filter((result) => result.status === "rejected");
      if (failedLoads.length > 0) {
        setPageError(t("rewardsPage.partialLoadError"));
      }
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } finally {
      setIsLoading(false);
    }
  }, [loadRankConfigs, loadResellers, loadStarConfigs, loadWithdrawals, t]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const saveStarConfigs = async () => {
    try {
      setSavingKey("star-all");
      setPageError(null);
      await httpClient.put<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_POINTS.STAR_CONFIG, {
        configs: starConfigs.map((item) => ({
          starCount: item.starCount,
          pointsAwarded: item.pointsAwarded,
        })),
      });
      showToast(t("rewardsPage.saved"));
      await loadStarConfigs();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("rewardsPage.saveStarError"));
    } finally {
      setSavingKey(null);
    }
  };

  const saveSingleStarRow = async (index: number) => {
    try {
      setSavingKey(`star-${index}`);
      setPageError(null);
      await httpClient.put<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_POINTS.STAR_CONFIG, {
        configs: starConfigs.map((item) => ({
          starCount: item.starCount,
          pointsAwarded: item.pointsAwarded,
        })),
      });
      showToast(t("rewardsPage.saved"));
      await loadStarConfigs();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("rewardsPage.saveStarRowError"));
    } finally {
      setSavingKey(null);
    }
  };

  const saveRankConfigs = async () => {
    try {
      setSavingKey("rank-all");
      setPageError(null);
      await httpClient.put<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_POINTS.RANK_CONFIG, {
        configs: rankConfigs.map((item) => ({
          ...item,
          minPoints: item.minPoints,
          maxPoints: item.maxPoints,
        })),
      });
      showToast(t("rewardsPage.saved"));
      await loadRankConfigs();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("rewardsPage.saveRankError"));
    } finally {
      setSavingKey(null);
    }
  };

  const saveSingleRankRow = async (index: number) => {
    try {
      setSavingKey(`rank-${index}`);
      setPageError(null);
      await httpClient.put<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_POINTS.RANK_CONFIG, {
        configs: rankConfigs.map((item) => ({
          ...item,
          minPoints: item.minPoints,
          maxPoints: item.maxPoints,
        })),
      });
      showToast(t("rewardsPage.saved"));
      await loadRankConfigs();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("rewardsPage.saveRankRowError"));
    } finally {
      setSavingKey(null);
    }
  };

  const runWithdrawalAction = async (action: WithdrawalAction, withdrawalId: string) => {
    const draft = withdrawalDrafts[withdrawalId] ?? { adminNote: "", kbzTransferRef: "" };

    try {
      setSavingKey(`${action}-${withdrawalId}`);
      setPageError(null);

      if (action === "approve") {
        await httpClient.post<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_WITHDRAWALS.APPROVE(withdrawalId), {
          adminNote: draft.adminNote.trim(),
        });
      } else if (action === "reject") {
        await httpClient.post<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_WITHDRAWALS.REJECT(withdrawalId), {
          adminNote: draft.adminNote.trim(),
        });
      } else {
        const kbzTransferRef = draft.kbzTransferRef.trim();
        if (!kbzTransferRef) {
          setPageError(t("rewardsPage.kbzTransferRequired"));
          return;
        }
        await httpClient.post<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_WITHDRAWALS.MARK_PAID(withdrawalId), {
          kbzTransferRef,
        });
      }

      showToast(t("rewardsPage.saved"));
      await loadWithdrawals();
    } catch (error) {
      const fallbackKey =
        action === "mark-paid"
          ? "rewardsPage.markPaidError"
          : action === "approve"
            ? "rewardsPage.approveError"
            : "rewardsPage.rejectError";
      setPageError(error instanceof Error ? error.message : t(fallbackKey));
    } finally {
      setSavingKey(null);
    }
  };

  const pendingWithdrawals = useMemo(
    () => withdrawals.filter((item) => item.status === "PENDING").length,
    [withdrawals]
  );

  const totalPointsDistributed = useMemo(
    () =>
      withdrawals
        .filter((item) => item.status === "APPROVED" || item.status === "TRANSFERRED")
        .reduce((sum, item) => sum + item.requestedPoints, 0),
    [withdrawals]
  );

  const activeRewards = useMemo(
    () => rankConfigs.filter((item) => (item.label || item.tier).trim().length > 0).length,
    [rankConfigs]
  );

  const selectedPendingIds = useMemo(
    () => selectedWithdrawalIds.filter((id) => withdrawals.some((item) => item.id === id && item.status === "PENDING")),
    [selectedWithdrawalIds, withdrawals]
  );
  const pendingWithdrawalIds = useMemo(
    () => withdrawals.filter((item) => item.status === "PENDING").map((item) => item.id),
    [withdrawals]
  );
  const allPendingSelected =
    pendingWithdrawalIds.length > 0 &&
    pendingWithdrawalIds.every((id) => selectedWithdrawalIds.includes(id));

  const processSelectedApprovals = async () => {
    if (selectedPendingIds.length === 0) return;
    setSavingKey("bulk-approve");
    try {
      setPageError(null);
      await Promise.all(
        selectedPendingIds.map((id) =>
          httpClient.post<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_WITHDRAWALS.APPROVE(id), {
            adminNote: (withdrawalDrafts[id]?.adminNote ?? "").trim(),
          })
        )
      );
      setSelectedWithdrawalIds([]);
      showToast(t("rewardsPage.saved"));
      await loadWithdrawals();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t("rewardsPage.approveSelectedError"));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <section className="page rewardsPage">
      <div className="pageHeader rewardsHeader">
        <div>
          <p className="pageEyebrow">{t("rewardsPage.eyebrow")}</p>
          <h1 className="pageTitle">{t("rewardsPage.title")}</h1>
          <p className="pageDescription">{t("rewardsPage.description")}</p>
        </div>
      </div>

      <div className="rewardsSummaryGrid">
        <div className="metricCard rewardsSummaryCard">
          <div className="rewardsSummaryIcon rewardsSummaryIconIndigo">
            <CoinsIcon />
          </div>
          <div className="metricLabel">{t("rewardsPage.totalPointsDistributed")}</div>
          <div className="metricValue">{totalPointsDistributed.toLocaleString(i18n.language)}</div>
          <div className="metricMeta">{t("rewardsPage.totalPointsDistributedMeta")}</div>
        </div>
        <div className="metricCard rewardsSummaryCard">
          <div className="rewardsSummaryIcon rewardsSummaryIconAmber">
            <AwardIcon />
          </div>
          <div className="metricLabel">{t("rewardsPage.activeRewards")}</div>
          <div className="metricValue">{activeRewards}</div>
          <div className="metricMeta">{t("rewardsPage.activeRewardsMeta")}</div>
        </div>
        <div className="metricCard rewardsSummaryCard">
          <div className="rewardsSummaryIcon rewardsSummaryIconRose">
            <WalletIcon />
          </div>
          <div className="metricLabel">{t("rewardsPage.pendingWithdrawals")}</div>
          <div className="metricValue">{pendingWithdrawals}</div>
          <div className="metricMeta">{t("rewardsPage.pendingWithdrawalsMeta")}</div>
        </div>
        <div className="metricCard rewardsSummaryCard">
          <div className="rewardsSummaryIcon rewardsSummaryIconSky">
            <UsersIcon />
          </div>
          <div className="metricLabel">{t("rewardsPage.totalResellers")}</div>
          <div className="metricValue">{totalResellers}</div>
          <div className="metricMeta">{t("rewardsPage.totalResellersMeta")}</div>
        </div>
      </div>

      {pageError ? <p className="authError surfaceMessage">{pageError}</p> : null}

      <div className="card rewardsPanel">
        <div className="rewardsTabs">
          <button
            type="button"
            className={activeTab === "config" ? "rewardsTab active" : "rewardsTab"}
            onClick={() => setActiveTab("config")}
          >
            {t("rewardsPage.configTab")}
          </button>
          <button
            type="button"
            className={activeTab === "withdrawals" ? "rewardsTab active" : "rewardsTab"}
            onClick={() => setActiveTab("withdrawals")}
          >
            {t("rewardsPage.withdrawalsTab")}
          </button>
        </div>

        {isLoading ? (
          <div className="rewardsSkeletonWrap">
            <div className="rewardsSkeletonLine" />
            <div className="rewardsSkeletonBox" />
            <div className="rewardsSkeletonBox" />
          </div>
        ) : null}

        {!isLoading && activeTab === "config" ? (
          <div className="rewardsContentStack">
            <section className="rewardsSectionCard">
              <div className="rewardsSectionHead">
                <h2 className="sectionTitle">{t("rewardsPage.starConfigTitle")}</h2>
                <p className="sectionDescription">{t("rewardsPage.starConfigDescription")}</p>
              </div>
              <div className="rewardsTableWrap">
                <table className="rewardsTable">
                  <thead>
                    <tr>
                      <th>{t("rewardsPage.starCount")}</th>
                      <th>{t("rewardsPage.pointsAwarded")}</th>
                      <th>{t("rewardsPage.action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {starConfigs.map((row, index) => (
                      <tr key={`${row.starCount}-${index}`}>
                        <td>{row.starCount}</td>
                        <td>
                          <input
                            className="authInput"
                            type="number"
                            min={0}
                            value={row.pointsAwarded ?? ""}
                            onChange={(e) =>
                              setStarConfigs((prev) =>
                                prev.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, pointsAwarded: toOptionalNonNegativeNumber(e.target.value) }
                                    : item
                                )
                              )
                            }
                          />
                        </td>
                        <td>
                          <button
                            className="rewardsBtn secondary"
                            type="button"
                            disabled={!!savingKey}
                            onClick={() => saveSingleStarRow(index)}
                          >
                            {savingKey === `star-${index}` ? t("categoryForm.saving") : t("common.save")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rewardsActions">
                <button className="rewardsBtn primary" type="button" disabled={!!savingKey} onClick={saveStarConfigs}>
                  {savingKey === "star-all" ? t("categoryForm.saving") : t("rewardsPage.saveAllChanges")}
                </button>
              </div>
            </section>

            <section className="rewardsSectionCard">
              <div className="rewardsSectionHead">
                <h2 className="sectionTitle">{t("rewardsPage.rankConfigTitle")}</h2>
                <p className="sectionDescription">{t("rewardsPage.rankConfigDescription")}</p>
              </div>
              <div className="rewardsTableWrap">
                <table className="rewardsTable">
                  <thead>
                    <tr>
                      <th>{t("rewardsPage.tier")}</th>
                      <th>{t("rewardsPage.minPoints")}</th>
                      <th>{t("rewardsPage.maxPoints")}</th>
                      <th>{t("rewardsPage.action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankConfigs.map((row, index) => (
                      <tr key={`${row.tier}-${index}`}>
                        <td>{row.label || row.tier}</td>
                        <td>
                          <input
                            className="authInput"
                            type="number"
                            min={0}
                            value={row.minPoints ?? ""}
                            onChange={(e) =>
                              setRankConfigs((prev) =>
                                prev.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, minPoints: toOptionalNonNegativeNumber(e.target.value) }
                                    : item
                                )
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="authInput"
                            type="number"
                            min={0}
                            value={row.maxPoints ?? ""}
                            placeholder={row.tier === "VIP" ? t("rewardsPage.noLimit") : t("rewardsPage.maxPointsPlaceholder")}
                            onChange={(e) =>
                              setRankConfigs((prev) =>
                                prev.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        maxPoints: toOptionalNonNegativeNumber(e.target.value),
                                      }
                                    : item
                                )
                              )
                            }
                          />
                        </td>
                        <td>
                          <button
                            className="rewardsBtn secondary"
                            type="button"
                            disabled={!!savingKey}
                            onClick={() => saveSingleRankRow(index)}
                          >
                            {savingKey === `rank-${index}` ? t("categoryForm.saving") : t("common.save")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rewardsActions">
                <button className="rewardsBtn primary" type="button" disabled={!!savingKey} onClick={saveRankConfigs}>
                  {savingKey === "rank-all" ? t("categoryForm.saving") : t("rewardsPage.saveAllChanges")}
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {!isLoading && activeTab === "withdrawals" ? (
          <section className="rewardsSectionCard">
            <div className="rewardsSectionHead">
              <div>
                <h2 className="sectionTitle">{t("rewardsPage.withdrawalManagementTitle")}</h2>
                <p className="sectionDescription">{t("rewardsPage.withdrawalManagementDescription")}</p>
              </div>
              <select
                className="authInput"
                value={withdrawalFilter}
                onChange={(e) => setWithdrawalFilter(e.target.value as WithdrawalFilter)}
              >
                {WITHDRAWAL_FILTERS.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL" ? t("rewardsPage.allStatuses") : status}
                  </option>
                ))}
              </select>
            </div>
            <div className="rewardsTableWrap">
              <table className="rewardsTable">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={allPendingSelected}
                        onChange={(e) =>
                          setSelectedWithdrawalIds(
                            e.target.checked ? pendingWithdrawalIds : []
                          )
                        }
                      />
                    </th>
                    <th>{t("rewardsPage.reseller")}</th>
                    <th>{t("rewardsPage.contact")}</th>
                    <th>{t("rewardsPage.amount")}</th>
                    <th>{t("rewardsPage.status")}</th>
                    <th>{t("rewardsPage.adminNote")}</th>
                    <th>{t("rewardsPage.transferRef")}</th>
                    <th>{t("rewardsPage.date")}</th>
                    <th>{t("rewardsPage.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <div className="verificationEmptyState">{t("rewardsPage.noData")}</div>
                      </td>
                    </tr>
                  ) : withdrawals.map((item) => {
                    const draft = withdrawalDrafts[item.id] ?? { adminNote: item.adminNote, kbzTransferRef: item.kbzTransferRef };

                    return (
                      <tr key={item.id}>
                        <td>
                          <input
                            type="checkbox"
                            disabled={item.status !== "PENDING"}
                            checked={selectedWithdrawalIds.includes(item.id)}
                            onChange={(e) =>
                              setSelectedWithdrawalIds((prev) =>
                                e.target.checked ? [...prev, item.id] : prev.filter((selectedId) => selectedId !== item.id)
                              )
                            }
                          />
                        </td>
                        <td>{item.userName}</td>
                        <td>{item.userPhoneOrEmail}</td>
                        <td>{formatMMK(item.estimatedAmount || item.requestedPoints)}</td>
                        <td>
                          <span className={`rewardsBadge ${statusClass(item.status)}`}>{item.status}</span>
                        </td>
                        <td>
                          <input
                            className="authInput"
                            type="text"
                            placeholder={t("rewardsPage.optionalAdminNote")}
                            value={draft.adminNote}
                            onChange={(e) => updateWithdrawalDraft(item.id, { adminNote: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className="authInput"
                            type="text"
                            placeholder={item.status === "APPROVED" ? t("rewardsPage.requiredForMarkPaid") : t("rewardsPage.transferReference")}
                            value={draft.kbzTransferRef}
                            onChange={(e) => updateWithdrawalDraft(item.id, { kbzTransferRef: e.target.value })}
                          />
                        </td>
                        <td>{formatDate(item.createdAt)}</td>
                        <td>
                          {item.status === "PENDING" ? (
                            <div className="rewardsInlineActions">
                              <button
                                type="button"
                                className="rewardsBtn primary"
                                disabled={!!savingKey}
                                onClick={() => runWithdrawalAction("approve", item.id)}
                              >
                                {savingKey === `approve-${item.id}` ? "..." : t("rewardsPage.approve")}
                              </button>
                              <button
                                type="button"
                                className="rewardsBtn danger subtle"
                                disabled={!!savingKey}
                                onClick={() => runWithdrawalAction("reject", item.id)}
                              >
                                {savingKey === `reject-${item.id}` ? "..." : t("rewardsPage.reject")}
                              </button>
                            </div>
                          ) : item.status === "APPROVED" ? (
                            <div className="rewardsInlineActions">
                              <button
                                type="button"
                                className="rewardsBtn primary"
                                disabled={!!savingKey}
                                onClick={() => runWithdrawalAction("mark-paid", item.id)}
                              >
                                {savingKey === `mark-paid-${item.id}` ? "..." : t("rewardsPage.markPaid")}
                              </button>
                            </div>
                          ) : (
                            <span className="muted">{t("rewardsPage.noAction")}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="rewardsActions">
              <button
                className="rewardsBtn primary"
                type="button"
                disabled={!!savingKey || selectedPendingIds.length === 0}
                onClick={processSelectedApprovals}
              >
                {savingKey === "bulk-approve" ? t("rewardsPage.processing") : t("rewardsPage.approveSelected")}
              </button>
            </div>
          </section>
        ) : null}
      </div>

      <p className="rewardsLastUpdated">{t("rewardsPage.lastUpdated", { time: lastUpdated })}</p>
      {toastMessage ? <div className="rewardsToast">{toastMessage}</div> : null}
    </section>
  );
}
