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
  Cpu,
  Monitor,
  AlertTriangle,
  Terminal
} from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";

export default function MacShortcutGuide() {
  const { uiLang } = useLanguage();
  const [activeTab, setActiveTab] = useState<"native" | "browser">("native");
  const [activeStep, setActiveStep] = useState(0);
  const [copiedTextUrl, setCopiedTextUrl] = useState(false);
  const [copiedWebUrl, setCopiedWebUrl] = useState(false);
  const [copiedTerminal, setCopiedTerminal] = useState(false);

  const appUrl = window.location.origin;

  const [customGeminiKey, setCustomGeminiKey] = useState(() => {
    try {
      return localStorage.getItem("logos_custom_gemini_key") || "";
    } catch {
      return "";
    }
  });
  const [customDeeplKey, setCustomDeeplKey] = useState(() => {
    try {
      return localStorage.getItem("logos_custom_deepl_key") || "";
    } catch {
      return "";
    }
  });
  const [clientId, setClientId] = useState(() => {
    try {
      return localStorage.getItem("logos_client_id") || "";
    } catch {
      return "";
    }
  });

  React.useEffect(() => {
    const handleStorageChange = () => {
      try {
        setCustomGeminiKey(localStorage.getItem("logos_custom_gemini_key") || "");
        setCustomDeeplKey(localStorage.getItem("logos_custom_deepl_key") || "");
        setClientId(localStorage.getItem("logos_client_id") || "");
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("logos_keys_updated", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("logos_keys_updated", handleStorageChange);
    };
  }, []);

  const getShortcutUrl = () => {
    let url = `${appUrl}/api/translate-text?html=true`;
    if (customGeminiKey) {
      url += `&gemini_key=${encodeURIComponent(customGeminiKey)}`;
    }
    if (customDeeplKey) {
      url += `&deepl_key=${encodeURIComponent(customDeeplKey)}`;
    }
    if (clientId) {
      url += `&client_id=${encodeURIComponent(clientId)}`;
    }
    url += `&text=`;
    return url;
  };

  const getWebUrl = () => {
    let url = `${appUrl}/?`;
    if (customGeminiKey) {
      url += `gemini_key=${encodeURIComponent(customGeminiKey)}&`;
    }
    if (customDeeplKey) {
      url += `deepl_key=${encodeURIComponent(customDeeplKey)}&`;
    }
    if (clientId) {
      url += `client_id=${encodeURIComponent(clientId)}&`;
    }
    url += `text=`;
    return url;
  };

  const nativeStepsEn = [
    {
      title: "1. Open macOS Shortcuts App (or Download Shortcut)",
      description: "Launch the native macOS 'Shortcuts' app to design a new one-click translation automation, or download our ready-made file for macOS Tahoe.",
      icon: Compass,
      instructions: [
        "Open Spotlight (Cmd + Space), search for 'Shortcuts' and open it.",
        "Alternatively, click the 'Download macOS Tahoe Shortcut' button below to get the pre-configured file with your personalized keys!",
        "If setting up manually, click the '+' icon in the upper right corner to create a new shortcut and name it 'Logos Translator'."
      ],
      imageTip: "The Shortcuts app is pre-installed for free on macOS Tahoe (macOS 16) and later."
    },
    {
      title: "2. Set as Quick Action & Clipboard Fallback",
      description: "Enable the services menu integration and set up a reliable clipboard fallback in case Logos doesn't pass the dragged text directly on macOS Tahoe.",
      icon: Settings,
      instructions: [
        "Click 'Shortcut Details' (the toggle settings/slider icon button in the top right panel).",
        "Check the boxes for 'Use as Quick Action' and 'Services Menu' to activate.",
        "Go back to the main editor and select the first input action block: 'Receive [Text] from [Quick Actions]'.",
        "Click the text '(if there's no input)' at the end of that first action block.",
        "Select **[Clipboard]** (or 'Clipboard contents') from the dropdown options as the fallback!"
      ],
      imageTip: "With this setup, if dragging fails on Tahoe, simply copy the text (Cmd+C) and press your keyboard shortcut to run the translation instantly."
    },
    {
      title: "3. Add URL Action Block",
      description: "Register the API server URL that handles high-speed translations and generates the visual popup cards on macOS Tahoe.",
      icon: Cpu,
      instructions: [
        "Search for 'URL' in the right-hand actions library and drag it into the editor.",
        "In the URL input field, copy and paste the 'API Translation URL' shown at the bottom of this guide.",
        "Right-click at the very end of the URL and insert the 'Shortcut Input' variable."
      ],
      imageTip: "Final URL format: " + appUrl + "/api/translate-text?html=true&text=[Shortcut Input]"
    },
    {
      title: "4. Display Web Popup Card",
      description: "Configure the popup window to display an interactive card with instant Copy buttons on macOS Tahoe.",
      icon: Sparkles,
      instructions: [
        "🎯 [Option A: Web Popup Mode - Highly Recommended on macOS Tahoe ⭐️]",
        "1. Search for 'Show Web Page' or 'Show Web Page in Safari' in the actions panel and add it.",
        "2. Map the 'URL' block you created in Step 3 as the input.",
        "3. Now, pressing the shortcut triggers an elegant overlay with dedicated buttons to copy individual components.",
        "",
        "📝 [Option B: Silent Text Overlay]",
        "1. Search for 'Get Contents of URL' and add it.",
        "2. Follow it with a 'Copy to Clipboard' action block.",
        "3. Complete with a 'Show Result' action block."
      ],
      imageTip: "Using Web Popup Mode (Option A) opens a beautiful, floating window with rounded corners right on top of your Logos Bible workspace."
    },
    {
      title: "5. Map Keyboard Shortcut (Cmd + Option + Shift + T)",
      description: "Map a global hotkey to translate selected texts instantly while reading in Logos on macOS Tahoe.",
      icon: Keyboard,
      instructions: [
        "Return to the 'Shortcut Details' panel on the right side.",
        "Click 'Add Keyboard Shortcut' and press 'Cmd + Option + Shift + T' on your keyboard.",
        "Close the Shortcuts editor—your setup is now complete!"
      ],
      imageTip: "Select any text in Logos and press Cmd + Option + Shift + T to see the translation in under a second."
    }
  ];

  const nativeStepsKo = [
    {
      title: "1. macOS 단축어 앱 열기 (또는 단축어 즉시 다운로드)",
      description: "클릭 한 번으로 고정밀 번역 및 주해 팝업을 연동하기 위해 macOS 기본 '단축어' 앱을 실행하거나, 아래에서 제공하는 완제품 단축어 파일을 다운로드해 가져옵니다.",
      icon: Compass,
      instructions: [
        "Spotlight(Cmd + Space)을 열어 '단축어' 혹은 'Shortcuts'를 검색해 실행합니다.",
        "🔥 [강력 추천] 아래 검은색 'macOS Tahoe 전용 단축어 다운로드' 버튼을 클릭하면, 로고스 앱의 한계를 해결하기 위해 '자동 복사(Cmd+C) AppleScript 매크로'가 내장된 최신 완제품 단축어가 다운로드됩니다.",
        "다운로드된 파일을 더블 클릭하여 설치하고, 아래 5단계의 단축키 설정만 추가하면 수동 설정 없이 즉시 드래그 번역이 완벽 작동합니다!"
      ],
      imageTip: "단축어 앱은 macOS Tahoe(타호, macOS 16) 환경에서 기본 제공되어 더욱 빠르고 쾌적한 연동 환경을 보장합니다."
    },
    {
      title: "2. 빠른 동작 설정 및 클립보드 예외 처리",
      description: "수동 생성 시, 로고스 본문 드래그 전달이 누락되었을 때를 대비해 빠른 동작 메뉴 등록 및 클립보드 자동 가져오기(백업)를 설정합니다.",
      icon: Settings,
      instructions: [
        "우측 설정 패널에서 'Shortcut Details' (슬라이더 조절 아이콘) 버튼을 누릅니다.",
        "'빠른 동작으로 사용(Use as Quick Action)' 및 '서비스 메뉴(Services Menu)'를 활성화합니다.",
        "메인 편집창으로 돌아와 첫 번째 입력 동작: 'Quick Actions에서 [텍스트] 받기'를 확인합니다.",
        "해당 줄 끝에 있는 '(입력이 없는 경우)' 또는 '(if there's no input)' 텍스트를 클릭합니다.",
        "드롭다운 목록에서 **[클립보드] (Clipboard)**를 예외(Fallback)로 설정해 줍니다!"
      ],
      imageTip: "다운로드형 단축어는 이 단계가 이미 스마트 매크로(AppleScript)로 완전 자동 구현되어 있어 생략 가능합니다."
    },
    {
      title: "3. URL 동작 블록 추가",
      description: "수동 생성 시, macOS Tahoe 환경에 대응하는 초고속 실시간 번역 및 분석 카드를 생성해 줄 API 주소를 등록합니다.",
      icon: Cpu,
      instructions: [
        "우측의 동작 라이브러리 검색창에 'URL'을 검색해 편집창으로 드래그합니다.",
        "이 페이지 하단에 제공되는 '메서드 1 연동 주소'를 그대로 복사해 URL 창에 붙여넣습니다.",
        "주소 맨 끝에 마우스 오른쪽 버튼을 누르고 '단축어 입력 (Shortcut Input)' 변수를 대입하세요."
      ],
      imageTip: "최종 연동 주소 형태: " + appUrl + "/api/translate-text?html=true&text=[Shortcut Input]"
    },
    {
      title: "4. 웹 페이지 표시 (팝업 창 연동)",
      description: "수동 생성 시, 로고스 성경 프로그램 위에 직접 복사 버튼이 포함된 팝업 카드가 뜨도록 설정합니다.",
      icon: Sparkles,
      instructions: [
        "🎯 [옵션 A: 웹 팝업 모드 - macOS Tahoe 매우 권장 ⭐️]",
        "1. 우측 동작 라이브러리에서 '웹 페이지 표시' 또는 'Show Web Page'를 검색해 추가합니다.",
        "2. 이전 단계에서 생성한 'URL' 블록을 입력 값으로 지정하세요.",
        "3. 이제 단축키를 누르면 macOS Tahoe의 부드러운 애니메이션과 함께 개별 복사 버튼이 포함된 주해 카드가 팝업됩니다.",
        "",
        "📝 [옵션 B: 백그라운드 텍스트 복사 모드]",
        "1. 'URL 콘텐츠 가져오기(Get Contents of URL)' 블록을 추가합니다.",
        "2. 바로 아래 '클립보드에 복사(Copy to Clipboard)' 블록을 둡니다.",
        "3. 마지막에 '결과 표시(Show Result)' 블록을 배치하면 알림창 형식으로 요약이 전달됩니다."
      ],
      imageTip: "웹 팝업 모드(옵션 A)를 선택하면 로고스 성경 앱 화면 위에 둥근 모서리의 예쁜 플로팅 카드가 바로 나타납니다."
    },
    {
      title: "5. 글로벌 단축키 지정 (Cmd + Option + Shift + T)",
      description: "로고스에서 글을 읽다 언제든지 바로 번역을 띄울 수 있도록 전역 단축키를 설정합니다.",
      icon: Keyboard,
      instructions: [
        "우측 설정 패널의 단축어 세부 정보 탭으로 돌아갑니다.",
        "'키보드 단축키 추가' 버튼을 클릭한 뒤, 키보드에서 'Cmd + Option + Shift + T'를 동시에 누릅니다.",
        "단축어 편집창을 닫으면 모든 준비가 끝납니다!"
      ],
      imageTip: "이제 로고스 앱에서 아무 본문이나 마우스로 드래그(선택)한 뒤 Cmd + Option + Shift + T를 누르기만 하면 자동 복사되어 1초 만에 플로팅 주해 창이 나타납니다."
    }
  ];

  const browserStepsEn = [
    {
      title: "1. Create Shortcut & Enable Clipboard",
      description: "Establish the basic shortcut framework on macOS Tahoe to transmit copied text safely from Logos to your web browser.",
      icon: Compass,
      instructions: [
        "Open the macOS 'Shortcuts' app and click the '+' icon in the top toolbar.",
        "In the right panel, check 'Use as Quick Action' and 'Services Menu'.",
        "Select 'Receive [Text] from [Quick Actions]'.",
        "Click '(if there's no input)' and choose **[Clipboard]** as the backup source."
      ],
      imageTip: "This ensures the shortcut works via copy-paste fallback even if text selection detection drops."
    },
    {
      title: "2. Set up Browser Navigation URL",
      description: "Configure the shortcut to open the full interactive workspace in a new browser tab or window.",
      icon: ExternalLink,
      instructions: [
        "Search for the 'URL' action and add it to your shortcut editor.",
        "Paste the 'Web Workspace URL' shown at the bottom of this page, and append the 'Shortcut Input' variable.",
        "Add an 'Open URLs' action block directly beneath it."
      ],
      imageTip: "Final URL format: " + appUrl + "/?text=[Shortcut Input]"
    },
    {
      title: "3. Map Shortcut (Cmd + Option + Shift + T)",
      description: "Assign a quick hotkey to trigger the browser-based workspace on macOS Tahoe.",
      icon: Keyboard,
      instructions: [
        "In the right-hand details tab, assign the keyboard combination 'Cmd + Option + Shift + T'.",
        "Your shortcut is complete! Select text in Logos, trigger the hotkey, and watch the browser compile your results."
      ],
      imageTip: "The browser workspace offers comprehensive tabbed modules, history saving, and original lexicon study."
    }
  ];

  const browserStepsKo = [
    {
      title: "1. 단축어 생성 및 클립보드 예외 처리",
      description: "복사된 텍스트를 로고스에서 웹 브라우저로 전송해 줄 기본 단축어 프레임워크를 마련합니다.",
      icon: Compass,
      instructions: [
        "macOS '단축어' 앱을 열고 우측 상단의 '+' 버튼을 클릭합니다.",
        "우측 설정 패널에서 '빠른 동작으로 사용' 및 '서비스 메뉴'를 활성화합니다.",
        "'Quick Actions에서 [텍스트] 받기'를 선택합니다.",
        "'(입력이 없는 경우)' 부분을 누르고 **[클립보드]**를 백업 소스로 지정하세요."
      ],
      imageTip: "텍스트 드래그 인식 범위를 벗어난 경우 복사-붙여넣기 상태에서 바로 작동되도록 보완해 줍니다."
    },
    {
      title: "2. 브라우저 새 창 열기 URL 등록",
      description: "전체 브라우저 작업창으로 텍스트를 담아 새 탭을 띄우는 동작을 추가합니다.",
      icon: ExternalLink,
      instructions: [
        "우측 검색창에 'URL'을 입력해 편집창에 등록합니다.",
        "이 가이드 아래에 제공되는 '웹 번역 앱 주소'를 붙여넣고 뒤에 '단축어 입력' 변수를 덧붙입니다.",
        "그 바로 아래에 'URL 열기(Open URLs)' 블록을 끌어다 추가하세요."
      ],
      imageTip: "최종 연동 주소 형태: " + appUrl + "/?text=[Shortcut Input]"
    },
    {
      title: "3. 글로벌 단축키 지정 (Cmd + Option + Shift + T)",
      description: "브라우저 기반 작업 환경을 빠르게 실행할 전역 핫키를 매핑합니다.",
      icon: Keyboard,
      instructions: [
        "우측의 세부 정보 탭에서 단축키 지정창을 열고 'Cmd + Option + Shift + T'를 누릅니다.",
        "이제 단축어가 완성되었습니다! 로고스 앱에서 단축키만 누르면 브라우저의 고기능 대조 스페이스가 실행됩니다."
      ],
      imageTip: "브라우저 작업창 환경은 여러 탭 보기, 주해 기록 영구 보관, 깊이 있는 신학 원어 연구 기능을 지원합니다."
    }
  ];

  const nativeSteps = uiLang === "ko" ? nativeStepsKo : nativeStepsEn;
  const browserSteps = uiLang === "ko" ? browserStepsKo : browserStepsEn;
  const steps = activeTab === "native" ? nativeSteps : browserSteps;

  const handleCopyTextUrl = () => {
    navigator.clipboard.writeText(getShortcutUrl());
    setCopiedTextUrl(true);
    setTimeout(() => setCopiedTextUrl(false), 2000);
  };

  const handleCopyWebUrl = () => {
    navigator.clipboard.writeText(getWebUrl());
    setCopiedWebUrl(true);
    setTimeout(() => setCopiedWebUrl(false), 2000);
  };

  const handleDownloadShortcut = () => {
    const isNative = activeTab === "native";
    const targetUrl = isNative ? getShortcutUrl() : getWebUrl();
    const actionId = isNative ? "is.workflow.actions.showwebpage" : "is.workflow.actions.openurl";
    
    // We escape & for XML compatibility
    const escapedUrl = targetUrl.replace(/&/g, "&amp;");
    // In plist dictionary keys, we use the original length of the unescaped URL
    const urlLength = targetUrl.length;

    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>WFWorkflowActions</key>
	<array>
		<dict>
			<key>WFWorkflowActionIdentifier</key>
			<string>is.workflow.actions.runapplescript</string>
			<key>WFWorkflowActionParameters</key>
			<dict>
				<key>WFAppleScript</key>
				<string>on run {input, parameters}
	if input is not missing value and input as string is not &quot;&quot; then
		return input
	end if
	tell application &quot;System Events&quot;
		keystroke &quot;c&quot; using command down
	end tell
	delay 0.2
	return the clipboard
end run</string>
			</dict>
			<key>UUID</key>
			<string>63F01C31-BC0C-4A2D-A537-83AF04C88214</string>
		</dict>
		<dict>
			<key>WFWorkflowActionIdentifier</key>
			<string>is.workflow.actions.url</string>
			<key>WFWorkflowActionParameters</key>
			<dict>
				<key>WFURLSpec</key>
				<dict>
					<key>Value</key>
					<dict>
						<key>attachmentsByRange</key>
						<dict>
							<key>{${urlLength}, 1}</key>
							<dict>
								<key>OutputUUID</key>
								<string>63F01C31-BC0C-4A2D-A537-83AF04C88214</string>
								<key>OutputName</key>
								<string>Script Result</string>
								<key>Type</key>
								<string>ActionOutput</string>
							</dict>
						</dict>
						<key>string</key>
						<string>${escapedUrl}\uFFFC</string>
					</dict>
					<key>WFSerializationType</key>
					<string>WFTextTokenString</string>
				</dict>
			</dict>
		</dict>
		<dict>
			<key>WFWorkflowActionIdentifier</key>
			<string>${actionId}</string>
			<key>WFWorkflowActionParameters</key>
			<dict/>
		</dict>
	</array>
	<key>WFWorkflowClientVersion</key>
	<string>1200</string>
	<key>WFWorkflowInputContentItemClasses</key>
	<array>
		<string>WFStringContentItem</string>
	</array>
	<key>WFWorkflowTypes</key>
	<array>
		<string>ActionExtension</string>
		<string>QuickAction</string>
	</array>
</dict>
</plist>`;

    const blob = new Blob([plistContent], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filename = isNative ? "Logos_Tahoe_Translator_Popup.shortcut" : "Logos_Tahoe_Translator_Browser.shortcut";
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const currentStepData = steps[activeStep] || steps[0];
  const StepIcon = currentStepData.icon;

  const handleTabChange = (tab: "native" | "browser") => {
    setActiveTab(tab);
    setActiveStep(0);
  };

  // Localized texts
  const labels = {
    title: {
      en: "macOS Tahoe (v16) Logos Keyboard Shortcut Integration Guide",
      ko: "macOS Tahoe (맥OS 16) 로고스 성경 단축키 연동 가이드",
    },
    desc: {
      en: "Optimized for macOS Tahoe. Translate any selected English text in your Logos Bible app instantly by mapping a system-wide hotkey: Cmd + Option + Shift + T.",
      ko: "macOS Tahoe 버전에 완전 최적화 완료! 로고스 성경 인앱에서 단어를 드래그하고 전역 단축키 Cmd + Option + Shift + T를 누르면 초고속 AI 주해 카드가 나타납니다.",
    },
    downloadBtn: {
      en: "Download macOS Tahoe Shortcut (.shortcut)",
      ko: "macOS Tahoe 전용 단축어 다운로드 (.shortcut)",
    },
    downloadDesc: {
      en: "This download contains your personalized API key and Client ID pre-configured! Double-click it to install instantly on macOS Tahoe.",
      ko: "사용자의 개인 API 키 및 Client ID 설정이 미리 주입된 완제품 단축어 파일을 다운로드합니다. 복잡한 입력 없이 더블 클릭 한 번으로 자동 등록됩니다!",
    },
    tabNative: {
      en: "Method 1: Native Floating Popup (Highly Recommended - No Browser Needed)",
      ko: "방법 1: 네이티브 투명 플로팅 팝업 (매우 권장 - 별도 브라우저창 없음)",
    },
    tabBrowser: {
      en: "Method 2: Full Interactive Browser Workspace",
      ko: "방법 2: 고기능 브라우저 연동 작업 스페이스",
    },
    stepLabel: {
      en: "Step",
      ko: "단계",
    },
    previousBtn: {
      en: "Previous",
      ko: "이전 단계",
    },
    nextBtn: {
      en: "Next",
      ko: "다음 단계",
    },
    method1Endpoint: {
      en: "Method 1 Endpoint",
      ko: "방법 1 연동 주소",
    },
    method1Title: {
      en: "API URL for Native Popup Card (Method 1)",
      ko: "단축어 URL 블록용 복사 대상 (네이티브 팝업 API)",
    },
    method1Desc: {
      en: "Paste this address in the 'URL' box of the Shortcuts app, then map the Shortcut Input variable right at the end.",
      ko: "단축어 앱의 'URL' 상자에 이 주소를 넣고 뒤에 단축어 입력 변수를 대입하세요.",
    },
    method2Endpoint: {
      en: "Method 2 Web URL",
      ko: "방법 2 연동 주소",
    },
    method2Title: {
      en: "Web Workspace URL (Method 2)",
      ko: "단축어 URL 블록용 복사 대상 (웹 작업창 주소)",
    },
    method2Desc: {
      en: "Paste this address in the 'URL' box, then append the Shortcut Input variable at the end.",
      ko: "단축어 앱의 'URL' 상자에 이 주소를 넣고 뒤에 단축어 입력 변수를 대입하세요.",
    },
    copyApiBtn: {
      en: "Copy API URL",
      ko: "API 주소 복사",
    },
    copyWebBtn: {
      en: "Copy Workspace URL",
      ko: "웹 앱 주소 복사",
    },
    copiedBtn: {
      en: "Copied!",
      ko: "복사 완료!",
    },
    diagramTitle: {
      en: "macOS Shortcuts Automation Flow",
      ko: "macOS 단축어 연동 흐름도 (Shortcuts Action Flow)",
    },
    diagramStep1: {
      en: "Selected Text",
      ko: "드래그 원문",
    },
    diagramStep2: {
      en: "api/translate-text",
      ko: "서버 API 호출",
    },
    diagramStep3: {
      en: "Floating Web Page",
      ko: "훑어보기 팝업",
    },
    diagramDesc1: {
      en: "Trigger",
      ko: "외부 트리거",
    },
    diagramDesc2: {
      en: "API Request",
      ko: "API 호출",
    },
    diagramDesc3: {
      en: "Overlay",
      ko: "결과 화면",
    }
  };

  const getLabel = (key: keyof typeof labels) => labels[key][uiLang] || labels[key]["en"];

  return (
    <div id="mac-shortcut-guide" className="bg-stone-50 border border-stone-200 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-stone-200 pb-4 mb-6">
        <div>
          <h3 className="font-serif text-xl font-semibold text-stone-800 flex items-center gap-2">
            <span className="inline-flex items-center justify-center bg-stone-800 text-stone-100 text-xs font-sans w-5 h-5 rounded-full"></span>
            {getLabel("title")}
          </h3>
          <p className="text-sm text-stone-600 mt-1">
            {getLabel("desc")}
          </p>
        </div>
      </div>

      {/* macOS Tahoe 1-Click Auto Installer Section */}
      <div className="mb-6 p-5 bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-xl shadow-md border border-stone-700">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase bg-amber-500 text-stone-950 px-2.5 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" /> macOS Tahoe One-click Installer
            </span>
            <h4 className="font-serif text-base font-semibold text-stone-100 mt-1">
              {uiLang === "ko" ? "macOS Tahoe 1초 자동 설치 단축어 파일 (.shortcut)" : "macOS Tahoe 1-Second Auto-Setup Shortcut File (.shortcut)"}
            </h4>
            <p className="text-xs text-stone-300 leading-relaxed max-w-2xl">
              {getLabel("downloadDesc")}
            </p>
          </div>
          <button
            onClick={handleDownloadShortcut}
            className="w-full md:w-auto px-5 py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-stone-950 rounded-lg text-xs font-bold transition-all shadow flex items-center justify-center gap-2 shrink-0 border border-amber-600 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-stone-950" />
            <span>{getLabel("downloadBtn")}</span>
          </button>
        </div>
      </div>

      {/* Troubleshooting/Security Policy Alert (Fixes "Unsigned Shortcuts Error") */}
      <div className="mb-6 p-5 bg-amber-50/60 border border-amber-200 rounded-xl shadow-sm text-stone-800">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-3 flex-1">
            <div>
              <h4 className="font-serif text-sm font-semibold text-amber-900 flex items-center gap-1.5">
                {uiLang === "ko" ? "💡 '서명되지 않은 단축어는 지원되지 않습니다' 오류 해결법" : "💡 Fix: 'Unsigned shortcut files are not supported' Error"}
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed mt-1">
                {uiLang === "ko" 
                  ? "macOS의 강화된 보안 정책으로 인해, 웹 브라우저에서 수동 다운로드한 로컬 단축어(.shortcut) 파일의 더블클릭 설치가 차단될 수 있습니다. 아래의 초간단 방법으로 즉시 해결해 보세요:"
                  : "Due to macOS security policies, downloaded local .shortcut files may be blocked from importing via double-click. Use one of these simple fixes:"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Method A: Terminal Import */}
              <div className="p-3 bg-white rounded-lg border border-stone-200 space-y-2 shadow-inner">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                  <Terminal className="w-4 h-4 text-stone-600" />
                  <span>{uiLang === "ko" ? "방법 1: 터미널로 본인 서명 후 설치 (가장 확실함 ⭐️)" : "Fix 1: Sign Locally via Terminal & Open (Most Reliable ⭐️)"}</span>
                </div>
                <p className="text-[11px] text-stone-500 leading-normal">
                  {uiLang === "ko" 
                    ? "macOS 단축어 명령어 도구로 다운로드된 파일에 로컬 서명을 수동으로 각인한 후 실행하여 안전하게 단축어 앱에 등록합니다:"
                    : "Use the macOS built-in shortcuts utility to apply a local signature to the file and open it for a secure installation:"}
                </p>
                <div className="flex items-center gap-1.5 bg-stone-50 p-1.5 rounded border border-stone-200">
                  <span className="font-mono text-[10px] text-stone-700 select-all truncate flex-1">
                    shortcuts sign -i ~/Downloads/{activeTab === "native" ? "Logos_Tahoe_Translator_Popup.shortcut" : "Logos_Tahoe_Translator_Browser.shortcut"} -o ~/Downloads/{activeTab === "native" ? "Logos_Tahoe_Translator_Popup_Signed.shortcut" : "Logos_Tahoe_Translator_Browser_Signed.shortcut"} && open ~/Downloads/{activeTab === "native" ? "Logos_Tahoe_Translator_Popup_Signed.shortcut" : "Logos_Tahoe_Translator_Browser_Signed.shortcut"}
                  </span>
                  <button
                    onClick={() => {
                      const file = activeTab === "native" ? "Logos_Tahoe_Translator_Popup" : "Logos_Tahoe_Translator_Browser";
                      const cmd = `shortcuts sign -i ~/Downloads/${file}.shortcut -o ~/Downloads/${file}_Signed.shortcut && open ~/Downloads/${file}_Signed.shortcut`;
                      navigator.clipboard.writeText(cmd);
                      setCopiedTerminal(true);
                      setTimeout(() => setCopiedTerminal(false), 2000);
                    }}
                    className="p-1 hover:bg-stone-200 rounded text-stone-600 cursor-pointer transition-colors"
                    title="Copy command"
                  >
                    {copiedTerminal ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Method B: Preferences Toggle */}
              <div className="p-3 bg-white rounded-lg border border-stone-200 space-y-2 shadow-inner">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                  <Settings className="w-4 h-4 text-stone-600" />
                  <span>{uiLang === "ko" ? "방법 2: 설정에서 외부 스크립트 허용하기" : "Fix 2: Enable Untrusted Shortcuts"}</span>
                </div>
                <p className="text-[11px] text-stone-500 leading-normal">
                  {uiLang === "ko" 
                    ? "단축어 앱 실행 -> 상단 메뉴 '단축어 > 설정... (Cmd + ,)' -> '고급' 탭 -> '스크립트 실행 허용' 및 '신뢰할 수 없는 단축어 허용'에 체크합니다."
                    : "Open Shortcuts app -> Click 'Shortcuts > Settings' -> Go to 'Advanced' tab -> Check 'Allow Running Scripts' and 'Allow Untrusted Shortcuts'."}
                </p>
                <div className="text-[10px] text-stone-400 italic">
                  {uiLang === "ko" 
                    ? "※ 또는 터미널에 defaults write com.apple.shortcuts SecurityAllowUntrusted -bool true 를 입력하세요."
                    : "※ Or run: defaults write com.apple.shortcuts SecurityAllowUntrusted -bool true"}
                </div>
              </div>
            </div>
          </div>
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
          {getLabel("tabNative")}
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
          {getLabel("tabBrowser")}
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
                  <div className="text-[10px] font-mono uppercase opacity-60">{getLabel("stepLabel")} 0{idx + 1}</div>
                  <div className="text-xs font-medium line-clamp-1">{step.title}</div>
                </div>
              </button>
            );
          })}

          <div className="mt-4 p-3.5 bg-amber-50/50 rounded-lg border border-amber-100 text-xs text-stone-700 space-y-2">
            <p className="font-semibold text-amber-900 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              {activeTab === "native" 
                ? (uiLang === "ko" ? "네이티브 반투명 팝업 연동" : "Seamless Native Popups!") 
                : (uiLang === "ko" ? "대조 공부용 브라우저 작업실" : "Interactive Web Workspace!")
              }
            </p>
            {activeTab === "native" ? (
              <p className="leading-relaxed text-[11px] text-amber-800">
                {uiLang === "ko" 
                  ? "로고스 프로그램 실행 중에 전용 단축키만 치면 성경 본문 위에 둥둥 떠 있는 심플하고 강력한 결과 주석 카드가 생성됩니다."
                  : "Displays a translucent floating card directly above your active Logos window. Ideal for quick translation and parsing without interrupting your study flow."
                }
              </p>
            ) : (
              <p className="leading-relaxed text-[11px] text-amber-800">
                {uiLang === "ko" 
                  ? "전체 웹브라우저 창을 실행하여 문장 일대일 대조, 성경 원어 연관 렉시콘 데이터베이스, 히스토리 저장을 이용합니다."
                  : "Opens the full web application on a separate tab, providing deep tabbed insights, histories, and dictionary annotations."
                }
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
                className="flex items-center justify-center gap-1 flex-1 sm:flex-initial px-3 py-1.5 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-md disabled:opacity-40 transition-colors text-xs font-semibold"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {getLabel("previousBtn")}
              </button>
              <button
                disabled={activeStep === steps.length - 1}
                onClick={() => setActiveStep(p => p + 1)}
                className="flex items-center justify-center gap-1 flex-1 sm:flex-initial px-3 py-1.5 bg-stone-800 text-stone-100 hover:bg-stone-900 rounded-md disabled:opacity-40 transition-colors text-xs font-semibold"
              >
                {getLabel("nextBtn")}
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
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{getLabel("method1Endpoint")}</span>
                <h5 className="font-serif text-sm font-semibold text-stone-800 mt-1">{getLabel("method1Title")}</h5>
                <p className="text-[11px] text-stone-600 mt-0.5">{getLabel("method1Desc")}</p>
              </div>
              <button
                onClick={handleCopyTextUrl}
                className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-lg text-xs font-semibold transition-colors shrink-0"
              >
                {copiedTextUrl ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{getLabel("copiedBtn")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{getLabel("copyApiBtn")}</span>
                  </>
                )}
              </button>
            </div>
            <div className="font-mono mt-2.5 bg-white border border-amber-100 p-2 rounded text-[11px] break-all select-all text-stone-700 font-semibold shadow-inner">
              {getShortcutUrl()}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1">
                <span className="text-[10px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{getLabel("method2Endpoint")}</span>
                <h5 className="font-serif text-sm font-semibold text-stone-800 mt-1">{getLabel("method2Title")}</h5>
                <p className="text-[11px] text-stone-600 mt-0.5">{getLabel("method2Desc")}</p>
              </div>
              <button
                onClick={handleCopyWebUrl}
                className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-lg text-xs font-semibold transition-colors shrink-0"
              >
                {copiedWebUrl ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{getLabel("copiedBtn")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{getLabel("copyWebBtn")}</span>
                  </>
                )}
              </button>
            </div>
            <div className="font-mono mt-2.5 bg-white border border-blue-100 p-2 rounded text-[11px] break-all select-all text-stone-700 font-semibold shadow-inner">
              {getWebUrl()}
            </div>
          </div>
        )}
      </div>

      {/* Visual Diagram for Shortcuts flow */}
      <div className="mt-6 bg-stone-800 text-stone-100 p-5 rounded-xl">
        <h4 className="text-xs font-mono font-semibold uppercase text-stone-400 tracking-wider mb-3">
          {getLabel("diagramTitle")}
        </h4>
        <div className="flex flex-col md:flex-row items-center justify-around gap-4 text-xs font-mono pt-2">
          <div className="flex flex-col items-center p-3 bg-stone-700/50 border border-stone-600 rounded-lg w-full md:w-1/4 text-center">
            <span className="text-stone-400 text-[10px]">01. {getLabel("diagramDesc1")}</span>
            <span className="font-semibold text-stone-200 mt-1">{getLabel("diagramStep1")}</span>
            <span className="text-[10px] text-amber-400/80 mt-1">Cmd + Opt + Shift + T</span>
          </div>
          <span className="text-stone-500 font-bold hidden md:inline">➔</span>
          <div className="flex flex-col items-center p-3 bg-stone-700/50 border border-stone-600 rounded-lg w-full md:w-1/4 text-center">
            <span className="text-stone-400 text-[10px]">02. {getLabel("diagramDesc2")}</span>
            <span className="font-semibold text-stone-200 mt-1">{getLabel("diagramStep2")}</span>
            <span className="text-[10px] text-stone-400 mt-1">Get Contents of URL</span>
          </div>
          <span className="text-stone-500 font-bold hidden md:inline">➔</span>
          <div className="flex flex-col items-center p-3 bg-stone-700/50 border border-stone-600 rounded-lg w-full md:w-1/4 text-center">
            <span className="text-stone-400 text-[10px]">03. {getLabel("diagramDesc3")}</span>
            <span className="font-semibold text-amber-300 mt-1">{getLabel("diagramStep3")}</span>
            <span className="text-[10px] text-stone-400 mt-1">Show Result (HTML Overlay)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
