-- Migration: FR-LUNAR-026 Collaborative Decision Boards

CREATE TABLE IF NOT EXISTS public.decision_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.decision_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.decision_boards(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    label TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.decision_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    option_id UUID NOT NULL REFERENCES public.decision_options(id) ON DELETE CASCADE,
    voter_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Realtime needs to be enabled for `decision_votes` so the frontend can subscribe
ALTER PUBLICATION supabase_realtime ADD TABLE public.decision_votes;

-- Setup RLS (Anonymous users can create and read)
ALTER TABLE public.decision_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_votes ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all boards, options, and votes
CREATE POLICY "Public read decision_boards" ON public.decision_boards FOR SELECT USING (true);
CREATE POLICY "Public read decision_options" ON public.decision_options FOR SELECT USING (true);
CREATE POLICY "Public read decision_votes" ON public.decision_votes FOR SELECT USING (true);

-- Allow public insert access
CREATE POLICY "Public insert decision_boards" ON public.decision_boards FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert decision_options" ON public.decision_options FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert decision_votes" ON public.decision_votes FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_decision_options_board_id ON public.decision_options(board_id);
CREATE INDEX IF NOT EXISTS idx_decision_votes_option_id ON public.decision_votes(option_id);
