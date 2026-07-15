import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Users, 
  UserPlus, 
  Trash2, 
  Key, 
  Lock, 
  Edit2, 
  Check, 
  X, 
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck
} from "lucide-react";

interface UserAccount {
  username: string;
  password?: string; // Stored plaintext as simple mock-like db on localstorage
  geminiKey?: string;
}

interface AdminPanelProps {
  uiLang: "ko" | "en";
  currentAdmin: string;
  onUserUpdate?: () => void;
}

export default function AdminPanel({ uiLang, currentAdmin, onUserUpdate }: AdminPanelProps) {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form fields for adding new user
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newGeminiKey, setNewGeminiKey] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Edit states
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState("");
  const [editGeminiKey, setEditGeminiKey] = useState("");
  const [showPwdMap, setShowPwdMap] = useState<Record<string, boolean>>({});

  // Reload user list
  const loadUsers = () => {
    try {
      const stored = localStorage.getItem("logos_users");
      if (stored) {
        const parsed = JSON.parse(stored);
        // Map individual keys from separate storage entries if key field is empty
        const mapped = parsed.map((u: any) => {
          const personalKey = localStorage.getItem(`logos_custom_gemini_key_${u.username}`) || u.geminiKey || "";
          return {
            ...u,
            geminiKey: personalKey
          };
        });
        setUsers(mapped);
      }
    } catch (e) {
      console.error("Failed to load users for admin panel:", e);
    }
  };

  useEffect(() => {
    loadUsers();
    
    // Listen to custom event for key updates
    const handleKeysUpdated = () => {
      loadUsers();
    };
    window.addEventListener("logos_keys_updated", handleKeysUpdated);
    return () => {
      window.removeEventListener("logos_keys_updated", handleKeysUpdated);
    };
  }, []);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const usernameTrimmed = newUsername.trim().toLowerCase();
    const passwordTrimmed = newPassword.trim();

    if (!usernameTrimmed || !passwordTrimmed) {
      setFormError(
        uiLang === "ko" 
          ? "아이디와 비밀번호를 모두 입력해 주세요." 
          : "Please enter both username and password."
      );
      return;
    }

    if (passwordTrimmed.length < 4) {
      setFormError(
        uiLang === "ko"
          ? "비밀번호는 최소 4자 이상이어야 합니다."
          : "Password must be at least 4 characters."
      );
      return;
    }

    try {
      const stored = localStorage.getItem("logos_users");
      let currentUsers = stored ? JSON.parse(stored) : [];

      if (currentUsers.some((u: any) => u.username === usernameTrimmed)) {
        setFormError(
          uiLang === "ko"
            ? "이미 등록된 아이디입니다."
            : "Username already exists."
        );
        return;
      }

      const newUser: UserAccount = {
        username: usernameTrimmed,
        password: passwordTrimmed,
        geminiKey: newGeminiKey.trim()
      };

      currentUsers.push(newUser);
      localStorage.setItem("logos_users", JSON.stringify(currentUsers));

      if (newUser.geminiKey) {
        localStorage.setItem(`logos_custom_gemini_key_${usernameTrimmed}`, newUser.geminiKey);
      }

      setFormSuccess(
        uiLang === "ko"
          ? "새로운 사용자가 성공적으로 추가되었습니다."
          : "Successfully added new user account."
      );

      // Reset form
      setNewUsername("");
      setNewPassword("");
      setNewGeminiKey("");
      setShowAddForm(false);
      loadUsers();
      if (onUserUpdate) onUserUpdate();

    } catch (e) {
      console.error(e);
      setFormError(
        uiLang === "ko"
          ? "사용자 추가 중 오류가 발생했습니다."
          : "An error occurred while adding the user."
      );
    }
  };

  const handleDeleteUser = (usernameToDelete: string) => {
    if (usernameToDelete === "logos_admin") {
      alert(
        uiLang === "ko"
          ? "관리자 계정(logos_admin)은 삭제할 수 없습니다."
          : "The primary admin account (logos_admin) cannot be deleted."
      );
      return;
    }

    const confirmMsg = uiLang === "ko"
      ? `계정 '${usernameToDelete}'을 정말로 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며, 해당 계정의 모든 정보가 영구히 소멸됩니다.`
      : `Are you sure you want to delete the user account '${usernameToDelete}'?\nThis action is irreversible and will purge all account details permanently.`;

    if (confirm(confirmMsg)) {
      try {
        const stored = localStorage.getItem("logos_users");
        if (stored) {
          const currentUsers = JSON.parse(stored);
          const filtered = currentUsers.filter((u: any) => u.username !== usernameToDelete);
          localStorage.setItem("logos_users", JSON.stringify(filtered));
          
          // Clear associated API key
          localStorage.removeItem(`logos_custom_gemini_key_${usernameToDelete}`);
          
          // If deleted user is currently cached on server side or has active session, logout event will trigger.
          loadUsers();
          if (onUserUpdate) onUserUpdate();
          
          // Dispatch global sync event
          window.dispatchEvent(new Event("logos_keys_updated"));
        }
      } catch (e) {
        console.error("Failed to delete user:", e);
      }
    }
  };

  const startEdit = (user: UserAccount) => {
    setEditingUser(user.username);
    setEditPassword(user.password || "");
    setEditGeminiKey(user.geminiKey || "");
  };

  const saveEdit = (username: string) => {
    const trimmedPass = editPassword.trim();
    if (!trimmedPass) {
      alert(uiLang === "ko" ? "비밀번호는 비워둘 수 없습니다." : "Password cannot be empty.");
      return;
    }
    if (trimmedPass.length < 4) {
      alert(uiLang === "ko" ? "비밀번호는 최소 4자 이상이어야 합니다." : "Password must be at least 4 characters.");
      return;
    }

    try {
      const stored = localStorage.getItem("logos_users");
      if (stored) {
        const currentUsers = JSON.parse(stored);
        const updated = currentUsers.map((u: any) => {
          if (u.username === username) {
            return {
              ...u,
              password: trimmedPass,
              geminiKey: editGeminiKey.trim()
            };
          }
          return u;
        });

        localStorage.setItem("logos_users", JSON.stringify(updated));
        
        // Update user key storage
        if (editGeminiKey.trim()) {
          localStorage.setItem(`logos_custom_gemini_key_${username}`, editGeminiKey.trim());
        } else {
          localStorage.removeItem(`logos_custom_gemini_key_${username}`);
        }

        // Handle case where we edited our own keys
        if (username === localStorage.getItem("logos_current_user")) {
          localStorage.setItem("logos_custom_gemini_key", editGeminiKey.trim());
        }

        // Notify server and sync
        const currentUserId = localStorage.getItem("logos_client_id") || "";
        if (currentUserId && username === localStorage.getItem("logos_current_user")) {
          fetch("/api/register-key", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ geminiApiKey: editGeminiKey.trim(), clientId: currentUserId })
          }).catch(err => console.error("Failed to register key during admin edit:", err));
        }

        setEditingUser(null);
        loadUsers();
        if (onUserUpdate) onUserUpdate();
        
        // Dispatch key sync
        window.dispatchEvent(new Event("logos_keys_updated"));
      }
    } catch (e) {
      console.error("Failed to save edited user:", e);
    }
  };

  const toggleShowPassword = (username: string) => {
    setShowPwdMap(prev => ({
      ...prev,
      [username]: !prev[username]
    }));
  };

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm space-y-6">
      
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-stone-900 text-stone-100 flex items-center justify-center rounded-xl shadow-xs">
            <Shield className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-black text-stone-900 text-base">
                {uiLang === "ko" ? "사용자 계정 관리 시스템" : "User Accounts Administration"}
              </h3>
              <span className="bg-stone-100 text-stone-800 border border-stone-200 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Admin Mode
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {uiLang === "ko" 
                ? "로그인 계정을 생성/삭제하고 개인별 구글 Gemini API Key 및 비밀번호를 직접 관리합니다."
                : "Manage credentials, secure keys, and accounts authorization settings."}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setFormError(null);
            setFormSuccess(null);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
            showAddForm
              ? "bg-stone-100 text-stone-700 border-stone-300"
              : "bg-stone-900 hover:bg-stone-950 text-stone-100 border-transparent"
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{showAddForm ? (uiLang === "ko" ? "창 닫기" : "Close Form") : (uiLang === "ko" ? "계정 추가" : "Add Account")}</span>
        </button>
      </div>

      {/* Add User Form Section */}
      {showAddForm && (
        <form onSubmit={handleAddUser} className="bg-stone-50 border border-stone-200/80 rounded-xl p-4 space-y-4 animate-fadeIn">
          <h4 className="font-serif font-bold text-stone-800 text-xs flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-stone-600" />
            <span>{uiLang === "ko" ? "새로운 사용자 계정 개설" : "Open New User Account"}</span>
          </h4>

          {formError && (
            <div className="bg-red-50 border border-red-100 text-red-800 text-xs p-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs p-3 rounded-lg">
              {formSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-600 block uppercase tracking-wider">
                {uiLang === "ko" ? "사용자 아이디 (영문)" : "Username"}
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder={uiLang === "ko" ? "예: scholar7" : "e.g., scholar7"}
                className="w-full p-2 bg-white border border-stone-250 rounded-lg text-xs font-mono focus:outline-none focus:border-stone-500 text-stone-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-600 block uppercase tracking-wider">
                {uiLang === "ko" ? "비밀번호 (최소 4자)" : "Password (Min 4 chars)"}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={uiLang === "ko" ? "비밀번호 입력..." : "Enter password..."}
                className="w-full p-2 bg-white border border-stone-250 rounded-lg text-xs font-mono focus:outline-none focus:border-stone-500 text-stone-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-stone-600 block uppercase tracking-wider">
                {uiLang === "ko" ? "개인 Gemini API Key (선택)" : "Personal Gemini API Key (Optional)"}
              </label>
              <input
                type="password"
                value={newGeminiKey}
                onChange={(e) => setNewGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full p-2 bg-white border border-stone-250 rounded-lg text-xs font-mono focus:outline-none focus:border-stone-500 text-stone-800"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-2 bg-stone-900 hover:bg-stone-950 text-stone-100 font-bold text-xs rounded-lg transition-colors cursor-pointer"
            >
              {uiLang === "ko" ? "계정 개설 완료" : "Complete Registration"}
            </button>
          </div>
        </form>
      )}

      {/* Users List Table */}
      <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50/50">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-stone-600">
            <thead>
              <tr className="bg-stone-100 border-b border-stone-200 font-serif font-bold text-stone-800">
                <th className="px-4 py-3 text-center w-12">#</th>
                <th className="px-4 py-3">{uiLang === "ko" ? "사용자 아이디" : "Username"}</th>
                <th className="px-4 py-3">{uiLang === "ko" ? "로그인 비밀번호" : "Password"}</th>
                <th className="px-4 py-3">{uiLang === "ko" ? "등록된 개인 API Key" : "Registered Gemini API Key"}</th>
                <th className="px-4 py-3 text-right pr-6 w-36">{uiLang === "ko" ? "관리 항목" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-white">
              {users.map((user, idx) => {
                const isEditing = editingUser === user.username;
                const isSelf = user.username === currentAdmin;
                const showPwd = !!showPwdMap[user.username];

                return (
                  <tr key={user.username} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-4 py-3 text-center font-mono text-stone-400 font-semibold">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 font-serif">{user.username}</span>
                        {isSelf && (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[8.5px] px-1.5 py-0.5 rounded font-bold font-sans">
                            {uiLang === "ko" ? "본인" : "You"}
                          </span>
                        )}
                        {user.username === "logos_admin" && (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[8.5px] px-1.5 py-0.5 rounded font-serif font-bold uppercase">
                            Admin
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {/* Password Field */}
                    <td className="px-4 py-3 font-mono">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="w-full max-w-xs p-1.5 bg-stone-50 border border-stone-250 rounded-md text-xs focus:outline-none focus:border-stone-500 focus:bg-white font-mono"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{showPwd ? (user.password || "••••") : "••••••••"}</span>
                          <button
                            onClick={() => toggleShowPassword(user.username)}
                            className="text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                          >
                            {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Gemini API Key Field */}
                    <td className="px-4 py-3 font-mono">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editGeminiKey}
                          onChange={(e) => setEditGeminiKey(e.target.value)}
                          placeholder="API Key 입력 안 됨"
                          className="w-full p-1.5 bg-stone-50 border border-stone-250 rounded-md text-xs focus:outline-none focus:border-stone-500 focus:bg-white font-mono"
                        />
                      ) : user.geminiKey ? (
                        <span className="text-emerald-700 bg-emerald-50/70 border border-emerald-200 px-2 py-0.5 rounded text-[11px] flex items-center gap-1.5 max-w-max">
                          <Key className="w-3 h-3 text-emerald-600" />
                          <span>
                            {user.geminiKey.substring(0, 6)}...{user.geminiKey.substring(user.geminiKey.length - 4)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-stone-400 italic text-[11px] flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-stone-300" />
                          {uiLang === "ko" ? "미등록 (서비스 작동 불가)" : "Unregistered (Gated)"}
                        </span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="px-4 py-3 text-right pr-6">
                      {isEditing ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => saveEdit(user.username)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                            title={uiLang === "ko" ? "저장" : "Save"}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{uiLang === "ko" ? "저장" : "Save"}</span>
                          </button>
                          <button
                            onClick={() => setEditingUser(null)}
                            className="p-1.5 bg-stone-100 hover:bg-stone-250 text-stone-600 rounded-md transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold border border-stone-200"
                            title={uiLang === "ko" ? "취소" : "Cancel"}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{uiLang === "ko" ? "취소" : "Cancel"}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => startEdit(user)}
                            className="p-1.5 bg-stone-50 hover:bg-stone-200 text-stone-700 rounded-md transition-colors border border-stone-250 cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                            title={uiLang === "ko" ? "비밀번호 및 API 키 편집" : "Edit Credentials"}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>{uiLang === "ko" ? "수정" : "Edit"}</span>
                          </button>
                          
                          {/* Disable delete for logos_admin */}
                          {user.username !== "logos_admin" ? (
                            <button
                              onClick={() => handleDeleteUser(user.username)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-colors border border-red-150 cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                              title={uiLang === "ko" ? "계정 영구 삭제" : "Purge Account"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{uiLang === "ko" ? "삭제" : "Delete"}</span>
                            </button>
                          ) : (
                            <span className="w-[49px] inline-block"></span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
