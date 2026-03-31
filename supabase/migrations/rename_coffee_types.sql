-- 1. Rename column 'robusta_price' to 'kiboko_price' in buying_prices table
ALTER TABLE public.buying_prices 
RENAME COLUMN robusta_price TO kiboko_price;

-- 2. Drop the existing 'arabica_price' column from buying_prices table
ALTER TABLE public.buying_prices 
DROP COLUMN IF EXISTS arabica_price;

-- 3. Update existing 'Robusta' purchases to 'Kiboko'
UPDATE public.purchases 
SET coffee_type = 'Kiboko' 
WHERE coffee_type = 'Robusta';

-- 4. Delete existing 'Arabica' purchases (if it's safe to delete them, skip this if you want to keep historical Arabica data)
-- DELETE FROM public.purchases WHERE coffee_type = 'Arabica';

-- 5. Modify the coffee_type constraint on the purchases table to allow 'Kiboko' and remove 'Arabica' and 'Robusta'
-- First, drop the old constraint by name. 
-- *Note: You will need to check the exact name of your constraint in Supabase if this fails.*
-- Typically, Supabase names check constraints like 'purchases_coffee_type_check'
ALTER TABLE public.purchases 
DROP CONSTRAINT IF EXISTS purchases_coffee_type_check;

-- 6. Add the new constraint with the updated coffee types
ALTER TABLE public.purchases 
ADD CONSTRAINT purchases_coffee_type_check 
CHECK (coffee_type IN ('Kiboko', 'Red', 'Kase'));
