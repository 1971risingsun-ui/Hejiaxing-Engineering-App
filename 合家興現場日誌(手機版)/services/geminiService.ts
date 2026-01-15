import { GoogleGenAI } from "@google/genai";

export const analyzeConstructionPhoto = async (base64Image: string): Promise<string> => {
  // Fix: Create a new GoogleGenAI instance right before making an API call to ensure it uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Fix: Extract pure base64 data and mimeType from Data URL if present.
  // Standard file readers often include a 'data:image/jpeg;base64,' prefix which must be removed.
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  const mimeType = base64Image.includes(';') ? base64Image.split(';')[0].split(':')[1] : 'image/jpeg';
  
  try {
    const response = await ai.models.generateContent({
      // Guideline: Use 'gemini-3-flash-preview' for multimodal analysis and general Q&A tasks.
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

    // Guideline: Access the .text property directly (do not call as a function).
    return response.text || "無法分析圖片";
  } catch (error) {
    console.error("Error analyzing photo:", error);
    return "分析失敗，請稍後再試。";
  }
};
