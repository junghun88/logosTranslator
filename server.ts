import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Safe atob polyfill/interceptor to prevent "The string did not match the expected pattern" DOMException on Node.js side
const originalAtob = global.atob;
global.atob = function safeAtob(str: string): string {
  if (typeof str !== "string") return "";
  try {
    // Strip out non-base64 characters and ensure correct padding
    let cleaned = str.replace(/[^A-Za-z0-9+/=]/g, "");
    const paddingNeeded = (4 - (cleaned.length % 4)) % 4;
    if (paddingNeeded > 0) {
      cleaned = cleaned.padEnd(cleaned.length + paddingNeeded, "=");
    }
    return originalAtob(cleaned);
  } catch (e) {
    console.warn("[Safe Atob] Falling back to standard Buffer decoding due to invalid base64 input:", e);
    try {
      return Buffer.from(str, "base64").toString("binary");
    } catch (bufferErr) {
      console.error("[Safe Atob] Both atob and Buffer.from failed to decode:", bufferErr);
      return "";
    }
  }
};

// Safe btoa polyfill/interceptor
const originalBtoa = global.btoa;
global.btoa = function safeBtoa(str: string): string {
  if (typeof str !== "string") return "";
  try {
    return originalBtoa(str);
  } catch (e) {
    console.warn("[Safe Btoa] Falling back to standard Buffer encoding:", e);
    try {
      return Buffer.from(str, "binary").toString("base64");
    } catch (err) {
      return "";
    }
  }
};

// Shared helper function to wrap promises in a timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

