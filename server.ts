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

// Request Limit Store (In-Memory)
// Tracks translation count per client-id or IP per day (YYYY-MM-DD)
interface RequestUsage {
  date: string;
  count: number;
}
const requestStore: Record<string, RequestUsage> = {};

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
function checkRequestLimit(
  clientId: string | undefined,
  ip: string,
  hasCustomKey: boolean
): { allowed: boolean; currentUsage: number; limit: number; error?: string } {
  const LIMIT = 50;
  if (hasCustomKey) {
    return { allowed: true, currentUsage: 0, limit: LIMIT };
  }

  const key = (clientId && clientId.trim()) || ip || "unknown";
  const today = getTodayString();
  const record = requestStore[key];

  let currentUsage = 0;
  if (record && record.date === today) {
    currentUsage = record.count;
  } else {
    requestStore[key] = { date: today, count: 0 };
  }

  if (currentUsage >= LIMIT) {
    return {
      allowed: false,
      currentUsage,
      limit: LIMIT,
      error: `오늘 무료 번역 제공량(하루 50회)을 모두 소진하셨습니다. (현재 사용량: ${currentUsage} / 50 회). 계속 사용하시려면 우측 상단의 '⚙️ 개인 API 키 설정' 창에서 본인의 Gemini API 키를 등록하여 무료 제한을 해제해 주세요.`
    };
  }

  return { allowed: true, currentUsage, limit: LIMIT };
}

