import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Copy, 
  Check, 
  BookOpen, 
  Globe, 
  HelpCircle, 
  FileText, 
  ArrowRight, 
  Bookmark, 
  BookmarkCheck,
  Languages
} from "lucide-react";
import { TranslationResult } from "../types";
import { useLanguage } from "../lib/LanguageContext";

interface TranslationViewerProps {
  result: TranslationResult;
  mode: "balanced" | "scholarly" | "devotional";
  isSaved: boolean;
  onToggleSave: () => void;
}

export default function TranslationViewer({ 
  result, 
  mode, 
  isSaved, 
  onToggleSave 
}: TranslationViewerProps) {
  const { t, uiLang } = useLanguage();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "sentences" | "words" | "references">("overview");

  const copyToClipboard = (text: string, sectionName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionName);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const getModeLabel = (m: string) => {
    switch (m) {
      case "scholarly": return t("modeScholarly");
      case "devotional": return t("modeDevotional");
      default: return t("modeBalanced");
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header Panel */}
      <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-stone-900 text-stone-100 rounded-lg">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-mono text-stone-500 uppercase tracking-wider">{t("analysisMode")}</div>
            <h3 className="font-serif font-bold text-stone-800 text-lg">
              {getModeLabel(mode)}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSave}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isSaved 
                ? "bg-amber-100 text-amber-800 border border-amber-200" 
                : "bg-white hover:bg-stone-100 text-stone-700 border border-stone-300"
            }`}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="w-4 h-4 text-amber-600 fill-amber-600" />
                <span>{t("savedToHistory")}</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4" />
                <span>{t("saveToHistory")}</span>
              </>
            )}
          </button>
          
          <button
            onClick={() => copyToClipboard(
              `[Source]\n${result.originalText}\n\n[Translation]\n${result.translation}\n\n[Commentary]\n${result.theologicalInsights}`,
              "all"
            )}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-lg text-xs font-medium transition-all"
          >
            {copiedSection === "all" ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{t("copiedAll")}</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>{t("copyAll")}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 px-6 overflow-x-auto gap-4">
        {[
          { id: "overview", label: t("tabOverview"), icon: FileText },
          { id: "sentences", label: t("tabSentences"), icon: Globe },
          { id: "words", label: t("tabWords"), icon: BookOpen },
          { id: "references", label: t("tabReferences"), icon: HelpCircle }
        ].map(tab => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3.5 px-1 border-b-2 font-medium text-xs flex items-center gap-2 whitespace-nowrap transition-all ${
                isActive 
                  ? "border-stone-800 text-stone-900" 
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="p-6">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* DeepL Info Banner when not used */}
            {!result.deeplUsed && (
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-3.5 text-xs text-stone-600 flex items-start gap-2.5">
                <span className="text-stone-400 font-bold shrink-0">{t("deeplGuideTitle")}</span>
                <p className="leading-relaxed">
                  {t("deeplGuideText")}
                </p>
              </div>
            )}

            {/* DeepL Error Info if failed */}
            {result.deeplError && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                {t("deeplErrorText")} ({result.deeplError})
              </div>
            )}

            <div className={`grid grid-cols-1 ${result.deeplUsed ? "lg:grid-cols-3" : "md:grid-cols-2"} gap-6`}>
              {/* Original text block */}
              <div className="bg-stone-50 border border-stone-100 rounded-xl p-5 relative group flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2.5">
                    <h4 className="font-mono text-[10px] uppercase text-stone-400 tracking-wider font-semibold">
                      {t("originalLabel")}
                    </h4>
                    <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded font-mono">Original</span>
                  </div>
                  <div className="font-serif text-base text-stone-800 leading-relaxed italic whitespace-pre-line">
                    "{result.originalText}"
                  </div>
                </div>
                <div className="mt-4 pt-2 border-t border-stone-100/50 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => copyToClipboard(result.originalText, "english")}
                    className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded text-[10px] text-stone-600 font-medium"
                    title={t("copyOriginal")}
                  >
                    {copiedSection === "english" ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>{t("copied")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>{t("copyOriginal")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* DeepL Literal Translation (Only if used) */}
              {result.deeplUsed && result.deeplTranslation && (
                <div className="bg-blue-50/20 border border-blue-100/70 rounded-xl p-5 relative group flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2.5">
                      <h4 className="font-mono text-[10px] uppercase text-blue-600/70 tracking-wider font-semibold">
                        {t("literalLabel")}
                      </h4>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-sans font-medium">
                        {t("deeplBadge")}
                      </span>
                    </div>
                    <div className="font-sans text-sm text-stone-800 leading-relaxed whitespace-pre-line">
                      {result.deeplTranslation}
                    </div>
                  </div>
                  <div className="mt-4 pt-2 border-t border-blue-100/30 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => copyToClipboard(result.deeplTranslation || "", "deepl")}
                      className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded text-[10px] text-stone-600 font-medium"
                      title={t("copyLiteral")}
                    >
                      {copiedSection === "deepl" ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>{t("copied")}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>{t("copyLiteral")}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Korean theological translation block */}
              <div className="bg-amber-50/30 border border-amber-100/50 rounded-xl p-5 relative group flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2.5">
                    <h4 className="font-mono text-[10px] uppercase text-amber-700/60 tracking-wider font-semibold">
                      {t("contextualLabel")}
                    </h4>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-sans font-semibold">
                      {t("contextualBadge")}
                    </span>
                  </div>
                  <div className="font-sans text-base text-stone-900 font-medium leading-relaxed whitespace-pre-line">
                    {result.translation}
                  </div>
                </div>
                <div className="mt-4 pt-2 border-t border-amber-100/30 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => copyToClipboard(result.translation, "korean")}
                    className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded text-[10px] text-stone-600 font-medium"
                    title={t("copyContextual")}
                  >
                    {copiedSection === "korean" ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>{t("copied")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>{t("copyContextual")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Theological Insight Block */}
            <div className="border-t border-stone-100 pt-6">
              <h4 className="font-serif font-bold text-stone-800 text-md mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-4 bg-stone-700 rounded-full inline-block"></span>
                {t("commentaryTitle")}
              </h4>
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 text-sm text-stone-700 leading-relaxed whitespace-pre-line font-sans">
                {result.theologicalInsights}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: SENTENCE BY SENTENCE */}
        {activeTab === "sentences" && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="text-xs text-stone-500 mb-2">
              {t("sentenceCompareDesc")}
            </div>

            <div className="divide-y divide-stone-100">
              {result.sentences && result.sentences.length > 0 ? (
                result.sentences.map((sent, index) => (
                  <div key={index} className="py-4 first:pt-0 last:pb-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-5">
                      <div className="flex gap-2.5">
                        <span className="font-mono text-xs text-stone-400 mt-0.5 font-bold">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <p className="font-serif text-sm text-stone-800 leading-relaxed">{sent.english}</p>
                      </div>
                    </div>
                    
                    <div className="lg:col-span-1 flex lg:justify-center items-center">
                      <ArrowRight className="w-4 h-4 text-stone-300 hidden lg:block" />
                      <span className="lg:hidden text-[10px] font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded font-semibold">
                        {t("sentenceCompareBadge")}
                      </span>
                    </div>

                    <div className="lg:col-span-6 bg-stone-50/50 p-3 rounded-lg border border-stone-100">
                      <p className="text-sm font-medium text-stone-950 leading-relaxed pl-1 font-sans">{sent.korean}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-stone-400 text-xs font-sans">
                  {t("noSentenceData")}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 3: KEY WORD DICTIONARY */}
        {activeTab === "words" && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="text-xs text-stone-500 mb-2">
              {t("lexiconDesc")}
            </div>

            {result.words && result.words.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.words.map((item, index) => (
                  <div 
                    key={index} 
                    className="border border-stone-200 hover:border-stone-400 rounded-xl p-4 bg-stone-50/30 hover:bg-white transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-baseline justify-between gap-2 border-b border-stone-100 pb-2 mb-2">
                        <span className="font-serif font-bold text-stone-800 text-sm">{item.word}</span>
                        {item.originalLanguage && (
                          <span className="font-serif text-xs text-amber-800 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full font-medium">
                            {item.originalLanguage} {item.transliteration ? `(${item.transliteration})` : ""}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs text-stone-900 font-semibold mb-1.5 font-sans">
                        {t("lexiconMeaning")}: {item.koreanMeaning}
                      </div>

                      {item.explanation && (
                        <p className="text-xs text-stone-600 leading-relaxed font-light font-sans">
                          {item.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-stone-400 text-xs font-sans">
                {t("noLexiconData")}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 4: CROSS REFERENCES */}
        {activeTab === "references" && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="text-xs text-stone-500 mb-2">
              {t("crossRefDesc")}
            </div>

            {result.crossReferences && result.crossReferences.length > 0 ? (
              <div className="space-y-4">
                {result.crossReferences.map((ref, index) => (
                  <div key={index} className="border border-stone-200 rounded-xl p-4 bg-stone-50/20">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-xs text-stone-400 font-bold">REF 0{index + 1}</span>
                      <h5 className="font-serif font-bold text-stone-900 text-sm">{ref.citation}</h5>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed mt-2.5 font-sans">
                      {ref.englishText && (
                        <div className="text-stone-600 font-serif italic border-r border-stone-200 pr-4">
                          "{ref.englishText}"
                        </div>
                      )}
                      <div className={`${ref.englishText ? "pl-2" : ""} text-stone-800 font-medium font-sans`}>
                        "{ref.koreanText}"
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-stone-400 text-xs font-sans">
                {t("noCrossRefData")}
              </div>
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
}
