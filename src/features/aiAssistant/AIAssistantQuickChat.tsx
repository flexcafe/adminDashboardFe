import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import container from "@/core/infrastructure/di/container";
import { HttpClient } from "@/core/infrastructure/api/HttpClient";
import loliLogo from "@/assets/loli-logo.png";
import {
  buildSnapshotContext,
  loadDashboardSnapshot,
} from "@/features/aiAssistant/dashboardSnapshot";
import { useAIAssistant } from "@/features/aiAssistant/useAIAssistant";

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2 3 14h8l-1 8 10-12h-8z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 2 11 13" />
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
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
  const [snapshotContext, setSnapshotContext] = useState<string>("No dashboard data loaded yet.");
  const [error, setError] = useState<string | null>(null);

  const hasApiKey = savedSettings.apiKey.trim().length > 0;
  const messages = activeSession?.messages ?? [];

  const loadSnapshot = useCallback(async () => {
    const nextSnapshot = await loadDashboardSnapshot(httpClient, currentPath, "quick");
    const nextContext = buildSnapshotContext(nextSnapshot, 14000);
    setSnapshotContext(nextContext);
    return nextContext;
  }, [currentPath, httpClient]);

  const refreshSnapshot = useCallback(async () => {
    await loadSnapshot();
  }, [loadSnapshot]);

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

  const handleSendMessage = async () => {
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
      const nextSnapshotContext = await loadSnapshot();
      await submitAssistantMessage({
        content: trimmed,
        dashboardContext: nextSnapshotContext || snapshotContext,
        onActionComplete: refreshSnapshot,
        refreshDashboardContext: loadSnapshot,
        sessionId: activeSession?.id,
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("aiAssistantPage.aiRequestFailed"));
    }
  };

  const handleComposerSubmit = (event: FormEvent) => {
    event.preventDefault();
    void handleSendMessage();
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

          <form className="aiQuickChatComposer" onSubmit={handleComposerSubmit}>
            <div className="aiQuickChatComposerRow">
              <textarea
                ref={textareaRef}
                value={input}
                placeholder={t("aiAssistantPage.quickInputPlaceholder")}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSendMessage();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={isLoading || !input.trim()}
                aria-label={t("aiAssistantPage.send")}
              >
                <SendIcon />
                <span>{t("aiAssistantPage.send")}</span>
              </button>
            </div>
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
