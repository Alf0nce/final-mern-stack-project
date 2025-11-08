-- Fix user_roles public exposure by restricting SELECT to authenticated users only
DROP POLICY IF EXISTS "Anyone can view user roles" ON public.user_roles;

CREATE POLICY "Authenticated users can view user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);