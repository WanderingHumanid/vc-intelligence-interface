import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with Service Role Key to bypass RLS for inserting new companies
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
    try {
        const { url, name } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Extremely basic URL cleaning to get a readable 'domain' as required by the schema
        let domain = url.trim();
        try {
            const urlObj = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
            domain = urlObj.hostname.replace(/^www\./, '');
        } catch (e) {
            // fallback if URL parsing fails completely
            domain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        }

        const newCompanyData = {
            name: name || domain,
            domain: domain,
            sector: 'Uncategorized',
            stage: 'Unknown',
            location: 'Unknown',
            description: 'Pending AI Enrichment',
        };

        const { data, error } = await supabase
            .from('companies')
            .upsert(newCompanyData, { onConflict: 'domain' })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, company: data });

    } catch (error: any) {
        console.error('Error tracking new company:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
