import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  GitBranch, 
  FileText, 
  RotateCcw,
  Save,
  Copy,
  Eye,
  Zap,
  FlaskConical
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SettingsModal } from "@/components/settings/SettingsModal";

interface AppLayoutProps {
  children: React.ReactNode;
  sidebarContent?: React.ReactNode;
  chatContent?: React.ReactNode;
  showChat?: boolean;
  chatCollapsed?: boolean;
}

export default function AppLayout({ 
  children, 
  sidebarContent, 
  chatContent, 
  showChat = false,
  chatCollapsed = true
}: AppLayoutProps) {
  const [currentProject] = useState("E-commerce Platform");
  const [connectionStatus] = useState({
    github: true,
    ado: true
  });
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-border bg-header text-header-foreground flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Story Generator</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-600 border-amber-500/30 cursor-help">
                    <FlaskConical className="h-3 w-3" />
                    Demo Mode
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    This app is running with simulated AI responses. 
                    Connect to n8n/LLM for live AI-powered story generation.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="text-sm text-muted-foreground">
            {currentProject}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <Badge variant={connectionStatus.github ? "default" : "secondary"} className="gap-1">
              <GitBranch className="h-3 w-3" />
              GitHub
            </Badge>
            <Badge variant={connectionStatus.ado ? "default" : "secondary"} className="gap-1">
              <FileText className="h-3 w-3" />
              ADO
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" title="Undo">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" title="Save Draft">
              <Save className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" title="Copy">
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" title="Preview">
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon-sm" 
              title="Settings"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        {sidebarContent && (
          <aside className="w-72 border-r border-border bg-card">
            {sidebarContent}
          </aside>
        )}

        {/* Main Content */}
        <main className={cn(
          "flex-1 overflow-auto transition-all duration-300",
          showChat && !chatCollapsed && "mr-96",
          showChat && chatCollapsed && "mr-12"
        )}>
          {children}
        </main>

        {/* Chat Panel */}
        {showChat && (
          <div className={cn(
            "border-l border-border bg-card fixed right-0 top-16 bottom-0 overflow-auto animate-slide-in-right z-10 transition-all duration-300",
            chatCollapsed ? "w-12" : "w-96"
          )}>
            {chatContent}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </div>
  );
}