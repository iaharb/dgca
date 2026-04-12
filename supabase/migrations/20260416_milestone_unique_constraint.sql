-- Ensure upserts on integration_milestones work correctly by agreement+type
ALTER TABLE integration_milestones
  DROP CONSTRAINT IF EXISTS integration_milestones_agreement_id_milestone_type_key;

ALTER TABLE integration_milestones
  ADD CONSTRAINT integration_milestones_agreement_id_milestone_type_key
  UNIQUE (agreement_id, milestone_type);
