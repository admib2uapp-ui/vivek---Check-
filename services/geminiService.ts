import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini
// Note: We create the instance inside the function to ensure we capture the latest key if it changes, 
// though strictly in this app structure it's static.
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface ChequeData {
  cheque_number: string;
  bank: string;
  branch: string;
  amount: number;
  date: string;
}

export const analyzeChequeImage = async (base64Image: string): Promise<ChequeData | null> => {
  if (!process.env.API_KEY) {
    console.error("No API Key found");
    return null;
  }

  try {
    const ai = getAiClient();
    
    // Clean base64 string if it contains metadata prefix
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64
            }
          },
          {
            text: "Extract the following details from this cheque image: Cheque Number, Bank Name, Branch Name, Amount (numeric), and Date (YYYY-MM-DD format if possible). If a field is not visible, use null."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cheque_number: { type: Type.STRING },
            bank: { type: Type.STRING },
            branch: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            date: { type: Type.STRING, description: "YYYY-MM-DD format" }
          },
          required: ["amount"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text) as ChequeData;
  } catch (error) {
    console.error("Error analyzing cheque with Gemini:", error);
    return null;
  }
};