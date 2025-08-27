import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Phone, MapPin, Calendar, Eye, Edit } from "lucide-react";

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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editMember, setEditMember] = useState({
    full_name: "",
    phone: "",
    address: "",
    monthly_savings_target: 0,
  });
  const [newMember, setNewMember] = useState({
    full_name: "",
    phone: "",
    address: "",
    monthly_savings_target: 0,
  });
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

  const handleAddMember = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add members",
          variant: "destructive",
        });
        return;
      }

      // Generate member number
      const memberCount = members.length;
      const memberNumber = `MB${String(memberCount + 1).padStart(4, '0')}`;

      const { error } = await supabase
        .from("members")
        .insert([
          {
            ...newMember,
            member_number: memberNumber,
            status: "active",
            total_savings: 0,
            total_loans: 0,
            user_id: user.id,
          }
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member added successfully",
      });

      setIsAddDialogOpen(false);
      setNewMember({
        full_name: "",
        phone: "",
        address: "",
        monthly_savings_target: 0,
      });
      
      fetchMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to add member",
        variant: "destructive",
      });
    }
  };

  const handleViewMember = (member: Member) => {
    setSelectedMember(member);
    setIsViewDialogOpen(true);
  };

  const handleEditMember = (member: Member) => {
    setSelectedMember(member);
    setEditMember({
      full_name: member.full_name,
      phone: member.phone || "",
      address: member.address || "",
      monthly_savings_target: member.monthly_savings_target || 0,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateMember = async () => {
    if (!selectedMember) return;

    try {
      const { error } = await supabase
        .from("members")
        .update(editMember)
        .eq("id", selectedMember.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member updated successfully",
      });

      setIsEditDialogOpen(false);
      setSelectedMember(null);
      fetchMembers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update member",
        variant: "destructive",
      });
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
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={newMember.full_name}
                  onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newMember.address}
                  onChange={(e) => setNewMember({ ...newMember, address: e.target.value })}
                  placeholder="Enter address"
                />
              </div>
              <div>
                <Label htmlFor="monthly_savings_target">Monthly Savings Target (KES)</Label>
                <Input
                  id="monthly_savings_target"
                  type="number"
                  value={newMember.monthly_savings_target}
                  onChange={(e) => setNewMember({ ...newMember, monthly_savings_target: Number(e.target.value) })}
                  placeholder="Enter monthly savings target"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddMember}>
                  Add Member
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleViewMember(member)}
                >
                  <Eye className="mr-1 h-3 w-3" />
                  View Details
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleEditMember(member)}
                >
                  <Edit className="mr-1 h-3 w-3" />
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
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Member
                </Button>
              </DialogTrigger>
            </Dialog>
          )}
        </div>
      )}

      {/* View Member Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Member Number:</span>
                <span className="font-mono">{selectedMember.member_number}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Full Name:</span>
                <span>{selectedMember.full_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Phone:</span>
                <span>{selectedMember.phone || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Address:</span>
                <span className="text-right">{selectedMember.address || "N/A"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Date Joined:</span>
                <span>{new Date(selectedMember.date_joined).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Status:</span>
                <Badge
                  variant="secondary"
                  className={`${getStatusColor(selectedMember.status)} text-white`}
                >
                  {selectedMember.status}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Monthly Target:</span>
                <span>{formatCurrency(selectedMember.monthly_savings_target || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Savings:</span>
                <span className="text-green-600 font-semibold">
                  {formatCurrency(selectedMember.total_savings)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Loans:</span>
                <span className="text-blue-600 font-semibold">
                  {formatCurrency(selectedMember.total_loans)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_full_name">Full Name</Label>
              <Input
                id="edit_full_name"
                value={editMember.full_name}
                onChange={(e) => setEditMember({ ...editMember, full_name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            <div>
              <Label htmlFor="edit_phone">Phone Number</Label>
              <Input
                id="edit_phone"
                value={editMember.phone}
                onChange={(e) => setEditMember({ ...editMember, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="edit_address">Address</Label>
              <Input
                id="edit_address"
                value={editMember.address}
                onChange={(e) => setEditMember({ ...editMember, address: e.target.value })}
                placeholder="Enter address"
              />
            </div>
            <div>
              <Label htmlFor="edit_monthly_savings_target">Monthly Savings Target (KES)</Label>
              <Input
                id="edit_monthly_savings_target"
                type="number"
                value={editMember.monthly_savings_target}
                onChange={(e) => setEditMember({ ...editMember, monthly_savings_target: Number(e.target.value) })}
                placeholder="Enter monthly savings target"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateMember}>
                Update Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MembersSection;