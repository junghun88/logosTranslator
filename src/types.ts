export interface WordAnalysis {
  word: string;
  originalLanguage?: string;
  transliteration?: string;
  koreanMeaning: string;
  explanation?: string;
}

export interface SentenceComparison {
  english: string;
  korean: string;
}

export interface CrossReference {
  citation: string;
  englishText?: string;
  koreanText: string;
}

export interface TranslationResult {
  originalText: string;
  translation: string;
  theologicalInsights: string;
  words: WordAnalysis[];
  sentences: SentenceComparison[];
  crossReferences?: CrossReference[];
  deeplTranslation?: string | null;
  deeplUsed?: boolean;
  deeplError?: string | null;
}

export interface SavedTranslation {
  id: string;
  timestamp: string;
  originalText: string;
  translation: string;
  mode: "balanced" | "scholarly" | "devotional";
  targetLang?: string;
  result: TranslationResult;
}
