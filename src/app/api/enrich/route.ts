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

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { url, companyId } = body;

        if (!url || !companyId) {
            return NextResponse.json({ error: "Missing 'url' or 'companyId' parameter" }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        // 0. Rate Limiting Check (Stretch Goal: Backoff / Rate Limit)
        const { data: cData } = await supabase
            .from('companies')
            .select('last_enriched_at')
            .eq('id', companyId)
            .single();

        if (cData && cData.last_enriched_at) {
            const lastEnriched = new Date(cData.last_enriched_at).getTime();
            const now = new Date().getTime();
            const hoursSinceEnrichment = (now - lastEnriched) / (1000 * 60 * 60);

            // Limit to 1 enrichment per hour per company to prevent LLM abuse
            if (hoursSinceEnrichment < 1) {
                return NextResponse.json({
                    error: "Rate Limit Exceeded: This company was recently enriched. Please wait an hour."
                }, { status: 429 });
            }
        }

        // 1. Scrape with Jina AI Reader
        const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
            headers: {
                Accept: "text/plain", // Request pure markdown
            }
        });

        if (!jinaRes.ok) {
            return NextResponse.json(
                { error: `Failed to scrape website via Jina AI (${jinaRes.status})` },
                { status: 502 }
            );
        }

        const markdownContent = await jinaRes.text();

        if (!markdownContent || markdownContent.trim() === "") {
            return NextResponse.json({ error: "No content extracted from the URL." }, { status: 404 });
        }

        // 2. Extract structured data with Gemini
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("GEMINI_API_KEY environment variable is not set.");
            return NextResponse.json(
                { error: "Server configuration error: Gemini API key missing." },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: SYSTEM_INSTRUCTION,
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: JSON_SCHEMA,
            },
        });

        const prompt = `Extract company intelligence from the following website scrape:\n\nURL: ${url}\n\nCONTENT:\n${markdownContent.slice(0, 100000)}`; // Trim to avoid crazy large pages exceeding limits, though Gemini flash handles 1M

        const result = await model.generateContent(prompt);
        const textRes = result.response.text();
        const parsedData = JSON.parse(textRes);

        // Provide the required sources array appendage
        const enrichedData = {
            ...parsedData,
            sources: [
                {
                    url: url,
                    fetchedAt: new Date().toISOString()
                }
            ]
        };

        // 3. Generate Vector Embedding using text-embedding-004
        const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const embeddingText = `${parsedData.summary} ${parsedData.keywords.join(", ")}`;
        const embeddingResult = await embeddingModel.embedContent(embeddingText);

        const embedding = embeddingResult.embedding.values;

        // 4. Save securely to Supabase Postgres (Bypassing RLS with Service Role)
        const { error: dbError } = await supabase
            .from("companies")
            .update({
                enrichment_summary: enrichedData.summary,
                what_they_do: enrichedData.whatTheyDo,
                keywords: enrichedData.keywords,
                signals: enrichedData.signals,
                sources: enrichedData.sources,
                thesis_score: enrichedData.thesisScore,
                thesis_explanation: enrichedData.thesisExplanation,
                embedding: embedding,
                last_enriched_at: new Date().toISOString()
            })
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
