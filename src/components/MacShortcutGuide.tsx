import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Compass, 
  Settings, 
  Keyboard, 
  CheckCircle, 
  Copy, 
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Layers,
  Cpu,
  Monitor
} from "lucide-react";

export default function MacShortcutGuide() {
  const [activeTab, setActiveTab] = useState<"native" | "browser">("native");
  const [activeStep, setActiveStep] = useState(0);
  const [copiedTextUrl, setCopiedTextUrl] = useState(false);
  const [copiedWebUrl, setCopiedWebUrl] = useState(false);

  const appUrl = window.location.origin;

  const nativeSteps = [
    {
      title: "1. macOS 단축어 앱 실행 & 만들기",
      description: "Mac에서 기본 제공되는 '단축어(Shortcuts)' 앱을 실행하고 새로운 자동화 단축키를 설계합니다.",
      icon: Compass,
      instructions: [
        "Spotlight(Cmd + Space)를 켜고 '단축어'를 검색하여 열어줍니다.",
        "우측 상단의 '+' 아이콘을 클릭하여 새로운 단축어를 만듭니다.",
        "단축어 이름을 'Logos 팝업 번역기' 또는 원하는 이름으로 설정합니다."
      ],
      imageTip: "단축어 앱은 macOS Monterey 이상에서 무료 기본 탑재되어 있습니다."
    },
    {
      title: "2. 빠른 동작(Quick Action) 설정",
      description: "성경 앱(Logos) 등 외부 앱에서 텍스트를 마우스 블록 지정하고 단축키를 눌렀을 때 반응하도록 설정합니다.",
      icon: Settings,
      instructions: [
        "우측 상단 탭에서 '단축어 세부사항(아이콘 버튼)'을 클릭합니다.",
        "'빠른 동작으로 사용' 및 '서비스 메뉴' 항목을 체크합니다.",
        "화면 맨 위에 생기는 입력 설정을 다음과 같이 구성합니다:",
        "「다음에서 [텍스트] 입력받기 (선택사항이 없는 경우: [아무것도 없음])」"
      ],
      imageTip: "이렇게 해야 마우스 드래그된 성경 구절이 단축어의 변수로 입력됩니다."
    },
    {
      title: "3. 번역 API URL 동작 생성",
      description: "드래그한 구절을 실시간 신학 해설과 함께 텍스트 카드로 변환해주는 API 서버 주소를 등록합니다.",
      icon: Cpu,
      instructions: [
        "오른쪽 검색창에서 'URL' 작업을 검색하여 왼쪽 편집창으로 드래그해 놓습니다.",
        "URL 입력창에 아래에 있는 'API 번역 주소'를 복사하여 붙여넣습니다.",
        "주소 맨 끝 부분에 마우스 우클릭을 하거나 삽입 메뉴에서 '단축어 입력' (Shortcut Input) 변수를 연결해 줍니다."
      ],
      imageTip: "완성 주소 형태: " + appUrl + "/api/translate-text?text=[단축어 입력]"
    },
    {
      title: "4. URL 콘텐츠 가져오기 및 팝업창 띄우기",
      description: "서버가 리턴해준 고급 포맷팅 텍스트 카드를 읽어와서 macOS 기본 팝업창으로 바로 출력합니다.",
      icon: Sparkles,
      instructions: [
        "우측 검색창에서 'URL 콘텐츠 가져오기' (Get Contents of URL) 작업을 검색해서 URL 블록 바로 밑에 배치합니다.",
        "우측 검색창에서 '결과 보기' (Show Result) 또는 '텍스트 훑어보기' (Quick Look) 작업을 검색해서 가져오기 블록 밑에 연달아 배치합니다.",
        "결과 보기 항목에 'URL 콘텐츠'가 변수로 잘 지정되어 있는지 확인합니다."
      ],
      imageTip: "이제 브라우저를 열지 않고도 macOS 자체 팝업창에서 깔끔한 원어/주해 카드가 노출됩니다!"
    },
    {
      title: "5. Alt + T (Option + T) 단축키 연결",
      description: "Logos 성경을 보던 도중 드래그한 다음 언제든 바로 호출할 수 있도록 단축키를 매핑합니다.",
      icon: Keyboard,
      instructions: [
        "다시 오른쪽의 단축어 세부사항 패널로 이동합니다.",
        "'키보드 단축키 추가' 버튼을 누르고 키보드에서 Alt + T (Option + T) 키를 눌러 등록합니다.",
        "이제 단축어 편집창을 닫으셔도 완료됩니다!"
      ],
      imageTip: "로고스 성경 본문을 마우스로 드래그하고 Alt+T만 누르면 1초 만에 팝업창이 떠오릅니다."
    }
  ];

  const browserSteps = [
    {
      title: "1. 단축어 만들기 & 빠른 동작 적용",
      description: "Logos에서 드래그한 텍스트 정보를 브라우저 앱으로 실시간 전송하기 위한 기본 뼈대를 만듭니다.",
      icon: Compass,
      instructions: [
        "macOS '단축어' 앱을 열고 상단 '+'를 클릭하여 새 단축키를 생성합니다.",
        "우측 패널에서 '빠른 동작으로 사용' 및 '서비스 메뉴'를 켭니다.",
        "상단 입력 설정을 「다음에서 [텍스트] 입력받기」로 구성합니다."
      ],
      imageTip: "텍스트 블록 드래그를 단축어 시작 시그널로 지정하는 단계입니다."
    },
    {
      title: "2. 번역 웹사이트 URL 추가 및 열기",
      description: "원문을 주소 뒤에 덧붙여서 즉시 웹 번역기 화면을 새 탭이나 팝업창으로 띄워주는 URL 주소를 세팅합니다.",
      icon: ExternalLink,
      instructions: [
        "우측 검색창에서 'URL' 작업을 검색하여 추가합니다.",
        "URL 입력란에 아래 '웹 번역기 연동 주소'를 복사하여 넣고, 주소 끝자리에 '단축어 입력' 변수를 대입합니다.",
        "이후 'URL 열기' (Open URLs) 작업을 검색하여 추가하고 연동합니다."
      ],
      imageTip: "완성 주소 형태: " + appUrl + "/?text=[단축어 입력]"
    },
    {
      title: "3. 단축키 매핑 (Alt + T)",
      description: "성경 연구 도중 마우스 드래그를 마치면 한 번에 웹 번역기를 띄울 수 있도록 최종 단축키를 등록합니다.",
      icon: Keyboard,
      instructions: [
        "우측 단축어 세부사항 설정에서 '키보드 단축키 추가'를 누릅니다.",
        "키보드에서 Option + T (또는 원하는 조합)를 누릅니다.",
        "이제 로고스 성경에서 드래그 후 지정 단축키를 누르면 아름다운 웹 분석기가 즉시 열립니다!"
      ],
      imageTip: "웹 번역기는 더 풍성한 카드 UI와 복사, 저장 등 세분화된 대화형 컨트롤을 제공합니다."
    }
  ];

  const steps = activeTab === "native" ? nativeSteps : browserSteps;

  const handleCopyTextUrl = () => {
    const shortcutTemplateUrl = `${appUrl}/api/translate-text?text=`;
    navigator.clipboard.writeText(shortcutTemplateUrl);
    setCopiedTextUrl(true);
    setTimeout(() => setCopiedTextUrl(false), 2000);
  };

  const handleCopyWebUrl = () => {
    const shortcutTemplateUrl = `${appUrl}/?text=`;
    navigator.clipboard.writeText(shortcutTemplateUrl);
    setCopiedWebUrl(true);
    setTimeout(() => setCopiedWebUrl(false), 2000);
  };

  const currentStepData = steps[activeStep] || steps[0];
  const StepIcon = currentStepData.icon;

  const handleTabChange = (tab: "native" | "browser") => {
    setActiveTab(tab);
    setActiveStep(0);
  };

  return (
    <div id="mac-shortcut-guide" className="bg-stone-50 border border-stone-200 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-stone-200 pb-4 mb-6">
        <div>
          <h3 className="font-serif text-xl font-semibold text-stone-800 flex items-center gap-2">
            <span className="inline-flex items-center justify-center bg-stone-800 text-stone-100 text-xs font-sans w-5 h-5 rounded-full"></span>
            macOS Logos 마우스 블록 단축키 연동 가이드
          </h3>
          <p className="text-sm text-stone-600 mt-1">
            Logos 성경 앱에서 마우스로 드래그한 영문 본문을 <strong>Alt + T (Option + T)</strong> 키로 즉시 번역하는 연동 가이드입니다.
          </p>
        </div>
      </div>

      {/* Method Switcher Tabs */}
      <div className="flex border-b border-stone-200 mb-6 bg-stone-100/50 p-1 rounded-lg gap-1">
        <button
          onClick={() => handleTabChange("native")}
          className={`flex-1 py-2.5 px-4 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === "native"
              ? "bg-white text-stone-900 shadow-sm border border-stone-200"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          방법 1. 브라우저 없이 '네이티브 팝업창'으로 바로 보기 (강력 추천!)
        </button>
        <button
          onClick={() => handleTabChange("browser")}
          className={`flex-1 py-2.5 px-4 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
            activeTab === "browser"
              ? "bg-white text-stone-900 shadow-sm border border-stone-200"
              : "text-stone-500 hover:text-stone-800"
          }`}
        >
          <Monitor className="w-3.5 h-3.5 text-blue-600" />
          방법 2. 브라우저 새 창/팝업 띄우기로 보기
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Step Navigation Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-2">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === activeStep;
            return (
              <button
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`text-left p-3 rounded-lg border transition-all flex items-center gap-3 ${
                  isActive
                    ? "bg-stone-800 text-stone-50 border-stone-800 shadow-sm"
                    : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
                }`}
              >
                <span className={`p-1.5 rounded-md ${isActive ? "bg-stone-700" : "bg-stone-100"}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <div className="overflow-hidden text-ellipsis">
                  <div className="text-[10px] font-mono uppercase opacity-60">Step 0{idx + 1}</div>
                  <div className="text-xs font-medium line-clamp-1">{step.title}</div>
                </div>
              </button>
            );
          })}

          <div className="mt-4 p-3.5 bg-amber-50/50 rounded-lg border border-amber-100 text-xs text-stone-700 space-y-2">
            <p className="font-semibold text-amber-900 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              {activeTab === "native" ? "네이티브 팝업의 압도적 편리함!" : "인터랙티브 웹 번역!"}
            </p>
            {activeTab === "native" ? (
              <p className="leading-relaxed text-[11px] text-amber-800">
                인터넷 브라우저를 열어서 흐름을 깨뜨리지 않고, macOS Shortcuts 엔진을 통해 Logos 성경 본문 위에 <strong>반투명하고 미려한 텍스트 카드 팝업창</strong>을 띄워 번역/원어풀이/신학 해설을 보여줍니다.
              </p>
            ) : (
              <p className="leading-relaxed text-[11px] text-amber-800">
                Logos에서 단축키를 누르면 브라우저를 가볍게 띄워 고급스럽게 디자인된 3단 분할 패널 번역기에서 단어 분석과 문장별 일대일 매핑, 저장 기능을 사용합니다.
              </p>
            )}
          </div>
        </div>

        {/* Step Description panel */}
        <div className="lg:col-span-8 flex flex-col justify-between bg-white border border-stone-200 rounded-lg p-5 min-h-[300px]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-stone-100 text-stone-800 rounded-lg">
                  <StepIcon className="w-5 h-5" />
                </span>
                <h4 className="font-serif font-semibold text-lg text-stone-800">{currentStepData.title}</h4>
              </div>
              <span className="text-[10px] bg-stone-100 text-stone-500 font-mono px-2 py-0.5 rounded">
                {activeStep + 1} / {steps.length}
              </span>
            </div>

            <p className="text-sm text-stone-600 mb-4">{currentStepData.description}</p>

            <ul className="space-y-3 pl-1">
              {currentStepData.instructions.map((inst, i) => (
                <li key={i} className="flex gap-2.5 text-xs text-stone-700 leading-relaxed">
                  <span className="text-stone-400 font-mono font-semibold select-none">0{i+1}.</span>
                  <span>{inst}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-stone-500 font-mono italic text-[11px]">
              {currentStepData.imageTip}
            </span>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                disabled={activeStep === 0}
                onClick={() => setActiveStep(p => p - 1)}
                className="flex items-center justify-center gap-1 flex-1 sm:flex-initial px-3 py-1.5 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-md disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                이전
              </button>
              <button
                disabled={activeStep === steps.length - 1}
                onClick={() => setActiveStep(p => p + 1)}
                className="flex items-center justify-center gap-1 flex-1 sm:flex-initial px-3 py-1.5 bg-stone-800 text-stone-100 hover:bg-stone-900 rounded-md disabled:opacity-40 transition-colors"
              >
                다음
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Copy-paste URL Card based on active tab */}
      <div className="mt-6">
        {activeTab === "native" ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1">
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">방법 1 전용 주소</span>
                <h5 className="font-serif text-sm font-semibold text-stone-800 mt-1">단축어 URL 블록용 복사 대상 (API 번역 카드 주소)</h5>
                <p className="text-[11px] text-stone-600 mt-0.5">단축어 앱의 'URL' 상자에 이 주소를 붙여넣은 뒤, 맨 뒤에 <code className="font-mono text-amber-800 font-bold bg-amber-100/50 px-1 rounded">단축어 입력</code> 변수를 매핑하세요.</p>
              </div>
              <button
                onClick={handleCopyTextUrl}
                className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-lg text-xs font-semibold transition-colors shrink-0"
              >
                {copiedTextUrl ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>API 번역 주소 복사</span>
                  </>
                )}
              </button>
            </div>
            <div className="font-mono mt-2.5 bg-white border border-amber-100 p-2 rounded text-[11px] break-all select-all text-stone-700 font-semibold shadow-inner">
              {appUrl}/api/translate-text?text=
            </div>
          </div>
        ) : (
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1">
                <span className="text-[10px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">방법 2 전용 주소</span>
                <h5 className="font-serif text-sm font-semibold text-stone-800 mt-1">단축어 URL 블록용 복사 대상 (웹 번역 앱 주소)</h5>
                <p className="text-[11px] text-stone-600 mt-0.5">단축어 앱의 'URL' 상자에 이 주소를 넣고 뒤에 <code className="font-mono text-blue-900 bg-blue-100/50 px-1 rounded">단축어 입력</code> 변수를 대입하세요.</p>
              </div>
              <button
                onClick={handleCopyWebUrl}
                className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-lg text-xs font-semibold transition-colors shrink-0"
              >
                {copiedWebUrl ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>복사 완료!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>웹 번역 앱 주소 복사</span>
                  </>
                )}
              </button>
            </div>
            <div className="font-mono mt-2.5 bg-white border border-blue-100 p-2 rounded text-[11px] break-all select-all text-stone-700 font-semibold shadow-inner">
              {appUrl}/?text=
            </div>
          </div>
        )}
      </div>

      {/* Visual Diagram for Shortcuts flow */}
      <div className="mt-6 bg-stone-800 text-stone-100 p-5 rounded-xl">
        <h4 className="text-xs font-mono font-semibold uppercase text-stone-400 tracking-wider mb-3">
          macOS 단축어 흐름도 (Shortcuts Action Diagram)
        </h4>
        <div className="flex flex-col md:flex-row items-center justify-around gap-4 text-xs font-mono pt-2">
          <div className="flex flex-col items-center p-3 bg-stone-700/50 border border-stone-600 rounded-lg w-full md:w-1/4 text-center">
            <span className="text-stone-400 text-[10px]">01. 외부 트리거</span>
            <span className="font-semibold text-stone-200 mt-1">드래그한 텍스트</span>
            <span className="text-[10px] text-amber-400/80 mt-1">Alt + T</span>
          </div>
          <span className="text-stone-500 font-bold hidden md:inline">➔</span>
          <div className="flex flex-col items-center p-3 bg-stone-700/50 border border-stone-600 rounded-lg w-full md:w-1/4 text-center">
            <span className="text-stone-400 text-[10px]">02. API 호출</span>
            <span className="font-semibold text-stone-200 mt-1">api/translate-text</span>
            <span className="text-[10px] text-stone-400 mt-1">Get Contents of URL</span>
          </div>
          <span className="text-stone-500 font-bold hidden md:inline">➔</span>
          <div className="flex flex-col items-center p-3 bg-stone-700/50 border border-stone-600 rounded-lg w-full md:w-1/4 text-center">
            <span className="text-stone-400 text-[10px]">03. 팝업 화면</span>
            <span className="font-semibold text-amber-300 mt-1">macOS 알림/훑어보기</span>
            <span className="text-[10px] text-stone-400 mt-1">Show Result (팝업 카드)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
