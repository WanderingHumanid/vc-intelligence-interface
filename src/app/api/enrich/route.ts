import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";

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
        }
    },
    required: ["summary", "whatTheyDo", "keywords", "signals"]
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { url } = body;

        if (!url) {
            return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
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

        return NextResponse.json(enrichedData);

    } catch (error: any) {
        console.error("Enrichment API Error:", error);
        return NextResponse.json(
            { error: error.message || "An unexpected error occurred during enrichment." },
            { status: 500 }
        );
    }
}
