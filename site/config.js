// Public client config. The anon key is meant to be public: every table is protected by row level security
// and only emails listed in public.admins can read anything. NEVER put the service_role key here.
window.AGENT_OPS_CONFIG = {
  supabaseUrl: "",      // https://<project-ref>.supabase.co
  supabaseAnonKey: "",  // Project Settings → API → anon public
};
