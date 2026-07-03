import React, { useState } from "react";
import { SavedTranslation } from "../types";
import { 
  Trash2, 
  Search, 
  BookMarked, 
  ChevronRight, 
  Calendar,
  XCircle,
  FileText
} from "lucide-react";

interface HistoryListProps {
  history: SavedTranslation[];
  activeId: string | null;
  onSelect: (item: SavedTranslation) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export default function HistoryList({
  history,
  activeId,
  onSelect,
  onDelete,
  onClearAll
}: HistoryListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredHistory = history.filter(item => {
    const s = searchTerm.toLowerCase();
    return (
      item.originalText.toLowerCase().includes(s) ||
      item.translation.toLowerCase().includes(s) ||
      item.result.theologicalInsights.toLowerCase().includes(s)
    );
  });

  const getModeBadgeColor = (mode: string) => {
    switch (mode) {
      case "scholarly":
        return "bg-purple-50 text-purple-700 border-purple-100";
      case "devotional":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      default:
        return "bg-blue-50 text-blue-700 border-blue-100";
    }
  };

  const getModeBadgeLabel = (mode: string) => {
    switch (mode) {
      case "scholarly": return "학술";
      case "devotional": return "묵상";
      default: return "균형";
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-stone-800" />
          <h4 className="font-serif font-bold text-stone-800 text-sm">성경 연구 역사 ({history.length})</h4>
        </div>
        {history.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-[10px] text-stone-500 hover:text-red-600 transition-colors font-medium"
          >
            전체 삭제
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-stone-100 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="본문, 번역, 신학 주석 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 border border-stone-200 rounded-lg text-xs bg-stone-50 focus:bg-white focus:outline-none focus:border-stone-500 transition-all font-sans text-stone-800"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-stone-100 max-h-[400px] lg:max-h-[600px]">
        {filteredHistory.length > 0 ? (
          filteredHistory.map((item) => {
            const isActive = item.id === activeId;
            const dateStr = new Date(item.timestamp).toLocaleDateString("ko-KR", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            });

            return (
              <div
                key={item.id}
                className={`group flex items-start gap-2.5 p-3.5 text-left transition-colors cursor-pointer relative ${
                  isActive ? "bg-stone-100/70" : "hover:bg-stone-50/50"
                }`}
                onClick={() => onSelect(item)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[9px] font-mono border px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${getModeBadgeColor(item.mode)}`}>
                      {getModeBadgeLabel(item.mode)}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3" />
                      {dateStr}
                    </span>
                  </div>

                  <p className="text-xs text-stone-800 font-serif font-semibold italic truncate">
                    "{item.originalText}"
                  </p>
                  
                  <p className="text-xs text-stone-500 line-clamp-1 mt-1">
                    {item.translation}
                  </p>
                </div>

                <div className="flex flex-col justify-between items-end gap-3 self-stretch">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                    className="p-1 hover:text-red-600 text-stone-400 rounded hover:bg-stone-200/50 transition-all opacity-0 group-hover:opacity-100"
                    title="기록 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className={`w-3.5 h-3.5 ${isActive ? "text-stone-800" : "text-stone-300"}`} />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 px-4 flex flex-col items-center justify-center text-stone-400">
            <FileText className="w-8 h-8 text-stone-200 mb-2" />
            <p className="text-xs font-medium">
              {searchTerm ? "검색 결과가 없습니다." : "연구 이력이 존재하지 않습니다."}
            </p>
            {!searchTerm && (
              <p className="text-[10px] text-stone-500 mt-1 max-w-[180px] leading-relaxed">
                Logos에서 가져온 영어 본문을 번역하고 저장 버튼을 누르면 여기에 기록됩니다.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
