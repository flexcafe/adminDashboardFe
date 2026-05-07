import { useCallback, useEffect, useMemo, useState } from "react";
import container from "@/core/infrastructure/di/container";
import { HttpClient } from "@/core/infrastructure/api/HttpClient";
import { API_ENDPOINTS } from "@/core/infrastructure/api/constants";

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
  pointsAwarded: number;
};

type RankConfig = {
  tier: string;
  minPoints: number;
  maxPoints: number;
  label: string;
  badgeUrl: string;
  sortOrder: number;
};

type WithdrawalStatus = "PENDING" | "APPROVED" | "REJECTED" | "TRANSFERRED";

type WithdrawalItem = {
  id: string;
  userName: string;
  userPhoneOrEmail: string;
  requestedPoints: number;
  estimatedAmount: number;
  status: WithdrawalStatus;
  createdAt: string;
};

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

const toRecordArray = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
  }
  if (value && typeof value === "object") {
    const obj = value as { items?: unknown; configs?: unknown };
    const inner = Array.isArray(obj.items) ? obj.items : obj.configs;
    if (Array.isArray(inner)) {
      return inner.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
    }
  }
  return [];
};

const formatMMK = (value: number) => `${value.toLocaleString()} MMK`;

const statusClass = (status: WithdrawalStatus) => {
  if (status === "PENDING") return "pending";
  if (status === "REJECTED") return "rejected";
  return "completed";
};

