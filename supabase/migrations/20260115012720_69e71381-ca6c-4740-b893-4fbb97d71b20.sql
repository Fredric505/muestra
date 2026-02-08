-- Add currency column to repairs table
ALTER TABLE public.repairs 
ADD COLUMN currency TEXT NOT NULL DEFAULT 'NIO' CHECK (currency IN ('NIO', 'USD'));

-- Add currency column to daily_earnings table
ALTER TABLE public.daily_earnings
ADD COLUMN currency TEXT NOT NULL DEFAULT 'NIO' CHECK (currency IN ('NIO', 'USD'));