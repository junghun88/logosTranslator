import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Languages, 
  Key, 
  Lock, 
  User, 
  UserPlus, 
  LogIn, 
  Eye, 
  EyeOff, 
  AlertCircle,
  CheckCircle,
  Globe
} from "lucide-react";
import { useLanguage } from "../lib/LanguageContext";

interface AuthScreenProps {
  onLoginSuccess: (username: string) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const { uiLang, setUiLang, t } = useLanguage();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-initialize default account if needed
  useEffect(() => {
    try {
      const storedUsers = localStorage.getItem("logos_users");
      let users = storedUsers ? JSON.parse(storedUsers) : [];
      
      // Check if admin already exists
      const adminExists = users.some((u: any) => u.username === "logos_admin");
      if (!adminExists) {
        users.push({
          username: "logos_admin",
          password: "password123",
          geminiKey: ""
        });
        localStorage.setItem("logos_users", JSON.stringify(users));
      }
    } catch (e) {
      console.error("Failed to initialize default user store:", e);
    }
  }, []);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError(
        uiLang === "ko" 
          ? "아이디와 비밀번호를 모두 입력해 주세요." 
          : "Please enter both username and password."
      );
      return;
    }

    if (trimmedPass.length < 4) {
      setError(
        uiLang === "ko"
          ? "비밀번호는 최소 4자 이상이어야 합니다."
          : "Password must be at least 4 characters."
      );
      return;
    }

    try {
      const storedUsers = localStorage.getItem("logos_users");
      let users = storedUsers ? JSON.parse(storedUsers) : [];

      if (isSignUp) {
        // Sign Up Mode
        const userExists = users.some((u: any) => u.username === trimmedUser);
        if (userExists) {
          setError(
            uiLang === "ko"
              ? "이미 존재하는 사용자 아이디입니다."
              : "Username already exists."
          );
          return;
        }

        // Add user
        const newUser = {
          username: trimmedUser,
          password: trimmedPass,
          geminiKey: ""
        };
        users.push(newUser);
        localStorage.setItem("logos_users", JSON.stringify(users));

        setSuccess(
          uiLang === "ko"
            ? "성공적으로 가입되었습니다! 자동 로그인 중..."
            : "Successfully registered! Logging in..."
        );

        setTimeout(() => {
          onLoginSuccess(trimmedUser);
        }, 1200);

      } else {
        // Sign In Mode
        const matchedUser = users.find(
          (u: any) => u.username === trimmedUser && u.password === trimmedPass
        );

        if (matchedUser) {
          setSuccess(
            uiLang === "ko"
              ? "로그인 성공! 대시보드로 이동합니다."
              : "Login successful! Redirecting..."
          );
          setTimeout(() => {
            onLoginSuccess(trimmedUser);
          }, 800);
        } else {
          setError(
            uiLang === "ko"
              ? "아이디 또는 비밀번호가 일치하지 않습니다."
              : "Invalid username or password."
          );
        }
      }
    } catch (e) {
      console.error(e);
      setError(
        uiLang === "ko"
          ? "인증 중 알 수 없는 오류가 발생했습니다."
          : "An error occurred during authentication."
      );
    }
  };

  const handleUseDemo = () => {
    setUsername("logos_admin");
    setPassword("password123");
    setIsSignUp(false);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans selection:bg-stone-800 selection:text-white">
      
      {/* Language Selector */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white border border-stone-200 rounded-full px-3 py-1 shadow-xs z-10">
        <Globe className="w-3.5 h-3.5 text-stone-500" />
        <button
          onClick={() => setUiLang(uiLang === "ko" ? "en" : "ko")}
          className="text-xs font-semibold text-stone-700 hover:text-stone-900 transition-colors"
        >
          {uiLang === "ko" ? "English" : "한국어"}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden p-6 sm:p-8 space-y-6"
      >
        {/* Header Logo & Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 bg-stone-900 text-stone-100 items-center justify-center rounded-xl shadow-xs mx-auto">
            <Languages className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="font-serif text-2xl font-black tracking-tight text-stone-900">
              {t("title")}
            </h1>
            <p className="text-xs text-stone-500 font-serif">
              {uiLang === "ko" 
                ? "신학 및 성경 번역 동반자 로그인" 
                : "Theological Study Companion Authorization"}
            </p>
          </div>
        </div>

        {/* Auth form */}
        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* Error & Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-800 text-xs p-3 rounded-lg flex items-start gap-2 animate-pulse">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs p-3 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1">
            <label className="text-xs font-serif font-bold text-stone-600 block">
              {uiLang === "ko" ? "아이디" : "Username"}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={uiLang === "ko" ? "아이디 입력..." : "Enter username..."}
                className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm placeholder-stone-400 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 text-stone-800"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="text-xs font-serif font-bold text-stone-600 block">
              {uiLang === "ko" ? "비밀번호" : "Password"}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={uiLang === "ko" ? "비밀번호 입력..." : "Enter password..."}
                className="w-full pl-9 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm placeholder-stone-400 focus:outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 text-stone-800"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 bg-stone-900 hover:bg-stone-950 text-stone-50 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{uiLang === "ko" ? "새 계정 만들기" : "Register New Account"}</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>{uiLang === "ko" ? "로그인" : "Log In"}</span>
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode Link */}
        <div className="text-center text-xs text-stone-500">
          {isSignUp ? (
            <p>
              {uiLang === "ko" ? "이미 계정이 있으신가요? " : "Already have an account? "}
              <button
                onClick={() => {
                  setIsSignUp(false);
                  setError(null);
                }}
                className="font-semibold text-stone-900 underline hover:text-stone-700 ml-1"
              >
                {uiLang === "ko" ? "로그인하기" : "Log In"}
              </button>
            </p>
          ) : (
            <p>
              {uiLang === "ko" ? "처음이신가요? " : "First time? "}
              <button
                onClick={() => {
                  setIsSignUp(true);
                  setError(null);
                }}
                className="font-semibold text-stone-900 underline hover:text-stone-700 ml-1"
              >
                {uiLang === "ko" ? "회원가입하기" : "Create Account"}
              </button>
            </p>
          )}
        </div>

        {/* Demo Account Quick helper */}
        <div className="border-t border-stone-200/60 pt-4 text-center space-y-2">
          <p className="text-[11px] text-stone-500 leading-relaxed">
            {uiLang === "ko" 
              ? "💡 바로 사용해 보시려면 데모 관리자 계정으로 로그인해 보세요."
              : "💡 Try the companion immediately using our default account."}
          </p>
          <button
            onClick={handleUseDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-semibold text-amber-800 transition-colors"
          >
            <Key className="w-3.5 h-3.5" />
            <span>logos_admin / password123</span>
          </button>
        </div>

        {/* Key Policy Banner */}
        <div className="bg-stone-50 border border-stone-100 rounded-lg p-3 text-[10.5px] text-stone-500 text-center space-y-1">
          <p className="font-semibold text-stone-700">
            {uiLang === "ko" ? "🔒 개인 API 키 필수 사용 정책" : "🔒 Personal API Key Required Policy"}
          </p>
          <p className="leading-relaxed">
            {uiLang === "ko"
              ? "본 서비스는 로그인 후 개인 구글 Gemini API Key가 등록된 상태에서만 번역 서비스가 작동되도록 고안되었습니다."
              : "This service is policy-gated and translation works only after setting up your personal Google Gemini API Key."}
          </p>
        </div>

      </motion.div>
    </div>
  );
}
