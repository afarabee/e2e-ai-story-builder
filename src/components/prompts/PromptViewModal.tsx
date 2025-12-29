import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PromptVersion } from "@/types/promptVersion";

interface PromptViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptVersion: PromptVersion | null;
}

export function PromptViewModal({ isOpen, onClose, promptVersion }: PromptViewModalProps) {
  if (!promptVersion) return null;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'draft':
        return 'secondary';
      case 'archived':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>{promptVersion.name}</span>
            <Badge variant={getStatusVariant(promptVersion.status)}>
              {promptVersion.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {promptVersion.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
              <p className="text-sm">{promptVersion.description}</p>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Created</h4>
            <p className="text-sm">{formatDate(promptVersion.created_at)}</p>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Template</h4>
            <ScrollArea className="flex-1 border rounded-md bg-muted/30">
              <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words">
                {promptVersion.template}
              </pre>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
