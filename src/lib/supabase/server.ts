import { createClient } from "@supabase/supabase-js";

// A server-only client using the service role to bypass RLS for generating embeddings
export function getServiceSupabase() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Missing Supabase Service Role configuration");
    }

    return createClient(supabaseUrl, serviceRoleKey);
}
