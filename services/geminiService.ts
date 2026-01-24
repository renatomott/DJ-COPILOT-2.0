
import { GoogleGenAI, Type } from "@google/genai";
import type { Track, Suggestion, MashupPair, SetReport, SuggestionResult } from "../types";

// Modelos recomendados
const textModel = "gemini-3-flash-preview";
const imageModel = "gemini-2.5-flash-image";

/**
 * Auxiliar para tratamento de erros de API.
 */
const handleApiError = (err: any, context: string) => {
  console.error(`Erro em ${context}:`, err);
  
  if (err.status === 401 || err.message?.includes("401") || err.message?.includes("API key")) {
    throw new Error("Erro de Autenticação: A chave de API é inválida ou não foi configurada corretamente nas variáveis de ambiente.");
  }
  
  if (err.status === 429) {
    throw new Error("Limite de requisições excedido. Tente novamente em alguns segundos.");
  }

  throw new Error(`Erro na IA (${context}): ${err.message || "Erro inesperado"}`);
};

export const generateVisuals = async (track: Track): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Crie uma arte abstrata, minimalista e psicodélica que represente a música ${track.name} (${track.genre}) com BPM ${track.bpm}. Sem texto.`;
    
    const response = await ai.models.generateContent({
      model: imageModel,
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "16:9" } },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (err) {
    console.error("Erro ao gerar visuais:", err);
    return null;
  }
};

export const getSetReport = async (history: Track[]): Promise<SetReport> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const tracksText = history.map(t => `${t.name} - ${t.artist} (${t.bpm} BPM, ${t.key})`).join('\n');
    const prompt = `Analise este set de DJ e retorne um JSON com summary, highlights (array) e vibeProgression:\n${tracksText}`;

    const response = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
            vibeProgression: { type: Type.STRING }
          },
          required: ["summary", "highlights", "vibeProgression"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (err) {
    handleApiError(err, "getSetReport");
    return { summary: "Erro na análise", highlights: [], vibeProgression: "" };
  }
};

export const getSemanticSearch = async (query: string, playlist: Track[]): Promise<Track[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const trackData = playlist.slice(0, 100).map(t => `ID:${t.id}|${t.name}|${t.genre}`).join('\n');
    const prompt = `Dada a busca "${query}", retorne um JSON com os IDs das 8 faixas mais compatíveis: { "ids": ["..."] }\n\n${trackData}`;

    const response = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ids: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    const { ids } = JSON.parse(response.text || '{"ids":[]}');
    return playlist.filter(t => ids.includes(t.id));
  } catch (err) {
    handleApiError(err, "getSemanticSearch");
    return [];
  }
};

export const getMashupPairs = async (playlist: Track[]): Promise<MashupPair[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const sample = playlist.slice(0, 50).map(t => `ID:${t.id}|${t.name}|${t.key}|${t.bpm}`).join('\n');
    const prompt = `Identifique 4 pares de faixas para mashup. Retorne JSON com array "pairs" contendo id1, id2 e reason.\n\n${sample}`;

    const response = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pairs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id1: { type: Type.STRING },
                  id2: { type: Type.STRING },
                  reason: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    const { pairs } = JSON.parse(response.text || '{"pairs":[]}');
    return pairs.map((p: any) => ({
      track1: playlist.find(t => t.id === p.id1)!,
      track2: playlist.find(t => t.id === p.id2)!,
      reason: p.reason
    })).filter((p: any) => p.track1 && p.track2);
  } catch (err) {
    handleApiError(err, "getMashupPairs");
    return [];
  }
};

export const getTrackSuggestions = async (currentTrack: Track, playlist: Track[], excludeIds: string[] = [], language: 'pt-BR' | 'en-US' = 'pt-BR'): Promise<SuggestionResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Filtra as faixas para não enviar o que já foi sugerido ou a própria faixa atual
    const candidates = playlist
      .filter(t => t.id !== currentTrack.id && !excludeIds.includes(t.id));

    // Pega um chunk (ex: 80 faixas) para análise. Se a lista for muito grande, pegamos aleatórias ou as primeiras.
    // Para melhorar a variedade no "Load More", embaralhamos levemente se tiver muitas
    const availableTracks = candidates
      .sort(() => 0.5 - Math.random()) 
      .slice(0, 80)
      .map(t => `ID: ${t.id}, "${t.name}" (${t.bpm} BPM, Tom: ${t.key})`)
      .join('\n');

    if (!availableTracks) {
        return { suggestions: [], cuePoints: [] };
    }

    const langInstruction = language === 'pt-BR' ? 'Português do Brasil' : 'Inglês (English)';

    const prompt = `Faixa atual: "${currentTrack.name}" (${currentTrack.bpm} BPM, Tom ${currentTrack.key}). Analise as faixas disponíveis e sugira as 5 melhores combinações (ordene por matchScore decrescente). Retorne JSON com "suggestions" (id, matchScore, reason em ${langInstruction} explicando a conexão musical) e "cuePoints" (strings).\n\n${availableTracks}`;

    const response = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  matchScore: { type: Type.NUMBER },
                  reason: { type: Type.STRING }
                }
              }
            },
            cuePoints: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["suggestions", "cuePoints"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    const suggestions = (data.suggestions || []).map((s: any) => {
      const t = playlist.find(track => track.id === s.id);
      return t ? { ...t, matchScore: s.matchScore, reason: s.reason } : null;
    }).filter((s: any) => s !== null);

    return { suggestions, cuePoints: data.cuePoints || [] };
  } catch (err) {
    handleApiError(err, "getTrackSuggestions");
    return { suggestions: [], cuePoints: [] };
  }
};

export const getGapAnalysis = async (playlist: Track[]): Promise<string[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const stats = playlist.slice(0, 200).map(t => `${t.bpm}|${t.genre}`).join(',');
    const prompt = `Analise as lacunas nesta coleção de músicas: ${stats}. Retorne 5 pontos técnicos sobre o que falta na biblioteca.`;
    
    const response = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
    });
    return response.text?.split('\n').filter(l => l.trim().length > 5).slice(0, 5) || [];
  } catch (err) {
    handleApiError(err, "getGapAnalysis");
    return [];
  }
};

export const identifyTrackFromImage = async (base64Image: string): Promise<{ title: string; artist: string }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imagePart = { inlineData: { data: base64Image, mimeType: 'image/jpeg' } };
    const response = await ai.models.generateContent({
      model: textModel,
      contents: { 
        parts: [
          imagePart, 
          { text: 'Extraia o título e artista da faixa principal visível nesta tela de software de DJ. Retorne APENAS um JSON com "title" e "artist".' }
        ] 
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            artist: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || '{"title":"","artist":""}');
  } catch (err) {
    handleApiError(err, "identifyTrackFromImage");
    return { title: "", artist: "" };
  }
};

export const generatePlaylist = async (playlist: Track[], vibe: string, isVocal: string): Promise<Track[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const tracksText = playlist.slice(0, 100).map(t => `ID:${t.id}|${t.name}|${t.genre}`).join('\n');
    const prompt = `Crie uma playlist de 10 faixas para vibe "${vibe}" (vocal: ${isVocal}). Retorne JSON com array "ids".\n\n${tracksText}`;
    
    const response = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ids: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
    const { ids } = JSON.parse(response.text || '{"ids":[]}');
    return playlist.filter(t => ids.includes(t.id));
  } catch (err) {
    handleApiError(err, "generatePlaylist");
    return [];
  }
};

export const enrichPlaylistData = async (playlist: Track[]): Promise<Partial<Track>[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const tracksText = playlist.slice(0, 20).map(t => `ID:${t.id}|${t.name}|${t.artist}`).join('\n');
    const prompt = `Classifique subgênero e energia (1-5) destas faixas. Retorne JSON com array "enrichments":\n\n${tracksText}`;

    const response = await ai.models.generateContent({
      model: textModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            enrichments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  subgenre: { type: Type.STRING },
                  energy: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    });
    const { enrichments } = JSON.parse(response.text || '{"enrichments":[]}');
    return enrichments;
  } catch (err) {
    handleApiError(err, "enrichPlaylistData");
    return [];
  }
};
