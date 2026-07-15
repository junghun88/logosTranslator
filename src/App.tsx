import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Languages, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  History, 
  Settings, 
  BookOpen, 
  FileText, 
  ExternalLink,
  ClipboardPaste,
  BookMarked,
  Info,
  Key,
  Globe,
  Eye,
  EyeOff,
  CheckCircle,
  Trash,
  Shield
} from "lucide-react";
import { TranslationResult, SavedTranslation } from "./types";
import TranslationViewer from "./components/TranslationViewer";
import HistoryList from "./components/HistoryList";
import MacShortcutGuide from "./components/MacShortcutGuide";
import { useLanguage } from "./lib/LanguageContext";
import AuthScreen from "./components/AuthScreen";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  const { uiLang, setUiLang, t } = useLanguage();

  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"balanced" | "scholarly" | "devotional">("balanced");
  const [targetLang, setTargetLang] = useState<string>("Korean");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [history, setHistory] = useState<SavedTranslation[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Translation Engine State
  const translationEngine = "gemini";

  // Custom API Keys State
  const [savedGeminiKey, setSavedGeminiKey] = useState("");
  const [customGeminiKey, setCustomGeminiKey] = useState("");
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [showGeminiPwd, setShowGeminiPwd] = useState(false);
  const [keysSavedStatus, setKeysSavedStatus] = useState<"idle" | "saved" | "cleared">("idle");

  // Client ID and Token Usage States
  const [clientId, setClientId] = useState("");
  const [dailyTokenUsage, setDailyTokenUsage] = useState({ used: 0, limit: 50 });

  // Fetch real-time daily translation usage from the server
  async function fetchRealtimeUsage(cidToUse?: string, geminiKeyToUse?: string) {
    try {
      const activeCid = cidToUse || clientId || localStorage.getItem("logos_client_id") || "";
      const activeGeminiKey = geminiKeyToUse !== undefined ? geminiKeyToUse : (savedGeminiKey || localStorage.getItem("logos_custom_gemini_key") || "");
      if (!activeCid) return;

      // Add cache buster 't' to ensure fresh data is fetched from the server without browser caching
      const res = await fetch(`/api/usage?clientId=${encodeURIComponent(activeCid)}&geminiApiKey=${encodeURIComponent(activeGeminiKey)}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setDailyTokenUsage({
          used: data.used,
          limit: data.limit
        });
        localStorage.setItem("logos_translation_count", String(data.used));
        if (data.date) {
          localStorage.setItem("logos_translation_count_date", data.date);
        }
      }
    } catch (err) {
      console.error("Failed to fetch realtime usage count from server:", err);
    }
  }

  // Load saved keys, client ID and token usage on mount
  useEffect(() => {
    try {
      const user = localStorage.getItem("logos_current_user");
      let gemini = "";
      if (user) {
        setCurrentUser(user);
        gemini = localStorage.getItem(`logos_custom_gemini_key_${user}`) || "";
        setSavedGeminiKey(gemini);
        setCustomGeminiKey(gemini);
        localStorage.setItem("logos_custom_gemini_key", gemini);
      } else {
        localStorage.removeItem("logos_custom_gemini_key");
      }

      // Client ID loading/generating
      let cid = localStorage.getItem("logos_client_id") || "";
      if (!cid) {
        cid = "cid_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        localStorage.setItem("logos_client_id", cid);
      }
      setClientId(cid);

      // Register custom key on server on mount if it exists
      if (gemini && cid) {
        fetch("/api/register-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ geminiApiKey: gemini, clientId: cid })
        }).catch(err => console.error("Failed to register key on mount:", err));
      }

      // Daily Translation Count loading
      const storedUsageDate = localStorage.getItem("logos_translation_count_date") || "";
      const today = new Date().toISOString().split("T")[0];
      let storedUsageCount = 0;
      if (storedUsageDate === today) {
        storedUsageCount = parseInt(localStorage.getItem("logos_translation_count") || "0", 10);
      } else {
        localStorage.setItem("logos_translation_count_date", today);
        localStorage.setItem("logos_translation_count", "0");
      }
      setDailyTokenUsage({ used: storedUsageCount, limit: 50 });

      // Fetch fresh count immediately
      if (cid) {
        fetchRealtimeUsage(cid, gemini);
      }
    } catch (e) {
      console.error("Failed to load saved API keys, clientId or token usage:", e);
    }
  }, []);

  // Sync usage periodically or on tab focus
  useEffect(() => {
    if (clientId) {
      fetchRealtimeUsage(clientId, savedGeminiKey);
      
      // Fetch every 15 seconds to keep in sync
      const interval = setInterval(() => {
        fetchRealtimeUsage(clientId, savedGeminiKey);
      }, 15000);

      // Fetch on window focus (e.g. user comes back from Mac shortcut popup)
      const handleFocus = () => {
        fetchRealtimeUsage(clientId, savedGeminiKey);
      };
      window.addEventListener("focus", handleFocus);

      return () => {
        clearInterval(interval);
        window.removeEventListener("focus", handleFocus);
      };
    }
  }, [clientId, savedGeminiKey]);

  // Handle global key updates (e.g. from Admin Panel)
  useEffect(() => {
    const handleGlobalKeysUpdated = () => {
      if (currentUser) {
        const gemini = localStorage.getItem(`logos_custom_gemini_key_${currentUser}`) || "";
        setSavedGeminiKey(gemini);
        setCustomGeminiKey(gemini);
      }
    };
    window.addEventListener("logos_keys_updated", handleGlobalKeysUpdated);
    return () => {
      window.removeEventListener("logos_keys_updated", handleGlobalKeysUpdated);
    };
  }, [currentUser]);

  const handleLoginSuccess = (username: string) => {
    localStorage.setItem("logos_current_user", username);
    setCurrentUser(username);
    const gemini = localStorage.getItem(`logos_custom_gemini_key_${username}`) || "";
    setSavedGeminiKey(gemini);
    setCustomGeminiKey(gemini);
    localStorage.setItem("logos_custom_gemini_key", gemini);

    if (gemini && clientId) {
      fetch("/api/register-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey: gemini, clientId })
      }).catch(err => console.error("Failed to register key on login:", err));
    }

    window.dispatchEvent(new Event("logos_keys_updated"));
  };

  const handleLogout = () => {
    localStorage.removeItem("logos_current_user");
    localStorage.removeItem("logos_custom_gemini_key");
    setCurrentUser(null);
    setSavedGeminiKey("");
    setCustomGeminiKey("");

    if (clientId) {
      fetch("/api/register-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey: "", clientId })
      }).catch(err => console.error("Failed to clear key on logout:", err));
    }

    window.dispatchEvent(new Event("logos_keys_updated"));
  };

  // Save personal API keys
  const handleSaveApiKeys = () => {
    try {
      if (!currentUser) return;
      localStorage.setItem(`logos_custom_gemini_key_${currentUser}`, customGeminiKey);
      localStorage.setItem("logos_custom_gemini_key", customGeminiKey);
      setSavedGeminiKey(customGeminiKey);
      setKeysSavedStatus("saved");
      
      if (customGeminiKey && clientId) {
        fetch("/api/register-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ geminiApiKey: customGeminiKey, clientId })
        }).catch(err => console.error("Failed to register key on save:", err));
      }

      // Notify other components (like MacShortcutGuide)
      window.dispatchEvent(new Event("logos_keys_updated"));

      setTimeout(() => setKeysSavedStatus("idle"), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // Clear personal API keys
  const handleClearApiKeys = () => {
    try {
      if (!currentUser) return;
      localStorage.removeItem(`logos_custom_gemini_key_${currentUser}`);
      localStorage.removeItem("logos_custom_gemini_key");
      setCustomGeminiKey("");
      setSavedGeminiKey("");
      setKeysSavedStatus("cleared");

      if (clientId) {
        fetch("/api/register-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ geminiApiKey: "", clientId })
        }).catch(err => console.error("Failed to clear key on server:", err));
      }

      // Notify other components (like MacShortcutGuide)
      window.dispatchEvent(new Event("logos_keys_updated"));

      setTimeout(() => setKeysSavedStatus("idle"), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // Loading indicator messages to show intelligence and depth
  const loadingMessages = [
    "Connecting to Gemini Theology Engine...",
    "Analyzing Logos source context...",
    "Cross-referencing Classical Greek & Hebrew lexicons...",
    "Translating passage into target theological terms...",
    "Generating deep theological insights & historical context...",
    "Curating relevant biblical cross-references..."
  ];

  // Load history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("logos_translation_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load translation history:", e);
    }
  }, []);

  // Sync history to localStorage
  const saveHistoryToStore = (newHistory: SavedTranslation[]) => {
    setHistory(newHistory);
    localStorage.setItem("logos_translation_history", JSON.stringify(newHistory));
  };

  // Listen to URL Query Parameters for instant macOS integration!
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const textParam = params.get("text");
    const modeParam = params.get("mode");
    const targetLangParam = params.get("targetLang") || params.get("target_lang") || params.get("lang");
    const geminiKeyParam = params.get("gemini_key") || params.get("geminiApiKey");

    let activeGeminiKey = localStorage.getItem("logos_custom_gemini_key") || "";

    if (geminiKeyParam) {
      localStorage.setItem("logos_custom_gemini_key", geminiKeyParam);
      setSavedGeminiKey(geminiKeyParam);
      setCustomGeminiKey(geminiKeyParam);
      activeGeminiKey = geminiKeyParam;
    }

    if (textParam) {
      let decodedText = textParam;
      try {
        // Since URLSearchParams.get() already decodes, we try to decode double-encoded values
        // only if there's a '%' symbol, and we wrap it in a safe try-catch to prevent crash.
        if (textParam.includes("%")) {
          decodedText = decodeURIComponent(textParam);
        }
      } catch (e) {
        console.warn("Failed to decode URI component, using raw param:", e);
        decodedText = textParam;
      }

      setText(decodedText);
      
      let finalMode: "balanced" | "scholarly" | "devotional" = "balanced";
      if (modeParam && (modeParam === "balanced" || modeParam === "scholarly" || modeParam === "devotional")) {
        setMode(modeParam);
        finalMode = modeParam;
      }

      let finalLang = "Korean";
      if (targetLangParam) {
        setTargetLang(targetLangParam);
        finalLang = targetLangParam;
      }

      // Automatically trigger translation with a slight delay to allow rendering
      const timer = setTimeout(() => {
        handleTranslate(decodedText, finalMode, finalLang, activeGeminiKey);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Rotate loading messages
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingMessages.length);
      }, 2500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleTranslate = async (
    textToTranslate: any = text,
    modeToUse: "balanced" | "scholarly" | "devotional" = mode,
    langToUse: string = targetLang,
    geminiKeyOverride?: string
  ) => {
    const safeText = typeof textToTranslate === "string" ? textToTranslate : String(textToTranslate || "");
    if (!safeText.trim()) {
      setError("Please enter the text to be translated.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveHistoryId(null);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: safeText,
          mode: modeToUse,
          targetLang: langToUse,
          geminiApiKey: geminiKeyOverride !== undefined ? geminiKeyOverride : savedGeminiKey,
          clientId: clientId,
          translationEngine: "gemini"
        })
      });

      // Safely read response as text to prevent "The string did not match the expected pattern" on JSON errors
      const responseText = await response.text();
      
      let parsedData: any = null;
      try {
        if (responseText) {
          parsedData = JSON.parse(responseText);
        }
      } catch (e) {
        console.warn("Response body is not a valid JSON string:", responseText);
      }

      if (!response.ok) {
        let cleanMsg = "Translation failed.";
        if (parsedData && parsedData.error) {
          cleanMsg = parsedData.error;
        } else if (responseText) {
          cleanMsg = responseText;
        }
        
        // Extract inner message if it's nested JSON
        if (typeof cleanMsg === "string" && cleanMsg.trim().startsWith("{")) {
          try {
            const inner = JSON.parse(cleanMsg);
            if (inner?.error?.message) {
              cleanMsg = inner.error.message;
            } else if (inner?.message) {
              cleanMsg = inner.message;
            }
          } catch (e) {
            // Ignore
          }
        }
        throw new Error(cleanMsg);
      }

      if (!parsedData) {
        if (responseText && (responseText.includes("⚠️") || responseText.includes("error") || responseText.includes("failed") || responseText.includes("translation"))) {
          throw new Error(responseText);
        }
        throw new Error("Invalid response received from the server.");
      }

      setResult(parsedData as TranslationResult);

      if (parsedData?.tokenUsage) {
        setDailyTokenUsage({
          used: parsedData.tokenUsage.dailyTotal,
          limit: parsedData.tokenUsage.limit
        });
        localStorage.setItem("logos_translation_count", String(parsedData.tokenUsage.dailyTotal));
        if (parsedData.tokenUsage.date) {
          localStorage.setItem("logos_translation_count_date", parsedData.tokenUsage.date);
        } else {
          localStorage.setItem("logos_translation_count_date", new Date().toISOString().split("T")[0]);
        }
      }
    } catch (err: any) {
      console.error("Translation request failed:", err);
      setError(err?.message || "An error occurred during the translation and analysis request.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSave = () => {
    if (!result) return;

    // Check if current is already saved in history
    const existingIndex = history.findIndex(
      item => item.originalText === result.originalText && item.mode === mode && (item.targetLang || "Korean") === targetLang
    );

    if (existingIndex >= 0) {
      // Remove
      const updated = history.filter((_, idx) => idx !== existingIndex);
      saveHistoryToStore(updated);
      setActiveHistoryId(null);
    } else {
      // Add
      const newItem: SavedTranslation = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date().toISOString(),
        originalText: result.originalText,
        translation: result.translation,
        mode,
        targetLang,
        translationEngine: "gemini",
        result
      };
      const updated = [newItem, ...history];
      saveHistoryToStore(updated);
      setActiveHistoryId(newItem.id);
    }
  };

  const handleSelectHistory = (item: SavedTranslation) => {
    setResult(item.result);
    setText(item.originalText);
    setMode(item.mode);
    setTargetLang(item.targetLang || "Korean");
    setActiveHistoryId(item.id);
  };

  const handleDeleteHistory = (id: string) => {
    const updated = history.filter(item => item.id !== id);
    saveHistoryToStore(updated);
    if (activeHistoryId === id) {
      setActiveHistoryId(null);
    }
  };

  const handleClearHistory = () => {
    if (confirm("Are you sure you want to delete all study history?")) {
      saveHistoryToStore([]);
      setActiveHistoryId(null);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard) {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText) {
          setText(clipboardText);
        }
      } else {
        alert("Unable to access the clipboard due to browser security settings. Please paste the text manually.");
      }
    } catch (err) {
      console.error("Clipboard paste error:", err);
    }
  };

  const isCurrentSaved = history.some(
    item => result && item.originalText === result.originalText && item.mode === mode && (item.targetLang || "Korean") === targetLang
  );

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans selection:bg-stone-800 selection:text-white">
      {/* Elegantly Crafted Academic Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-900 text-stone-100 flex items-center justify-center rounded-xl shadow-sm shrink-0">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl font-black tracking-tight text-stone-900">
                  {t("title")}
                </h1>
                <span className="hidden sm:inline-block bg-amber-50 text-amber-800 border border-amber-200 text-[10px] px-2 py-0.5 rounded-full font-serif font-semibold">
                  {t("subtitle")}
                </span>
              </div>
              <p className="text-xs text-stone-500 font-serif mt-0.5">
                {t("tagline")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {currentUser && (
              <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 shrink-0 text-xs text-stone-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-serif font-bold text-stone-800">{currentUser}</span>
                <span className="text-stone-300">|</span>
                <button
                  onClick={handleLogout}
                  className="font-semibold text-stone-500 hover:text-stone-900 underline cursor-pointer"
                >
                  {uiLang === "ko" ? "로그아웃" : "Logout"}
                </button>
              </div>
            )}

            {/* Language Toggle Segmented Control */}
            <div className="inline-flex bg-stone-100 p-0.5 border border-stone-200 rounded-lg text-xs font-semibold shrink-0">
              <button
                onClick={() => setUiLang("ko")}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${
                  uiLang === "ko" 
                    ? "bg-white text-stone-900 shadow-xs font-bold" 
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <Globe className="w-3 h-3 text-stone-400" />
                한국어
              </button>
              <button
                onClick={() => setUiLang("en")}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1 ${
                  uiLang === "en" 
                    ? "bg-white text-stone-900 shadow-xs font-bold" 
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <Globe className="w-3 h-3 text-stone-400" />
                English
              </button>
            </div>

            {/* Custom API Key Configuration Toggle */}
            <button
              onClick={() => {
                setShowApiSettings(!showApiSettings);
                if (showGuide) setShowGuide(false);
                setShowAdminPanel(false);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                showApiSettings 
                  ? "bg-stone-900 text-white shadow-sm" 
                  : "bg-stone-50 hover:bg-stone-200 text-stone-700 border border-stone-300"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{t("personalKeysBtn")}</span>
            </button>

            {/* Admin Panel Toggle */}
            {currentUser === "logos_admin" && (
              <button
                onClick={() => {
                  setShowAdminPanel(!showAdminPanel);
                  setShowApiSettings(false);
                  setShowGuide(false);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  showAdminPanel 
                    ? "bg-amber-800 text-white shadow-sm border border-transparent" 
                    : "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{t("adminPanel")}</span>
              </button>
            )}

            {/* Guide Toggle */}
            <button
              onClick={() => {
                setShowGuide(!showGuide);
                if (showApiSettings) setShowApiSettings(false);
                setShowAdminPanel(false);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                showGuide 
                  ? "bg-stone-900 text-white shadow-sm" 
                  : "bg-stone-50 hover:bg-stone-200 text-stone-700 border border-stone-300"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              {showGuide ? t("collapseGuide") : t("shortcutsGuide")}
            </button>

            <span className="h-6 w-px bg-stone-200 hidden md:block"></span>
            
            <div className="hidden md:flex flex-col items-start md:items-end shrink-0">
              <span className="text-[10px] font-mono text-stone-400 font-semibold uppercase tracking-wider">
                {savedGeminiKey ? t("customKeyBypassActive") : t("dailyTokenUsageTitle")}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                {!savedGeminiKey ? (
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-stone-100 h-2 rounded-full overflow-hidden border border-stone-200 relative">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          dailyTokenUsage.used >= dailyTokenUsage.limit 
                            ? "bg-rose-500" 
                            : dailyTokenUsage.used > dailyTokenUsage.limit * 0.8 
                              ? "bg-amber-500" 
                              : "bg-amber-600"
                        }`}
                        style={{ width: `${Math.min(100, (dailyTokenUsage.used / dailyTokenUsage.limit) * 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-mono font-bold text-stone-750">
                      {dailyTokenUsage.used.toLocaleString()} / {dailyTokenUsage.limit.toLocaleString()}회
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-amber-700 font-bold bg-amber-50/50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600 animate-pulse" />
                    {t("customKeyBypassActive")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Personal API Keys Settings Panel */}
        <AnimatePresence>
          {showApiSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
                  <div className="w-8 h-8 bg-amber-50 text-amber-950 flex items-center justify-center rounded-lg border border-amber-200">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-stone-900 text-base">{t("apiSettingsTitle")}</h3>
                    <p className="text-xs text-stone-500 mt-0.5">{t("apiSettingsDesc")}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Gemini Key Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-serif font-bold text-stone-700 flex items-center justify-between">
                      <span>{t("geminiKeyLabel")}</span>
                      <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-amber-800 hover:underline flex items-center gap-0.5">
                        {t("getFreeApiKey")} <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </label>
                    <div className="relative">
                      <input
                        type={showGeminiPwd ? "text" : "password"}
                        placeholder="AIzaSy..."
                        value={customGeminiKey}
                        onChange={(e) => setCustomGeminiKey(e.target.value)}
                        className="w-full p-2.5 pr-10 border border-stone-200 rounded-lg text-xs leading-relaxed font-mono focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 bg-stone-50/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGeminiPwd(!showGeminiPwd)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-stone-400 hover:text-stone-700"
                      >
                        {showGeminiPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Daily Token Usage Meter inside Settings */}
                <div className="bg-stone-50 border border-stone-200/60 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-serif font-bold text-stone-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      {t("dailyTokenUsageTitle")}
                    </span>
                    {savedGeminiKey ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {t("customKeyBypassActive")}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-stone-600">
                        {t("tokenMeterLabel")} {dailyTokenUsage.used.toLocaleString()} / {dailyTokenUsage.limit.toLocaleString()}회 ({Math.round((dailyTokenUsage.used / dailyTokenUsage.limit) * 100)}%)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 leading-relaxed">
                    {t("dailyTokenUsageDesc")}
                  </p>
                  
                  {!savedGeminiKey && (
                    <div className="w-full bg-stone-250/70 h-2 rounded-full overflow-hidden relative">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          dailyTokenUsage.used >= dailyTokenUsage.limit 
                            ? "bg-rose-500" 
                            : dailyTokenUsage.used > dailyTokenUsage.limit * 0.8 
                              ? "bg-amber-500" 
                              : "bg-amber-600"
                        }`}
                        style={{ width: `${Math.min(100, (dailyTokenUsage.used / dailyTokenUsage.limit) * 100)}%` }}
                      ></div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveApiKeys}
                      className="px-4 py-2 bg-stone-900 hover:bg-stone-950 text-stone-50 font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4 text-stone-300" />
                      {t("saveKeysBtn")}
                    </button>
                    <button
                      onClick={handleClearApiKeys}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-lg transition-colors border border-stone-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash className="w-4 h-4 text-stone-500" />
                      {t("clearKeysBtn")}
                    </button>
                  </div>

                  <AnimatePresence>
                    {keysSavedStatus === "saved" && (
                      <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-emerald-800 font-semibold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5"
                      >
                        <span>✓</span> {t("keysSavedAlert")}
                      </motion.span>
                    )}
                    {keysSavedStatus === "cleared" && (
                      <motion.span
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-amber-800 font-semibold bg-amber-50 px-3 py-1 rounded-full border border-amber-200"
                      >
                        {t("keysClearedAlert")}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* macOS Integration Guide Banner */}
        <AnimatePresence>
          {showGuide && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <MacShortcutGuide />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin Panel (Visible to logos_admin only) */}
        <AnimatePresence>
          {showAdminPanel && currentUser === "logos_admin" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8"
            >
              <AdminPanel 
                uiLang={uiLang} 
                currentAdmin={currentUser}
                onUserUpdate={() => {
                  fetchRealtimeUsage(clientId, savedGeminiKey);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT 4 COLUMNS: Text input & Preferences & History */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Input Card */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                <h3 className="font-serif font-bold text-stone-800 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-stone-700" />
                  English Text Analyzer
                </h3>
                <span className="text-[10px] font-mono text-stone-400 font-semibold">
                  {text.length} characters
                </span>
              </div>

              <div className="relative">
                <textarea
                  id="source-text-input"
                  rows={6}
                  placeholder="Enter English Bible verses or theological commentaries from your Logos app..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full p-4 border border-stone-200 rounded-xl text-sm leading-relaxed placeholder-stone-400 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 font-serif text-stone-800 resize-none bg-stone-50/50"
                />
                
                {/* Floating Paste Shortcut button */}
                <div className="absolute right-3 bottom-3 flex gap-1.5">
                  <button
                    onClick={handlePasteClipboard}
                    className="p-1.5 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg text-stone-500 hover:text-stone-800 shadow-xs transition-colors flex items-center gap-1 text-[10px] font-medium"
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    <span>Paste</span>
                  </button>
                  {text && (
                    <button
                      onClick={() => setText("")}
                      className="p-1.5 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg text-stone-500 hover:text-stone-800 shadow-xs transition-colors text-[10px]"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Study Mode Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-serif font-bold text-stone-600 block">Study Mode</label>
                <div className="grid grid-cols-3 gap-1.5 bg-stone-50 p-1 border border-stone-200 rounded-lg">
                  {[
                    { id: "balanced", label: "Balanced", desc: "Default" },
                    { id: "scholarly", label: "Scholarly", desc: "Lexicon" },
                    { id: "devotional", label: "Devotional", desc: "Pastoral" }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id as any)}
                      className={`py-2 px-1 rounded-md text-xs font-semibold flex flex-col items-center transition-all ${
                        mode === m.id
                          ? "bg-white text-stone-900 border border-stone-300 shadow-xs"
                          : "text-stone-500 hover:text-stone-800"
                      }`}
                    >
                      <span>{m.label}</span>
                      <span className="text-[9px] font-normal opacity-60 font-serif italic mt-0.5">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Language Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-serif font-bold text-stone-600 block flex items-center justify-between">
                  <span>Target Language</span>
                  <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-serif font-semibold">
                    Theology Optimized
                  </span>
                </label>
                <div className="relative">
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-800 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 appearance-none cursor-pointer pr-8 font-sans"
                  >
                    <option value="Korean">한국어 (Korean)</option>
                    <option value="English">영어 (English)</option>
                    <option value="Japanese">일본어 (Japanese)</option>
                    <option value="Chinese Simplified">중국어 간체 (Chinese Simplified)</option>
                    <option value="Chinese Traditional">중국어 번체 (Chinese Traditional)</option>
                    <option value="Spanish">스페인어 (Spanish)</option>
                    <option value="German">독일어 (German)</option>
                    <option value="French">프랑스어 (French)</option>
                    <option value="Portuguese">포르투갈어 (Portuguese)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-stone-500">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>



              {/* Action Button / API Key Requirement Policy */}
              {!savedGeminiKey ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-stone-700 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 text-amber-800 font-bold">
                    <Key className="w-4 h-4 shrink-0" />
                    <span>구글 Gemini API Key 입력 필수 정책</span>
                  </div>
                  <p className="leading-relaxed font-serif text-stone-600">
                    로고스 번역 동반자 서비스 이용 정책에 따라 <strong>개인 API Key가 등록되어야</strong> 신학 분석 및 번역 서비스가 활성화됩니다. 우측 상단의 API Key 설정 창에서 발급받은 본인 키를 입력해 주세요.
                  </p>
                  <button
                    onClick={() => {
                      setShowApiSettings(true);
                      if (showGuide) setShowGuide(false);
                    }}
                    className="w-full py-2 bg-amber-800 hover:bg-amber-900 text-stone-50 rounded-lg text-center font-bold text-[11px] transition-colors cursor-pointer"
                  >
                    ⚙️ 개인 API Key 설정 열기
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleTranslate()}
                  disabled={loading || !text.trim()}
                  className="w-full py-3 bg-stone-900 hover:bg-stone-950 text-stone-50 rounded-lg font-semibold text-xs disabled:opacity-40 shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Analyzing & Translating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Run Theological Parsing</span>
                    </>
                  )}
                </button>
              )}

              {/* Quick tip */}
              <div className="bg-stone-50 border border-stone-100 rounded-lg p-3 text-[11px] text-stone-500 flex gap-2">
                <Info className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Drag and copy text in Logos, click the <strong>Paste</strong> button, or configure macOS Shortcuts for seamless one-click translation.
                </p>
              </div>
            </div>

            {/* Study Notes & History Sidebar */}
            <HistoryList
              history={history}
              activeId={activeHistoryId}
              onSelect={handleSelectHistory}
              onDelete={handleDeleteHistory}
              onClearAll={handleClearHistory}
            />

          </div>

          {/* RIGHT 8 COLUMNS: Active translation & analysis view */}
          <div className="lg:col-span-8 h-full">
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-white border border-stone-200 rounded-xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[400px] space-y-6"
                >
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin"></div>
                    <Languages className="w-6 h-6 text-stone-800 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  
                  <div className="space-y-2 max-w-sm">
                    <h4 className="font-serif font-bold text-stone-800 text-md">
                      {loadingMessages[loadingStep]}
                    </h4>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      The theological parser is extracting lexicon definitions, original word roots, and deep historical commentary. This may take a moment.
                    </p>
                  </div>
                </motion.div>
              )}

              {error && !loading && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-red-50 border border-red-200 text-red-900 rounded-xl p-6 shadow-sm space-y-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">⚠️</span>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm">Theological Translation Failed (API Error)</h4>
                      <p className="text-xs text-red-700 leading-relaxed font-mono bg-red-100/50 p-2 rounded border border-red-200">{error}</p>
                    </div>
                  </div>

                  {(error.toUpperCase().includes("GEMINI") || 
                    error.toUpperCase().includes("API") || 
                    error.toUpperCase().includes("KEY") || 
                    error.toUpperCase().includes("CREDENTIAL") || 
                    error.toUpperCase().includes("FORBIDDEN") || 
                    error.toUpperCase().includes("UNAUTHORIZED")) && (
                    <div className="bg-white border border-red-200 rounded-lg p-4 text-xs text-stone-700 space-y-3 shadow-xs">
                      <p className="font-bold text-stone-900 flex items-center gap-1.5">
                        💡 How to Set Up Your GEMINI_API_KEY
                      </p>
                      <ol className="list-decimal list-inside space-y-1.5 text-stone-600 pl-1">
                        <li>Click the <strong>Settings</strong> menu in the upper right corner of this browser or your AI Studio environment.</li>
                        <li>Navigate to the <strong>Secrets</strong> or <strong>Environment Variables</strong> tab.</li>
                        <li>Add a new variable with the name <code className="bg-stone-100 text-stone-800 px-1 py-0.5 rounded font-mono font-semibold">GEMINI_API_KEY</code>.</li>
                        <li>Paste your actual API Key from Google AI Studio or Google Cloud Console, and save.</li>
                        <li>Refresh the page or try re-running the translation!</li>
                      </ol>
                    </div>
                  )}

                  {error.includes("DEEPL") && (
                    <div className="bg-white border border-red-200 rounded-lg p-4 text-xs text-stone-700 space-y-3 shadow-xs">
                      <p className="font-bold text-stone-900 flex items-center gap-1.5">
                        💡 How to Set Up Your DEEPL_API_KEY
                      </p>
                      <p className="text-stone-600">
                        Encountered a DeepL API error, or want to configure a DeepL key for dual translations?
                      </p>
                      <ol className="list-decimal list-inside space-y-1.5 text-stone-600 pl-1">
                        <li>Sign up or log in to the <a href="https://www.deepl.com/pro-api" target="_blank" rel="noopener noreferrer" className="text-stone-900 underline font-semibold">DeepL API Developer Portal</a>.</li>
                        <li>Acquire your API Key (the free plan offers 500k characters/month) and copy it.</li>
                        <li>Open the <strong>Settings</strong> panel at the top right, and save the key under the name <code className="bg-stone-100 text-stone-800 px-1 py-0.5 rounded font-mono font-semibold">DEEPL_API_KEY</code>.</li>
                      </ol>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTranslate()}
                      className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs rounded transition-colors"
                    >
                      Try Again
                    </button>
                    {(error.toUpperCase().includes("GEMINI") || error.toUpperCase().includes("KEY") || error.toUpperCase().includes("API")) && (
                      <a 
                        href="https://aistudio.google.com/apikey" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-100 font-bold text-xs rounded transition-colors inline-block"
                      >
                        Get Free Gemini API Key ↗
                      </a>
                    )}
                  </div>
                </motion.div>
              )}

              {result && !loading && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <TranslationViewer
                    result={result}
                    mode={mode}
                    isSaved={isCurrentSaved}
                    onToggleSave={handleToggleSave}
                  />
                </motion.div>
              )}

              {!result && !loading && !error && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-stone-50 border border-stone-200 border-dashed rounded-xl p-12 text-center min-h-[400px] flex flex-col items-center justify-center shadow-inner"
                >
                  <BookOpen className="w-12 h-12 text-stone-300 mb-4" />
                  <h3 className="font-serif font-bold text-stone-700 text-base">Select or Paste a Passage to Analyze</h3>
                  <p className="text-xs text-stone-500 max-w-sm mt-1.5 leading-relaxed">
                    Paste English Bible verses or commentaries in the left input box, or load an example below. The system will provide dual translations, cross-references, and lexicon annotations.
                  </p>
                  
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => {
                        setText("For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.");
                        setMode("devotional");
                      }}
                      className="px-3 py-2 bg-white hover:bg-stone-100 border border-stone-200 text-stone-600 rounded-lg text-xs font-semibold transition-all shadow-xs"
                    >
                      Load Devotional Example (John 3:16)
                    </button>
                    <button
                      onClick={() => {
                        setText("Therefore, since we have been justified by faith, we have peace with God through our Lord Jesus Christ. Through him we have also obtained access by faith into this grace in which we stand, and we rejoice in hope of the glory of God.");
                        setMode("scholarly");
                      }}
                      className="px-3 py-2 bg-white hover:bg-stone-100 border border-stone-200 text-stone-600 rounded-lg text-xs font-semibold transition-all shadow-xs"
                    >
                      Load Scholarly Example (Romans 5:1-2)
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="bg-stone-950 text-stone-400 py-10 mt-16 border-t border-stone-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <p className="text-xs font-serif font-semibold tracking-wide text-stone-500 uppercase">
            Logos Translation Companion & Theological Parser
          </p>
          <p className="text-xs max-w-md mx-auto text-stone-400 font-light leading-relaxed">
            This application is designed to assist MacBook Logos Bible Software users in original language studies and contextual biblical research. It fully supports real-time popup integrations using macOS Shortcuts.
          </p>
          <div className="text-[10px] text-stone-600 font-mono mt-4">
            Powered by Google Gemini 3.5 Flash & Antigravity Built
          </div>
        </div>
      </footer>
    </div>
  );
}
