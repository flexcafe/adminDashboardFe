import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import container from "@/core/infrastructure/di/container";
import { HttpClient } from "@/core/infrastructure/api/HttpClient";
import { API_ENDPOINTS } from "@/core/infrastructure/api/constants";
import loliLogo from "@/assets/loli-logo.png";
import { useAIAssistant } from "@/features/aiAssistant/useAIAssistant";

type DashboardSnapshot = {
  currentPage: string;
  loadedAt: string;
  data: Record<string, unknown>;
};

const compactJson = (value: unknown, maxLength = 14000) => {
  const text = JSON.stringify(value, null, 2);
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...truncated` : text;
};

const buildSnapshotContext = (snapshot: DashboardSnapshot | null) => {
  if (!snapshot) return "No dashboard data loaded yet.";
  return compactJson(snapshot);
};

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2 3 14h8l-1 8 10-12h-8z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function QuickMessageContent({ content, role }: { content: string; role: "assistant" | "user" }) {
  if (role === "user") {
    return <p>{content}</p>;
  }

  return (
    <div className="aiQuickChatMarkdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export function AIAssistantQuickChat({ currentPath }: { currentPath: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const httpClient = useMemo(() => container.resolve<HttpClient>("httpClient"), []);
  const {
    activeSession,
    savedSettings,
    isLoading,
    createSession,
    submitMessage: submitAssistantMessage,
  } = useAIAssistant();
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const shouldAutoScrollRef = useRef(true);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasApiKey = savedSettings.apiKey.trim().length > 0;
  const messages = activeSession?.messages ?? [];

  const loadSnapshot = useCallback(async () => {
    const loaders = {
      dashboard: () => httpClient.get(API_ENDPOINTS.AUTH.KBZPAY_VERIFICATION_REQUESTED),
      adminChatAwaiting: () => httpClient.get(API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.AWAITING_INSTRUCTION),
      adminChatPending: () => httpClient.get(API_ENDPOINTS.DASHBOARD_ADMIN_CHAT.PENDING),
      fraudReports: () => httpClient.get(API_ENDPOINTS.DASHBOARD_FRAUD_REPORTS.BASE),
      suggestions: () => httpClient.get(API_ENDPOINTS.DASHBOARD_SUGGESTIONS.BASE),
      sliderAds: () => httpClient.get(API_ENDPOINTS.DASHBOARD_SLIDER_ADS.BASE),
      categories: () => httpClient.get(API_ENDPOINTS.DASHBOARD_CATEGORIES.BASE),
      withdrawals: () => httpClient.get(API_ENDPOINTS.DASHBOARD_WITHDRAWALS.BASE),
      users: () => httpClient.get(API_ENDPOINTS.USERS.GET_LIST, { params: { take: 10, skip: 0 } }),
    };

    const entries = await Promise.all(
      Object.entries(loaders).map(async ([key, load]) => {
        try {
          return [key, await load()] as const;
        } catch {
          return [key, "Unable to load"] as const;
        }
      })
    );

    setSnapshot({
      currentPage: currentPath,
      loadedAt: new Date().toISOString(),
      data: Object.fromEntries(entries),
    });
  }, [currentPath, httpClient]);

  useEffect(() => {
    if (!isOpen) return;
    const timeoutId = window.setTimeout(() => {
      void loadSnapshot();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, loadSnapshot]);

  useEffect(() => {
    if (!isOpen) return;
    const element = messagesRef.current;
    if (!element) return;
    if (!shouldAutoScrollRef.current) return;
    element.scrollTop = element.scrollHeight;
  }, [isOpen, messages.length, isLoading]);

  useEffect(() => {
    if (!isOpen) return;
    const timeoutId = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 140);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  const welcomeMessage = useMemo(
    () => t("aiAssistantPage.quickWelcome", { defaultValue: "Ask LOLI AI about this admin page." }),
    [t]
  );

  const starterPrompts = useMemo(() => {
    if (currentPath.includes("fraud-reports")) {
      return [
        "Summarize the current fraud reports.",
        "Which record needs admin action first?",
        "Explain this page status briefly.",
      ];
    }

    if (currentPath.includes("admin-chat")) {
      return [
        "Summarize pending safe payment work.",
        "What should I do next on this page?",
        "Explain the current queues briefly.",
      ];
    }

    return [
      "Summarize this admin page.",
      "What should I review first?",
      "Explain the key records briefly.",
    ];
  }, [currentPath]);

  const startNewChat = () => {
    if (isLoading) return;
    createSession();
    setInput("");
    setError(null);
    void loadSnapshot();
    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  };

  const submitMessage = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    if (!savedSettings.apiKey.trim()) {
      setError(t("aiAssistantPage.quickApiKeyRequired"));
      return;
    }

    setInput("");
    setError(null);
    shouldAutoScrollRef.current = true;

    try {
      await submitAssistantMessage({
        content: trimmed,
        dashboardContext: buildSnapshotContext(snapshot),
        onActionComplete: loadSnapshot,
        sessionId: activeSession?.id,
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("aiAssistantPage.aiRequestFailed"));
    }
  };

  return (
    <div className={isOpen ? "aiQuickChat active" : "aiQuickChat"}>
      {isOpen ? (
        <section className="aiQuickChatPanel" aria-label={t("aiAssistantPage.quickChatTitle")}>
          <header className="aiQuickChatHead">
            <div className="aiQuickChatIdentity">
              <img src={loliLogo} alt="LOLI AI logo" />
              <div>
                <strong>{t("aiAssistantPage.quickChatTitle")}</strong>
                <span>{savedSettings.agentMode ? t("aiAssistantPage.agentModeEnabled") : t("aiAssistantPage.contextReady")}</span>
              </div>
            </div>
            <div className="aiQuickChatHeadActions">
              <button className="aiQuickChatNewButton" type="button" onClick={startNewChat} disabled={isLoading}>
                {t("aiAssistantPage.newChat")}
              </button>
              <button className="aiQuickChatIconButton" type="button" aria-label={t("common.close", { defaultValue: "Close" })} onClick={() => setIsOpen(false)}>
                <CloseIcon />
              </button>
            </div>
          </header>

          {!hasApiKey || error ? (
            <div className="aiQuickChatNotice">
              <p>{error || t("aiAssistantPage.quickApiKeyRequired")}</p>
              <button
                type="button"
                className="rewardsBtn secondary"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/ai-assistant");
                }}
              >
                {t("aiAssistantPage.openSettings")}
              </button>
            </div>
          ) : null}

          <div
            className="aiQuickChatMessages"
            ref={messagesRef}
            onScroll={(event) => {
              const element = event.currentTarget;
              const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
              shouldAutoScrollRef.current = distanceFromBottom < 48;
            }}
          >
            {messages.length === 0 ? (
              <div className="aiQuickChatEmpty">
                <div className="aiQuickChatEmptyIcon">
                  <SparkIcon />
                </div>
                <div className="aiQuickChatEmptyBody">
                  <strong>{t("aiAssistantPage.quickChatTitle")}</strong>
                  <p>{welcomeMessage}</p>
                </div>
                <div className="aiQuickChatStarterGrid">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="aiQuickChatStarter"
                      onClick={() => {
                        setInput(prompt);
                        textareaRef.current?.focus();
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <article key={message.id} className={`aiQuickChatMessage ${message.role}`}>
                  <span>{message.role === "user" ? t("aiAssistantPage.you") : "LOLI"}</span>
                  <QuickMessageContent content={message.content} role={message.role} />
                </article>
              ))
            )}
            {isLoading ? <div className="aiQuickChatTyping">{t("aiAssistantPage.thinking")}</div> : null}
          </div>

          <form className="aiQuickChatComposer" onSubmit={(event) => void submitMessage(event)}>
            <textarea
              ref={textareaRef}
              value={input}
              placeholder={t("aiAssistantPage.quickInputPlaceholder")}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submitMessage(event);
                }
              }}
            />
            <button type="submit" disabled={isLoading || !input.trim()}>
              <SparkIcon />
            </button>
          </form>
        </section>
      ) : null}

      <button
        className="aiQuickChatLauncher"
        type="button"
        aria-label={t("aiAssistantPage.quickOpen")}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <img src={loliLogo} alt="" aria-hidden="true" />
        <span>LOLI</span>
      </button>
    </div>
  );
}
