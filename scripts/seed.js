const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase URL or Service Role Key in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log("Reading data/companies.json...");
    const dataPath = path.join(__dirname, '..', 'data', 'companies.json');
    const companiesData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    console.log(`Found ${companiesData.length} companies. Upserting into Supabase...`);

    for (const company of companiesData) {
        const { id, ...rest } = company;
        // Note: We don't map the old random UUID "id" string from the JSON string array directly, 
        // letting Postgres create its own ID or we can force mapping.
        // To ensure idempotency (not duplicating), we match on 'domain'.

        const { error } = await supabase
            .from('companies')
            .upsert(
                {
                    name: rest.name,
                    domain: rest.website.replace(/^https?:\/\//, '').replace(/\/$/, ''),
                    sector: rest.sector,
                    stage: rest.stage,
                    location: rest.location,
                    description: rest.description,
                    founded: rest.founded || null,
                    headcount: rest.headcount || null
                },
                { onConflict: 'domain' }
            );

        if (error) {
            console.error(`Error inserting ${rest.name}:`, error.message);
        } else {
            console.log(`Upserted ${rest.name}`);
        }
    }

    console.log("Seed complete.");
}

seed().catch(console.error);
