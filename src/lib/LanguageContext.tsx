import React, { createContext, useContext, useState, useEffect } from "react";

export type UiLang = "en" | "ko";

interface LanguageContextProps {
  uiLang: UiLang;
  setUiLang: (lang: UiLang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

// Translation Dictionary
const dictionary: Record<string, Record<UiLang, string>> = {
  // Header & Global
  title: {
    en: "Logos Translation Assistant",
    ko: "로고스 번역 동반자",
  },
  theologyEdition: {
    en: "Theology Edition",
    ko: "신학 에디션",
  },
  tagline: {
    en: "MacBook Logos Bible Translation & Theological Parsing System",
    ko: "맥북 로고스 성경 번역 및 신학적 주해 분석 시스템",
  },
  shortcutsGuide: {
    en: " macOS Shortcuts Guide",
    ko: " macOS 단축어 연동 가이드",
  },
  collapseGuide: {
    en: "Collapse Guide",
    ko: "가이드 접기",
  },
  engineStatus: {
    en: "Engine Status",
    ko: "엔진 상태",
  },
  geminiOnline: {
    en: "Gemini AI Online",
    ko: "Gemini AI 정상 작동",
  },

  // Input Card
  cardTitle: {
    en: "English Text Analyzer",
    ko: "영어 본문 분석기",
  },
  charCount: {
    en: "characters",
    ko: "자",
  },
  placeholder: {
    en: "Enter English Bible verses or theological commentaries from your Logos app...",
    ko: "로고스 앱에서 복사한 영어 성경 구절이나 신학 주석을 입력하세요...",
  },
  pasteBtn: {
    en: "Paste",
    ko: "붙여넣기",
  },
  clearBtn: {
    en: "Clear",
    ko: "지우기",
  },
  studyMode: {
    en: "Study Mode",
    ko: "연구 모드",
  },
  modeBalanced: {
    en: "Balanced",
    ko: "균형 번역",
  },
  descBalanced: {
    en: "Default",
    ko: "기본 주해",
  },
  modeScholarly: {
    en: "Scholarly",
    ko: "학술 연구",
  },
  descScholarly: {
    en: "Lexicon",
    ko: "원어 분석",
  },
  modeDevotional: {
    en: "Devotional",
    ko: "경건 묵상",
  },
  descDevotional: {
    en: "Pastoral",
    ko: "목회 나눔",
  },
  targetLangLabel: {
    en: "Target Language",
    ko: "번역 대상 언어",
  },
  theologyOptimized: {
    en: "Theology Optimized",
    ko: "신학 용어 최적화",
  },
  runBtn: {
    en: "Run Theological Parsing",
    ko: "신학 분석 및 번역 시작",
  },
  translatingBtn: {
    en: "Analyzing & Translating...",
    ko: "신학적 분석 및 주해 번역 중...",
  },
  quickTip: {
    en: "Drag and copy text in Logos, click the Paste button, or configure macOS Shortcuts for seamless one-click translation.",
    ko: "로고스에서 본문을 드래그 복사한 뒤 붙여넣기 단추를 누르거나, macOS 단축어를 연동하면 1초 만에 바로 번역됩니다.",
  },

  // History List
  historyTitle: {
    en: "Study History",
    ko: "연구 역사 기록",
  },
  clearAll: {
    en: "Clear All",
    ko: "전체 삭제",
  },
  searchPlaceholder: {
    en: "Search passages, translations, annotations...",
    ko: "구절, 번역, 주석 및 어원 검색...",
  },
  noHistory: {
    en: "No study history yet.",
    ko: "저장된 연구 이력이 없습니다.",
  },
  noSearchResults: {
    en: "No search results found.",
    ko: "일치하는 검색 결과가 없습니다.",
  },
  historyTip: {
    en: "Your saved translations will appear here to keep track of your studies.",
    ko: "번역 결과에서 '연구 노트 저장' 버튼을 클릭하면 여기에 안전하게 보관됩니다.",
  },
  deleteRecord: {
    en: "Delete record",
    ko: "기록 삭제",
  },

  // Empty State (no translation active)
  emptyTitle: {
    en: "Select or Paste a Passage to Analyze",
    ko: "분석할 본문을 선택하거나 입력해 주세요",
  },
  emptyDesc: {
    en: "Paste English Bible verses or commentaries in the left input box, or load an example below. The system will provide dual translations, cross-references, and lexicon annotations.",
    ko: "왼쪽 입력창에 영문 성경 구절이나 주석을 복사해 넣은 뒤 번역 버튼을 누르시면, 고정밀 번역, 원어 사전 분석 및 신학적 주해를 공부하실 수 있습니다.",
  },
  loadDevotional: {
    en: "Load Devotional Example (John 3:16)",
    ko: "묵상용 예시 불러오기 (요한복음 3:16)",
  },
  loadScholarly: {
    en: "Load Scholarly Example (Romans 5:1-2)",
    ko: "학술 연구용 예시 불러오기 (로마서 5:1-2)",
  },

  // Loading Screen
  loadingDescription: {
    en: "The theological parser is extracting lexicon definitions, original word roots, and deep historical commentary. This may take a moment.",
    ko: "AI 신학 분석 엔진이 단어의 성경 원어 사전과 역사적 주해적 맥락을 복합 추출하고 있습니다. 잠시만 기다려 주세요.",
  },

  // Error Card
  errorTitle: {
    en: "Theological Translation Failed (API Error)",
    ko: "신학 번역 및 해석 실패 (API 오류)",
  },
  tryAgain: {
    en: "Try Again",
    ko: "다시 시도하기",
  },
  getFreeApiKey: {
    en: "Get Free Gemini API Key ↗",
    ko: "무료 Gemini API Key 발급받기 ↗",
  },

  // Translation Viewer Header
  analysisMode: {
    en: "Analysis Mode",
    ko: "해석 분석 모드",
  },
  savedToHistory: {
    en: "Saved to History",
    ko: "연구 노트 저장됨",
  },
  saveToHistory: {
    en: "Save to History",
    ko: "연구 노트 저장",
  },
  copyAll: {
    en: "Copy All",
    ko: "전체 카드 복사",
  },
  copiedAll: {
    en: "Copied All",
    ko: "전체 복사 완료",
  },

  // Tabs
  tabOverview: {
    en: "Overview & Commentary",
    ko: "종합 번역 & 신학 주해",
  },
  tabSentences: {
    en: "Sentence Comparison",
    ko: "문장별 대조 분석",
  },
  tabWords: {
    en: "Original Lexicon (Greek/Hebrew)",
    ko: "핵심 원어 사전 (Greek/Hebrew)",
  },
  tabReferences: {
    en: "Cross References",
    ko: "주제별 참조 구절 (Cross-Ref)",
  },

  // Overview Tab Contents
  originalLabel: {
    en: "Logos Original English Text",
    ko: "로고스 영어 원문",
  },
  contextualLabel: {
    en: "Theological Translation",
    ko: "Gemini 신학·문맥 역본",
  },
  contextualBadge: {
    en: "Gemini Contextual",
    ko: "Gemini 주해의역",
  },
  commentaryTitle: {
    en: "Theological Commentary & Contextual Insights",
    ko: "해당 본문의 신학적 맥락과 묵상적 통찰 (Theological Insights)",
  },
  copied: {
    en: "Copied",
    ko: "복사 완료",
  },
  copyOriginal: {
    en: "Copy Original",
    ko: "원문 복사",
  },
  copyLiteral: {
    en: "Copy Literal",
    ko: "직역본 복사",
  },
  copyContextual: {
    en: "Copy Contextual",
    ko: "의역본 복사",
  },

  // Sentence Comparison Tab Contents
  sentenceCompareDesc: {
    en: "Compare sentence structures side-by-side to study grammatical flow and precise translation matches.",
    ko: "각 원문 문장별 일대일 매칭을 통해 문장의 문법 구조와 한글 의미를 입체적으로 대조 연구할 수 있습니다.",
  },
  sentenceCompareBadge: {
    en: "Translation",
    ko: "번역 매칭",
  },
  noSentenceData: {
    en: "No sentence comparison data available.",
    ko: "문장별 분석 대조 데이터가 존재하지 않습니다.",
  },

  // Lexicon Tab Contents
  lexiconDesc: {
    en: "Analysis of key words, their Greek/Hebrew root terms, transliterations, and theological usage in context.",
    ko: "본문 내 주요 핵심 단어들의 헬라어(Greek) / 히브리어(Hebrew) 성경 원어 사전과 어원, 신학적 용어 해석입니다.",
  },
  lexiconMeaning: {
    en: "Meaning",
    ko: "뜻",
  },
  noLexiconData: {
    en: "No original words analyzed in this passage.",
    ko: "원어 분석 단어가 포함되어 있지 않습니다.",
  },

  // Cross-References Tab Contents
  crossRefDesc: {
    en: "Theologically relevant cross-references to broaden your study of the themes in this passage.",
    ko: "본문 텍스트의 성경 연구에 영감을 주는 깊은 주제적/신학적 성경 교차 참조 구절입니다.",
  },
  noCrossRefData: {
    en: "No cross-references available for this passage.",
    ko: "추천 상호참조 구절이 없습니다.",
  },

  // Footer
  footerTitle: {
    en: "Logos Translation Companion & Theological Parser",
    ko: "로고스 번역 동반자 & 신학 해석 엔진",
  },
  footerText: {
    en: "This application is designed to assist MacBook Logos Bible Software users in original language studies and contextual biblical research. It fully supports real-time popup integrations using macOS Shortcuts.",
    ko: "이 앱은 맥북 Logos 성경 프로그램 사용자들의 깊이 있는 원어 및 주해 연구를 돕기 위해 개발된 대화형 웹 분석기입니다. macOS 단축어 연동 기술을 통해 로컬 앱과의 실시간 연동을 지원합니다.",
  },

  // Loading Messages Rotation (translating keys)
  loadMsg0: { en: "Connecting to Gemini Theology Engine...", ko: "Gemini 신학 분석 엔진 연결 중..." },
  loadMsg1: { en: "Analyzing Logos source context...", ko: "Logos 영어 원문 컨텍스트 분석 중..." },
  loadMsg2: { en: "Cross-referencing Classical Greek & Hebrew lexicons...", ko: "헬라어 및 히브리어 고전 원어 사전 대조 중..." },
  loadMsg3: { en: "Translating passage into target theological terms...", ko: "신학적 용어를 대입하여 한글 주해 번역 중..." },
  loadMsg4: { en: "Generating deep theological insights & historical context...", ko: "역사적 주해 주석 및 심층 묵상적 통찰 생성 중..." },
  loadMsg5: { en: "Curating relevant biblical cross-references...", ko: "주제와 연관된 상호참조(Cross-Ref) 성경 구절 발굴 중..." },

  // API Keys Config
  apiSettingsTitle: {
    en: "Personal API Keys Config (Pay-As-You-Go)",
    ko: "개인 API 키 설정 (개인 과금 및 개인 키 사용)",
  },
  apiSettingsDesc: {
    en: "Configure your own Gemini and DeepL API keys. All translation requests will be billed directly to your personal accounts. Keys are stored locally and securely in your browser.",
    ko: "본인의 Gemini 및 DeepL API 키를 입력하여 사용합니다. 모든 번역 및 주해 요청은 개인 계정으로 과금됩니다. API 키는 브라우저 로컬 저장소(LocalStorage)에 안전하게 저장됩니다.",
  },
  geminiKeyLabel: {
    en: "Personal Gemini API Key",
    ko: "개인 구글 Gemini API Key",
  },
  deeplKeyLabel: {
    en: "Personal DeepL API Key (Optional)",
    ko: "개인 DeepL API Key (선택 사항)",
  },
  saveKeysBtn: {
    en: "Save API Keys",
    ko: "API 키 저장 완료",
  },
  clearKeysBtn: {
    en: "Clear Saved Keys",
    ko: "저장된 키 초기화",
  },
  keysSavedAlert: {
    en: "Your personal API keys have been saved successfully!",
    ko: "개인 API 키가 안전하게 저장되었습니다!",
  },
  keysClearedAlert: {
    en: "Personal API keys cleared. Reverting to server default credentials.",
    ko: "개인 API 키가 초기화되었습니다. 서버 기본 관리자 키를 사용합니다.",
  },
  languageToggleLabel: {
    en: "Language",
    ko: "언어 설정",
  },
  personalKeysBtn: {
    en: "⚙️ API Keys Settings",
    ko: "⚙️ 개인 API 키 설정",
  },
  saveConfirm: {
    en: "Saved",
    ko: "저장됨",
  },
  clearConfirm: {
    en: "Cleared",
    ko: "초기화됨",
  },
  dailyTokenUsageTitle: {
    en: "Daily Translation Limit",
    ko: "일일 무료 번역 제공량 (Translation Meter)",
  },
  dailyTokenUsageDesc: {
    en: "You have 50 free translations daily. Exceeding this requires registering your own Gemini API key.",
    ko: "매일 50회의 무료 번역이 제공됩니다. 한도 초과 시 우측 상단의 '⚙️ 개인 API 키 설정' 메뉴에서 본인 키를 등록하여 계속 사용할 수 있습니다.",
  },
  tokenMeterLabel: {
    en: "Translations Used Today:",
    ko: "오늘 번역 횟수:",
  },
  customKeyBypassActive: {
    en: "✨ Unlimited (Personal Key Active)",
    ko: "✨ 한도 없음 (개인 API 키 적용 중)",
  },
  translationEngineLabel: {
    en: "Translation Service Selection",
    ko: "번역 서비스 선택",
  },
  engineDeeplLabel: {
    en: "DeepL (Optional / High Precision)",
    ko: "DeepL (고정밀 선택사항)",
  },
  engineGeminiLabel: {
    en: "Gemini (Default / Recommended)",
    ko: "Gemini (기본 권장)",
  },
  translationEngineDesc: {
    en: "Choose the primary translation service for direct literal translation comparison. DeepL provides high precision if configured with an API key.",
    ko: "영어에서 다른 언어로 직역할 때 사용할 주 엔진을 선택합니다. DeepL은 키를 등록했을 때 고정밀 번역을 제공합니다.",
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [uiLang, setUiLangState] = useState<UiLang>(() => {
    try {
      const saved = localStorage.getItem("logos_ui_lang");
      return saved === "ko" || saved === "en" ? saved : "en";
    } catch {
      return "en";
    }
  });

  const setUiLang = (lang: UiLang) => {
    setUiLangState(lang);
    try {
      localStorage.setItem("logos_ui_lang", lang);
    } catch (e) {
      console.error(e);
    }
  };

  const t = (key: string): string => {
    if (!dictionary[key]) {
      return key;
    }
    return dictionary[key][uiLang];
  };

  return (
    <LanguageContext.Provider value={{ uiLang, setUiLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
