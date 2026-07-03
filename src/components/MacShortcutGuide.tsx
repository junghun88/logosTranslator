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
  MousePointerClick
} from "lucide-react";

export default function MacShortcutGuide() {
  const [activeStep, setActiveStep] = useState(0);
  const [copied, setCopied] = useState(false);

  const appUrl = window.location.origin;

  const steps = [
    {
      title: "1. macOS 단축어 앱 실행",
      description: "Mac에서 기본 제공되는 '단축어(Shortcuts)' 애플리케이션을 실행하고 새로운 단축어를 생성합니다.",
      icon: Compass,
      instructions: [
        "Finder 또는 Spotlight(Cmd + Space)를 켜고 '단축어'를 검색하여 앱을 엽니다.",
        "상단의 '+' 버튼을 클릭하여 새로운 단축어를 만듭니다.",
        "단축어 이름을 'Logos 번역 도우미' 또는 원하는 이름으로 지정합니다."
      ],
      imageTip: "단축어 앱은 macOS의 강력한 자동화 도구입니다."
    },
    {
      title: "2. 빠른 동작 설정",
      description: "Logos와 같은 외부 앱에서 텍스트를 마우스 블록으로 지정했을 때 동작하도록 설정합니다.",
      icon: Settings,
      instructions: [
        "우측 사이드바의 '단축어 세부사항' 아이콘(아이콘 탭)을 클릭합니다.",
        "'빠른 동작으로 사용'을 활성화하고, 아래 '서비스 메뉴'를 체크합니다.",
        "상단 입력란을 '다음에서 [텍스트]을(를) 입력으로 받음: [선택사항이 없는 경우: 아무것도 없음]'으로 설정합니다."
      ],
      imageTip: "이렇게 하면 마우스 드래그 선택 시 단축어에 자동으로 전달됩니다."
    },
    {
      title: "3. URL 및 브라우저 열기 동작 추가",
      description: "복사한 텍스트를 우리 웹 번역기로 전달하는 URL 빌더와 열기 동작을 추가합니다.",
      icon: MousePointerClick,
      instructions: [
        "우측 작업 검색창에서 'URL'을 검색하여 작업공간에 추가합니다.",
        "URL 입력칸에 아래 주소를 입력하고, 끝에 마우스 우클릭으로 '단축어 입력' 변수를 넣습니다.",
        "그 아래에 'URL 열기(Open URLs)' 작업을 검색하여 추가하고, 위에서 만든 URL을 연결합니다."
      ],
      imageTip: "동작 흐름: [URL: 복사된 주소] -> [URL 열기]"
    },
    {
      title: "4. 키보드 단축키 지정",
      description: "마우스 블록 지정 후 키보드 단축키만 누르면 즉시 작동하도록 단축키를 등록합니다.",
      icon: Keyboard,
      instructions: [
        "단축어 세부사항 설정에서 '키보드 단축키 추가' 버튼을 클릭합니다.",
        "원하는 단축키를 입력합니다. (예: Option + T 또는 Cmd + Shift + T)",
        "단축어 편집창을 닫고 저장을 마칩니다."
      ],
      imageTip: "이제 Logos 성경에서 영문 텍스트를 드래그하고 지정한 단축키를 누르면 브라우저가 열리며 자동 번역됩니다!"
    }
  ];

  const handleCopyUrl = () => {
    const shortcutTemplateUrl = `${appUrl}/?text=`;
    navigator.clipboard.writeText(shortcutTemplateUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentStepData = steps[activeStep];
  const StepIcon = currentStepData.icon;

  return (
    <div id="mac-shortcut-guide" className="bg-stone-50 border border-stone-200 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-stone-200 pb-4 mb-6">
        <div>
          <h3 className="font-serif text-xl font-semibold text-stone-800 flex items-center gap-2">
            <span className="inline-flex items-center justify-center bg-stone-800 text-stone-100 text-xs font-sans w-5 h-5 rounded-full"></span>
            macOS Logos 마우스 블록 단축키 연동 가이드
          </h3>
          <p className="text-sm text-stone-600 mt-1">
            Logos 성경 앱에서 마우스로 드래그한 영어 텍스트를 단축키 하나로 즉시 한글 번역하는 방법입니다.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <button
            onClick={handleCopyUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 border border-stone-300 text-stone-700 hover:bg-stone-200 rounded-lg text-xs font-medium transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>복사 완료!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>단축어 대상 URL 복사</span>
              </>
            )}
          </button>
        </div>
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

          <div className="mt-4 p-3 bg-stone-100 rounded-lg border border-stone-200 text-xs text-stone-600 space-y-2">
            <p className="font-semibold text-stone-700">💡 꿀팁!</p>
            <p>단축어 세부사항 주소값으로 복사한 URL 뒤에 <code className="font-mono bg-white px-1 border rounded text-amber-800">단축어 입력</code> 또는 <code className="font-mono bg-white px-1 border rounded text-amber-800">Shortcut Input</code> 변수를 연결하시면 완벽하게 연동됩니다.</p>
          </div>
        </div>

        {/* Step Description panel */}
        <div className="lg:col-span-8 flex flex-col justify-between bg-white border border-stone-200 rounded-lg p-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="p-2 bg-stone-100 text-stone-800 rounded-lg">
                <StepIcon className="w-5 h-5" />
              </span>
              <h4 className="font-serif font-semibold text-lg text-stone-800">{currentStepData.title}</h4>
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
            <span className="text-stone-500 font-mono italic">
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

      <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-2.5">
        <span className="text-amber-600 text-base">⚠️</span>
        <div className="text-[11px] text-amber-800 leading-relaxed">
          <strong>단축어 설정용 주소 예시 (URL 설정 시 복사해서 붙여넣으세요):</strong>
          <div className="font-mono mt-1 bg-white border border-amber-100 p-1.5 rounded select-all text-[10px] break-all overflow-x-auto">
            {appUrl}/?text=ShortcutInput
          </div>
          <p className="mt-1">
            * 'ShortcutInput' 부분에 단축어 앱 내의 <strong>'Shortcut Input' (또는 '단축어 입력')</strong> 변수 객체를 대입하셔야 마우스로 드래그한 성경 내용이 실시간으로 전달됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
