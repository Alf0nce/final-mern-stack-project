-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'treasurer', 'secretary', 'member')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create members table for CBO membership details
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  national_id TEXT,
  address TEXT,
  date_joined DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  monthly_savings_target DECIMAL(10,2) DEFAULT 0,
  total_savings DECIMAL(10,2) DEFAULT 0,
  total_loans DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create loans table
CREATE TABLE public.loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_number TEXT NOT NULL UNIQUE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  interest_rate DECIMAL(5,2) NOT NULL DEFAULT 10.0,
  duration_months INTEGER NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'disbursed', 'completed', 'defaulted')),
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  approval_date DATE,
  disbursement_date DATE,
  due_date DATE,
  total_amount_due DECIMAL(10,2),
  amount_paid DECIMAL(10,2) DEFAULT 0,
  balance DECIMAL(10,2),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create loan_payments table
CREATE TABLE public.loan_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  receipt_number TEXT,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create savings table
CREATE TABLE public.savings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal')),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  recorded_by UUID NOT NULL REFERENCES auth.users(id),
  receipt_number TEXT,
  balance_after DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policies for members (all authenticated users can view all members)
CREATE POLICY "Authenticated users can view all members" ON public.members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage members" ON public.members
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'treasurer', 'secretary')
    )
  );

-- Create policies for loans
CREATE POLICY "Users can view all loans" ON public.loans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Members can apply for loans" ON public.loans
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members 
      WHERE user_id = auth.uid() AND id = member_id
    )
  );

CREATE POLICY "Admins can manage loans" ON public.loans
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'treasurer')
    )
  );

-- Create policies for loan_payments
CREATE POLICY "Users can view all loan payments" ON public.loan_payments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can record payments" ON public.loan_payments
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'treasurer')
    )
  );

-- Create policies for savings
CREATE POLICY "Users can view all savings" ON public.savings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage savings" ON public.savings
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'treasurer')
    )
  );

-- Create function to automatically update member totals
CREATE OR REPLACE FUNCTION update_member_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update savings total
  UPDATE public.members 
  SET total_savings = (
    SELECT COALESCE(
      SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE -amount END), 0
    )
    FROM public.savings 
    WHERE member_id = NEW.member_id
  )
  WHERE id = NEW.member_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for savings
CREATE TRIGGER update_member_savings_total
  AFTER INSERT OR UPDATE OR DELETE ON public.savings
  FOR EACH ROW EXECUTE FUNCTION update_member_totals();

-- Create function to update loan balances
CREATE OR REPLACE FUNCTION update_loan_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Update loan balance
  UPDATE public.loans 
  SET amount_paid = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.loan_payments 
    WHERE loan_id = NEW.loan_id
  ),
  balance = total_amount_due - (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.loan_payments 
    WHERE loan_id = NEW.loan_id
  )
  WHERE id = NEW.loan_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for loan payments
CREATE TRIGGER update_loan_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.loan_payments
  FOR EACH ROW EXECUTE FUNCTION update_loan_balance();

-- Create function to calculate total amount due when loan is approved
CREATE OR REPLACE FUNCTION calculate_loan_total()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.total_amount_due = NEW.amount + (NEW.amount * NEW.interest_rate / 100);
    NEW.balance = NEW.total_amount_due;
    NEW.approval_date = CURRENT_DATE;
    
    -- Calculate due date
    NEW.due_date = NEW.approval_date + (NEW.duration_months || ' months')::INTERVAL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for loan calculations
CREATE TRIGGER calculate_loan_total_trigger
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION calculate_loan_total();

-- Create function to auto-generate member numbers
CREATE OR REPLACE FUNCTION generate_member_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.member_number IS NULL OR NEW.member_number = '' THEN
    NEW.member_number = 'ALF' || LPAD((SELECT COUNT(*) + 1 FROM public.members)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for member number generation
CREATE TRIGGER generate_member_number_trigger
  BEFORE INSERT ON public.members
  FOR EACH ROW EXECUTE FUNCTION generate_member_number();

-- Create function to auto-generate loan numbers
CREATE OR REPLACE FUNCTION generate_loan_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.loan_number IS NULL OR NEW.loan_number = '' THEN
    NEW.loan_number = 'LN' || TO_CHAR(CURRENT_DATE, 'YYYY') || LPAD((SELECT COUNT(*) + 1 FROM public.loans WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE))::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for loan number generation
CREATE TRIGGER generate_loan_number_trigger
  BEFORE INSERT ON public.loans
  FOR EACH ROW EXECUTE FUNCTION generate_loan_number();

-- Create function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();