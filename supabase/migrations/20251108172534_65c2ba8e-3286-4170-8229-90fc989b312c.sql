-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'treasurer', 'member');

-- Create user_roles table for role-based access control
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view roles (needed for UI)
CREATE POLICY "Anyone can view user roles"
ON public.user_roles
FOR SELECT
USING (true);

-- Policy: Only admins can manage roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, role::app_role
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- FIX ISSUE #1: Remove public access to members table
DROP POLICY IF EXISTS "Anyone can view members" ON public.members;

CREATE POLICY "Authenticated users can view members"
ON public.members
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- FIX ISSUE #3: Restrict member updates/deletes to admins and treasurers only
DROP POLICY IF EXISTS "Authenticated users can update members" ON public.members;
DROP POLICY IF EXISTS "Authenticated users can delete members" ON public.members;

CREATE POLICY "Admins and treasurers can update members"
ON public.members
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'treasurer'));

CREATE POLICY "Admins and treasurers can delete members"
ON public.members
FOR DELETE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'treasurer'));

-- FIX ISSUE #2: Restrict loans access to authenticated users
DROP POLICY IF EXISTS "Users can view all loans" ON public.loans;

CREATE POLICY "Authenticated users can view loans"
ON public.loans
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Also restrict loan_payments and savings to authenticated users
DROP POLICY IF EXISTS "Users can view all loan payments" ON public.loan_payments;

CREATE POLICY "Authenticated users can view loan payments"
ON public.loan_payments
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view all savings" ON public.savings;

CREATE POLICY "Authenticated users can view savings"
ON public.savings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Update handle_new_user function to use user_roles instead of profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email), 
    'member'
  );
  
  -- Insert default member role into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member');
  
  RETURN NEW;
END;
$$;