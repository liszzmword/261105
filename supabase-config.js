// Copy your project's URL and publishable/anon key from Supabase settings.
// This file is loaded in the browser. Never put a service_role or secret key here.
const BLOCKDROP_SUPABASE_CONFIG = {
  url: 'https://trntyoplmnvnetkrtnoh.supabase.co',
  anonKey: 'sb_publishable_SECeTobPV2W_9x06ZazuDg_khS0gfKb'
};
if (typeof window !== 'undefined') window.BLOCKDROP_SUPABASE_CONFIG = BLOCKDROP_SUPABASE_CONFIG;
if (typeof module !== 'undefined') module.exports = BLOCKDROP_SUPABASE_CONFIG;
