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
      title: "1. Open macOS Shortcuts App",
      description: "Launch the native macOS 'Shortcuts' app to design a new one-click translation automation.",
      icon: Compass,
      instructions: [
        "Open Spotlight (Cmd + Space), search for 'Shortcuts' and open it.",
        "Click the '+' icon in the upper right corner to create a new shortcut.",
        "Rename the shortcut to 'Logos Translator' or any name you prefer."
      ],
      imageTip: "The Shortcuts app is pre-installed for free on macOS Monterey and later."
    },
    {
      title: "2. Set as Quick Action & Clipboard Fallback",
      description: "Enable the services menu integration and set up a reliable clipboard fallback in case Logos doesn't pass the dragged text directly.",
      icon: Settings,
      instructions: [
        "Click 'Shortcut Details' (the toggle settings/slider icon button in the top right panel).",
        "Check the boxes for 'Use as Quick Action' and 'Services Menu' to activate.",
        "Go back to the main editor and select the first input action block: 'Receive [Text] from [Quick Actions]'.",
        "Click the text '(if there's no input)' at the end of that first action block.",
        "Select **[Clipboard]** (or 'Clipboard contents') from the dropdown options as the fallback!"
      ],
      imageTip: "With this setup, if dragging fails, simply copy the text (Cmd+C) and press your keyboard shortcut to run the translation instantly."
    },
    {
      title: "3. Add URL Action Block",
      description: "Register the API server URL that handles high-speed translations and generates the visual popup cards.",
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
      description: "Configure the popup window to display an interactive card with instant Copy buttons.",
      icon: Sparkles,
      instructions: [
        "🎯 [Option A: Web Popup Mode - Highly Recommended ⭐️]",
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
      description: "Map a global hotkey to translate selected texts instantly while reading in Logos.",
      icon: Keyboard,
      instructions: [
        "Return to the 'Shortcut Details' panel on the right side.",
        "Click 'Add Keyboard Shortcut' and press 'Cmd + Option + Shift + T' on your keyboard.",
        "Close the Shortcuts editor—your setup is now complete!"
      ],
      imageTip: "Select any text in Logos and press Cmd + Option + Shift + T to see the translation in under a second."
    }
  ];

  const browserSteps = [
    {
      title: "1. Create Shortcut & Enable Clipboard",
      description: "Establish the basic shortcut framework to transmit copied text safely from Logos to your web browser.",
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
      description: "Assign a quick hotkey to trigger the browser-based workspace.",
      icon: Keyboard,
      instructions: [
        "In the right-hand details tab, assign the keyboard combination 'Cmd + Option + Shift + T'.",
        "Your shortcut is complete! Select text in Logos, trigger the hotkey, and watch the browser compile your results."
      ],
      imageTip: "The browser workspace offers comprehensive tabbed modules, history saving, and original lexicon search."
    }
  ];

  const steps = activeTab === "native" ? nativeSteps : browserSteps;

  const handleCopyTextUrl = () => {
    const shortcutTemplateUrl = `${appUrl}/api/translate-text?html=true&text=`;
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
            macOS Logos Keyboard Shortcut Integration Guide
          </h3>
          <p className="text-sm text-stone-600 mt-1">
            Translate any selected English text in your Logos Bible app instantly by mapping a system-wide hotkey: <strong>Cmd + Option + Shift + T</strong>.
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
          Method 1: Native Floating Popup (Highly Recommended - No Browser Needed)
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
          Method 2: Full Interactive Browser Workspace
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
              {activeTab === "native" ? "Seamless Native Popups!" : "Interactive Web Workspace!"}
            </p>
            {activeTab === "native" ? (
              <p className="leading-relaxed text-[11px] text-amber-800">
                Displays a translucent floating card directly above your active Logos window. Ideal for quick translation and parsing without interrupting your study flow.
              </p>
            ) : (
              <p className="leading-relaxed text-[11px] text-amber-800">
                Opens the full web application on a separate tab, providing deep tabbed insights, histories, and dictionary annotations.
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
                Previous
              </button>
              <button
                disabled={activeStep === steps.length - 1}
                onClick={() => setActiveStep(p => p + 1)}
                className="flex items-center justify-center gap-1 flex-1 sm:flex-initial px-3 py-1.5 bg-stone-800 text-stone-100 hover:bg-stone-900 rounded-md disabled:opacity-40 transition-colors"
              >
                Next
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
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Method 1 Endpoint</span>
                <h5 className="font-serif text-sm font-semibold text-stone-800 mt-1">API URL for Native Popup Card (Method 1)</h5>
                <p className="text-[11px] text-stone-600 mt-0.5">Paste this address in the 'URL' box of the Shortcuts app, then map the <code className="font-mono text-amber-800 font-bold bg-amber-100/50 px-1 rounded">Shortcut Input</code> variable right at the end.</p>
              </div>
              <button
                onClick={handleCopyTextUrl}
                className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-lg text-xs font-semibold transition-colors shrink-0"
              >
                {copiedTextUrl ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy API URL</span>
                  </>
                )}
              </button>
            </div>
            <div className="font-mono mt-2.5 bg-white border border-amber-100 p-2 rounded text-[11px] break-all select-all text-stone-700 font-semibold shadow-inner">
              {appUrl}/api/translate-text?html=true&text=
            </div>
          </div>
        ) : (
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1">
                <span className="text-[10px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Method 2 Web URL</span>
                <h5 className="font-serif text-sm font-semibold text-stone-800 mt-1">Web Workspace URL (Method 2)</h5>
                <p className="text-[11px] text-stone-600 mt-0.5">Paste this address in the 'URL' box, then append the <code className="font-mono text-blue-900 bg-blue-100/50 px-1 rounded">Shortcut Input</code> variable at the end.</p>
              </div>
              <button
                onClick={handleCopyWebUrl}
                className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-lg text-xs font-semibold transition-colors shrink-0"
              >
                {copiedWebUrl ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Workspace URL</span>
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
          macOS Shortcuts Automation Flow
        </h4>
        <div className="flex flex-col md:flex-row items-center justify-around gap-4 text-xs font-mono pt-2">
          <div className="flex flex-col items-center p-3 bg-stone-700/50 border border-stone-600 rounded-lg w-full md:w-1/4 text-center">
            <span className="text-stone-400 text-[10px]">01. Trigger</span>
            <span className="font-semibold text-stone-200 mt-1">Selected Text</span>
            <span className="text-[10px] text-amber-400/80 mt-1">Cmd + Opt + Shift + T</span>
          </div>
          <span className="text-stone-500 font-bold hidden md:inline">➔</span>
          <div className="flex flex-col items-center p-3 bg-stone-700/50 border border-stone-600 rounded-lg w-full md:w-1/4 text-center">
            <span className="text-stone-400 text-[10px]">02. API Request</span>
            <span className="font-semibold text-stone-200 mt-1">api/translate-text</span>
            <span className="text-[10px] text-stone-400 mt-1">Get Contents of URL</span>
          </div>
          <span className="text-stone-500 font-bold hidden md:inline">➔</span>
          <div className="flex flex-col items-center p-3 bg-stone-700/50 border border-stone-600 rounded-lg w-full md:w-1/4 text-center">
            <span className="text-stone-400 text-[10px]">03. Overlay</span>
            <span className="font-semibold text-amber-300 mt-1">Floating Web Page</span>
            <span className="text-[10px] text-stone-400 mt-1">Show Result Overlay</span>
          </div>
        </div>
      </div>
    </div>
  );
}
