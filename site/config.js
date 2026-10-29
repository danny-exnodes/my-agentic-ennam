// Public client config. The anon key is meant to be public: every table is protected by row level security
// and only emails listed in public.admins can read anything. NEVER put the service_role key here.
window.AGENT_OPS_CONFIG = {
  supabaseUrl: "https://zclwbsguebfvfyvwoybt.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjbHdic2d1ZWJmdmZ5dndveWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNTU3NzMsImV4cCI6MjEwODgzMTc3M30.9Plz6XxO7HuJXkMNl2ABh7USjvw5j8hH2RHEf8SKY1U",
};
