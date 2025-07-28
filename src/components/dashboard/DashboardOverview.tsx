import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, DollarSign, PiggyBank, TrendingUp } from "lucide-react";

interface DashboardStats {
  totalMembers: number;
  activeLoans: number;
  totalSavings: number;
  totalLoanAmount: number;
}

const DashboardOverview = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeLoans: 0,
    totalSavings: 0,
    totalLoanAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch total members
      const { count: membersCount } = await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Fetch active loans
      const { count: loansCount } = await supabase
        .from("loans")
        .select("*", { count: "exact", head: true })
        .in("status", ["approved", "disbursed"]);

      // Fetch total savings
      const { data: savingsData } = await supabase
        .from("savings")
        .select("amount, transaction_type");

      let totalSavings = 0;
      if (savingsData) {
        totalSavings = savingsData.reduce((sum, transaction) => {
          return transaction.transaction_type === "deposit" 
            ? sum + Number(transaction.amount)
            : sum - Number(transaction.amount);
        }, 0);
      }

      // Fetch total loan amount
      const { data: loansData } = await supabase
        .from("loans")
        .select("amount")
        .in("status", ["approved", "disbursed"]);

      const totalLoanAmount = loansData?.reduce((sum, loan) => sum + Number(loan.amount), 0) || 0;

      setStats({
        totalMembers: membersCount || 0,
        activeLoans: loansCount || 0,
        totalSavings,
        totalLoanAmount,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount);
  };

  const statCards = [
    {
      title: "Total Members",
      value: stats.totalMembers,
      description: "Active CBO members",
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Active Loans",
      value: stats.activeLoans,
      description: "Currently active loans",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "Total Savings",
      value: formatCurrency(stats.totalSavings),
      description: "Total member savings",
      icon: PiggyBank,
      color: "text-purple-600",
    },
    {
      title: "Loan Portfolio",
      value: formatCurrency(stats.totalLoanAmount),
      description: "Total loans disbursed",
      icon: TrendingUp,
      color: "text-orange-600",
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-muted rounded animate-pulse"></div>
              </CardTitle>
              <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded animate-pulse mb-1"></div>
              <div className="h-3 bg-muted rounded animate-pulse w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-muted-foreground">
          Monitor your CBO's performance and activities
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest transactions and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New member registration</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Loan payment received</p>
                  <p className="text-xs text-muted-foreground">5 hours ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Savings deposit made</p>
                  <p className="text-xs text-muted-foreground">1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div 
                className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  toast({
                    title: "Record Savings Deposit",
                    description: "Savings transaction form will be implemented soon",
                  });
                }}
              >
                <p className="text-sm font-medium">Record new savings deposit</p>
                <p className="text-xs text-muted-foreground">Add member savings transaction</p>
              </div>
              <div 
                className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  toast({
                    title: "Process Loan Payment",
                    description: "Loan payment form will be implemented soon",
                  });
                }}
              >
                <p className="text-sm font-medium">Process loan payment</p>
                <p className="text-xs text-muted-foreground">Record loan repayment</p>
              </div>
              <div 
                className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => {
                  toast({
                    title: "Generate Reports",
                    description: "Report generation feature will be implemented soon",
                  });
                }}
              >
                <p className="text-sm font-medium">Generate reports</p>
                <p className="text-xs text-muted-foreground">Export financial reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;