import { GoogleGenAI } from "@google/genai";
import { InventoryItem } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeInventory = async (query: string, items: InventoryItem[]): Promise<string> => {
  // Limit context to prevent token overflow. If too many items, summarize.
  const itemContext = items.slice(0, 50).map(item => ({
    id: item.id,
    name: item.name,
    qty: item.quantity,
    loc: item.location
  }));
  
  const prompt = `
    You are an intelligent inventory assistant.
    Here is a subset of the current visible inventory data (top 50 items):
    ${JSON.stringify(itemContext)}

    Total visible items count: ${items.length}.

    User Question: "${query}"

    Please provide a concise, helpful answer based on the data provided. 
    If the user asks about an item not in the list, mention that it might be hidden or not in the top 50 matches.
    Focus on availability, locations, and potential stock issues.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Fast response needed
      }
    });
    return response.text || "I couldn't generate an analysis at this time.";
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "Sorry, I encountered an error while analyzing the inventory.";
  }
};

export const getSmartSearchKeywords = async (query: string): Promise<string[]> => {
  // Extract potential part numbers or keywords from a natural language query
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Extract search keywords or part numbers from this query: "${query}". Return ONLY a comma-separated list of strings.`,
    });
    const text = response.text || "";
    return text.split(',').map(s => s.trim()).filter(Boolean);
  } catch (e) {
    return [query];
  }
};
