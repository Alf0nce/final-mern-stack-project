import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LoanInterest {
  id: string;
  loan_number: string;
  member_name: string;
  amount: number;
  interest_rate: number;
  total_amount_due: number;
  interest_amount: number;
  amount_paid: number;
  interest_received: number;
  status: string;
  approval_date: string;
}

const InterestSection = () => {
  const [loans, setLoans] = useState<LoanInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalInterestEarned, setTotalInterestEarned] = useState(0);
  const [totalInterestPending, setTotalInterestPending] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchInterestData();
  }, []);

  const fetchInterestData = async () => {
    try {
      const { data, error } = await supabase
        .from("loans")
        .select(`
          id,
          loan_number,
          amount,
          interest_rate,
          total_amount_due,
          amount_paid,
          status,
          approval_date,
          members!inner(full_name)
        `)
        .eq("status", "approved");

      if (error) throw error;

      const interestData = data.map((loan: any) => {
        const interestAmount = loan.total_amount_due - loan.amount;
        const interestReceived = Math.min(
          Math.max(loan.amount_paid - loan.amount, 0),
          interestAmount
        );

        return {
          id: loan.id,
          loan_number: loan.loan_number,
          member_name: loan.members.full_name,
          amount: loan.amount,
          interest_rate: loan.interest_rate,
          total_amount_due: loan.total_amount_due,
          interest_amount: interestAmount,
          amount_paid: loan.amount_paid,
          interest_received: interestReceived,
          status: loan.status,
          approval_date: loan.approval_date,
        };
      });

      setLoans(interestData);

      // Calculate totals
      const totalEarned = interestData.reduce((sum, loan) => sum + loan.interest_received, 0);
      const totalPending = interestData.reduce((sum, loan) => sum + (loan.interest_amount - loan.interest_received), 0);
      
      setTotalInterestEarned(totalEarned);
      setTotalInterestPending(totalPending);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch interest data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Interest Received</h2>
          <p className="text-muted-foreground">
            Track interest earnings from approved loans
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interest Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalInterestEarned)}
            </div>
            <p className="text-xs text-muted-foreground">
              Interest collected from loan payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Interest</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(totalInterestPending)}
            </div>
            <p className="text-xs text-muted-foreground">
              Outstanding interest to be collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expected</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalInterestEarned + totalInterestPending)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total interest from all approved loans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Interest Table */}
      <Card>
        <CardHeader>
          <CardTitle>Interest Breakdown by Loan</CardTitle>
          <CardDescription>
            Detailed view of interest earnings from each approved loan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan #</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Principal Amount</TableHead>
                <TableHead>Interest Rate</TableHead>
                <TableHead>Expected Interest</TableHead>
                <TableHead>Interest Received</TableHead>
                <TableHead>Pending Interest</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approval Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">{loan.loan_number}</TableCell>
                  <TableCell>{loan.member_name}</TableCell>
                  <TableCell>{formatCurrency(loan.amount)}</TableCell>
                  <TableCell>{loan.interest_rate}%</TableCell>
                  <TableCell>{formatCurrency(loan.interest_amount)}</TableCell>
                  <TableCell className="text-green-600 font-medium">
                    {formatCurrency(loan.interest_received)}
                  </TableCell>
                  <TableCell className="text-orange-600">
                    {formatCurrency(loan.interest_amount - loan.interest_received)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={loan.amount_paid >= loan.total_amount_due ? "default" : "secondary"}>
                      {loan.amount_paid >= loan.total_amount_due ? "Fully Paid" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(loan.approval_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {loans.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No approved loans found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InterestSection;