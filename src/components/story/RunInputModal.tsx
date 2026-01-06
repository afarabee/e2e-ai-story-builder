import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface RunInputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modelId: string;
  debug?: {
    llm_request: {
      provider: string;
      model: string;
      prompt_version: string;
      messages: Array<{ role: string; content: string }>;
      payload: unknown;
    };
  };
}

export function RunInputModal({ open, onOpenChange, modelId, debug }: RunInputModalProps) {
  const hasDebug = !!debug?.llm_request;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            Run Input: {modelId}
            {hasDebug && (
              <Badge variant="outline" className="text-xs font-normal">
                Prompt: {debug.llm_request.prompt_version}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {!hasDebug ? (
          <div className="py-8 text-center text-muted-foreground">
            Debug not available for this run.
          </div>
        ) : (
          <Tabs defaultValue="messages" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="messages">Messages</TabsTrigger>
              <TabsTrigger value="payload">Payload</TabsTrigger>
            </TabsList>
            
            <TabsContent value="messages">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                <div className="space-y-4">
                  {debug.llm_request.messages.map((msg, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                        {msg.role}
                        {msg.role === 'system' && (
                          <span className="text-xs font-normal">(filled template)</span>
                        )}
                        {msg.role === 'user' && (
                          <span className="text-xs font-normal">(raw_input)</span>
                        )}
                      </div>
                      <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-3 rounded-md overflow-x-auto">
                        {msg.content}
                      </pre>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="payload">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {JSON.stringify(debug.llm_request.payload, null, 2)}
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
