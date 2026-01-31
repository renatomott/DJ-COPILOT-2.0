import { GoogleGenAI, Type } from "@google/genai";
import type { Track, Suggestion, MashupPair, SetReport, SuggestionResult } from "../types";

const textModel = "gemini-3-flash-preview";
const imageModel = "gemini-2.5-flash-image";

// Helper for Exponential Backoff Retry
// Handles transient 429 errors by waiting and retrying
const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = 2, delay = 1500): Promise<T> => {
  try {
    return await fn();
  } catch (err: any) {
    const isRateLimit = err.status === 429 || err?.response?.status === 429 || err?.message?.includes('429') || err?.message?.includes('quota');
    if (retries > 0 && isRateLimit) {
      // console.warn(`Quota/Rate limit hit. Retrying in ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw err;
  }
};

const handleApiError = (err: any, context: string) => {
  console.error(`Erro em ${context}:`, err);
  if (err.status === 401 || err.message?.includes("401") || err.message?.includes("API key")) {
    throw new Error("Erro de Autenticação: A chave de API é inválida.");
  }
  if (err.status === 429 || err.message?.includes("429") || err.message?.includes("quota")) {
    throw new Error("Limite de cota da IA excedido. Usando modo offline.");
  }
  throw new Error(`Erro na IA (${context}): ${err.message || "Erro inesperado"}`);
};

export const generateVisuals = async (track: Track): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Crie uma arte abstrata, minimalista e psicodélica que represente a música ${track.name} (${track.genre}) com BPM ${track.bpm}. Sem texto.`;
    
    const response = await retryWithBackoff(async () => {
        return await ai.models.generateContent({
            model: imageModel,
            contents: { parts: [{ text: prompt }] },
            config: { imageConfig: { aspectRatio: "16:9" } },
        });
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    return null;
  } catch (err) {
    return null;
  }
};

export const planAutoSet = async (
    playlist: Track[], 
    startTrack: Track | null, 
    mustHaveTracks: Track[],
    params: { 
      progression: string; 
      length: number;
      isStrict: boolean;
      minRating: number;
      targetPlaylists: string[];
      bpmRange?: { min: number, max: number };
      minEnergy?: number;
    },
    language: 'pt-BR' | 'en-US' = 'pt-BR'
): Promise<Track[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        let pool = playlist;

        if (params.isStrict) {
            pool = pool.filter(t => {
                const bpm = parseFloat(t.bpm) || 0;
                const matchesRating = t.rating >= params.minRating;
                const matchesPlaylist = params.targetPlaylists.length === 0 || params.targetPlaylists.includes(t.location);
                const matchesBpm = (!params.bpmRange) || (bpm >= params.bpmRange.min && bpm <= params.bpmRange.max);
                const matchesEnergy = (!params.minEnergy) || ((t.energy || 0) >= params.minEnergy);
                const isMustHave = mustHaveTracks.some(m => m.id === t.id);
                return isMustHave || (matchesRating && matchesPlaylist && matchesBpm && matchesEnergy);
            });
        }

        if (pool.length < params.length) {
            console.warn("Filtros muito estritos, usando pool completo como fallback");
            pool = playlist;
        }

        const tracksData = pool.slice(0, 300).map(t => 
            `ID:${t.id}|${t.name}|Key:${t.key}|BPM:${t.bpm}|Energy:${t.energy || '?'}|Rating:${t.rating}`
        ).join('\n');

        const mustHaveIds = mustHaveTracks.map(t => t.id).join(', ');

        const prompt = `
        Objetivo: Criar um set de DJ com EXATAMENTE ${params.length} faixas.
        Estratégia de Vibe: ${params.progression}.
        
        Parametros Desejados:
        - BPM entre ${params.bpmRange?.min || 0} e ${params.bpmRange?.max || 999}.
        - Energia Mínima: ${params.minEnergy || 0} (escala 1-5).
        - Rating Mínimo: ${params.minRating}.
        
        REGRAS CRÍTICAS:
        1. As seguintes faixas SÃO OBRIGATÓRIAS e DEVEM estar na sequência final: [${mustHaveIds}].
        2. Encaixe estas faixas obrigatórias na ordem que faça mais sentido harmônico (Camelot) e de energia segundo a estratégia.
        3. Preencha as lacunas com outras faixas da biblioteca fornecida.
        4. O set deve ter coesão harmônica (mixagem em tom compatível).
        5. Se possível, comece com: ${startTrack ? `${startTrack.name} (ID:${startTrack.id})` : 'A melhor opção'}.
        
        Retorne APENAS um JSON com o array de IDs na ordem de mixagem: { "ids": ["id1", "id2", ...] }.
        
        Biblioteca Disponível:
        ${tracksData}
        `;

        const response = await retryWithBackoff(async () => {
            return await ai.models.generateContent({
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
        });

        const parsed = JSON.parse(response.text || '{"ids":[]}');
        const ids = Array.isArray(parsed.ids) ? parsed.ids : [];
        
        const orderedTracks: Track[] = [];
        ids.forEach((id: string) => {
            const track = playlist.find(t => t.id === id);
            if (track) orderedTracks.push(track);
        });
        
        return orderedTracks;
    } catch (err) {
        handleApiError(err, "planAutoSet");
        return [];
    }
};

export const getSetReport = async (history: Track[]): Promise<SetReport> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const tracksText = history.map(t => `${t.name} - ${t.artist} (${t.bpm} BPM, ${t.key})`).join('\n');
    const prompt = `Analise este set de DJ e retorne um JSON com summary, highlights (array) e vibeProgression:\n${tracksText}`;
    
    const response = await retryWithBackoff(async () => {
        return await ai.models.generateContent({
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
    });
    return JSON.parse(response.text || "{}");
  } catch (err) {
    return { summary: "Erro na análise", highlights: [], vibeProgression: "" };
  }
};

export const getSemanticSearch = async (query: string, playlist: Track[]): Promise<Track[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const trackData = playlist.slice(0, 100).map(t => `ID:${t.id}|${t.name}|${t.genre}`).join('\n');
    const prompt = `Dada a busca "${query}", retorne um JSON com os IDs das 8 faixas mais compatíveis: { "ids": ["..."] }\n\n${trackData}`;
    
    const response = await retryWithBackoff(async () => {
        return await ai.models.generateContent({
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
    });

    const parsed = JSON.parse(response.text || '{"ids":[]}');
    const ids = Array.isArray(parsed.ids) ? parsed.ids : [];
    return playlist.filter(t => ids.includes(t.id));
  } catch (err) {
    return [];
  }
};

export const getMashupPairs = async (playlist: Track[]): Promise<MashupPair[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const sample = playlist.slice(0, 50).map(t => `ID:${t.id}|${t.name}|${t.key}|${t.bpm}`).join('\n');
    const prompt = `Identifique 4 pares de faixas para mashup. Retorne JSON com array "pairs" contendo id1, id2 e reason.\n\n${sample}`;
    
    const response = await retryWithBackoff(async () => {
        return await ai.models.generateContent({
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
    });
    
    const parsed = JSON.parse(response.text || '{"pairs":[]}');
    const pairs = Array.isArray(parsed.pairs) ? parsed.pairs : [];
    return pairs.map((p: any) => ({
      track1: playlist.find(t => t.id === p.id1)!,
      track2: playlist.find(t => t.id === p.id2)!,
      reason: p.reason
    })).filter((p: any) => p.track1 && p.track2);
  } catch (err) {
    return [];
  }
};

export const getTrackSuggestions = async (currentTrack: Track, playlist: Track[], excludeIds: string[] = [], language: 'pt-BR' | 'en-US' = 'pt-BR'): Promise<SuggestionResult> => {
  const currentBpm = parseFloat(currentTrack.bpm) || 120;

  // 1. FILTRAGEM E ORDENAÇÃO ROBUSTA (Local)
  // Isso é vital tanto para preparar dados para a IA quanto para o Fallback.
  const candidates = playlist.filter(t => t.id !== currentTrack.id && !excludeIds.includes(t.id));
  
  // Ordena puramente por proximidade de BPM
  const sortedCandidates = candidates.sort((a, b) => {
      const bpmA = parseFloat(a.bpm) || 0;
      const bpmB = parseFloat(b.bpm) || 0;
      const diffA = Math.abs(bpmA - currentBpm);
      const diffB = Math.abs(bpmB - currentBpm);
      return diffA - diffB;
  });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Envia as 120 faixas mais próximas para a IA
    const tracksToSend = sortedCandidates.slice(0, 120);

    // Formata os dados de forma compacta
    const availableTracksStr = tracksToSend.map(t => 
        `ID:${t.id}|${t.name}|${t.artist}|${t.bpm}|${t.key}|${t.genre}|${t.energy || ''}`
    ).join('\n');
    
    if (!availableTracksStr) return { suggestions: [], cuePoints: [] };
    
    const langInstruction = language === 'pt-BR' ? 'Português do Brasil' : 'Inglês (English)';
    
    const prompt = `
    Atue como um DJ profissional.
    Faixa Tocando: "${currentTrack.name}" de ${currentTrack.artist} 
    BPM: ${currentTrack.bpm} | Tom: ${currentTrack.key} | Gênero: ${currentTrack.genre}
    
    TAREFA: Selecione as 5 melhores faixas para mixar a seguir a partir da lista abaixo.
    
    CRITÉRIOS DE ESCOLHA (Prioridade):
    1. BPM compatível (Faixas com BPM muito próximo são ideais).
    2. Compatibilidade Harmônica (Camelot Wheel).
    3. Energia e Vibe (Manter ou subir energia).
    
    IMPORTANTE:
    - Se não houver match perfeito de tom, priorize o BPM.
    - Se não houver match perfeito de BPM, priorize o Tom.
    - VOCÊ DEVE RETORNAR 5 SUGESTÕES. Se nenhuma for perfeita, retorne as "menos piores" ou mais criativas com matchScore menor.
    - NUNCA retorne uma lista vazia.
    
    Formato de Resposta (JSON):
    {
      "suggestions": [
        { "id": "ID_DA_FAIXA", "matchScore": 0.95, "reason": "Explicação curta em ${langInstruction}..." }
      ],
      "cuePoints": ["Intro", "Break", "Drop"] 
    }

    LISTA DE CANDIDATOS:
    ${availableTracksStr}`;
    
    const response = await retryWithBackoff(async () => {
        return await ai.models.generateContent({
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
    });

    const data = JSON.parse(response.text || "{}");
    const suggestions = (data.suggestions || []).map((s: any) => {
      const t = playlist.find(track => track.id === s.id);
      return t ? { ...t, matchScore: s.matchScore, reason: s.reason } : null;
    }).filter((s: any) => s !== null);
    return { suggestions, cuePoints: data.cuePoints || [] };

  } catch (err) {
    // FALLBACK ROBUSTO: Se a IA falhar (cota/erro), usamos algoritmos locais.
    console.warn("AI Suggestion failed (Quota/Error), using Fallback.", err);
    
    // Pega as 5 faixas com BPM mais próximo que já foram ordenadas acima
    const fallbackSuggestions = sortedCandidates.slice(0, 5).map(t => ({
        ...t,
        matchScore: 0.75, // Score moderado para indicar que é um match matemático
        reason: language === 'pt-BR' 
            ? "Sugestão algorítmica por proximidade de BPM (Modo Offline - Cota IA excedida)" 
            : "Algorithmic suggestion based on BPM proximity (Offline Mode - AI Quota exceeded)"
    }));
    
    return { suggestions: fallbackSuggestions, cuePoints: [] };
  }
};

export const getGapAnalysis = async (playlist: Track[]): Promise<string[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const stats = playlist.slice(0, 200).map(t => `${t.bpm}|${t.genre}`).join(',');
    const prompt = `Analise as lacunas nesta coleção de músicas: ${stats}. Retorne 5 pontos técnicos sobre o que falta na biblioteca.`;
    
    const response = await retryWithBackoff(async () => {
        return await ai.models.generateContent({ model: textModel, contents: prompt });
    });
    return response.text?.split('\n').filter(l => l.trim().length > 5).slice(0, 5) || [];
  } catch (err) {
    return [];
  }
};

export const identifyTrackFromImage = async (base64Image: string): Promise<{ title: string; artist: string }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imagePart = { inlineData: { data: base64Image, mimeType: 'image/jpeg' } };
    
    const response = await retryWithBackoff(async () => {
        return await ai.models.generateContent({
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
    });
    return JSON.parse(response.text || '{"title":"","artist":""}');
  } catch (err) {
    return { title: "", artist: "" };
  }
};

export const generatePlaylist = async (playlist: Track[], vibe: string, isVocal: string): Promise<Track[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const tracksText = playlist.slice(0, 100).map(t => `ID:${t.id}|${t.name}|${t.genre}`).join('\n');
    const prompt = `Crie uma playlist de 10 faixas para vibe "${vibe}" (vocal: ${isVocal}). Retorne JSON com array "ids".\n\n${tracksText}`;
    
    const response = await retryWithBackoff(async () => {
        return await ai.models.generateContent({
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
    });

    const parsed = JSON.parse(response.text || '{"ids":[]}');
    const ids = Array.isArray(parsed.ids) ? parsed.ids : [];
    return playlist.filter(t => ids.includes(t.id));
  } catch (err) {
    return [];
  }
};

export const enrichPlaylistData = async (playlist: Track[]): Promise<Partial<Track>[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // IMPROVED: Include BPM and Genre for better AI Context
    const tracksText = playlist.slice(0, 50).map(t => 
        `ID:${t.id}|${t.name}|${t.artist}|${t.bpm} BPM|${t.genre}`
    ).join('\n');
    
    // IMPROVED PROMPT: Explicit Energy Scale definition
    const prompt = `Analise a lista de faixas musicais fornecida. Para cada faixa, retorne um objeto JSON com:
    1. "subgenre": O subgênero eletrônico mais específico (ex: Tech House, Melodic Techno, Deep House).
    2. "energy": Um número inteiro de 1 a 5 representando a energia da faixa.
       - 1: Chill/Ambient/Warm-up muito calmo.
       - 2: Calmo, bom para começo de set.
       - 3: Energia média, constante, dançante.
       - 4: Alta energia, momentos de pico.
       - 5: Peak time, Banger, Explosivo.
    3. "cuePoints": Array com 3 strings sugerindo pontos de mixagem (ex: "Intro", "Vocal Start", "Drop", "Break", "Outro").
    
    Retorne JSON com array "enrichments" (id, subgenre, energy, cuePoints: string[]).
    \n\n${tracksText}`;

    const response = await retryWithBackoff(async () => {
        return await ai.models.generateContent({
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
                        energy: { type: Type.NUMBER },
                        cuePoints: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                    }
                }
                }
            }
        });
    });

    const parsed = JSON.parse(response.text || '{"enrichments":[]}');
    return Array.isArray(parsed.enrichments) ? parsed.enrichments : [];
  } catch (err) {
    return [];
  }
};