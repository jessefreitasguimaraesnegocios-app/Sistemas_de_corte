
import { GoogleGenAI } from "@google/genai";

// Always use the named parameter and direct process.env.API_KEY access
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateBusinessDescription = async (name: string, type: string) => {
  try {
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
