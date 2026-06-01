import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  listSuggestions,
  rewardSuggestion,
  dismissSuggestion,
  type Suggestion,
} from "./suggestionsApi";

type SuggestionsContextValue = {
  suggestions: Suggestion[];
  pendingCount: number;
  isLoading: boolean;
  error: string | null;
  actionLoading: string | null;
  refreshSuggestions: () => Promise<void>;
  handleReward: (suggestionId: string, points: number) => Promise<string>;
  handleDismiss: (suggestionId: string) => Promise<string>;
};

const SuggestionsContext =
  createContext<SuggestionsContextValue | null>(null);

export function SuggestionsProvider({ children }: PropsWithChildren) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  const refreshSuggestions = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const refreshTask = (async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await listSuggestions();
      setSuggestions(data);
    } catch (loadError) {
      setSuggestions([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load suggestions."
      );
    } finally {
      setIsLoading(false);
      refreshInFlightRef.current = null;
    }
    })();

    refreshInFlightRef.current = refreshTask;
    return refreshTask;
  }, []);

  useEffect(() => {
    void refreshSuggestions();
  }, [refreshSuggestions]);

  const pendingCount = useMemo(
    () => suggestions.filter((s) => s.status === "PENDING").length,
    [suggestions]
  );

  const handleReward = useCallback(
    async (suggestionId: string, points: number): Promise<string> => {
      setActionLoading(suggestionId);
      try {
        const message = await rewardSuggestion(suggestionId, points);
        setSuggestions((prev) =>
          prev.map((s) =>
            s.id === suggestionId ? { ...s, status: "REWARDED" } : s
          )
        );
        return message;
      } finally {
        setActionLoading(null);
      }
    },
    []
  );

  const handleDismiss = useCallback(
    async (suggestionId: string): Promise<string> => {
      setActionLoading(suggestionId);
      try {
        const message = await dismissSuggestion(suggestionId);
        setSuggestions((prev) =>
          prev.map((s) =>
            s.id === suggestionId ? { ...s, status: "DISMISSED" } : s
          )
        );
        return message;
      } finally {
        setActionLoading(null);
      }
    },
    []
  );

  const value = useMemo<SuggestionsContextValue>(
    () => ({
      suggestions,
      pendingCount,
      isLoading,
      error,
      actionLoading,
      refreshSuggestions,
      handleReward,
      handleDismiss,
    }),
    [
      suggestions,
      pendingCount,
      isLoading,
      error,
      actionLoading,
      refreshSuggestions,
      handleReward,
      handleDismiss,
    ]
  );

  return (
    <SuggestionsContext.Provider value={value}>
      {children}
    </SuggestionsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSuggestions() {
  const context = useContext(SuggestionsContext);

  if (!context) {
    throw new Error(
      "useSuggestions must be used within a SuggestionsProvider."
    );
  }

  return context;
}
