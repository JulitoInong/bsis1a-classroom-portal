// ========================================
// SUPABASE CONFIG
// ========================================
// 1. Pumunta sa Supabase Project Settings > API
// 2. Kopyahin ang "Project URL" at ilagay sa baba
// 3. Kopyahin ang "anon public" key at ilagay sa baba
// (HUWAG ilagay dito ang "service_role" key)

const SUPABASE_URL = "https://gcxyusbnrjigvlvuxymu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_QsBPLeH06yqFOfF2wurOhw_NJg6rXeK";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);
