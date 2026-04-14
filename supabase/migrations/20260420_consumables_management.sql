-- 20260420_consumables_management.sql
-- Create Inventory Items Table
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('BTP', 'BTAG')),
  current_stock INTEGER DEFAULT 0,
  reorder_threshold INTEGER DEFAULT 10,
  unit_price NUMERIC DEFAULT 0.00,
  threshold_breached BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Consumables Usage Table
CREATE TABLE IF NOT EXISTS consumables_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airline_id UUID REFERENCES airlines(id),
  item_id UUID REFERENCES inventory_items(id),
  quantity INTEGER NOT NULL,
  usage_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger Function to Decrement Stock and Flag Threshold
CREATE OR REPLACE FUNCTION handle_consumable_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stock and check threshold for the item being used
  UPDATE inventory_items
  SET current_stock = current_stock - NEW.quantity,
      threshold_breached = (current_stock - NEW.quantity) <= reorder_threshold,
      updated_at = now()
  WHERE id = NEW.item_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create Trigger
DROP TRIGGER IF EXISTS on_consumable_usage_added ON consumables_usage;
CREATE TRIGGER on_consumable_usage_added
AFTER INSERT ON consumables_usage
FOR EACH ROW
EXECUTE FUNCTION handle_consumable_usage();

-- Helper Function for Restocking
CREATE OR REPLACE FUNCTION restock_inventory_item(item_id UUID, added_quantity INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE inventory_items
  SET current_stock = current_stock + added_quantity,
      threshold_breached = (current_stock + added_quantity) <= reorder_threshold,
      updated_at = now()
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumables_usage ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for development)
DROP POLICY IF EXISTS "Public Read" ON inventory_items;
CREATE POLICY "Public Read" ON inventory_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated All" ON inventory_items;
CREATE POLICY "Authenticated All" ON inventory_items FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Public Read" ON consumables_usage;
CREATE POLICY "Public Read" ON consumables_usage FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated Insert" ON consumables_usage;
CREATE POLICY "Authenticated Insert" ON consumables_usage FOR INSERT TO authenticated WITH CHECK (true);

-- Seed Initial Items if they don't exist
INSERT INTO inventory_items (name, type, current_stock, reorder_threshold, unit_price)
SELECT 'Boarding Pass Roll (50pcs)', 'BTP', 500, 50, 12.50
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE type = 'BTP');

INSERT INTO inventory_items (name, type, current_stock, reorder_threshold, unit_price)
SELECT 'Bag Tag Roll (100pcs)', 'BTAG', 1000, 100, 8.75
WHERE NOT EXISTS (SELECT 1 FROM inventory_items WHERE type = 'BTAG');
