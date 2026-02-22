import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";
import { getServiceSupabase } from "@/lib/supabase/server";

const SYSTEM_INSTRUCTION = `You are a world-class venture capital analyst. 
Your goal is to parse a markdown scrape of a startup's website and extract structured data about the company according to the exact JSON schema provided.
Do not invent information. If something is completely absent, omit it or leave an empty array, but prioritize extracting relevant context where possible.`;

const JSON_SCHEMA: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        summary: {
            type: SchemaType.STRING,
            description: "A 1-2 sentence plain-English description of the company and what they actually do."
        },
        whatTheyDo: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "Up to 6 bullet points of specific products, features, or services they offer."
        },
        keywords: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "Up to 10 relevant keywords (e.g., 'B2B SaaS', 'DevTools', 'AI', 'Fintech')."
        },
        signals: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "Up to 4 inferred signals (e.g., 'Hiring aggressively in engineering', 'Targeting enterprise clients', 'Recently pivoted')."
        },
        thesisScore: {
            type: SchemaType.INTEGER,
            description: "A score from 0-100 indicating how well this company aligns with typical top-tier B2B Software/AI VC investment theses."
        },
        thesisExplanation: {
            type: SchemaType.STRING,
            description: "A short 1-2 sentence explanation justifying the assigned thesisScore."
        }
    },
    required: ["summary", "whatTheyDo", "keywords", "signals", "thesisScore", "thesisExplanation"]
};

// ──────────────────────────────────────────────────────────────
// Groq Fallback: Structured extraction when Gemini fails
// ──────────────────────────────────────────────────────────────
async function extractWithGroq(markdownContent: string, url: string): Promise<any> {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw new Error("GROQ_API_KEY not configured for fallback.");

    const groqPrompt = `${SYSTEM_INSTRUCTION}

Extract company intelligence from the following website scrape and return a JSON object with these exact keys:
- summary (string): A 1-2 sentence description
- whatTheyDo (string[]): Up to 6 bullet points
- keywords (string[]): Up to 10 keywords
- signals (string[]): Up to 4 inferred signals
- thesisScore (integer 0-100): Alignment with B2B Software/AI VC thesis
- thesisExplanation (string): 1-2 sentence justification

URL: ${url}

CONTENT:
${markdownContent.slice(0, 60000)}

Respond ONLY with valid JSON, no markdown fences.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${groqKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: groqPrompt }],
            temperature: 0.3,
            response_format: { type: "json_object" },
        }),
    });

    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Groq API returned ${response.status}: ${errBody}`);
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content;
    if (!text) throw new Error("Empty response from Groq");

    return JSON.parse(text);
}