export function PointsPage() {
  const httpClient = container.resolve<HttpClient>("httpClient");
  const [activeTab, setActiveTab] = useState<"config" | "withdrawals">("config");
  const [starConfigs, setStarConfigs] = useState<StarConfig[]>([]);
  const [rankConfigs, setRankConfigs] = useState<RankConfig[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [selectedWithdrawalIds, setSelectedWithdrawalIds] = useState<string[]>([]);
  const [totalResellers, setTotalResellers] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("--");
  const [pageError, setPageError] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 1800);
  }, []);

  const loadStarConfigs = useCallback(async () => {
    const response = await httpClient.get<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_POINTS.STAR_CONFIG);
    const normalized = toRecordArray(response?.data)
      .map((item) => ({
        starCount: toNumber(item.starCount),
        pointsAwarded: toNumber(item.pointsAwarded),
      }))
      .filter((item) => item.starCount > 0)
      .sort((a, b) => a.starCount - b.starCount);

    const pointsByStar = new Map(normalized.map((item) => [item.starCount, item.pointsAwarded]));
    const completedRows: StarConfig[] = Array.from({ length: 5 }, (_, index) => {
      const starCount = index + 1;
      return {
        starCount,
        pointsAwarded: pointsByStar.get(starCount) ?? starCount,
      };
    });
    setStarConfigs(completedRows);
  }, [httpClient]);

  const loadRankConfigs = useCallback(async () => {
    const response = await httpClient.get<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_POINTS.RANK_CONFIG);
    const normalized = toRecordArray(response?.data)
      .map((item) => ({
        tier: toText(item.tier) || "UNKNOWN",
        minPoints: toNumber(item.minPoints),
        maxPoints: toNumber(item.maxPoints),
        label: toText(item.label),
        badgeUrl: toText(item.badgeUrl),
        sortOrder: toNumber(item.sortOrder),
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (normalized.length === 0) {
      setRankConfigs([
        { tier: "BRONZE", minPoints: 0, maxPoints: 499, label: "Bronze", badgeUrl: "", sortOrder: 1 },
        { tier: "SILVER", minPoints: 500, maxPoints: 999, label: "Silver", badgeUrl: "", sortOrder: 2 },
        { tier: "GOLD", minPoints: 1000, maxPoints: 1999, label: "Gold", badgeUrl: "", sortOrder: 3 },
        { tier: "PLATINUM", minPoints: 2000, maxPoints: 999999999, label: "Platinum", badgeUrl: "", sortOrder: 4 },
      ]);
      return;
    }
    setRankConfigs(normalized);
  }, [httpClient]);

  const loadWithdrawals = useCallback(async () => {
    const response = await httpClient.get<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_WITHDRAWALS.BASE);
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
          userName: toText(item.userName) || toText(item.name) || "Unknown",
          userPhoneOrEmail: toText(item.phone) || toText(item.email) || "",
          requestedPoints: toNumber(item.requestedPoints || item.points),
          estimatedAmount: toNumber(item.estimatedAmount || item.amount),
          status,
          createdAt: toText(item.createdAt),
        };
      })
      .filter((item): item is WithdrawalItem => !!item);
    setWithdrawals(normalized);
  }, [httpClient]);

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
        setPageError("Some rewards data could not be loaded. Please refresh and try again.");
      }
      setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } finally {
      setIsLoading(false);
    }
  }, [loadRankConfigs, loadResellers, loadStarConfigs, loadWithdrawals]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const saveStarConfigs = async () => {
    try {
      setSavingKey("star-all");
      setPageError(null);
      await httpClient.put<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_POINTS.STAR_CONFIG, { configs: starConfigs });
      showToast("Saved!");
      await loadStarConfigs();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to save star point settings.");
    } finally {
      setSavingKey(null);
    }
  };

  const saveSingleStarRow = async (index: number) => {
    try {
      setSavingKey(`star-${index}`);
      setPageError(null);
      await httpClient.put<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_POINTS.STAR_CONFIG, { configs: starConfigs });
      showToast("Saved!");
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to save this star point row.");
    } finally {
      setSavingKey(null);
    }
  };

  const saveRankConfigs = async () => {
    try {
      setSavingKey("rank-all");
      setPageError(null);
      await httpClient.put<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_POINTS.RANK_CONFIG, { configs: rankConfigs });
      showToast("Saved!");
      await loadRankConfigs();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to save rank settings.");
    } finally {
      setSavingKey(null);
    }
  };

  const saveSingleRankRow = async (index: number) => {
    try {
      setSavingKey(`rank-${index}`);
      setPageError(null);
      await httpClient.put<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_POINTS.RANK_CONFIG, { configs: rankConfigs });
      showToast("Saved!");
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to save this rank row.");
    } finally {
      setSavingKey(null);
    }
  };

  const runWithdrawalAction = async (action: "approve" | "reject", withdrawalId: string) => {
    try {
      setSavingKey(`${action}-${withdrawalId}`);
      setPageError(null);
      if (action === "approve") {
        await httpClient.post<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_WITHDRAWALS.APPROVE(withdrawalId), { adminNote: "" });
      } else {
        await httpClient.post<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_WITHDRAWALS.REJECT(withdrawalId), { adminNote: "" });
      }
      showToast("Saved!");
      await loadWithdrawals();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : `Failed to ${action === "approve" ? "approve" : "reject"} withdrawal.`
      );
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

  const processSelected = async () => {
    const pendingIds = selectedWithdrawalIds.filter((id) => withdrawals.some((w) => w.id === id && w.status === "PENDING"));
    if (pendingIds.length === 0) return;
    setSavingKey("bulk-process");
    try {
      setPageError(null);
      await Promise.all(
        pendingIds.map((id) =>
          httpClient.post<ApiResponse<unknown>>(API_ENDPOINTS.DASHBOARD_WITHDRAWALS.APPROVE(id), { adminNote: "Bulk approved" })
        )
      );
      setSelectedWithdrawalIds([]);
      showToast("Saved!");
      await loadWithdrawals();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to process selected withdrawals.");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <section className="page rewardsPage">
      <div className="pageHeader rewardsHeader">
        <div>
          <h1 className="pageTitle">Rewards Control Center</h1>
          <p className="pageDescription">Manage points rules, rank thresholds, and withdrawal approvals in one clean workspace.</p>
        </div>
      </div>

      <div className="rewardsSummaryGrid">
        <div className="metricCard rewardsSummaryCard">
          <div className="metricLabel">Total Points Distributed</div>
          <div className="metricValue">{totalPointsDistributed.toLocaleString()}</div>
        </div>
        <div className="metricCard rewardsSummaryCard">
          <div className="metricLabel">Active Rewards</div>
          <div className="metricValue">{activeRewards}</div>
        </div>
        <div className="metricCard rewardsSummaryCard">
          <div className="metricLabel">Pending Withdrawals</div>
          <div className="metricValue">{pendingWithdrawals}</div>
        </div>
        <div className="metricCard rewardsSummaryCard">
          <div className="metricLabel">Total Resellers</div>
          <div className="metricValue">{totalResellers}</div>
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
            ⚙ Points & Rank Configuration
          </button>
          <button
            type="button"
            className={activeTab === "withdrawals" ? "rewardsTab active" : "rewardsTab"}
            onClick={() => setActiveTab("withdrawals")}
          >
            💸 Withdrawal Requests
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
                <h2 className="sectionTitle">⭐ Star Points Configuration</h2>
                <p className="sectionDescription">Set points awarded by star count.</p>
              </div>
              <div className="rewardsTableWrap">
                <table className="rewardsTable">
                  <thead>
                    <tr>
                      <th>Star Count (1-5)</th>
                      <th>Points Awarded</th>
                      <th>Action</th>
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
                            value={row.pointsAwarded}
                            onChange={(e) =>
                              setStarConfigs((prev) =>
                                prev.map((x, i) =>
                                  i === index ? { ...x, pointsAwarded: Math.max(0, Number(e.target.value) || 0) } : x
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
                            {savingKey === `star-${index}` ? "Saving..." : "Save"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rewardsActions">
                <button className="rewardsBtn primary" type="button" disabled={!!savingKey} onClick={saveStarConfigs}>
                  {savingKey === "star-all" ? "Saving..." : "Save All Changes"}
                </button>
              </div>
            </section>

            <section className="rewardsSectionCard">
              <div className="rewardsSectionHead">
                <h2 className="sectionTitle">🏅 Rank Configuration</h2>
                <p className="sectionDescription">Set minimum points required for each rank.</p>
              </div>
              <div className="rewardsTableWrap">
                <table className="rewardsTable">
                  <thead>
                    <tr>
                      <th>Rank Name</th>
                      <th>Minimum Points Required</th>
                      <th>Action</th>
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
                            value={row.minPoints}
                            onChange={(e) =>
                              setRankConfigs((prev) =>
                                prev.map((x, i) => (i === index ? { ...x, minPoints: Math.max(0, Number(e.target.value) || 0) } : x))
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
                            {savingKey === `rank-${index}` ? "Saving..." : "Save"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rewardsActions">
                <button className="rewardsBtn primary" type="button" disabled={!!savingKey} onClick={saveRankConfigs}>
                  {savingKey === "rank-all" ? "Saving..." : "Save All Changes"}
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {!isLoading && activeTab === "withdrawals" ? (
          <section className="rewardsSectionCard">
            <div className="rewardsTableWrap">
              <table className="rewardsTable">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={withdrawals.length > 0 && selectedWithdrawalIds.length === withdrawals.length}
                        onChange={(e) =>
                          setSelectedWithdrawalIds(e.target.checked ? withdrawals.map((item) => item.id) : [])
                        }
                      />
                    </th>
                    <th>Reseller Name</th>
                    <th>Amount (MMK)</th>
                    <th>Request Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedWithdrawalIds.includes(item.id)}
                          onChange={(e) =>
                            setSelectedWithdrawalIds((prev) =>
                              e.target.checked ? [...prev, item.id] : prev.filter((x) => x !== item.id)
                            )
                          }
                        />
                      </td>
                      <td>{item.userName}</td>
                      <td>{formatMMK(item.estimatedAmount || item.requestedPoints)}</td>
                      <td>{item.createdAt ? item.createdAt.slice(0, 10) : "-"}</td>
                      <td>
                        <span className={`rewardsBadge ${statusClass(item.status)}`}>{item.status}</span>
                      </td>
                      <td>
                        {item.status === "PENDING" ? (
                          <div className="rewardsInlineActions">
                            <button
                              type="button"
                              className="rewardsBtn success"
                              disabled={!!savingKey}
                              onClick={() => runWithdrawalAction("approve", item.id)}
                            >
                              {savingKey === `approve-${item.id}` ? "..." : "Approve"}
                            </button>
                            <button
                              type="button"
                              className="rewardsBtn danger"
                              disabled={!!savingKey}
                              onClick={() => runWithdrawalAction("reject", item.id)}
                            >
                              {savingKey === `reject-${item.id}` ? "..." : "Reject"}
                            </button>
                          </div>
                        ) : (
                          <span className="muted">No action</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rewardsActions">
              <button className="rewardsBtn primary" type="button" disabled={!!savingKey} onClick={processSelected}>
                {savingKey === "bulk-process" ? "Processing..." : "Process Selected"}
              </button>
            </div>
          </section>
        ) : null}
      </div>

      <p className="rewardsLastUpdated">Last updated: today at {lastUpdated}</p>
      {toastMessage ? <div className="rewardsToast">{toastMessage}</div> : null}
    </section>
  );
}
