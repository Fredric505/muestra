-- Add 'failed' to the repair_status enum
ALTER TYPE public.repair_status ADD VALUE IF NOT EXISTS 'failed';

-- Add a column to store the failure reason
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS failure_reason TEXT;