// Retrying wrapper for generateContent to handle transient Gemini API issues (e.g., 503 high demand or overloaded)
async function generateContentWithRetry(
  ai: GoogleGenAI,
  options: {
    model: string;
    contents: any;
    config: any;
  },
  timeoutMs: number = 60000,
  timeoutMessage: string = "구글 Gemini API 요청 시간 초과"
): Promise<any> {
  const maxRetries = 2;
  let delay = 1000; // 1 second base delay

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await withTimeout(
        ai.models.generateContent(options),
        timeoutMs,
        timeoutMessage
      );
    } catch (error: any) {
      const errStr = String(error?.message || error || "");
      const errStatus = error?.status;
      
      const isTransient = 
        errStr.includes("503") || 
        errStr.includes("high demand") || 
        errStr.includes("UNAVAILABLE") || 
        errStr.includes("overloaded") ||
        errStr.includes("temporary") ||
        errStatus === 503 ||
        errStatus === "UNAVAILABLE";

      if (isTransient && attempt <= maxRetries) {
        console.warn(`[Translate API] Attempt ${attempt} failed with transient error: ${errStr}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 1.5; // Backoff
      } else {
        throw error;
      }
    }
  }
}

function escapeHtml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Robust, case-insensitive, and cleaned environment variable fetcher to prevent user configuration errors
function getCleanEnv(keyName: string): string | undefined {
  const upperKey = keyName.toUpperCase();
  const lowerKey = keyName.toLowerCase();
  
  let val = process.env[keyName] || process.env[upperKey] || process.env[lowerKey];
  
  if (!val) {
    const foundKey = Object.keys(process.env).find(k => k.toUpperCase() === upperKey);
    if (foundKey) {
      val = process.env[foundKey];
    }
  }
  
  if (typeof val === "string") {
    val = val.trim();
    // Strip enclosing quotes if present (e.g. "key" or 'key')
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1).trim();
    }
    return val;
  }
  
  return undefined;
}

// Token Limit Store (In-Memory)
// Tracks token usage per client-id or IP per day (YYYY-MM-DD)
interface TokenUsage {
  date: string;
  tokens: number;
}
const tokenStore: Record<string, TokenUsage> = {};

function getTodayString(): string {
  const d = new Date();
  // Adjust to KST (UTC+9) for South Korean users
  const kstOffset = 9 * 60; // KST is UTC+9
  const localTime = d.getTime();
  const kstTime = localTime + (kstOffset + d.getTimezoneOffset()) * 60 * 1000;
  const kstDate = new Date(kstTime);
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  const date = String(kstDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

// Check if usage limit is reached (returns true if allowed, false if blocked)
function checkTokenLimit(
  clientId: string | undefined,
  ip: string,
  estimatedTokens: number,
  hasCustomKey: boolean
): { allowed: boolean; currentUsage: number; limit: number; error?: string } {
  const LIMIT = 5000;
  if (hasCustomKey) {
    return { allowed: true, currentUsage: 0, limit: LIMIT };
  }

  const key = (clientId && clientId.trim()) || ip || "unknown";
  const today = getTodayString();
  const record = tokenStore[key];

  let currentUsage = 0;
  if (record && record.date === today) {
    currentUsage = record.tokens;
  } else {
    tokenStore[key] = { date: today, tokens: 0 };
  }

  if (currentUsage >= LIMIT) {
    return {
      allowed: false,
      currentUsage,
      limit: LIMIT,
      error: `오늘 무료 제공량(5,000 토큰)을 모두 소진하셨습니다. (현재 사용량: ${currentUsage.toLocaleString()} / 5,000 토큰). 계속 사용하시려면 우측 상단의 '⚙️ 개인 API 키 설정' 창에서 본인의 Gemini API 키를 등록하여 무료 과금 한도를 해제해 주세요.`
    };
  }

  return { allowed: true, currentUsage, limit: LIMIT };
}

// Commits the tokens used by a request
function commitTokens(clientId: string | undefined, ip: string, actualTokens: number) {
  const key = (clientId && clientId.trim()) || ip || "unknown";
  const today = getTodayString();
  const record = tokenStore[key];

  if (record && record.date === today) {
    record.tokens += actualTokens;
  } else {
    tokenStore[key] = { date: today, tokens: actualTokens };
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  function getDeepLLangCode(lang: string): string | null {
    const l = lang.toLowerCase();
    if (l.includes("korean") || l.includes("ko")) return "KO";
    if (l.includes("japanese") || l.includes("ja")) return "JA";
    if (l.includes("chinese simplified")) return "ZH";
    if (l.includes("chinese traditional")) return "ZH";
    if (l.includes("chinese") || l.includes("zh")) return "ZH";
    if (l.includes("spanish") || l.includes("es")) return "ES";
    if (l.includes("german") || l.includes("de")) return "DE";
    if (l.includes("french") || l.includes("fr")) return "FR";
    if (l.includes("portuguese") || l.includes("pt")) return "PT";
    if (l.includes("english") || l.includes("en")) return "EN";
    return null;
  }

  // Shared helper function to do the translation and analysis
  async function translateAndAnalyzeCore(
    text: string, 
    mode: string = "balanced", 
    targetLang: string = "Korean",
    customGeminiKey?: string,
    customDeeplKey?: string
  ) {
    console.log(`[Translate API] Received request. Text length: ${text.length}, Mode: ${mode}, Target Language: ${targetLang}`);
    
    const apiKey = (customGeminiKey && customGeminiKey.trim()) || getCleanEnv("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("[Translate API] Error: GEMINI_API_KEY is not configured.");
      throw new Error("GEMINI_API_KEY가 설정되지 않았습니다. 서비스 관리자의 GEMINI_API_KEY가 등록되어 있지 않거나 사용자의 개인 API Key가 입력되지 않았습니다. 앱 설정이나 우측 상단 Secrets 메뉴에서 등록해 주세요.");
    }

    // Check and invoke DeepL if key is configured (support both DEEPL_API_KEY and DEEP_API_KEY)
    let deeplTranslation: string | null = null;
    let deeplError: string | null = null;
    const deeplKey = (customDeeplKey && customDeeplKey.trim()) || getCleanEnv("DEEPL_API_KEY") || getCleanEnv("DEEP_API_KEY");
    const deeplLangCode = getDeepLLangCode(targetLang);

    if (deeplKey && deeplLangCode) {
      console.log(`[Translate API] Found DeepL API Key. Initializing DeepL request for ${targetLang} (${deeplLangCode})...`);
      try {
        const isFree = deeplKey.endsWith(":fx");
        const deeplUrl = isFree 
          ? "https://api-free.deepl.com/v2/translate" 
          : "https://api.deepl.com/v2/translate";

        console.log(`[Translate API] Querying DeepL API via: ${deeplUrl}`);
        
        // Add a 5-second timeout to prevent requests from hanging indefinitely
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.warn("[Translate API] DeepL request timed out after 5 seconds. Aborting.");
          controller.abort();
        }, 5000);

        const deeplRes = await fetch(deeplUrl, {
          method: "POST",
          headers: {
            "Authorization": `DeepL-Auth-Key ${deeplKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: [text],
            target_lang: deeplLangCode
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (deeplRes.ok) {
          const deeplData = await deeplRes.json() as { translations: { text: string }[] };
          if (deeplData?.translations?.[0]?.text) {
            deeplTranslation = deeplData.translations[0].text;
            console.log("[Translate API] DeepL translation completed successfully.");
          } else {
            console.warn("[Translate API] DeepL responded successfully but translation field was empty.");
          }
        } else {
          const errText = await deeplRes.text();
          console.error(`[Translate API] DeepL API responded with status ${deeplRes.status}: ${errText}`);
          deeplError = `DeepL API Error (Status ${deeplRes.status})`;
        }
      } catch (err: any) {
        console.error("[Translate API] Failed to connect to DeepL API or request timed out:", err);
        deeplError = err?.message || "DeepL Connection Error/Timeout";
      }
    } else {
      console.log("[Translate API] No DeepL API Key configured. Skipping DeepL translation step.");
    }

    console.log("[Translate API] Initializing GoogleGenAI client...");
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Formulate custom system instructions based on study mode
    let systemInstruction = `You are an expert biblical translator, theologian, and biblical languages scholar (Greek and Hebrew). 
Your task is to translate theological, biblical, or commentary text from English to ${targetLang}.
Analyze the source text carefully to provide the most contextually accurate and elegant translation into ${targetLang}.
For biblical verses or theological commentary, maintain standard Christian terminology in ${targetLang} unless the literary context suggests a broader translation.
Provide deep, high-fidelity theological analysis and explain key terms, including their Greek/Hebrew roots, transliterations, and specific nuances in this passage.
All explanations, insights, and meanings MUST be written in the selected target language (${targetLang}) to serve a reader who understands ${targetLang}.

CRITICAL JSON PROPERTY CONSTRAINT: Even though the response JSON schema specifies property names like 'koreanMeaning', 'korean', and 'koreanText', you MUST write their values in the requested target language (${targetLang}) instead of Korean! Do NOT change the JSON key names, only translate the values inside them.`;

    if (mode === "scholarly") {
      systemInstruction += `\nFocus on high-level scholarly parsing, original languages (Greek/Hebrew word studies), and academic theological insights, written entirely in ${targetLang}.`;
    } else if (mode === "devotional") {
      systemInstruction += `\nFocus on warm, pastoral, devotional application, clear and accessible ${targetLang} translation, and practical spiritual insights, written entirely in ${targetLang}.`;
    } else {
      systemInstruction += `\nFocus on a balanced, precise literary translation and clear structural side-by-side parsing, written entirely in ${targetLang}.`;
    }

    let prompt = `Please translate and analyze the following text:
"${text}"`;

    if (deeplTranslation) {
      prompt += `\n\nNote: A precise, literal translation from the DeepL API is provided below for your reference. You should use it to inform your theological translation, compare styles, and align the sentence-by-sentence analysis structure:
"${deeplTranslation}"`;
    }

    console.log("[Translate API] Invoking Gemini API generateContent...");
    let response;
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        originalText: { type: Type.STRING },
        translation: { type: Type.STRING },
        theologicalInsights: { type: Type.STRING, description: `Deep theological commentary, historical context, and explanation of this passage in ${targetLang}` },
        words: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: "The English word or phrase being analyzed" },
              originalLanguage: { type: Type.STRING, description: "Greek or Hebrew term if applicable (e.g. 'ἀγάπη' or 'חֶסֶ드'), otherwise empty" },
              transliteration: { type: Type.STRING, description: "Transliteration of the root word (e.g. 'agape' or 'chesed')" },
              koreanMeaning: { type: Type.STRING, description: `The meaning of the word/phrase translated into ${targetLang}` },
              explanation: { type: Type.STRING, description: `Grammatical nuance, dictionary meaning, or context-specific nuance in this passage in ${targetLang}` }
            },
            required: ["word", "koreanMeaning"]
          },
          description: "List of key theological, biblical, or grammatical terms to study"
        },
        sentences: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              english: { type: Type.STRING, description: "The English sentence or distinct phrase" },
              korean: { type: Type.STRING, description: `The translated sentence or distinct phrase in ${targetLang}` }
            },
            required: ["english", "korean"]
          },
          description: "Sentence-by-sentence side-by-side comparison for easy reading and grammar matching"
        },
        crossReferences: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              citation: { type: Type.STRING, description: "Bible verse citation (e.g., Romans 5:8)" },
              englishText: { type: Type.STRING, description: "English text of the cross-reference" },
              koreanText: { type: Type.STRING, description: `Translated text or official translation of the cross-reference in ${targetLang}` }
            },
            required: ["citation", "koreanText"]
          },
          description: `2-3 highly relevant biblical cross-references that support the theological themes of the text, with text translated into ${targetLang}`
        }
      },
      required: ["originalText", "translation", "theologicalInsights", "words", "sentences"]
    };

    try {
      console.log("[Translate API] Trying primary model: gemini-3.5-flash...");
      response = await generateContentWithRetry(
        ai,
        {
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema
          }
        },
        60000, // 60-second timeout
        "구글 Gemini API 요청 시간 초과 (60초). 번역 및 분석 내용이 길거나 현재 구글 서버 트래픽이 일시적으로 매우 높은 상태입니다. 다시 한 번 번역 단축키를 누르거나 잠시 후 '다시 시도하기'를 클릭해 주세요."
      );
    } catch (primaryErr: any) {
      console.warn("[Translate API] Primary model (gemini-3.5-flash) failed, returned 503, or timed out. Attempting failover to gemini-2.5-flash...", primaryErr?.message || primaryErr);
      
      try {
        response = await generateContentWithRetry(
          ai,
          {
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              systemInstruction,
              responseMimeType: "application/json",
              responseSchema
            }
          },
          60000, // 60-second timeout
          "복구용 Gemini API 요청 시간 초과 (60초). 현재 인공지능 서버 트래픽이 극도로 많거나 원문 본문의 분석량이 매우 많습니다. 잠시만 대기 후 다시 시도해 주세요."
        );
        console.log("[Translate API] Failover to gemini-2.5-flash succeeded.");
      } catch (fallbackErr: any) {
        console.error("[Translate API] Fallback model (gemini-2.5-flash) also failed:", fallbackErr?.message || fallbackErr);
        throw fallbackErr;
      }
    }

    const responseText = response.text;
    if (!responseText) {
      console.error("[Translate API] Error: Gemini API returned an empty response.");
      throw new Error("Empty response from Gemini");
    }

    console.log("[Translate API] Received response from Gemini. Parsing JSON...");
    
    // Defensive Markdown Code Blocks cleanup
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```")) {
      console.log("[Translate API] Cleaning markdown wrapper from response text...");
      cleanedText = cleanedText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(cleanedText);
    } catch (jsonErr) {
      console.warn("[Translate API] JSON parsing failed initially, attempting robust JSON extraction...", jsonErr);
      
      // Attempt to extract JSON from any block (in case the model didn't perfectly trim backticks)
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[0]);
          console.log("[Translate API] Successfully extracted and parsed JSON using regex fallback.");
        } catch (innerErr) {
          try {
            // Escape invalid control characters often found in raw text output
            const repaired = jsonMatch[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => {
              switch (c) {
                case '\n': return '\\n';
                case '\r': return '\\r';
                case '\t': return '\\t';
                default: return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
              }
            });
            parsedResponse = JSON.parse(repaired);
            console.log("[Translate API] Successfully parsed JSON after control character escaping.");
          } catch (repairErr) {
            console.error("[Translate API] Robust parsing fallback failed:", repairErr);
            throw new Error("신학 분석 데이터를 분석 가능한 JSON 데이터로 변환하지 못했습니다. 다시 한 번 요청해 주세요.");
          }
        }
      } else {
        throw new Error("인공지능 응답에서 구조화된 신학 데이터 블록을 찾지 못했습니다.");
      }
    }
    
    console.log("[Translate API] JSON parsed successfully.");
    
    // Inject DeepL status and translation into response so client can display it
    parsedResponse.deeplTranslation = deeplTranslation;
    parsedResponse.deeplUsed = !!deeplTranslation;
    parsedResponse.deeplError = deeplError;

    // Inject token usage metadata
    const actualTokens = response?.usageMetadata?.totalTokenCount || response?.usageMetadata?.total_token_count || Math.ceil(text.length * 1.5 + 1500);
    parsedResponse.tokenCount = actualTokens;

    return parsedResponse;
  }

  // API route for translation and theological analysis (JSON Response)
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, mode, targetLang, geminiApiKey, deeplApiKey, clientId } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required" });
      }

      const customGeminiKey = geminiApiKey || (req.headers["x-gemini-api-key"] as string);
      const customDeeplKey = deeplApiKey || (req.headers["x-deepl-api-key"] as string);

      const hasCustomKey = !!(customGeminiKey && customGeminiKey.trim());
      const estimatedTokens = Math.ceil(text.length * 1.5 + 1500);

      const limitCheck = checkTokenLimit(clientId, req.ip || "", estimatedTokens, hasCustomKey);
      if (!limitCheck.allowed) {
        return res.status(403).json({ error: limitCheck.error, limitExceeded: true });
      }

      const result = await translateAndAnalyzeCore(text, mode, targetLang || "Korean", customGeminiKey, customDeeplKey);
      
      const actualTokens = result.tokenCount || estimatedTokens;
      commitTokens(clientId, req.ip || "", actualTokens);

      const finalKey = clientId || req.ip || "unknown";
      const finalDailyTotal = tokenStore[finalKey]?.tokens || 0;

      result.tokenUsage = {
        used: actualTokens,
        dailyTotal: finalDailyTotal,
        limit: 5000,
        hasCustomKey
      };

      res.json(result);
    } catch (error: any) {
      console.error("Translation API Error:", error);
      
      let errMsg = "번역에 실패하였습니다.";
      if (error) {
        if (typeof error === "string") {
          errMsg = error;
        } else if (error.message) {
          errMsg = error.message;
        }
        
        // Handle Google GenAI SDK nested error details if present
        if (error.error && typeof error.error === "object") {
          if (error.error.message) {
            errMsg = error.error.message;
          }
        }
        
        // Handle potential stringified JSON errors
        if (typeof errMsg === "string" && errMsg.trim().startsWith("{")) {
          try {
            const parsed = JSON.parse(errMsg);
            if (parsed?.error?.message) {
              errMsg = parsed.error.message;
            } else if (parsed?.message) {
              errMsg = parsed.message;
            }
          } catch (e) {
            // Ignore
          }
        }
      }
      
      // Let's translate some common API error terms to clean Korean for the user
      if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID")) {
        errMsg = "등록된 GEMINI_API_KEY가 올바르지 않습니다. 정확한 구글 API 키 값을 다시 한 번 입력해 주세요.";
      } else if (errMsg.includes("quota exceeded") || errMsg.includes("Quota exceeded") || errMsg.includes("429")) {
        errMsg = "구글 Gemini API 할당량(Quota)을 초과하였습니다. 잠시만 대기 후 다시 시도해 주세요.";
      } else if (errMsg.includes("503") || errMsg.includes("Service Unavailable")) {
        errMsg = "구글 Gemini 서버가 일시적으로 중단되었거나 응답하지 않습니다. 잠시 후 다시 시도해 주세요.";
      } else if (errMsg.includes("timeout") || errMsg.includes("time out")) {
        errMsg = "요청 시간 초과(Timeout): 서버 응답 지연으로 취소되었습니다. 잠시 후 '다시 시도하기'를 눌러주세요.";
      }
      
      res.status(500).json({ error: errMsg });
    }
  });

  // Dedicated API route that returns a beautifully pre-formatted Plain Text
  // perfect for macOS Shortcuts Quick Look / Popup without leaving Logos!
  const handleTranslateToText = async (req: express.Request, res: express.Response) => {
    const isHtml = req.query.html === "true" || req.body.html === "true";
    try {
      const text = (req.body.text || req.query.text) as string;
      const mode = (req.body.mode || req.query.mode || "balanced") as string;
      const targetLang = (req.body.targetLang || req.query.targetLang || req.body.target_lang || req.query.target_lang || "Korean") as string;

      const customGeminiKey = (req.body.geminiApiKey || req.query.geminiApiKey || req.body.gemini_key || req.query.gemini_key || req.headers["x-gemini-api-key"]) as string | undefined;
      const customDeeplKey = (req.body.deeplApiKey || req.query.deeplApiKey || req.body.deepl_key || req.query.deepl_key || req.headers["x-deepl-api-key"]) as string | undefined;
      const clientId = (req.body.clientId || req.query.clientId || req.body.client_id || req.query.client_id) as string | undefined;

      const estimatedTokens = Math.ceil(text ? text.length * 1.5 + 300 : 0);
      const hasCustomKey = !!(customGeminiKey && customGeminiKey.trim());

      if (text && text.trim()) {
        const limitCheck = checkTokenLimit(clientId, req.ip || "", estimatedTokens, hasCustomKey);
        if (!limitCheck.allowed) {
          if (isHtml) {
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            const limitExceededHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>무료 이용 한도 초과 - Logos 번역 동반자</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f5f5f4;
      color: #1c1917;
      margin: 0;
      padding: 16px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .card {
      background-color: #ffffff;
      border: 1px solid #fca5a5;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      width: 100%;
      max-width: 520px;
      padding: 24px;
      box-sizing: border-box;
    }
    .title {
      font-size: 15px;
      font-weight: 700;
      color: #dc2626;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 16px;
      border-bottom: 1px solid #fca5a5;
      padding-bottom: 12px;
    }
    .desc {
      font-size: 13px;
      color: #44403c;
      margin-bottom: 16px;
      line-height: 1.6;
    }
    .btn {
      width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      background-color: #1c1917;
      color: #ffffff;
      transition: all 0.2s;
    }
    .btn:hover {
      background-color: #44403c;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="title">⚠️ [이용 한도 초과] 하루 무료 한도에 도달했습니다</div>
    <div class="desc">
      오늘 하루 무료 제공량(5,000 토큰)을 모두 소진하셨습니다.<br><br>
      계속해서 단축어와 신학 번역 서비스를 중단 없이 사용하시려면, 웹 브라우저에서 서비스에 접속한 후 <strong>오른쪽 상단 '⚙️ 개인 API 키 설정'</strong>에서 본인의 Google Gemini API 키를 등록해 주세요. 등록 시 무료 과금 제한이 완전히 해제됩니다.
    </div>
    <button class="btn" onclick="window.close()">닫기</button>
  </div>
</body>
</html>`;
            return res.status(403).send(limitExceededHtml);
          } else {
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            let lines: string[] = [];
            lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            lines.push("⚠️ [이용 한도 초과] 하루 무료 한도 도달");
            lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            lines.push("");
            lines.push("오늘 제공되는 무료 사용량(5,000 토큰)을 초과했습니다.");
            lines.push("");
            lines.push("계속 사용하시려면 본인의 Gemini API 키를 등록해야 합니다.");
            lines.push("");
            lines.push("💡 조치 방법:");
            lines.push("1. 브라우저로 Logos 번역 동반자에 접속합니다.");
            lines.push("2. 우측 상단 '개인 API 키 설정' 버튼을 누릅니다.");
            lines.push("3. 본인의 Google Gemini API 키를 입력해 주세요.");
            lines.push("");
            lines.push("※ 키를 등록하면 단축키 링크에도 자동으로 안전하게 탑재되어");
            lines.push("   macOS Shortcuts에서 이전과 똑같이 중단 없이 작동합니다!");
            lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            return res.status(403).send(lines.join("\n"));
          }
        }
      }

      if (!text || typeof text !== "string" || !text.trim()) {
        if (isHtml) {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          const noTextInputHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>원문 없음 - Logos 번역 동반자</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f5f5f4;
      color: #1c1917;
      margin: 0;
      padding: 16px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .card {
      background-color: #ffffff;
      border: 1px solid #e7e5e4;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      width: 100%;
      max-width: 520px;
      padding: 24px;
      box-sizing: border-box;
    }
    .title {
      font-size: 15px;
      font-weight: 700;
      color: #b45309;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 16px;
      border-bottom: 1px solid #e7e5e4;
      padding-bottom: 12px;
    }
    .info-list {
      font-size: 13px;
      line-height: 1.6;
      color: #44403c;
      padding-left: 0;
      list-style-type: none;
    }
    .info-list li {
      margin-bottom: 12px;
      padding-left: 14px;
      position: relative;
    }
    .info-list li::before {
      content: "•";
      position: absolute;
      left: 0;
      color: #d97706;
      font-weight: bold;
    }
    .btn {
      width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      background-color: #1c1917;
      color: #ffffff;
      transition: all 0.2s;
      margin-top: 12px;
    }
    .btn:hover {
      background-color: #44403c;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="title">⚠️ [입력 원문 없음] Logos 번역 동반자</div>
    <div style="font-size: 13px; color: #57534e; margin-bottom: 12px; line-height: 1.5;">
      번역 및 주해할 성경 원문이 전달되지 않았습니다.
    </div>
    <ul class="info-list">
      <li><strong>[추천] 복사(Cmd + C) 후 단축키 실행:</strong> 로고스(Logos) 성경 앱은 자체 엔진 특성상 마우스 블록 지정 텍스트를 macOS 빠른 동작 서비스로 가끔 전달하지 못합니다. 번역할 본문을 드래그한 뒤 Cmd + C로 한 번 복사하시고 단축키를 누르시면 100% 정상 작동합니다.</li>
      <li><strong>단축어 '클립보드' 설정 적용:</strong> 맥북 '단축어' 앱에서 해당 단축어의 최상단 입력 조건 중 「선택사항이 없는 경우」 항목의 기본값을 <strong>[클립보드]</strong> (또는 '클립보드 콘텐츠')로 변경해 주시면 마우스 드래그와 복사를 자동 인식해 완벽히 호환됩니다.</li>
    </ul>
    <button class="btn" onclick="window.close()">닫기</button>
  </div>
</body>
</html>`;
          return res.status(200).send(noTextInputHtml);
        }

        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        let lines: string[] = [];
        lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        lines.push("⚠️ [입력 원문 없음] Logos 번역 동반자");
        lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        lines.push("");
        lines.push("번역 및 주해할 성경 원문이 전달되지 않았습니다.");
        lines.push("");
        lines.push("💡 원인 및 빠른 해결 방법:");
        lines.push("");
        lines.push("1. [추천] 복사(Cmd + C) 후 단축키 실행");
        lines.push("   로고스(Logos) 성경 앱은 자체 엔진 특성상 마우스 블록 지정");
        lines.push("   텍스트를 macOS 빠른 동작 서비스로 가끔 전달하지 못합니다.");
        lines.push("   번역할 본문을 마우스로 드래그한 뒤 Cmd + C로 한 번 복사하시고");
        lines.push("   단축키를 누르시면 100% 정상적으로 번역 결과가 나타납니다.");
        lines.push("");
        lines.push("2. 단축어 '클립보드' 설정 적용");
        lines.push("   맥북 '단축어' 앱에서 해당 단축어의 최상단 입력 조건 중");
        lines.push("   「선택사항이 없는 경우」 항목의 기본값을");
        lines.push("   [클립보드] (또는 '클립보드 콘텐츠')로 선택해 주시면 마우스 드래그와");
        lines.push("   복사(Cmd+C)를 모두 스마트하게 자동 인식하여 가장 완벽하게 작동합니다.");
        lines.push("");
        lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return res.status(200).send(lines.join("\n"));
      }

      // 1. Try to fetch DeepL translation if configured for lightning fast simple translation
      let deeplTranslation: string | null = null;
      let usedDeepL = false;
      const deeplKey = (customDeeplKey && customDeeplKey.trim()) || getCleanEnv("DEEPL_API_KEY") || getCleanEnv("DEEP_API_KEY");
      const deeplLangCode = getDeepLLangCode(targetLang);

      if (deeplKey && deeplLangCode) {
        console.log(`[Fast Route] Found DeepL key. Querying DeepL translation for ${targetLang} (${deeplLangCode})...`);
        try {
          const isFree = deeplKey.endsWith(":fx");
          const deeplUrl = isFree 
            ? "https://api-free.deepl.com/v2/translate" 
            : "https://api.deepl.com/v2/translate";

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000); // 4-second timeout for speed

          const deeplRes = await fetch(deeplUrl, {
            method: "POST",
            headers: {
              "Authorization": `DeepL-Auth-Key ${deeplKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              text: [text],
              target_lang: deeplLangCode
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (deeplRes.ok) {
            const deeplData = await deeplRes.json() as { translations: { text: string }[] };
            if (deeplData?.translations?.[0]?.text) {
              deeplTranslation = deeplData.translations[0].text;
              usedDeepL = true;
              console.log("[Fast Route] DeepL translation completed successfully.");
            }
          }
        } catch (deeplErr) {
          console.warn("[Fast Route] DeepL query failed, falling back to simple Gemini...", deeplErr);
        }
      }

      let translationResult = "";
      let engineName = "";

      if (usedDeepL && deeplTranslation) {
        translationResult = deeplTranslation;
        engineName = `DeepL 고정밀 초고속 번역 (${targetLang})`;
      } else {
        // Fallback to simple Gemini translation if DeepL is not available or failed
        console.log(`[Fast Route] DeepL is not available or failed. Using fast Gemini translation into ${targetLang}...`);
        const apiKey = (customGeminiKey && customGeminiKey.trim()) || getCleanEnv("GEMINI_API_KEY");
        if (!apiKey) {
          throw new Error("GEMINI_API_KEY가 설정되지 않았습니다. 서비스 관리자의 GEMINI_API_KEY가 등록되어 있지 않거나 사용자의 개인 API Key가 입력되지 않았습니다. 앱 설정이나 우측 상단 Secrets 메뉴에서 등록해 주세요.");
        }

        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const fastPrompt = `You are an expert biblical translator and Christian literature scholar. 
Translate the following English theological/commentary/biblical text into highly accurate, natural, and elegant ${targetLang}.
Maintain standard Christian terminology in ${targetLang} (e.g., if ${targetLang} is Korean, use '하나님', '예수 그리스도', '은혜' 등).
Do NOT include any introduction, explanations, metadata, markdown backticks, or notes. Return ONLY the translated ${targetLang} text.

Text to translate:
"${text}"`;

        const response = await generateContentWithRetry(
          ai,
          {
            model: "gemini-3.5-flash",
            contents: fastPrompt,
            config: {}
          },
          15000,
          "구글 Gemini API 응답 지연"
        );

        translationResult = response?.text || "";
        engineName = `Gemini 초고속 신학 번역 (${targetLang})`;

        // Capture and commit actual token usage
        const actualTokens = response?.usageMetadata?.totalTokenCount || response?.usageMetadata?.total_token_count || estimatedTokens;
        commitTokens(clientId, req.ip || "", actualTokens);
      }

      if (isHtml) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        const successHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Logos 번역 결과</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f5f5f4;
      color: #1c1917;
      margin: 0;
      padding: 16px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .card {
      background-color: #ffffff;
      border: 1px solid #e7e5e4;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      width: 100%;
      max-width: 520px;
      padding: 24px;
      box-sizing: border-box;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #e7e5e4;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .title {
      font-size: 14px;
      font-weight: 700;
      color: #44403c;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .subtitle {
      font-size: 10px;
      background-color: #f5f5f4;
      color: #78716c;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
    .section-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #78716c;
      margin-top: 16px;
      margin-bottom: 6px;
      font-weight: 600;
    }
    .text-box {
      background-color: #fafaf9;
      border: 1px solid #f5f5f4;
      border-radius: 8px;
      padding: 12px;
      font-size: 13.5px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .original {
      color: #57534e;
      font-style: italic;
    }
    .translation {
      color: #1c1917;
      font-weight: 500;
      border-left: 3px solid #78716c;
      background-color: #f5f5f4;
    }
    .button-group {
      display: flex;
      gap: 8px;
      margin-top: 20px;
    }
    .btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 14px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-primary {
      background-color: #1c1917;
      color: #ffffff;
    }
    .btn-primary:hover {
      background-color: #44403c;
    }
    .btn-secondary {
      background-color: #ffffff;
      color: #44403c;
      border: 1px solid #d6d3d1;
    }
    .btn-secondary:hover {
      background-color: #fafaf9;
    }
    .footer {
      font-size: 11px;
      color: #a8a29e;
      text-align: center;
      margin-top: 16px;
      border-top: 1px dashed #e7e5e4;
      padding-top: 12px;
      line-height: 1.4;
    }
    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background-color: #1c1917;
      color: #ffffff;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 500;
      border-radius: 20px;
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 999;
      pointer-events: none;
    }
    .toast.show {
      transform: translateX(-50%) translateY(0);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="title">
        <span>📖</span> LOGOS TRANSLATION COMPANION
      </div>
      <div class="subtitle">FAST MODE</div>
    </div>

    <div class="section-title">Logos English Original</div>
    <div class="text-box original" id="originalText">${escapeHtml(text)}</div>

    <div class="section-title">${escapeHtml(engineName)}</div>
    <div class="text-box translation" id="translationText">${escapeHtml(translationResult)}</div>

    <div class="button-group">
      <button class="btn btn-primary" onclick="copyTranslation()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        번역 텍스트 복사 (Copy)
      </button>
      <button class="btn btn-secondary" onclick="copyAll()">
        원문+번역 복사
      </button>
      <button class="btn btn-secondary" style="flex: 0.5;" onclick="window.close()">닫기 (Close)</button>
    </div>

    <div class="footer">
      ⚡️ Running in high-speed popup mode via system shortcut.<br>
      For deep tabbed analysis and lexicon entries, use the full Companion browser app.
    </div>
  </div>

  <div id="toast" class="toast">복사 완료!</div>

  <script>
    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2000);
    }

    function copyTranslation() {
      const text = document.getElementById('translationText').innerText;
      navigator.clipboard.writeText(text).then(() => {
        showToast('번역 텍스트가 클립보드에 복사되었습니다!');
      }).catch(err => {
        alert('복사 실패: ' + err);
      });
    }

    function copyAll() {
      const orig = document.getElementById('originalText').innerText;
      const trans = document.getElementById('translationText').innerText;
      const fullText = "[ Logos English Original ]\\n" + orig + "\\n\\n[ ${engineName} ]\\n" + trans;
      navigator.clipboard.writeText(fullText).then(() => {
        showToast('전체 카드가 클립보드에 복사되었습니다!');
      }).catch(err => {
        alert('복사 실패: ' + err);
      });
    }
  </script>
</body>
</html>`;
        return res.status(200).send(successHtml);
      }

      // Construct a highly polished, classical text card design using text characters
      let lines: string[] = [];
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      lines.push("📖 LOGOS TRANSLATION COMPANION (FAST)");
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      lines.push("");
      lines.push("[ Logos English Original ]");
      lines.push(`"${text.trim()}"`);
      lines.push("");
      lines.push(`[ ${engineName} ]`);
      lines.push(translationResult.trim());
      lines.push("");
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      lines.push("⚡️ Running in high-speed popup mode via system shortcut.");
      lines.push("💡 For deep theological commentary, lexicons, and cross-references,");
      lines.push("   visit the interactive Companion browser workspace!");
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // Set content type as plain text with UTF-8 encoding
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.send(lines.join("\n"));
    } catch (error: any) {
      console.error("Text Translation Route Error:", error);
      
      if (isHtml) {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        const errorHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error Occurred</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f5f5f4;
      color: #1c1917;
      margin: 0;
      padding: 16px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .card {
      background-color: #ffffff;
      border: 1px solid #f87171;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      width: 100%;
      max-width: 520px;
      padding: 24px;
      box-sizing: border-box;
    }
    .title {
      font-size: 14px;
      font-weight: 700;
      color: #b91c1c;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 12px;
    }
    .error-box {
      background-color: #fef2f2;
      border: 1px solid #fee2e2;
      border-radius: 8px;
      padding: 16px;
      font-size: 13px;
      line-height: 1.5;
      color: #991b1b;
      margin-bottom: 16px;
      white-space: pre-wrap;
    }
    .btn {
      width: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      background-color: #1c1917;
      color: #ffffff;
      transition: all 0.2s;
    }
    .btn:hover {
      background-color: #44403c;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="title">⚠️ [Theological Translation Error]</div>
    <div class="error-box">${escapeHtml(error?.message || String(error))}</div>
    <button class="btn" onclick="window.close()">Close</button>
  </div>
</body>
</html>`;
        return res.status(200).send(errorHtml);
      }

      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      // Return 200 OK so macOS Shortcuts "Get Contents of URL" always succeeds and can display a friendly formatted error card instead of crashing/hanging
      res.status(200).send(`⚠️ [Theological Translation Error]\n\nTranslation and analysis failed.\n\nDetails: ${error?.message || "Unknown error"}\n\nHelp:\n1. Verify that GEMINI_API_KEY is correctly set in the Settings > Secrets tab.\n2. Google Gemini servers might be temporarily busy. Please try again shortly.`);
    }
  };

  app.post("/api/translate-text", handleTranslateToText);
  app.get("/api/translate-text", handleTranslateToText);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
