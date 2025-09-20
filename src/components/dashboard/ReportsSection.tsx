import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter, 
  TrendingUp, 
  Users, 
  CreditCard, 
  DollarSign,
  BarChart3,
  PieChart
} from "lucide-react";

interface LoanReport {
  id: string;
  loan_number: string;
  amount: number;
  interest_rate: number;
  status: string;
  application_date: string;
  total_amount_due: number;
  amount_paid: number;
  balance: number;
  members: {
    full_name: string;
    member_number: string;
  };
}

interface PaymentReport {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  receipt_number: string;
  loans: {
    loan_number: string;
    members: {
      full_name: string;
    };
  };
}

interface MemberReport {
  id: string;
  member_number: string;
  full_name: string;
  total_savings: number;
  date_joined: string;
  status: string;
}

const ReportsSection = () => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState("loans");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [memberFilter, setMemberFilter] = useState("all");
  
  const [loanReports, setLoanReports] = useState<LoanReport[]>([]);
  const [paymentReports, setPaymentReports] = useState<PaymentReport[]>([]);
  const [memberReports, setMemberReports] = useState<MemberReport[]>([]);
  const [members, setMembers] = useState<MemberReport[]>([]);
  
  const [summary, setSummary] = useState({
    totalLoans: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    activeMembers: 0,
    totalSavings: 0
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("members")
        .select("id, member_number, full_name, total_savings, date_joined, status")
        .order("full_name");

      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      console.error("Error fetching members:", error);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchLoanReports(),
        fetchPaymentReports(),
        fetchMemberReports(),
        calculateSummary()
      ]);

      toast({
        title: "Success",
        description: "Report generated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLoanReports = async () => {
    let query = supabase
      .from("loans")
      .select(`
        *,
        members!inner(full_name, member_number)
      `);

    if (dateFrom) {
      query = query.gte("application_date", dateFrom);
    }
    if (dateTo) {
      query = query.lte("application_date", dateTo);
    }
    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }
    if (memberFilter !== "all") {
      query = query.eq("member_id", memberFilter);
    }

    query = query.order("application_date", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    setLoanReports(data || []);
  };

  const fetchPaymentReports = async () => {
    let query = supabase
      .from("loan_payments")
      .select(`
        *,
        loans!inner(
          loan_number,
          members!inner(full_name)
        )
      `);

    if (dateFrom) {
      query = query.gte("payment_date", dateFrom);
    }
    if (dateTo) {
      query = query.lte("payment_date", dateTo);
    }

    query = query.order("payment_date", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    setPaymentReports(data || []);
  };

  const fetchMemberReports = async () => {
    let query = supabase
      .from("members")
      .select("*");

    if (dateFrom) {
      query = query.gte("date_joined", dateFrom);
    }
    if (dateTo) {
      query = query.lte("date_joined", dateTo);
    }

    query = query.order("date_joined", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    setMemberReports(data || []);
  };

  const calculateSummary = async () => {
    try {
      // Get loan summary
      const { data: loanSummary, error: loanError } = await supabase
        .from("loans")
        .select("amount, total_amount_due, amount_paid, balance, status");

      if (loanError) throw loanError;

      // Get member summary
      const { data: memberSummary, error: memberError } = await supabase
        .from("members")
        .select("total_savings, status");

      if (memberError) throw memberError;

      const totalLoans = loanSummary?.length || 0;
      const totalAmount = loanSummary?.reduce((sum, loan) => sum + (loan.amount || 0), 0) || 0;
      const totalPaid = loanSummary?.reduce((sum, loan) => sum + (loan.amount_paid || 0), 0) || 0;
      const totalOutstanding = loanSummary?.reduce((sum, loan) => sum + (loan.balance || 0), 0) || 0;
      const activeMembers = memberSummary?.filter(member => member.status === 'active').length || 0;
      const totalSavings = memberSummary?.reduce((sum, member) => sum + (member.total_savings || 0), 0) || 0;

      setSummary({
        totalLoans,
        totalAmount,
        totalPaid,
        totalOutstanding,
        activeMembers,
        totalSavings
      });
    } catch (error) {
      console.error("Error calculating summary:", error);
    }
  };

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
        return "bg-green-600";
      case "defaulted":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: "Warning",
        description: "No data to export",
        variant: "destructive",
      });
      return;
    }

    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'object' ? JSON.stringify(value) : value
      ).join(",")
    );
    
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            Generate comprehensive reports on loans, payments, and members
          </p>
        </div>
        <Button onClick={generateReport} disabled={loading}>
          <FileText className="mr-2 h-4 w-4" />
          {loading ? "Generating..." : "Generate Report"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalLoans}</div>
            <p className="text-xs text-muted-foreground">
              Total amount: {formatCurrency(summary.totalAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground">
              Outstanding: {formatCurrency(summary.totalOutstanding)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeMembers}</div>
            <p className="text-xs text-muted-foreground">
              Total savings: {formatCurrency(summary.totalSavings)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <Label>Status Filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="disbursed">Disbursed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="defaulted">Defaulted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Member Filter</Label>
              <Select value={memberFilter} onValueChange={setMemberFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs defaultValue="loans" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="loans">Loan Reports</TabsTrigger>
          <TabsTrigger value="payments">Payment Reports</TabsTrigger>
          <TabsTrigger value="members">Member Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="loans" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Loan Reports</CardTitle>
                <CardDescription>
                  Detailed loan information and status
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => exportToCSV(loanReports, "loan_report")}
                disabled={loanReports.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan #</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Application Date</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loanReports.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-mono">{loan.loan_number}</TableCell>
                      <TableCell>{loan.members.full_name}</TableCell>
                      <TableCell>{formatCurrency(loan.amount)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`${getStatusColor(loan.status)} text-white`}
                        >
                          {loan.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(loan.application_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(loan.amount_paid)}
                      </TableCell>
                      <TableCell className="text-red-600">
                        {formatCurrency(loan.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment Reports</CardTitle>
                <CardDescription>
                  All payment transactions and receipts
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => exportToCSV(paymentReports, "payment_report")}
                disabled={paymentReports.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Loan #</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentReports.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono">{payment.receipt_number}</TableCell>
                      <TableCell className="font-mono">{payment.loans.loan_number}</TableCell>
                      <TableCell>{payment.loans.members.full_name}</TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="capitalize">{payment.payment_method}</TableCell>
                      <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Member Reports</CardTitle>
                <CardDescription>
                  Member information and savings summary
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => exportToCSV(memberReports, "member_report")}
                disabled={memberReports.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Total Savings</TableHead>
                    <TableHead>Date Joined</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberReports.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-mono">{member.member_number}</TableCell>
                      <TableCell>{member.full_name}</TableCell>
                      <TableCell className="text-green-600">
                        {formatCurrency(member.total_savings)}
                      </TableCell>
                      <TableCell>{new Date(member.date_joined).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                          {member.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsSection;