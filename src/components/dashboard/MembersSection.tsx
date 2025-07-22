import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Phone, MapPin, Calendar } from "lucide-react";

interface Member {
  id: string;
  member_number: string;
  full_name: string;
  phone: string;
  address: string;
  date_joined: string;
  status: string;
  monthly_savings_target: number;
  total_savings: number;
  total_loans: number;
}

const MembersSection = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("date_joined", { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(member =>
    member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.member_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "inactive":
        return "bg-yellow-500";
      case "suspended":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Members</h2>
          <p className="text-muted-foreground">
            Manage CBO members and their information
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members by name, number, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMembers.map((member) => (
          <Card key={member.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{member.full_name}</CardTitle>
                  <CardDescription className="font-mono">
                    {member.member_number}
                  </CardDescription>
                </div>
                <Badge
                  variant="secondary"
                  className={`${getStatusColor(member.status)} text-white`}
                >
                  {member.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {member.phone && (
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span>{member.phone}</span>
                </div>
              )}
              
              {member.address && (
                <div className="flex items-center space-x-2 text-sm">
                  <MapPin className="h-3 w-3 text-muted-foreground" />
                  <span className="truncate">{member.address}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span>
                  Joined {new Date(member.date_joined).toLocaleDateString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Savings</p>
                  <p className="font-semibold text-green-600">
                    {formatCurrency(member.total_savings)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Loans</p>
                  <p className="font-semibold text-blue-600">
                    {formatCurrency(member.total_loans)}
                  </p>
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  View Details
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMembers.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {searchTerm ? "No members found matching your search." : "No members registered yet."}
          </p>
          {!searchTerm && (
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add First Member
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default MembersSection;