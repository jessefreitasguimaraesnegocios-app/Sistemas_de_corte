
import { GoogleGenAI } from "@google/genai";

// Lazy initialization - only create when needed and API key is available
const getAI = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generateBusinessDescription = async (name: string, type: string) => {
  try {
    const ai = getAI();
    if (!ai) {
      // Return default description if API key is not available
      return "Qualidade e sofisticação em cada detalhe.";
    }
    
    // Basic Text Tasks (e.g., summarization, proofreading, and simple Q&A): 'gemini-3-flash-preview'
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere uma descrição atraente e curta (máximo 150 caracteres) para um(a) ${type} chamado(a) "${name}". Foque em qualidade e bem-estar.`,
    });
    // The GenerateContentResponse object features a text property (not a method)
    return response.text || "Bem-vindo ao nosso espaço de beleza e cuidado.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Qualidade e sofisticação em cada detalhe.";
  }
};
