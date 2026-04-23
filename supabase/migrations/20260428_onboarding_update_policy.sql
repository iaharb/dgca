CREATE POLICY "Allow DGCA update onboarding_requests" ON onboarding_requests FOR UPDATE TO authenticated USING (true);
