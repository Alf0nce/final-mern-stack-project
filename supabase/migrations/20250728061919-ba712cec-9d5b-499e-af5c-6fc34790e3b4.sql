-- Clean up existing policies and create proper ones for members table
DROP POLICY IF EXISTS "Authenticated users can view all members" ON public.members;
DROP POLICY IF EXISTS "Users can view all members" ON public.members;
DROP POLICY IF EXISTS "Users can insert their own member record" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can update members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can delete members" ON public.members;

-- Create clean policies for members table
CREATE POLICY "Anyone can view members" 
ON public.members 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own member record" 
ON public.members 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update members" 
ON public.members 
FOR UPDATE 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete members" 
ON public.members 
FOR DELETE 
USING (auth.uid() IS NOT NULL);