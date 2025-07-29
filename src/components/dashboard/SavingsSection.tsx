import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Calendar, TrendingUp, TrendingDown, User, Receipt } from "lucide-react";
import { SavingsTransactionForm } from "@/components/forms/SavingsTransactionForm";

interface SavingsTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  transaction_date: string;
  description: string;
  receipt_number: string;
  balance_after: number;
  members: {
    full_name: string;
    member_number: string;
  };
}

const SavingsSection = () => {
  const [transactions, setTransactions] = useState<SavingsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalSavings, setTotalSavings] = useState(0);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
    fetchTotalSavings();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("savings")
        .select(`
          *,
          members!inner(full_name, member_number)
        `)
        .order("transaction_date", { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch savings transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTotalSavings = async () => {
    try {
      const { data, error } = await supabase
        .from("savings")
        .select("amount, transaction_type");

      if (error) throw error;

      const total = data?.reduce((sum, transaction) => {
        return transaction.transaction_type === "deposit" 
          ? sum + Number(transaction.amount)
          : sum - Number(transaction.amount);
      }, 0) || 0;

      setTotalSavings(total);
    } catch (error: any) {
      console.error("Error fetching total savings:", error);
    }
  };

  const filteredTransactions = transactions.filter(transaction =>
    transaction.members.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.members.member_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Savings</h2>
          <p className="text-muted-foreground">
            Track member savings deposits and withdrawals
          </p>
        </div>
        <Button onClick={() => setShowTransactionForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Transaction
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span>Total Savings Balance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(totalSavings)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Accumulated from all member savings
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by member, description, or receipt number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="space-y-3">
        {filteredTransactions.map((transaction) => (
          <Card key={transaction.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${
                    transaction.transaction_type === "deposit" 
                      ? "bg-green-100 text-green-600" 
                      : "bg-red-100 text-red-600"
                  }`}>
                    {transaction.transaction_type === "deposit" ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold">{transaction.members.full_name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {transaction.members.member_number}
                      </Badge>
                      <Badge
                        variant={transaction.transaction_type === "deposit" ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {transaction.transaction_type}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(transaction.transaction_date).toLocaleDateString()}</span>
                      </div>
                      
                      {transaction.receipt_number && (
                        <div className="flex items-center space-x-1">
                          <Receipt className="h-3 w-3" />
                          <span>{transaction.receipt_number}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>Recorded by admin</span>
                      </div>
                    </div>
                    
                    {transaction.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {transaction.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    transaction.transaction_type === "deposit" 
                      ? "text-green-600" 
                      : "text-red-600"
                  }`}>
                    {transaction.transaction_type === "deposit" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </div>
                  
                  {transaction.balance_after !== null && (
                    <p className="text-xs text-muted-foreground">
                      Balance: {formatCurrency(transaction.balance_after)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTransactions.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {searchTerm ? "No transactions found matching your search." : "No savings transactions recorded yet."}
          </p>
          {!searchTerm && (
            <Button className="mt-4" onClick={() => setShowTransactionForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Record First Transaction
            </Button>
          )}
        </div>
      )}

      <SavingsTransactionForm
        open={showTransactionForm}
        onOpenChange={setShowTransactionForm}
        onSuccess={() => {
          fetchTransactions();
          fetchTotalSavings();
        }}
      />
    </div>
  );
};

export default SavingsSection;