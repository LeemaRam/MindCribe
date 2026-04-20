import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeTranscript(transcript: string) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are MindScribe AI, a sophisticated intelligence framework for meeting analysis.
    Your goal is to provide cinematic-level insights from raw transcripts.
    
    Given a transcript, you must return a strict JSON object with the following structure:
    {
      "title": "A short, descriptive title for the meeting (max 60 chars).",
      "summary": "A concise, high-impact summary (5-6 lines). Use professional yet engaging language.",
      "keyPoints": [
        "Specifically highlight core decisions, discoveries, or shifts in strategy.",
        "Each point should be clear and scannable."
      ],
      "actionItems": [
        {
          "task": "The specific action to be taken.",
          "owner": "The person responsible (if identifiable, otherwise 'Unassigned').",
          "priority": "High", "Medium", or "Low"
        }
      ],
      "meeting_score": {
        "clarity": 1-10,
        "productivity": 1-10,
        "engagement": 1-10
      },
      "suggestions": [
        "Specifically how this meeting could be improved",
        "Efficiency recommendations"
      ]
    }
    
    Do not include any text other than the JSON object.
  `;

  try {
    console.log("MindScribe AI: Initiating neural synthesis...");
    const response = await ai.models.generateContent({
      model,
      contents: transcript,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    console.log("MindScribe AI: Synthesis complete.", response);
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("MindScribe AI: Analysis Error:", error);
    throw error;
  }
}

export async function chatWithIntelligence(prompt: string, context: string, history: { role: string, content: string }[]) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are MindScribe AI, the strategic intelligence assistant assigned to this workspace.
    You have access to the following meeting analysis context:
    ${context}
    
    Answer the user's questions based on this context and the conversation history. 
    Maintain a professional, analytical, and supportive persona.
    If the information is not in the context, state that clearly but try to offer relevant strategic advice.
  `;

  try {
    console.log("MindScribe AI: Processing neural query...");
    const response = await ai.models.generateContent({
      model,
      contents: prompt, // Simple single-turn for now, or we can use chat history if needed
      config: {
        systemInstruction,
      },
    });

    console.log("MindScribe AI: Query response generated.", response);
    return response.text || "I was unable to retrieve a response from the neural network.";
  } catch (error) {
    console.error("MindScribe AI: Chat Error:", error);
    throw error;
  }
}
