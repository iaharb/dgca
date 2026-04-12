-- Allow authenticated users to perform full telemetry syncs
DO $do$
BEGIN
  -- Airlines
  CREATE POLICY "Allow Auth Inserts" ON airlines FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "Allow Auth Updates" ON airlines FOR UPDATE TO authenticated USING (true);

  -- Agreements
  CREATE POLICY "Allow Auth Inserts" ON agreements FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "Allow Auth Updates" ON agreements FOR UPDATE TO authenticated USING (true);

  -- Integration Milestones
  CREATE POLICY "Allow Auth Inserts" ON integration_milestones FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "Allow Auth Updates" ON integration_milestones FOR UPDATE TO authenticated USING (true);

  -- Usage Metrics
  CREATE POLICY "Allow Auth Inserts" ON usage_metrics FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "Allow Auth Updates" ON usage_metrics FOR UPDATE TO authenticated USING (true);

  -- Penalty Ledger
  CREATE POLICY "Allow Auth Inserts" ON penalty_ledger FOR INSERT TO authenticated WITH CHECK (true);
  CREATE POLICY "Allow Auth Updates" ON penalty_ledger FOR UPDATE TO authenticated USING (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $do$;
