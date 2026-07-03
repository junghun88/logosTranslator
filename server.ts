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

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // Shared helper function to do the translation and analysis
  async function translateAndAnalyzeCore(text: string, mode: string = "balanced") {
    console.log(`[Translate API] Received request. Text length: ${text.length}, Mode: ${mode}`);
    
    const apiKey = getCleanEnv("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("[Translate API] Error: GEMINI_API_KEY is not configured.");
      throw new Error("GEMINI_API_KEY가 설정되지 않았습니다. 브라우저 우측 상단 Settings 메뉴의 Secrets 패널에서 GEMINI_API_KEY를 등록해 주세요.");
    }

    // Check and invoke DeepL if key is configured (support both DEEPL_API_KEY and DEEP_API_KEY)
    let deeplTranslation: string | null = null;
    let deeplError: string | null = null;
    const deeplKey = getCleanEnv("DEEPL_API_KEY") || getCleanEnv("DEEP_API_KEY");

    if (deeplKey) {
      console.log("[Translate API] Found DeepL API Key. Initializing DeepL request...");
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
            target_lang: "KO"
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
Your task is to translate theological, biblical, or commentary text from English to Korean.
Analyze the source text carefully to provide the most contextually accurate and elegant Korean translation.
For biblical verses or theological commentary, maintain standard Korean Christian terminology (such as '하나님', '예수 그리스도', '구원', '은혜', '성경', etc.) unless the literary context suggests a broader translation.
Provide deep, high-fidelity theological analysis and explain key terms, including their Greek/Hebrew roots, transliterations, and specific nuances in this passage.`;

    if (mode === "scholarly") {
      systemInstruction += "\nFocus on high-level scholarly parsing, original languages (Greek/Hebrew word studies), and academic theological insights.";
    } else if (mode === "devotional") {
      systemInstruction += "\nFocus on warm, pastoral, devotional application, clear and accessible Korean translation, and practical spiritual insights.";
    } else {
      systemInstruction += "\nFocus on a balanced, precise literary translation and clear structural side-by-side parsing.";
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
        theologicalInsights: { type: Type.STRING, description: "Deep theological commentary, historical context, and explanation of this passage" },
        words: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: "The English word or phrase being analyzed" },
              originalLanguage: { type: Type.STRING, description: "Greek or Hebrew term if applicable (e.g. 'ἀγάπη' or 'חֶסֶ드'), otherwise empty" },
              transliteration: { type: Type.STRING, description: "Transliteration of the root word (e.g. 'agape' or 'chesed')" },
              koreanMeaning: { type: Type.STRING, description: "Korean translation or equivalent theological term" },
              explanation: { type: Type.STRING, description: "Grammatical nuance, dictionary meaning, or context-specific nuance in this passage" }
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
              korean: { type: Type.STRING, description: "The translated Korean sentence or distinct phrase" }
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
              koreanText: { type: Type.STRING, description: "Korean translated text or official translation of the cross-reference" }
            },
            required: ["citation", "koreanText"]
          },
          description: "2-3 highly relevant biblical cross-references that support the theological themes of the text"
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

    return parsedResponse;
  }

  // API route for translation and theological analysis (JSON Response)
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, mode } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required" });
      }

      const result = await translateAndAnalyzeCore(text, mode);
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
    try {
      const text = (req.body.text || req.query.text) as string;
      const mode = (req.body.mode || req.query.mode || "balanced") as string;

      if (!text || typeof text !== "string" || !text.trim()) {
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
        lines.push("3. 브라우저(번역 동반자 홈 화면)에서 직접 입력");
        lines.push("   서버 메인 화면에 접속하여 입력창에 직접 원문을 붙여넣고");
        lines.push("   '신학적 대조 번역 실행' 버튼을 누르셔도 동일하게 확인 가능합니다.");
        lines.push("");
        lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return res.status(200).send(lines.join("\n"));
      }

      // 1. Try to fetch DeepL translation if configured for lightning fast simple translation
      let deeplTranslation: string | null = null;
      let usedDeepL = false;
      const deeplKey = getCleanEnv("DEEPL_API_KEY") || getCleanEnv("DEEP_API_KEY");

      if (deeplKey) {
        console.log("[Fast Route] Found DeepL key. Querying DeepL translation...");
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
              target_lang: "KO"
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
        engineName = "DeepL 고정밀 초고속 번역";
      } else {
        // Fallback to simple Gemini translation if DeepL is not available or failed
        console.log("[Fast Route] DeepL is not available or failed. Using fast Gemini translation...");
        const apiKey = getCleanEnv("GEMINI_API_KEY");
        if (!apiKey) {
          throw new Error("GEMINI_API_KEY가 설정되지 않았습니다. 브라우저 우측 상단 Settings 메뉴의 Secrets 패널에서 GEMINI_API_KEY를 등록해 주세요.");
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
Translate the following English theological/commentary/biblical text into highly accurate, natural, and elegant Korean.
Maintain standard Korean Christian terminology (e.g., '하나님', '예수 그리스도', '은혜' 등).
Do NOT include any introduction, explanations, metadata, markdown backticks, or notes. Return ONLY the translated Korean text.

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
        engineName = "Gemini 초고속 신학 번역";
      }

      // Construct a highly polished, classical text card design using text characters
      let lines: string[] = [];
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      lines.push("📖 LOGOS TRANSLATION COMPANION (FAST)");
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      lines.push("");
      lines.push("[ Logos 영어 원문 ]");
      lines.push(`"${text.trim()}"`);
      lines.push("");
      lines.push(`[ ${engineName} ]`);
      lines.push(translationResult.trim());
      lines.push("");
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      lines.push("⚡️ 팝업 단축키용 초고속 직역 모드로 실행되었습니다.");
      lines.push("💡 상세 신학 분석, 원어 연구, 대조 주해 및 교차 구절은");
      lines.push("   번역 동반자 웹 브라우저 앱에서 실시간으로 확인해 보세요!");
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // Set content type as plain text with UTF-8 encoding
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.send(lines.join("\n"));
    } catch (error: any) {
      console.error("Text Translation Route Error:", error);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      // Return 200 OK so macOS Shortcuts "Get Contents of URL" always succeeds and can display a friendly formatted error card instead of crashing/hanging
      res.status(200).send(`⚠️ [신학 번역 오류 발생]\n\n번역 및 분석에 실패하였습니다.\n\n상세 정보: ${error?.message || "Unknown error"}\n\n도움말:\n1. 이 브라우저의 Settings > Secrets 패널에 GEMINI_API_KEY가 등록되어 있는지 꼭 확인해 주세요.\n2. 현재 구글 Gemini 서버가 일시적으로 지연되고 있을 수 있으니, 잠시 후 다시 시도해 주세요.`);
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
