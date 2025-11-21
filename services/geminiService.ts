import { GoogleGenAI, Type } from "@google/genai";
import { Article, Feed } from '../types';

// Ensure API key is present
if (!process.env.API_KEY) {
  console.error("API_KEY is missing from environment variables.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const summarizeArticle = async (content: string, title: string): Promise<string> => {
  try {
    // Truncate content to avoid token limits if it's massive, though 2.5-flash has a large context.
    const cleanContent = content.length > 10000 ? content.substring(0, 10000) + "..." : content;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Summarize the following article titled "${title}" in a concise, bulleted format. Highlight the key takeaways. \n\nArticle Content:\n${cleanContent}`,
      config: {
        systemInstruction: "You are a helpful news assistant. Keep summaries objective and easy to read.",
      }
    });
    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Summarization error:", error);
    return "Error generating summary. Please try again.";
  }
};

export const generateVirtualFeed = async (topic: string, feedId: string): Promise<Article[]> => {
  try {
    // Using Gemini 2.5 Flash with Google Search to create a "Virtual" RSS feed
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find the latest, most relevant news articles about: "${topic}". 
      Return a structured JSON list of 5-7 articles. 
      For each article, provide a title, a link (URL found from grounding), a brief content summary (2-3 sentences), a publication date (approximate if exact not found, formatted YYYY-MM-DD HH:mm:ss), and an author name if available.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              link: { type: Type.STRING },
              content: { type: Type.STRING },
              pubDate: { type: Type.STRING },
              author: { type: Type.STRING },
            },
            required: ["title", "link", "content", "pubDate"]
          }
        }
      }
    });

    const rawText = response.text;
    if (!rawText) return [];

    const items = JSON.parse(rawText);
    
    // Map to our Article type
    return items.map((item: any, index: number) => ({
      id: `virtual-${feedId}-${Date.now()}-${index}`,
      feedId: feedId,
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      content: item.content, // This is the "snippet" or summary from the search
      author: item.author || "Pulse AI Discovery",
      read: false,
      bookmarked: false,
      tags: ["Virtual", "AI Generated"]
    }));

  } catch (error) {
    console.error("Virtual feed generation error:", error);
    throw error;
  }
};

export const chatWithArticle = async (articleContent: string, history: {role: string, text: string}[], newMessage: string) => {
  try {
    const cleanContent = articleContent.length > 15000 ? articleContent.substring(0, 15000) + "..." : articleContent;
    
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: [
        {
          role: 'user',
          parts: [{ text: `Context: You are an AI assistant helping a user understand an article. Here is the article content:\n\n${cleanContent}\n\nAnswer questions based on this text.` }]
        },
        {
          role: 'model',
          parts: [{ text: "Understood. I am ready to answer questions about the article." }]
        },
        ...history.map(h => ({
          role: h.role,
          parts: [{ text: h.text }]
        }))
      ]
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text;
  } catch (error) {
    console.error("Chat error:", error);
    return "I'm having trouble connecting right now.";
  }
};

export const generateSmartDigest = async (articles: Article[], customPrompt?: string): Promise<string> => {
  try {
    if (articles.length === 0) return "No articles available to generate a digest.";

    // Increased context limit to 50 articles for broader analysis capabilities
    // Gemini 2.5 Flash has a large context window, so we can afford this.
    const articlesText = articles.slice(0, 50).map(a => `- [${a.pubDate}] ${a.title} (${a.link}): ${a.content.substring(0, 800)}...`).join('\n\n');

    let finalPrompt = customPrompt;
    if (!finalPrompt) {
        finalPrompt = `Create a "Daily Smart Digest" based on the following article headlines and snippets. 
      Group them by theme if possible. Write in a professional, engaging newsletter style. Include links to the original articles where relevant in Markdown format.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${finalPrompt}
      \n\n--- SOURCE DATA ---\n${articlesText}`,
    });
    return response.text || "Could not generate analysis.";
  } catch (error) {
    console.error("Digest/Analysis error:", error);
    return "Error generating analysis.";
  }
};
