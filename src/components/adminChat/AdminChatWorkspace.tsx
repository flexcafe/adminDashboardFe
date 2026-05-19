import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAdminChat } from "@/features/adminChat/AdminChatContext";
import type {
  AdminChatQueueTab,
  AdminChatRecord,
} from "@/features/adminChat/types";

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function formatDate(value: string, locale: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTimelineStepState(
  record: AdminChatRecord | null,
  step: "request" | "instruction" | "pending" | "received" | "transferred"
) {
  if (!record) return "idle";

  const ranking = {
    SAFE_PAYMENT_AWAITING_INSTRUCTION: 1,
    SAFE_PAYMENT_INSTRUCTION_SENT: 2,
    SAFE_PAYMENT_PENDING: 3,
    SAFE_PAYMENT_RECEIVED: 4,
    COMPLETED: 5,
  } as const;

  const currentRank = ranking[record.stage] ?? 1;
  const stepRank = {
    request: 1,
    instruction: 2,
    pending: 3,
    received: 4,
    transferred: 5,
  }[step];

  if (currentRank > stepRank) return "done";
  if (currentRank === stepRank) return "active";
  return "idle";
}

export function AdminChatWorkspace() {
  const { i18n, t } = useTranslation();
  const {
    awaitingInstruction,
    pending,
    isLoading,
    error,
    refreshQueues,
    sendInstruction,
    markReceived,
    markTransferred,
  } = useAdminChat();
  const [activeTab, setActiveTab] =
    useState<AdminChatQueueTab>("awaitingInstruction");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [instructionPhone, setInstructionPhone] = useState("");
  const [instructionNote, setInstructionNote] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<null | "instruction" | "received" | "transferred">(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const itemsByTab = useMemo(
    () => ({
      awaitingInstruction,
      pending,
    }),
    [awaitingInstruction, pending]
  );

  const currentItems = itemsByTab[activeTab];

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return currentItems;

    return currentItems.filter((item) =>
      [
        item.listingTitle,
        item.buyerName,
        item.sellerName,
        item.buyerPhone,
        item.buyerKbzPayPhone,
        item.transactionId,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [currentItems, searchQuery]);

  const selectedRecord =
    filteredItems.find((item) => item.transactionId === selectedId) ??
    currentItems.find((item) => item.transactionId === selectedId) ??
    filteredItems[0] ??
    currentItems[0] ??
    null;

  useEffect(() => {
    if (!selectedRecord) {
      setSelectedId("");
      return;
    }

    if (selectedId !== selectedRecord.transactionId) {
      setSelectedId(selectedRecord.transactionId);
    }
  }, [selectedId, selectedRecord]);

  useEffect(() => {
    setInstructionPhone(selectedRecord?.adminReceivingPhone ?? "");
    setInstructionNote(selectedRecord?.adminNote ?? "");
    setResolutionNote(selectedRecord?.adminNote ?? "");
    setFeedback(null);
    setSubmitError(null);
  }, [
    selectedRecord?.adminNote,
    selectedRecord?.adminReceivingPhone,
    selectedRecord?.transactionId,
  ]);

  const queueStats = {
    awaitingInstruction: awaitingInstruction.length,
    pending: pending.length,
  };

  const totalActionable = queueStats.awaitingInstruction + queueStats.pending;

  const handleSendInstruction = async () => {
    if (!selectedRecord) return;
    if (!instructionPhone.trim()) {
      setSubmitError(t("adminChatPage.phoneRequired"));
      return;
    }

    try {
      setIsSubmitting("instruction");
      setSubmitError(null);
      const message = await sendInstruction(selectedRecord.transactionId, {
        adminReceivingPhone: instructionPhone,
        adminNote: instructionNote,
      });
      setFeedback(message);
    } catch (actionError) {
      setSubmitError(
        actionError instanceof Error
          ? actionError.message
          : t("adminChatPage.instructionError")
      );
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleMarkReceived = async () => {
    if (!selectedRecord) return;

    try {
      setIsSubmitting("received");
      setSubmitError(null);
      const message = await markReceived(selectedRecord.transactionId, {
        adminNote: resolutionNote,
      });
      setFeedback(message);
    } catch (actionError) {
      setSubmitError(
        actionError instanceof Error
          ? actionError.message
          : t("adminChatPage.receivedError")
      );
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleMarkTransferred = async () => {
    if (!selectedRecord) return;

    try {
      setIsSubmitting("transferred");
      setSubmitError(null);
      const message = await markTransferred(selectedRecord.transactionId, {
        adminNote: resolutionNote,
      });
      setFeedback(message);
    } catch (actionError) {
      setSubmitError(
        actionError instanceof Error
          ? actionError.message
          : t("adminChatPage.transferredError")
      );
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <section className="page adminChatPage">
      <div className="pageHeader">
        <div>
          <p className="pageEyebrow">{t("adminChatPage.eyebrow")}</p>
          <h1 className="pageTitle">{t("adminChatPage.title")}</h1>
          <p className="pageDescription">{t("adminChatPage.description")}</p>
        </div>
        <div className="pageHeaderActions">
          <button
            type="button"
            className="verificationActionButton"
            onClick={() => {
              void refreshQueues();
            }}
            disabled={isLoading}
          >
            {isLoading ? t("adminChatPage.refreshing") : t("common.refresh")}
          </button>
        </div>
      </div>

      <div className="adminChatSummaryGrid">
        <div className="metricCard adminChatSummaryCard adminChatSummaryCardGold">
          <div className="metricLabel">{t("adminChatPage.awaitingAction")}</div>
          <div className="metricValue">{totalActionable}</div>
          <div className="metricMeta">{t("adminChatPage.awaitingActionMeta")}</div>
        </div>
        <div className="metricCard adminChatSummaryCard adminChatSummaryCardSky">
          <div className="metricLabel">{t("adminChatPage.awaitingInstruction")}</div>
          <div className="metricValue">{queueStats.awaitingInstruction}</div>
          <div className="metricMeta">{t("adminChatPage.awaitingInstructionMeta")}</div>
        </div>
        <div className="metricCard adminChatSummaryCard adminChatSummaryCardMint">
          <div className="metricLabel">{t("adminChatPage.pending")}</div>
          <div className="metricValue">{queueStats.pending}</div>
          <div className="metricMeta">{t("adminChatPage.pendingMeta")}</div>
        </div>
      </div>

      <div className="adminChatLayout">
        <div className="card adminChatQueuePanel">
          <div className="adminChatPanelHeader">
            <div>
              <div className="sectionTitle">{t("adminChatPage.queueTitle")}</div>
              <p className="sectionDescription">
                {t("adminChatPage.queueDescription")}
              </p>
            </div>
          </div>

          <div className="adminChatTabs" role="tablist" aria-label={t("adminChatPage.sectionsLabel")}>
            <button
              type="button"
              className={
                activeTab === "awaitingInstruction"
                  ? "adminChatTab active"
                  : "adminChatTab"
              }
              onClick={() => setActiveTab("awaitingInstruction")}
            >
              <span className="adminChatTabTitle">{t("adminChatPage.awaitingInstruction")}</span>
              <span className="adminChatTabCount">{queueStats.awaitingInstruction}</span>
            </button>
            <button
              type="button"
              className={activeTab === "pending" ? "adminChatTab active" : "adminChatTab"}
              onClick={() => setActiveTab("pending")}
            >
              <span className="adminChatTabTitle">{t("adminChatPage.pending")}</span>
              <span className="adminChatTabCount">{queueStats.pending}</span>
            </button>
          </div>

          <div className="adminChatSearchRow">
            <div className="verificationSearchField">
              <span className="verificationSearchIcon">
                <SearchIcon />
              </span>
              <input
                type="search"
                className="authInput verificationSearchInput"
                placeholder={t("adminChatPage.searchPlaceholder")}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="adminChatList">
            {filteredItems.length === 0 ? (
              <div className="adminChatEmptyState">
                {searchQuery.trim()
                  ? t("adminChatPage.emptySearch")
                  : t("adminChatPage.emptyDefault")}
              </div>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.transactionId}
                  type="button"
                  className={
                    selectedRecord?.transactionId === item.transactionId
                      ? "adminChatListCard active"
                      : "adminChatListCard"
                  }
                  onClick={() => setSelectedId(item.transactionId)}
                >
                  <div className="adminChatListTop">
                    <span className="inlineBadge">{item.stageLabel}</span>
                    <span className="adminChatTimestamp">
                      {formatDate(item.updatedAt || item.createdAt, i18n.language)}
                    </span>
                  </div>
                  <div className="adminChatListTitle">
                    {item.listingTitle || t("adminChatPage.untitledListing")}
                  </div>
                  <div className="adminChatListMeta">
                    <span>{item.buyerName || t("adminChatPage.unknownBuyer")}</span>
                    <span>{item.sellerName || t("adminChatPage.unknownSeller")}</span>
                  </div>
                  <div className="adminChatListAmount">
                    {item.amountLabel
                      ? `${item.amountLabel} ${item.currency}`.trim()
                      : t("adminChatPage.amountPending")}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="adminChatDetailStack">
          <div className="card adminChatFlowCard">
            <div className="adminChatPanelHeader">
              <div>
                <div className="sectionTitle">{t("adminChatPage.flowTitle")}</div>
                <p className="sectionDescription">
                  {t("adminChatPage.flowDescription")}
                </p>
              </div>
            </div>

            <div className="adminChatFlowSteps">
              {[
                {
                  key: "request",
                  title: t("adminChatPage.stepRequest"),
                  text: t("adminChatPage.stepRequestText"),
                },
                {
                  key: "instruction",
                  title: t("adminChatPage.stepInstruction"),
                  text: t("adminChatPage.stepInstructionText"),
                },
                {
                  key: "pending",
                  title: t("adminChatPage.stepPending"),
                  text: t("adminChatPage.stepPendingText"),
                },
                {
                  key: "received",
                  title: t("adminChatPage.stepReceived"),
                  text: t("adminChatPage.stepReceivedText"),
                },
                {
                  key: "transferred",
                  title: t("adminChatPage.stepTransferred"),
                  text: t("adminChatPage.stepTransferredText"),
                },
              ].map((step, index) => (
                <div
                  key={step.key}
                  className={`adminChatFlowStep ${getTimelineStepState(
                    selectedRecord,
                    step.key as
                      | "request"
                      | "instruction"
                      | "pending"
                      | "received"
                      | "transferred"
                  )}`}
                >
                  <div className="adminChatFlowStepNumber">{index + 1}</div>
                  <div>
                    <div className="adminChatFlowStepTitle">{step.title}</div>
                    <div className="adminChatFlowStepText">{step.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card adminChatDetailCard">
            <div className="adminChatPanelHeader">
              <div>
                <div className="sectionTitle">{t("adminChatPage.detailTitle")}</div>
                <p className="sectionDescription">
                  {t("adminChatPage.detailDescription")}
                </p>
              </div>
            </div>

            {!selectedRecord ? (
              <div className="adminChatEmptyState">{t("adminChatPage.emptyDefault")}</div>
            ) : (
              <>
                <div className="adminChatHero">
                  <div>
                    <div className="adminChatHeroTitle">
                      {selectedRecord.listingTitle || t("adminChatPage.untitledListing")}
                    </div>
                    <div className="adminChatHeroMeta">
                      {t("adminChatPage.transactionId", {
                        id: selectedRecord.transactionId,
                      })}
                    </div>
                  </div>
                  <span className="verificationHeroBadge">
                    {selectedRecord.stageLabel}
                  </span>
                </div>

                <div className="adminChatInfoGrid">
                  <div className="detailItem">
                    <div className="detailLabel">{t("adminChatPage.buyer")}</div>
                    <div className="detailValue">
                      {selectedRecord.buyerName || t("adminChatPage.unknownBuyer")}
                    </div>
                    <div className="detailMeta">
                      {selectedRecord.buyerPhone || selectedRecord.buyerKbzPayPhone || "-"}
                    </div>
                  </div>
                  <div className="detailItem">
                    <div className="detailLabel">{t("adminChatPage.seller")}</div>
                    <div className="detailValue">
                      {selectedRecord.sellerName || t("adminChatPage.unknownSeller")}
                    </div>
                    <div className="detailMeta">
                      {selectedRecord.sellerPhone || "-"}
                    </div>
                  </div>
                  <div className="detailItem">
                    <div className="detailLabel">{t("adminChatPage.amount")}</div>
                    <div className="detailValue">
                      {selectedRecord.amountLabel
                        ? `${selectedRecord.amountLabel} ${selectedRecord.currency}`.trim()
                        : t("adminChatPage.amountPending")}
                    </div>
                    <div className="detailMeta">
                      {t("adminChatPage.createdAt", {
                        value: formatDate(
                          selectedRecord.createdAt,
                          i18n.language
                        ),
                      })}
                    </div>
                  </div>
                  <div className="detailItem">
                    <div className="detailLabel">{t("adminChatPage.buyerKbzPay")}</div>
                    <div className="detailValue">
                      {selectedRecord.buyerKbzPayName || "-"}
                    </div>
                    <div className="detailMeta">
                      {selectedRecord.buyerKbzPayPhone || "-"}
                    </div>
                  </div>
                </div>

                <div className="adminChatActionCard">
                  <div className="adminChatActionTitle">
                    {selectedRecord.canSendInstruction
                      ? t("adminChatPage.sendInstructionTitle")
                      : t("adminChatPage.completeEscrowTitle")}
                  </div>
                  <p className="adminChatActionText">
                    {selectedRecord.canSendInstruction
                      ? t("adminChatPage.sendInstructionDescription")
                      : t("adminChatPage.completeEscrowDescription")}
                  </p>

                  {selectedRecord.canSendInstruction ? (
                    <div className="adminChatFormGrid">
                      <label className="authField">
                        <span className="authLabel">
                          {t("adminChatPage.receivingPhoneLabel")}
                        </span>
                        <input
                          type="text"
                          className="authInput"
                          value={instructionPhone}
                          onChange={(event) =>
                            setInstructionPhone(event.target.value)
                          }
                          placeholder={t("adminChatPage.receivingPhonePlaceholder")}
                        />
                      </label>
                      <label className="authField">
                        <span className="authLabel">
                          {t("adminChatPage.noteLabel")}
                        </span>
                        <textarea
                          className="authInput adminChatTextarea"
                          value={instructionNote}
                          onChange={(event) =>
                            setInstructionNote(event.target.value)
                          }
                          placeholder={t("adminChatPage.notePlaceholder")}
                          rows={4}
                        />
                      </label>
                      <div className="verificationButtonRow">
                        <button
                          type="button"
                          className="verificationActionButton"
                          onClick={() => {
                            void handleSendInstruction();
                          }}
                          disabled={isSubmitting !== null}
                        >
                          {isSubmitting === "instruction"
                            ? t("adminChatPage.sendingInstruction")
                            : t("adminChatPage.sendInstruction")}
                        </button>
                      </div>
                    </div>
                  ) : selectedRecord.canMarkReceived || selectedRecord.canMarkTransferred ? (
                    <div className="adminChatFormGrid">
                      <label className="authField">
                        <span className="authLabel">
                          {t("adminChatPage.noteLabel")}
                        </span>
                        <textarea
                          className="authInput adminChatTextarea"
                          value={resolutionNote}
                          onChange={(event) =>
                            setResolutionNote(event.target.value)
                          }
                          placeholder={t("adminChatPage.reviewNotePlaceholder")}
                          rows={4}
                        />
                      </label>
                      <div className="verificationButtonRow">
                        {selectedRecord.canMarkReceived ? (
                          <button
                            type="button"
                            className="verificationActionButton"
                            onClick={() => {
                              void handleMarkReceived();
                            }}
                            disabled={isSubmitting !== null}
                          >
                            {isSubmitting === "received"
                              ? t("adminChatPage.markingReceived")
                              : t("adminChatPage.markReceived")}
                          </button>
                        ) : null}
                        {selectedRecord.canMarkTransferred ? (
                          <button
                            type="button"
                            className="verificationActionButton subtle"
                            onClick={() => {
                              void handleMarkTransferred();
                            }}
                            disabled={isSubmitting !== null}
                          >
                            {isSubmitting === "transferred"
                              ? t("adminChatPage.markingTransferred")
                              : t("adminChatPage.markTransferred")}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="adminChatEmptyState">
                      {t("adminChatPage.stepTransferredText")}
                    </div>
                  )}

                  {feedback ? <p className="adminChatSuccess">{feedback}</p> : null}
                  {submitError ? <p className="authError">{submitError}</p> : null}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {error ? <p className="authError surfaceMessage">{error}</p> : null}
    </section>
  );
}
