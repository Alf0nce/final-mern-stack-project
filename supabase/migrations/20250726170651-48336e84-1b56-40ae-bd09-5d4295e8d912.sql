-- Allow users to insert their own member record during signup
DROP POLICY IF EXISTS "Authenticated users can manage members" ON public.members;

-- Create separate policies for different operations
CREATE POLICY "Users can view all members" 
ON public.members 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own member record" 
ON public.members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update members" 
ON public.members 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete members" 
ON public.members 
FOR DELETE 
USING (auth.uid() IS NOT NULL);