import { GoogleGenAI, Type } from "@google/genai";
import type { Track, Suggestion, MashupPair, SetReport, SuggestionResult } from "../types";

// Helper to get client safely with clear error for the user
const getAiClient = () => {
  // Access environment variable safely
  const rawKey = process.env.API_KEY;
  // Trim whitespace which is a common copy-paste error
  const key = rawKey ? rawKey.trim() : "";

  if (!key || !key.startsWith("AIza")) {
    console.error("API Key Invalid or Missing. Length:", key.length);
    throw new Error("API Key inválida ou ausente. Verifique o Netlify (Environment Variables) e faça um novo deploy.");
  }
  return new GoogleGenAI({ apiKey: key });
};

const textModel = "gemini-3-flash-preview";
const imageModel = "gemini-2.5-flash-image";

// Helper to handle API errors gracefully
const handleApiError = (err: any, context: string) => {
  console.error(`Error in ${context}:`, err);
  
  if ((err.status === 400) || (err.message && err.message.includes("400"))) {
     throw new Error("Erro de API (400): Verifique se sua API Key tem restrições de IP/Referer no Google Cloud Console ou se o modelo está disponível.");
  }
  if ((err.status === 429) || (err.message && err.message.includes("429"))) {
      throw new Error("Muitas requisições (429). Tente novamente em alguns instantes.");
  }
  throw err;
};

export const generateVisuals = async (track: Track): Promise<string | null> => {
  try {
    const ai = getAiClient();
    const prompt = `Crie uma arte abstrata, minimalista e psicodélica de alta qualidade que represente a vibe de uma música de ${track.genre} com BPM ${track.bpm} e tom ${track.key}. Use cores que remetam ao sentimento da música. Sem texto, sem marcas d'água.`;
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
    console.error("Error generating visuals:", err);
    return null;
  }
};

export const getSetReport = async (history: Track[]): Promise<SetReport> => {
  try {
    const ai = getAiClient();
    const tracksText = history.map(t => `${t.name} - ${t.artist} (${t.bpm} BPM, ${t.key})`).join('\n');
    const prompt = `Analise a jornada musical deste set de DJ:
    ${tracksText}
    
    Forneça um relatório técnico e criativo em JSON contendo:
    - summary: Um resumo executivo do set.
    - highlights: 3 pontos técnicos de destaque.
    - vibeProgression: Uma descrição de como a energia evoluiu.`;

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
      return { summary: "Erro", highlights: [], vibeProgression: "Erro" };
  }
};

export const getSemanticSearch = async (query: string, playlist: Track[]): Promise<Track[]> => {
  try {
    const ai = getAiClient();
    const trackData = playlist.slice(0, 100).map(t => `ID:${t.id}|${t.name}|${t.artist}|${t.genre}|${t.key}`).join('\n');
    const prompt = `Aja como um curador musical. Dada a busca do usuário: "${query}", selecione as 8 faixas que melhor combinam com essa descrição emocional ou técnica.
    Biblioteca:
    ${trackData}
    
    Responda APENAS com um JSON contendo um array de IDs: { "ids": ["id1", "id2"] }`;

    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: { ids: { type: Type.ARRAY, items: { type: Type.STRING } } }
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
    const ai = getAiClient();
    const sample = playlist.slice(0, 40).map(t => `ID:${t.id}|${t.name}|${t.key}|${t.bpm}`).join('\n');
    const prompt = `Identifique 4 pares de faixas compatíveis para mashup ao vivo (tons harmônicos e BPMs próximos).
    Lista:
    ${sample}
    
    Responda em JSON com os IDs e a razão técnica.`;

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

export const getTrackSuggestions = async (currentTrack: Track, playlist: Track[]): Promise<SuggestionResult> => {
  try {
    const ai = getAiClient();
    const availableTracks = playlist
        .filter(t => t.id !== currentTrack.id)
        .slice(0, 100)
        .map(t => `ID: ${t.id}, "${t.name}" - ${t.artist} (${t.bpm} BPM, Tom: ${t.key}, Gênero: ${t.genre})`)
        .join('\n');

    const prompt = `Faixa atual: "${currentTrack.name}" por ${currentTrack.artist} (${currentTrack.bpm} BPM, Tom ${currentTrack.key}).
    
    Analise a biblioteca e sugira:
    1. As 10 melhores faixas para a sequência.
    2. 3 Cue Points estratégicos (ex: "Intro 32 bars", "Break 1:45") para a faixa ATUAL.
    
    Biblioteca:
    ${availableTracks}
    
    Responda estritamente em JSON.`;

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
    const ai = getAiClient();
    const stats = playlist.slice(0, 200).map(t => `${t.bpm}|${t.genre}`).join(',');
    const prompt = `Analise os dados de BPM e Gênero desta coleção: ${stats}. 
    Identifique 5 lacunas (Gaps) que limitam a versatilidade do DJ (ex: falta de techno melódico em 128bpm). 
    Seja direto e técnico.`;
    
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
    const ai = getAiClient();
    const imagePart = { inlineData: { data: base64Image, mimeType: 'image/jpeg' } };
    const response = await ai.models.generateContent({
        model: textModel,
        contents: { parts: [imagePart, { text: 'Identifique o título e artista da faixa selecionada nesta tela de Rekordbox/CDJ. Responda apenas o JSON com "title" e "artist".' }] },
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
    const ai = getAiClient();
    const tracksText = playlist.slice(0, 100).map(t => `ID:${t.id}|${t.name}|${t.artist}|${t.genre}`).join('\n');
    const prompt = `Crie uma playlist de 10 faixas para a vibe "${vibe}" (vocal: ${isVocal}).
    Biblioteca:
    ${tracksText}
    
    Retorne apenas o JSON com os IDs.`;
    
    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: { ids: { type: Type.ARRAY, items: { type: Type.STRING } } }
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
    const ai = getAiClient();
    const tracksText = playlist.slice(0, 20).map(t => `ID:${t.id}|${t.name}|${t.artist}`).join('\n');
    const prompt = `Aja como um especialista musical. Para cada faixa, identifique o Subgênero e o Nível de Energia (1-5).
    Músicas:
    ${tracksText}
    
    Retorne em JSON: { "enrichments": [ { "id": "...", "subgenre": "...", "energy": 4 } ] }`;

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