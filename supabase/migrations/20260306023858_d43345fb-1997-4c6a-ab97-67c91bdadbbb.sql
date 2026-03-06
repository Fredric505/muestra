
-- Drop the overly permissive anon policy and replace with a more controlled one
DROP POLICY "Anon can insert registration IPs" ON public.registration_ips;
