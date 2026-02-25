
import { GoogleGenAI } from "@google/genai";

// Đọc API key từ biến môi trường Vite (file .env)
const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

// Chỉ khởi tạo client khi có API key để tránh throw lỗi lúc load app
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const summarizeProject = async (title: string, description: string) => {
  // Nếu chưa cấu hình API key, không gọi Gemini, tránh làm trắng màn hình
  if (!ai) {
    console.warn("VITE_GEMINI_API_KEY chưa được cấu hình. Bỏ qua AI summary.");
    return "AI summary chưa được bật (thiếu Gemini API key).";
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a professional one-sentence executive summary and 3 key milestones for a project named "${title}" with this description: "${description}"`,
    });
    // Extracting Text Output from GenerateContentResponse using .text property
    return response.text;
  } catch (error) {
    console.error("Gemini summary error:", error);
    return "Could not generate AI summary at this time.";
  }
};
