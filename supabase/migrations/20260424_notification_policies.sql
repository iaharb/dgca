-- Add UPDATE policy for notifications to allow users to mark them as read
CREATE POLICY "Users can update their own notification read status" ON notifications
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.role = 'dgca' OR profiles.role = 'operations_partner')
  )
)
WITH CHECK (
  is_read IS NOT NULL -- Allow updating the read status
);