// ──────────────────────────────────────────────────────────────
// Main Enrichment Handler
// ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { url, companyId } = body;

        if (!url || !companyId) {
            return NextResponse.json({ error: "Missing 'url' or 'companyId' parameter" }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        // 0. Rate Limiting Check
        const { data: cData } = await supabase
            .from('companies')
            .select('last_enriched_at')
            .eq('id', companyId)
            .single();

        if (cData && cData.last_enriched_at) {
            const lastEnriched = new Date(cData.last_enriched_at).getTime();
            const now = new Date().getTime();
            const hoursSinceEnrichment = (now - lastEnriched) / (1000 * 60 * 60);

            if (hoursSinceEnrichment < 1) {
                return NextResponse.json({
                    error: "Rate Limit Exceeded: This company was recently enriched. Please wait an hour."
                }, { status: 429 });
            }
        }

        // 1. Normalize URL for scraping
        let scrapeUrl = url.trim();
        if (!scrapeUrl.startsWith('http')) {
            scrapeUrl = `https://${scrapeUrl}`;
        }
        scrapeUrl = scrapeUrl.replace(/\/+$/, '');

        // Extract clean domain for LLM context
        let cleanDomain = scrapeUrl;
        try { cleanDomain = new URL(scrapeUrl).hostname.replace(/^www\./, ''); } catch { }

        // 2. Scrape with Jina AI Reader (graceful fallback if it fails)
        let markdownContent = "";
        try {
            const jinaRes = await fetch(`https://r.jina.ai/${scrapeUrl}`, {
                headers: {
                    "Accept": "text/plain",
                    "X-Return-Format": "text",
                    "User-Agent": "Mozilla/5.0 (compatible; VCIntelligenceBot/1.0)",
                },
                signal: AbortSignal.timeout(20000),
            });

            if (jinaRes.ok) {
                markdownContent = await jinaRes.text();
            } else {
                console.warn(`Jina returned ${jinaRes.status} for ${scrapeUrl}`);
            }
        } catch (jinaError: any) {
            console.warn("Jina scrape failed (non-fatal):", jinaError.message);
        }

        // If Jina failed, instruct Gemini to use its training knowledge
        if (!markdownContent || markdownContent.trim().length < 50) {
            markdownContent = `IMPORTANT: The website at ${scrapeUrl} could not be scraped. However, you MUST still analyze this company using your training data and general knowledge.

Company domain: ${cleanDomain}
Company URL: ${scrapeUrl}

Use everything you know about this company from your training data. If this is a well-known company, provide detailed analysis. If this is an unknown company, make reasonable inferences from the domain name about what they likely do, their probable sector, and potential signals. Do NOT return empty fields — always provide your best assessment.`;
        }

        // 2. Extract structured data — try Gemini first, fallback to Groq
        let parsedData: any;
        let usedProvider = "gemini";

        const apiKey = process.env.GEMINI_API_KEY;

        if (apiKey) {
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({
                    model: "gemini-2.5-flash",
                    systemInstruction: SYSTEM_INSTRUCTION,
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: JSON_SCHEMA,
                    },
                });

                const prompt = `Extract company intelligence from the following website scrape:\n\nURL: ${url}\n\nCONTENT:\n${markdownContent.slice(0, 100000)}`;
                const result = await model.generateContent(prompt);
                const textRes = result.response.text();
                parsedData = JSON.parse(textRes);
            } catch (geminiError: any) {
                console.warn("Gemini extraction failed, falling back to Groq:", geminiError.message);
                try {
                    parsedData = await extractWithGroq(markdownContent, url);
                    usedProvider = "groq";
                } catch (groqError: any) {
                    console.error("Groq fallback also failed:", groqError.message);
                    throw new Error(`Both Gemini and Groq failed. Gemini: ${geminiError.message}. Groq: ${groqError.message}`);
                }
            }
        } else {
            // No Gemini key at all — go straight to Groq
            try {
                parsedData = await extractWithGroq(markdownContent, url);
                usedProvider = "groq";
            } catch (groqError: any) {
                throw new Error("No GEMINI_API_KEY set, and Groq fallback failed: " + groqError.message);
            }
        }

        const enrichedData = {
            ...parsedData,
            sources: [{ url: url, fetchedAt: new Date().toISOString(), provider: usedProvider }]
        };

        // 3. Generate Vector Embedding using gemini-embedding-001
        let embedding: number[] | null = null;

        if (apiKey) {
            try {
                const genAI = new GoogleGenerativeAI(apiKey);
                const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
                const embeddingText = `${parsedData.summary} ${parsedData.keywords?.join(", ") || ""}`;
                const embeddingResult = await embeddingModel.embedContent(embeddingText);
                embedding = embeddingResult.embedding.values;
            } catch (embeddingError: any) {
                console.warn("Embedding generation failed (non-fatal):", embeddingError.message);
                // Continue without embedding — enrichment data is still valuable
            }
        }

        // 4. Save to Supabase Postgres (Bypassing RLS with Service Role)
        const updatePayload: any = {
            enrichment_summary: enrichedData.summary,
            what_they_do: enrichedData.whatTheyDo,
            keywords: enrichedData.keywords,
            signals: enrichedData.signals,
            sources: enrichedData.sources,
            thesis_score: enrichedData.thesisScore,
            thesis_explanation: enrichedData.thesisExplanation,
            last_enriched_at: new Date().toISOString()
        };

        if (embedding) {
            updatePayload.embedding = embedding;
        }

        const { error: dbError } = await supabase
            .from("companies")
            .update(updatePayload)
            .eq("id", companyId);

        if (dbError) {
            console.error("Supabase Save Error:", dbError);
            return NextResponse.json({ error: "Failed to save enrichment to database: " + dbError.message }, { status: 500 });
        }

        return NextResponse.json(enrichedData);

    } catch (error: any) {
        console.error("Enrichment API Error:", error);
        return NextResponse.json(
            { error: error.message || "An unexpected error occurred during enrichment." },
            { status: 500 }
        );
    }
}