// Commits the request count used by a request
function commitRequest(clientId: string | undefined, ip: string) {
  const key = (clientId && clientId.trim()) || ip || "unknown";
  const today = getTodayString();
  const record = requestStore[key];

  if (record && record.date === today) {
    record.count += 1;
  } else {
    requestStore[key] = { date: today, count: 1 };
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
    customDeeplKey?: string,
    translationEngine: string = "gemini"
  ) {
    console.log(`[Translate API] Received request. Text length: ${text.length}, Mode: ${mode}, Target Language: ${targetLang}, Engine: ${translationEngine}`);
    
    const apiKey = customGeminiKey && customGeminiKey.trim();
    if (!apiKey) {
      console.error("[Translate API] Error: User's personal GEMINI_API_KEY is not configured.");
      throw new Error("개인 구글 Gemini API Key가 입력되지 않았습니다. 번역 서비스 이용 정책에 따라 개인 API 키를 등록하셔야 번역 서비스를 이용하실 수 있습니다.");
    }

    // Check and invoke DeepL if key is configured (support both DEEPL_API_KEY and DEEP_API_KEY) and engine is 'deepl'
    let deeplTranslation: string | null = null;
    let deeplError: string | null = null;
    const isDeeplRequested = (translationEngine === "deepl");
    const deeplKey = isDeeplRequested ? ((customDeeplKey && customDeeplKey.trim()) || getCleanEnv("DEEPL_API_KEY") || getCleanEnv("DEEP_API_KEY")) : null;
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

    if (translationEngine === "gemini") {
      systemInstruction += `\n\n[CRITICAL INSTRUCTION FOR SIMPLE TRANSLATION]: 
You are performing a simple, direct, and straightforward language translation. Focus on delivering a clear, modern, and highly natural translation in the 'translation' field, avoiding overly complex or heavy academic theological jargon. Keep vocabulary analysis and insights accessible, clear, and direct.`;
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
      console.log("[Translate API] Trying primary model: gemini-2.5-flash...");
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
        "구글 Gemini API 요청 시간 초과 (60초). 번역 및 분석 내용이 길거나 현재 구글 서버 트래픽이 일시적으로 매우 높은 상태입니다. 다시 한 번 번역 단축키를 누르거나 잠시 후 '다시 시도하기'를 클릭해 주세요."
      );
    } catch (primaryErr: any) {
      console.warn("[Translate API] Primary model (gemini-2.5-flash) failed or timed out. Attempting backup request...", primaryErr?.message || primaryErr);
      
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
        console.log("[Translate API] Backup request to gemini-2.5-flash succeeded.");
      } catch (fallbackErr: any) {
        console.error("[Translate API] Backup request also failed:", fallbackErr?.message || fallbackErr);
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
      const { text, mode, targetLang, geminiApiKey, deeplApiKey, clientId, translationEngine } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required" });
      }

      const customGeminiKey = geminiApiKey || (req.headers["x-gemini-api-key"] as string);
      const customDeeplKey = deeplApiKey || (req.headers["x-deepl-api-key"] as string);

      const hasCustomKey = !!(customGeminiKey && customGeminiKey.trim());
      const estimatedTokens = Math.ceil(text.length * 1.5 + 1500);

      const limitCheck = checkRequestLimit(clientId, req.ip || "", hasCustomKey);
      if (!limitCheck.allowed) {
        return res.status(403).json({ error: limitCheck.error, limitExceeded: true });
      }

      const result = await translateAndAnalyzeCore(
        text, 
        mode, 
        targetLang || "Korean", 
        customGeminiKey, 
        customDeeplKey,
        translationEngine || "gemini"
      );
      
      commitRequest(clientId, req.ip || "");

      const finalKey = clientId || req.ip || "unknown";
      const finalDailyTotal = requestStore[finalKey]?.count || 0;

      result.tokenUsage = {
        used: 1,
        dailyTotal: finalDailyTotal,
        limit: 50,
        date: getTodayString(),
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

  // GET API route for retrieving the current request count for a client-id
  app.get("/api/usage", (req, res) => {
    try {
      const rawClientId = req.query.clientId || req.query.client_id;
      const clientId = typeof rawClientId === "string" ? rawClientId : undefined;
      
      const rawGeminiKey = req.query.geminiApiKey || req.query.gemini_key;
      const customGeminiKey = typeof rawGeminiKey === "string" ? rawGeminiKey : undefined;
      
      const hasCustomKey = !!(customGeminiKey && customGeminiKey.trim());
      
      const key = (clientId && clientId.trim()) || req.ip || "unknown";
      const today = getTodayString();
      const record = requestStore[key];
      
      let currentUsage = 0;
      if (record && record.date === today) {
        currentUsage = record.count;
      }
      
      // Explicitly prevent browser from caching this status endpoint
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      res.json({
        used: currentUsage,
        limit: 50,
        date: today,
        hasCustomKey
      });
    } catch (error) {
      console.error("Usage API Error:", error);
      res.status(500).json({ error: "Failed to retrieve usage" });
    }
  });

  // Dedicated API route that returns a beautifully pre-formatted Plain Text
  // perfect for macOS Shortcuts Quick Look / Popup without leaving Logos!
  const handleTranslateToText = async (req: express.Request, res: express.Response) => {
    // Disable caching for this endpoint to prevent macOS Shortcuts/Safari from serving stale translation cards
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const isHtml = req.query.html === "true" || req.body.html === "true";
    try {
      const rawText = req.body.text || req.query.text;
      let text = "";
      if (Array.isArray(rawText)) {
        text = rawText.map(item => typeof item === "string" ? item : JSON.stringify(item)).join("\n");
      } else if (rawText && typeof rawText === "object") {
        if ("value" in rawText && typeof rawText.value === "string") {
          text = rawText.value;
        } else if ("string" in rawText && typeof rawText.string === "string") {
          text = rawText.string;
        } else {
          const keys = Object.keys(rawText);
          if (keys.length === 0) {
            text = "";
          } else {
            text = JSON.stringify(rawText);
          }
        }
      } else if (rawText !== undefined && rawText !== null) {
        text = String(rawText);
      }

      const rawMode = req.body.mode || req.query.mode;
      const mode = (typeof rawMode === "string" ? rawMode : "balanced") as string;
      
      const rawTargetLang = req.body.targetLang || req.query.targetLang || req.body.target_lang || req.query.target_lang;
      const targetLang = (typeof rawTargetLang === "string" ? rawTargetLang : "Korean") as string;

      const rawGeminiKey = req.body.geminiApiKey || req.query.geminiApiKey || req.body.gemini_key || req.query.gemini_key || req.headers["x-gemini-api-key"];
      const customGeminiKey = typeof rawGeminiKey === "string" ? rawGeminiKey : undefined;

      const rawDeeplKey = req.body.deeplApiKey || req.query.deeplApiKey || req.body.deepl_key || req.query.deepl_key || req.headers["x-deepl-api-key"];
      const customDeeplKey = typeof rawDeeplKey === "string" ? rawDeeplKey : undefined;

      const rawClientId = req.body.clientId || req.query.clientId || req.body.client_id || req.query.client_id;
      const clientId = typeof rawClientId === "string" ? rawClientId : undefined;

      const rawEngine = req.body.engine || req.query.engine;
      const engine = typeof rawEngine === "string" ? rawEngine : "gemini";

      const estimatedTokens = Math.ceil(text ? text.length * 1.5 + 300 : 0);
      const hasCustomKey = !!(customGeminiKey && customGeminiKey.trim());

      if (text && typeof text === "string" && text.trim()) {
        const limitCheck = checkRequestLimit(clientId, req.ip || "", hasCustomKey);
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
      오늘 하루 무료 제공량(50회 번역)을 모두 소진하셨습니다.<br><br>
      계속해서 단축어와 신학 번역 서비스를 중단 없이 사용하시려면, 웹 브라우저에서 서비스에 접속한 후 <strong>오른쪽 상단 '⚙️ 개인 API 키 설정'</strong>에서 본인의 Google Gemini API 키를 등록해 주세요. 등록 시 무료 과금 제한이 완전히 해제됩니다.
    </div>
    <button class="btn" onclick="window.close()">닫기</button>
  </div>
</body>
</html>`;
            return res.status(200).send(limitExceededHtml);
          } else {
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            let lines: string[] = [];
            lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            lines.push("⚠️ [이용 한도 초과] 하루 무료 한도 도달");
            lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            lines.push("");
            lines.push("오늘 제공되는 무료 사용량(하루 50회 번역)을 초과했습니다.");
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
            return res.status(200).send(lines.join("\n"));
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

      // Gemini Translation Route (Optimized for maximum speed and quality)
      console.log(`[Fast Route] Using fast Gemini translation into ${targetLang}...`);
      const apiKey = customGeminiKey && customGeminiKey.trim();
      if (!apiKey) {
        throw new Error("개인 구글 Gemini API Key가 입력되지 않았습니다. 번역 서비스 이용 정책에 따라 웹 대시보드 로그인 후 개인 API 키를 반드시 등록해 주세요.");
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

      // Use gemini-2.5-flash which is extremely fast and high fidelity for translation without thinking overhead
      const response = await generateContentWithRetry(
        ai,
        {
          model: "gemini-2.5-flash",
          contents: fastPrompt,
          config: {} // No thinkingConfig is passed, avoiding extra inference latency for simple translation
        },
        12000,
        "구글 Gemini API 응답 지연"
      );

      const translationResult = response?.text || "";
      const engineName = `Gemini 초고속 신학 번역 (${targetLang})`;

      commitRequest(clientId, req.ip || "");

      const finalKey = (clientId && clientId.trim()) || req.ip || "unknown";
      const finalDailyTotal = requestStore[finalKey]?.count || 0;

      let fallbackMessage = "";

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
      position: relative;
      background-color: #ffffff;
      border: 1px solid #e7e5e4;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      width: 100%;
      max-width: 920px;
      padding: 40px;
      box-sizing: border-box;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #e7e5e4;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 15.5px;
      font-weight: 700;
      color: #44403c;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .subtitle {
      font-size: 11px;
      background-color: #f5f5f4;
      color: #78716c;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: monospace;
    }
    .section-title {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #78716c;
      margin-top: 24px;
      margin-bottom: 10px;
      font-weight: 600;
    }
    .engine-switcher {
      display: flex;
      background-color: #fafaf9;
      border: 1px solid #e7e5e4;
      border-radius: 8px;
      padding: 4px;
      margin-bottom: 20px;
      gap: 6px;
    }
    .engine-tab {
      flex: 1;
      text-align: center;
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      border: none;
      background: transparent;
      color: #78716c;
      transition: all 0.2s ease;
      text-decoration: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .engine-tab:hover {
      color: #44403c;
    }
    .engine-tab.active {
      background-color: #ffffff;
      color: #1c1917;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.08);
      border: 1px solid #d6d3d1;
    }
    .fallback-banner {
      font-size: 11px;
      color: #b45309;
      background-color: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 16px;
      line-height: 1.5;
    }
    .text-box {
      background-color: #fafaf9;
      border: 1px solid #f5f5f4;
      border-radius: 8px;
      padding: 22px;
      font-size: 15.5px;
      line-height: 1.7;
      white-space: pre-wrap;
      word-break: break-word;
      min-height: 220px;
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
      gap: 10px;
      margin-top: 24px;
    }
    .btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 18px;
      font-size: 13px;
      font-weight: 600;
     <div class="footer" style="display: flex; flex-direction: column; gap: 4px; align-items: center; justify-content: center;">
      <div>⚡️ Running in high-speed popup mode via system shortcut.</div>
      <div style="font-size: 10px; color: #78716c; font-weight: 500; background-color: #f5f5f4; padding: 2px 8px; border-radius: 12px; border: 1px solid #e7e5e4; margin-top: 4px; display: inline-block;">
        ${hasCustomKey ? "✨ 한도 없음 (개인 API 키 적용 중)" : `📊 오늘 무료 번역: ${finalDailyTotal} / 50 회`}
      </div>
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
      const fullText = "[ Logos English Original ]\\n" + orig + "\\n\\n[ ${escapeHtml(engineName)} ]\\n" + trans;
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
      if (hasCustomKey) {
        lines.push("✨ 한도 없음 (개인 API 키 적용 중)");
      } else {
        lines.push(`📊 오늘 무료 번역: ${finalDailyTotal} / 50 회`);
      }
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
