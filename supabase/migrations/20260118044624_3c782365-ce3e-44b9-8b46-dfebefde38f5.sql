-- Add warranty_days column to repairs table
ALTER TABLE public.repairs 
ADD COLUMN warranty_days integer DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.repairs.warranty_days IS 'Días de garantía para la reparación';