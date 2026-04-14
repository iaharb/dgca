-- Create notifications table for audit history and workflow alerts
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id), -- Null if public/global for admins
  airline_id UUID REFERENCES airlines(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'action_required'
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}', -- Store airline_id, agreement_id, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own notifications or global ones if they are DGCA
CREATE POLICY "Users see relevant notifications" ON notifications
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'dgca' OR profiles.role = 'operations_partner')
  )
);

-- Allow system to insert notifications (from edge functions or triggered roles)
CREATE POLICY "System Insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
