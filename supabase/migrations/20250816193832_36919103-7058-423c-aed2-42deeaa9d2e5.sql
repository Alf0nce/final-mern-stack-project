-- Drop the restrictive policy and create a more permissive one for savings transactions
DROP POLICY IF EXISTS "Admins can manage savings" ON public.savings;

-- Allow authenticated users to insert savings transactions
CREATE POLICY "Authenticated users can record savings transactions" 
ON public.savings 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow admins and treasurers to update and delete savings
CREATE POLICY "Admins can update savings" 
ON public.savings 
FOR UPDATE 
USING (EXISTS ( 
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = ANY (ARRAY['admin'::text, 'treasurer'::text])
));

CREATE POLICY "Admins can delete savings" 
ON public.savings 
FOR DELETE 
USING (EXISTS ( 
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = ANY (ARRAY['admin'::text, 'treasurer'::text])
));