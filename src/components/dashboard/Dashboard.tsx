import { useState } from "react";
import { User } from "@supabase/supabase-js";
import unityLogo from "@/assets/unity-logo.png";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardOverview from "./DashboardOverview";
import MembersSection from "./MembersSection";
import LoansSection from "./LoansSection";
import SavingsSection from "./SavingsSection";
import { 
  Home, 
  Users, 
  DollarSign, 
  PiggyBank, 
  LogOut,
  Building2,
  Menu
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface DashboardProps {
  user: User;
}

type Section = "overview" | "members" | "loans" | "savings";

const Dashboard = ({ user }: DashboardProps) => {
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const navigation = [
    { key: "overview", label: "Overview", icon: Home },
    { key: "members", label: "Members", icon: Users },
    { key: "loans", label: "Loans", icon: DollarSign },
    { key: "savings", label: "Savings", icon: PiggyBank },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "overview":
        return <DashboardOverview />;
      case "members":
        return <MembersSection />;
      case "loans":
        return <LoansSection />;
      case "savings":
        return <SavingsSection />;
      default:
        return <DashboardOverview />;
    }
  };

  const Sidebar = () => (
    <div className="h-full flex flex-col bg-card border-r">
      <div className="p-6 border-b">
        <div className="flex items-center space-x-2">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Alfo Self Help Group</h2>
            <p className="text-sm text-muted-foreground">CBO Management</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <Button
                  variant={activeSection === item.key ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    setActiveSection(item.key as Section);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t">
        <div className="text-sm text-muted-foreground mb-2">
          Welcome, {user.email}
        </div>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="lg:hidden fixed top-4 left-4 z-50">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b p-4 lg:p-6">
          <div className="flex items-center space-x-3 ml-12 lg:ml-0">
            <img src={unityLogo} alt="Unity Logo" className="h-8 w-8" />
            <h1 className="text-2xl font-bold">
              Alfo Self Help Group
            </h1>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;