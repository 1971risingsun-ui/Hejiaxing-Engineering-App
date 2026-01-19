import { GoogleGenAI } from "@google/genai";

export const analyzeConstructionPhoto = async (base64Image: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined') return "API Key 未配置，無法分析圖片。";

  const ai = new GoogleGenAI({ apiKey });
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  const mimeType = base64Image.includes(';') ? base64Image.split(';')[0].split(':')[1] : 'image/jpeg';
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: "Analyze this construction site photo. Identify the current stage, visible materials, and potential safety hazards. Be concise." }
        ]
      }
    });

    return response.text || "無法獲取分析結果";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "分析失敗，請檢查網路連線或 API 配額。";
  }
};

/**
 * 將文字翻譯為中越文對照格式 (Bilingual Side-by-Side)
 * 專為工程描述與備註優化，並加入行動端穩定性處理。
 */
export const translateProjectContent = async (text: string): Promise<string> => {
  if (typeof text !== 'string' || !text || text.trim().length === 0) return "";
  
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined') {
    console.error("Translation failed: API Key missing.");
    return text;
  }

  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你現在是一位精通中文與越南文的建築工程專業翻譯。
請將下方的內容轉換為「中越雙語對照」格式。

要求：
1. 逐段對照：每一段原始中文內容下方，必須緊接著對應的越南文翻譯。
2. 保持專業：使用正確的建築工程術語。
3. 格式完整：保留原本的編號、清單符號 (如 1., 2. 或 -)。
4. 嚴禁廢話：直接輸出對照後的文字，不要添加解釋、開場白或結語。

待處理內容：
${text}`,
      config: {
        systemInstruction: "你是一個專業的工程文檔翻譯工具，任務是將輸入文字轉換為高品質的中越雙語對照版本。",
        temperature: 0.1, // 降低隨機性，提高翻譯穩定度
      }
    });

    const result = response.text;
    return result && result.trim().length > 0 ? result : text;
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    // 在手機端如果失敗，回傳原始文字以免資料遺失
    return text;
  }
};