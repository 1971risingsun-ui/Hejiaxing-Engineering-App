import { GoogleGenAI } from "@google/genai";

export const analyzeConstructionPhoto = async (base64Image: string): Promise<string> => {
  // Fix: Create a new GoogleGenAI instance right before making an API call to ensure it uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Fix: Extract pure base64 data and mimeType from Data URL if present.
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  const mimeType = base64Image.includes(';') ? base64Image.split(';')[0].split(':')[1] : 'image/jpeg';
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: "Analyze this construction site photo. Identify the current stage of construction, list any visible materials, and highlight potential safety hazards if any. Be concise."
          }
        ]
      }
    });

    return response.text || "無法分析圖片";
  } catch (error) {
    console.error("Error analyzing photo:", error);
    return "分析失敗，請稍後再試。";
  }
};

/**
 * 將文字翻譯為中越文對照格式 (Bilingual Side-by-Side)
 * 專為工程描述與備註優化
 */
export const translateProjectContent = async (text: string): Promise<string> => {
  if (typeof text !== 'string' || !text || text.trim().length === 0) return "";
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你現在是一位精通中文與越南文的建築工程專業翻譯。
請將下方的內容轉換為「中越雙語對照」格式。

要求：
1. 逐段對照：每一段原始中文內容下方，必須緊接著對應的越南文翻譯。
2. 保持專業：使用正確的建築工程術語。
3. 格式完整：保留原本的編號、清單符號 (如 1., 2. 或 -)。
4. 嚴禁廢話：直接輸出對照後的文字，不要解釋你做了什麼，也不要開場白或結語。
5. 備註處理：若內容是備註訊息，請確保翻譯語氣準確。

待處理內容：
${text}`,
      config: {
        systemInstruction: "你是一個專業的工程文檔翻譯工具，任務是將輸入文字轉換為高品質的中越雙語對照版本，不添加任何 AI 的自我說明。",
      }
    });

    return response.text || text;
  } catch (error) {
    console.error("Error translating content:", error);
    return text;
  }
};