-- Create app_settings table
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  is_initiated BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert default row
INSERT INTO public.app_settings (id, is_initiated)
VALUES ('global', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to app_settings"
  ON public.app_settings FOR SELECT
  USING (true);

-- Allow public update access for 'is_initiated' logic in demo app (since we don't have true admin auth yet in this scaffold)
CREATE POLICY "Allow public update access to app_settings"
  ON public.app_settings FOR UPDATE
  USING (true);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  user_id UUID PRIMARY KEY,
  user_type TEXT CHECK (user_type IN ('dgca', 'airline')),
  airline_code TEXT,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for demo (typically would be restricted to auth.uid() = user_id)
CREATE POLICY "Allow public access to user_sessions"
  ON public.user_sessions FOR ALL
  USING (true);
