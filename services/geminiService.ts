import { GoogleGenAI, Chat, Type, Schema } from "@google/genai";
import { TripSummary } from "../types";

let aiInstance: GoogleGenAI | null = null;

const getAIInstance = (): GoogleGenAI => {
  if (!aiInstance) {
    if (!process.env.API_KEY) {
      throw new Error("API Key is missing. Please set process.env.API_KEY.");
    }
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

/**
 * Generates a structured summary of the itinerary using Gemini's JSON mode.
 * This allows us to build a nice UI timeline and suggest questions.
 */
export const generateTripSummary = async (contextText: string): Promise<TripSummary> => {
  const ai = getAIInstance();
  
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "A creative title for this trip (e.g., 'Weekend in Paris')" },
      destination: { type: Type.STRING, description: "Main city or country of the trip" },
      dates: { type: Type.STRING, description: "Date range of the trip (e.g., 'Oct 12 - Oct 15')" },
      suggestedQuestions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "3 specific, interesting questions the user could ask about this specific itinerary"
      },
      events: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "Date of event in YYYY-MM-DD format. Infer year from document or use current year." },
            time: { type: Type.STRING, description: "Time of event in HH:MM (24h) format. Use '09:00' if specific time is missing." },
            activity: { type: Type.STRING, description: "Short description of activity" },
            location: { type: Type.STRING, description: "Location name if available, else empty" },
            type: { 
              type: Type.STRING, 
              enum: ['flight', 'hotel', 'activity', 'food', 'other'],
              description: "Category of the event"
            }
          },
          required: ["date", "time", "activity", "type"]
        }
      }
    },
    required: ["title", "destination", "dates", "events", "suggestedQuestions"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following travel document and extract a structured itinerary summary.
      
      DOCUMENT CONTENT:
      ${contextText.substring(0, 50000)} ... (truncated for summary if too long)`, // Send first 50k chars for summary to save latency, usually enough for header info
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No summary generated");
    
    return JSON.parse(text) as TripSummary;
  } catch (error) {
    console.error("Summary Generation Error:", error);
    // Return a fallback if parsing fails
    return {
      title: "My Trip",
      destination: "Unknown",
      dates: "Upcoming",
      events: [],
      suggestedQuestions: ["What is in this document?", "Are there any flights?", "Where am I staying?"]
    };
  }
};

export const createItineraryChat = (contextText: string): Chat => {
  const ai = getAIInstance();
  
  const systemPrompt = `
    You are an expert Travel Assistant AI. 
    The user has uploaded a travel itinerary or document. 
    Your goal is to answer questions STRICTLY based on the content provided below.
    
    Rules:
    1. If the answer is found in the document, provide it clearly and concisely.
    2. ALWAYS cite the page number if possible, using the format [Page X].
    3. If the answer is NOT in the document, explicitly say "I couldn't find that information in your uploaded itinerary."
    4. Do not make up dates, times, or flight numbers.
    5. Be helpful, friendly, and act like a personal concierge.
    6. Format your answers nicely (use bullet points for lists, bold for times/dates).

    --- BEGIN DOCUMENT CONTENT ---
    ${contextText}
    --- END DOCUMENT CONTENT ---
  `;

  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.4,
    },
  });
};

export const sendChatMessage = async (chat: Chat, message: string): Promise<string> => {
  try {
    const result = await chat.sendMessage({
      message: message
    });
    
    const responseText = result.text;
    if (!responseText) throw new Error("Empty response from model");
    
    return responseText;
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
};