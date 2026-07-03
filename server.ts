import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Shared helper function to do the translation and analysis
  async function translateAndAnalyzeCore(text: string, mode: string = "balanced") {
    console.log(`[Translate API] Received request. Text length: ${text.length}, Mode: ${mode}`);
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[Translate API] Error: GEMINI_API_KEY is not configured.");
      throw new Error("GEMINI_API_KEY is not configured. Please add it in the Settings secrets panel.");
    }

    // Check and invoke DeepL if key is configured (support both DEEPL_API_KEY and DEEP_API_KEY)
    let deeplTranslation: string | null = null;
    let deeplError: string | null = null;
    const deeplKey = process.env.DEEPL_API_KEY || process.env.DEEP_API_KEY;

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
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
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
        }
      }
    });

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

    const parsedResponse = JSON.parse(cleanedText);
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
      res.status(500).json({ error: error?.message || "Failed to translate text" });
    }
  });

  // Dedicated API route that returns a beautifully pre-formatted Plain Text
  // perfect for macOS Shortcuts Quick Look / Popup without leaving Logos!
  const handleTranslateToText = async (req: express.Request, res: express.Response) => {
    try {
      const text = (req.body.text || req.query.text) as string;
      const mode = (req.body.mode || req.query.mode || "balanced") as string;

      if (!text || typeof text !== "string") {
        return res.status(400).send("오류: 번역할 텍스트가 입력되지 않았습니다.");
      }

      const result = await translateAndAnalyzeCore(text, mode);

      // Construct a highly polished, classical text card design using text characters
      let lines: string[] = [];
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      lines.push("📖 LOGOS BIBLE TRANSLATION COMPANION");
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      lines.push("");
      lines.push("[ Logos 영어 원문 ]");
      lines.push(`"${result.originalText.trim()}"`);
      lines.push("");

      if (result.deeplUsed && result.deeplTranslation) {
        lines.push("[ DeepL 고정밀 직역 ]");
        lines.push(result.deeplTranslation.trim());
        lines.push("");
      }

      lines.push("[ Gemini 고품격 신학 번역 ]");
      lines.push(result.translation.trim());
      lines.push("");
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      lines.push("💡 신학적 맥락 & 해설 (Theological Insights)");
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      lines.push(result.theologicalInsights.trim());
      lines.push("");

      if (result.words && result.words.length > 0) {
        lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        lines.push("🔍 핵심 원어 사전 (Original Languages Study)");
        lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        result.words.forEach((item: any) => {
          let wordHeader = `• ${item.word}`;
          if (item.originalLanguage) {
            wordHeader += ` [${item.originalLanguage}`;
            if (item.transliteration) {
              wordHeader += ` / ${item.transliteration}`;
            }
            wordHeader += `]`;
          }
          lines.push(wordHeader);
          lines.push(`  뜻: ${item.koreanMeaning}`);
          if (item.explanation) {
            lines.push(`  설명: ${item.explanation}`);
          }
          lines.push("");
        });
      }

      if (result.crossReferences && result.crossReferences.length > 0) {
        lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        lines.push("🔗 연관 교차 참조 성경 구절 (Cross-References)");
        lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        result.crossReferences.forEach((ref: any, idx: number) => {
          lines.push(`${idx + 1}. ${ref.citation}`);
          if (ref.englishText) {
            lines.push(`   ENG: "${ref.englishText.trim()}"`);
          }
          lines.push(`   KOR: "${ref.koreanText.trim()}"`);
          lines.push("");
        });
      }

      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      lines.push(" Logos Translation Assistant | Theology Edition");
      lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // Set content type as plain text with UTF-8 encoding
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.send(lines.join("\n"));
    } catch (error: any) {
      console.error("Text Translation Route Error:", error);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.status(500).send(`오류: 번역 및 분석에 실패하였습니다.\n\n상세 정보: ${error?.message || "Unknown error"}`);
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
