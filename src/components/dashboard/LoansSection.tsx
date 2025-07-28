import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Calendar, DollarSign, Clock, User } from "lucide-react";

interface Loan {
  id: string;
  loan_number: string;
  amount: number;
  interest_rate: number;
  duration_months: number;
  purpose: string;
  status: string;
  application_date: string;
  due_date: string;
  total_amount_due: number;
  amount_paid: number;
  balance: number;
  members: {
    full_name: string;
    member_number: string;
  };
}

const LoansSection = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const { data, error } = await supabase
        .from("loans")
        .select(`
          *,
          members!inner(full_name, member_number)
        `)
        .order("application_date", { ascending: false });

      if (error) throw error;
      setLoans(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch loans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLoans = loans.filter(loan =>
    loan.loan_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loan.members.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loan.purpose.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount || 0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "approved":
        return "bg-blue-500";
      case "disbursed":
        return "bg-green-500";
      case "completed":
        return "bg-gray-500";
      case "defaulted":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Loans</h2>
          <p className="text-muted-foreground">
            Manage loan applications, approvals, and repayments
          </p>
        </div>
        <Button onClick={() => {
          toast({
            title: "New Loan",
            description: "Loan application form will be implemented soon",
          });
        }}>
          <Plus className="mr-2 h-4 w-4" />
          New Loan
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search loans by number, member, or purpose..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filteredLoans.map((loan) => (
          <Card key={loan.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-mono">
                    {loan.loan_number}
                  </CardTitle>
                  <CardDescription>
                    {loan.purpose}
                  </CardDescription>
                </div>
                <Badge
                  variant="secondary"
                  className={`${getStatusColor(loan.status)} text-white`}
                >
                  {getStatusLabel(loan.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 text-sm">
                <User className="h-3 w-3 text-muted-foreground" />
                <span>{loan.members.full_name}</span>
                <span className="text-muted-foreground">
                  ({loan.members.member_number})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground mb-1">
                    <DollarSign className="h-3 w-3" />
                    <span>Loan Amount</span>
                  </div>
                  <p className="font-semibold text-blue-600">
                    {formatCurrency(loan.amount)}
                  </p>
                </div>
                
                <div>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground mb-1">
                    <Clock className="h-3 w-3" />
                    <span>Duration</span>
                  </div>
                  <p className="font-semibold">
                    {loan.duration_months} months
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Interest Rate</p>
                  <p className="font-semibold">{loan.interest_rate}%</p>
                </div>
                
                <div>
                  <p className="text-xs text-muted-foreground">Total Due</p>
                  <p className="font-semibold text-orange-600">
                    {formatCurrency(loan.total_amount_due)}
                  </p>
                </div>
              </div>

              {loan.status !== "pending" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Amount Paid</p>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(loan.amount_paid)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="font-semibold text-red-600">
                      {formatCurrency(loan.balance)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2 text-sm pt-2 border-t">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span>Applied: {new Date(loan.application_date).toLocaleDateString()}</span>
                {loan.due_date && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span>Due: {new Date(loan.due_date).toLocaleDateString()}</span>
                  </>
                )}
              </div>

              <div className="flex space-x-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  View Details
                </Button>
                {loan.status === "pending" && (
                  <Button size="sm" className="flex-1">
                    Approve
                  </Button>
                )}
                {(loan.status === "approved" || loan.status === "disbursed") && (
                  <Button size="sm" className="flex-1">
                    Record Payment
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLoans.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {searchTerm ? "No loans found matching your search." : "No loans applied yet."}
          </p>
          {!searchTerm && (
            <Button className="mt-4" onClick={() => {
              toast({
                title: "Create First Loan",
                description: "Loan application form will be implemented soon",
              });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Loan
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default LoansSection;