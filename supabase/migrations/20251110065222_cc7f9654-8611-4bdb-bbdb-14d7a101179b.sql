-- ============================================
-- FIX 1: Prevent Privilege Escalation via Profile Self-Update
-- ============================================

-- Restrict profile updates to prevent users from modifying their own role field
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  -- Prevent role modification - role must remain unchanged
  role = (SELECT role FROM profiles WHERE user_id = auth.uid())
);

-- ============================================
-- FIX 2: Restrict Public Profile Viewing
-- ============================================

-- Replace public profile viewing with user-only access
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- ============================================
-- FIX 3: Restrict Member PII Exposure
-- ============================================

-- Replace broad member viewing with restricted access
DROP POLICY IF EXISTS "Authenticated users can view members" ON public.members;

CREATE POLICY "Users can view their own member record"
ON public.members FOR SELECT
USING (
  auth.uid() = user_id OR 
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'treasurer'::app_role)
);

-- ============================================
-- FIX 4: Migrate policies from profiles.role to has_role()
-- ============================================

-- Fix loans UPDATE policy
DROP POLICY IF EXISTS "Admins can manage loans" ON public.loans;

CREATE POLICY "Admins can manage loans"
ON public.loans FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'treasurer'::app_role)
);

-- Fix loan_payments INSERT policy
DROP POLICY IF EXISTS "Admins can record payments" ON public.loan_payments;

CREATE POLICY "Admins can record payments"
ON public.loan_payments FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'treasurer'::app_role)
);

-- Fix savings DELETE policy
DROP POLICY IF EXISTS "Admins can delete savings" ON public.savings;

CREATE POLICY "Admins can delete savings"
ON public.savings FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'treasurer'::app_role)
);

-- Fix savings UPDATE policy
DROP POLICY IF EXISTS "Admins can update savings" ON public.savings;

CREATE POLICY "Admins can update savings"
ON public.savings FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'treasurer'::app_role)
);