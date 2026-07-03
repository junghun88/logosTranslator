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
  Info
} from "lucide-react";
import { TranslationResult, SavedTranslation } from "./types";
import TranslationViewer from "./components/TranslationViewer";
import HistoryList from "./components/HistoryList";
import MacShortcutGuide from "./components/MacShortcutGuide";

export default function App() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"balanced" | "scholarly" | "devotional">("balanced");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [history, setHistory] = useState<SavedTranslation[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Loading indicator messages to show intelligence and depth
  const loadingMessages = [
    "Gemini 신학 엔진 연결 중...",
    "Logos 원문 문맥 분석 중...",
    "고전 헬라어/히브리어 원어 사전 대조 검색 중...",
    "품격 있는 한글 신학 용어로 문장 번역 중...",
    "연관 신학 에세이 및 역사적 맥락 작성 중...",
    "교차 대조 성경 구절 엄선 중..."
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
    if (textParam) {
      const decodedText = decodeURIComponent(textParam);
      setText(decodedText);
      // Automatically trigger translation with a slight delay to allow rendering
      const timer = setTimeout(() => {
        handleTranslate(decodedText);
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

  const handleTranslate = async (textToTranslate: string = text) => {
    if (!textToTranslate.trim()) {
      setError("번역할 텍스트를 입력해 주세요.");
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
          text: textToTranslate,
          mode
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "번역에 실패하였습니다.");
      }

      const data: TranslationResult = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "번역 및 분석 요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSave = () => {
    if (!result) return;

    // Check if current is already saved in history
    const existingIndex = history.findIndex(
      item => item.originalText === result.originalText && item.mode === mode
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
    if (confirm("모든 연구 기록을 삭제하시겠습니까?")) {
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
        alert("브라우저 보안 설정으로 인해 클립보드에 직접 접근할 수 없습니다. 수동으로 붙여넣어 주세요.");
      }
    } catch (err) {
      console.error("Clipboard paste error:", err);
    }
  };

  const isCurrentSaved = history.some(
    item => result && item.originalText === result.originalText && item.mode === mode
  );

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans selection:bg-stone-800 selection:text-white">
      {/* Elegantly Crafted Academic Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-900 text-stone-100 flex items-center justify-center rounded-xl shadow-sm">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl font-black tracking-tight text-stone-900">
                  Logos Translation Assistant
                </h1>
                <span className="hidden sm:inline-block bg-amber-50 text-amber-800 border border-amber-200 text-[10px] px-2 py-0.5 rounded-full font-serif font-semibold">
                  Theology Edition
                </span>
              </div>
              <p className="text-xs text-stone-500 font-serif mt-0.5">
                맥북 Logos 성경 영문 본문 및 주석 번역·신학 분석 시스템
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                showGuide 
                  ? "bg-stone-900 text-white shadow-sm" 
                  : "bg-stone-50 hover:bg-stone-200 text-stone-700 border border-stone-300"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              {showGuide ? "가이드 접기" : " macOS 단축키 연동 방법"}
            </button>
            <span className="h-6 w-px bg-stone-200 hidden md:block"></span>
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-mono text-stone-400 font-semibold uppercase tracking-wider">Engine Status</span>
              <span className="text-xs text-stone-700 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Gemini AI Online
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
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

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT 4 COLUMNS: Text input & Preferences & History */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Input Card */}
            <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                <h3 className="font-serif font-bold text-stone-800 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-stone-700" />
                  영문 텍스트 분석기
                </h3>
                <span className="text-[10px] font-mono text-stone-400 font-semibold">
                  {text.length} characters
                </span>
              </div>

              <div className="relative">
                <textarea
                  id="source-text-input"
                  rows={6}
                  placeholder="Logos 성경 앱의 영문 구절이나 신학 주석을 입력하세요..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full p-4 border border-stone-200 rounded-xl text-sm leading-relaxed placeholder-stone-400 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 font-serif text-stone-800 resize-none bg-stone-50/50"
                />
                
                {/* Floating Paste Shortcut button */}
                <div className="absolute right-3 bottom-3 flex gap-1.5">
                  <button
                    onClick={handlePasteClipboard}
                    className="p-1.5 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg text-stone-500 hover:text-stone-800 shadow-xs transition-colors flex items-center gap-1 text-[10px] font-medium"
                    title="클립보드 붙여넣기"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    <span>붙여넣기</span>
                  </button>
                  {text && (
                    <button
                      onClick={() => setText("")}
                      className="p-1.5 bg-white hover:bg-stone-50 border border-stone-200 rounded-lg text-stone-500 hover:text-stone-800 shadow-xs transition-colors text-[10px]"
                    >
                      비우기
                    </button>
                  )}
                </div>
              </div>

              {/* Study Mode Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-serif font-bold text-stone-600 block">연구 모드 (Study Mode)</label>
                <div className="grid grid-cols-3 gap-1.5 bg-stone-50 p-1 border border-stone-200 rounded-lg">
                  {[
                    { id: "balanced", label: "균형", desc: "기본" },
                    { id: "scholarly", label: "학술", desc: "원어" },
                    { id: "devotional", label: "묵상", desc: "경건" }
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

              {/* Action Button */}
              <button
                onClick={() => handleTranslate()}
                disabled={loading || !text.trim()}
                className="w-full py-3 bg-stone-900 hover:bg-stone-950 text-stone-50 rounded-lg font-semibold text-xs disabled:opacity-40 shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>분석 번역 중...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>신학적 대조 번역 실행</span>
                  </>
                )}
              </button>

              {/* Quick tip */}
              <div className="bg-stone-50 border border-stone-100 rounded-lg p-3 text-[11px] text-stone-500 flex gap-2">
                <Info className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Logos에서 텍스트를 마우스 드래그해 복사한 후 <strong>붙여넣기</strong> 버튼을 누르거나, 상단의 macOS 단축어 연동을 구성하여 원스톱 번역을 누려보세요.
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
                      AI 신학 번역기가 단어의 성경 원어 사전과 깊은 역사적 주해적 맥락을 입체적으로 추출하고 있습니다. 잠시만 기다려 주세요.
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
                  className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-6 shadow-sm flex items-start gap-3"
                >
                  <span className="text-lg">⚠️</span>
                  <div>
                    <h4 className="font-bold text-sm">신학 번역 요청 실패</h4>
                    <p className="text-xs mt-1 text-red-700 leading-relaxed">{error}</p>
                    <button
                      onClick={() => handleTranslate()}
                      className="mt-3 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 font-bold text-xs rounded transition-colors"
                    >
                      다시 시도하기
                    </button>
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
                  <h3 className="font-serif font-bold text-stone-700 text-base">분석할 본문을 선택하거나 연동해 주세요</h3>
                  <p className="text-xs text-stone-500 max-w-sm mt-1.5 leading-relaxed">
                    왼쪽 입력창에 영문 성경 구절이나 신학 주석을 직접 입력하시거나 복사해서 대입한 다음, 번역 버튼을 누르시면 전문적인 신학 사전 번역 및 대조 주해 데이터를 한눈에 공부할 수 있습니다.
                  </p>
                  
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => {
                        setText("For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.");
                        setMode("devotional");
                      }}
                      className="px-3 py-2 bg-white hover:bg-stone-100 border border-stone-200 text-stone-600 rounded-lg text-xs font-semibold transition-all shadow-xs"
                    >
                      예시 구절 넣기 (요한복음 3:16)
                    </button>
                    <button
                      onClick={() => {
                        setText("Therefore, since we have been justified by faith, we have peace with God through our Lord Jesus Christ. Through him we have also obtained access by faith into this grace in which we stand, and we rejoice in hope of the glory of God.");
                        setMode("scholarly");
                      }}
                      className="px-3 py-2 bg-white hover:bg-stone-100 border border-stone-200 text-stone-600 rounded-lg text-xs font-semibold transition-all shadow-xs"
                    >
                      학술적 구절 넣기 (로마서 5:1-2)
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
            이 앱은 맥북 Logos 성경 앱 유저의 깊이 있는 원어 및 주해 연구를 돕기 위해 개발된 웹 어플리케이션입니다. macOS 단축어 연동 기술을 통해 로컬 앱과의 실시간 연동을 완벽 지원합니다.
          </p>
          <div className="text-[10px] text-stone-600 font-mono mt-4">
            Powered by Google Gemini 3.5 Flash & Antigravity Built
          </div>
        </div>
      </footer>
    </div>
  );
}
