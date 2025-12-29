import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles,
  TestTube,
  Code,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Check,
  CheckCircle,
  Undo2,
  ArrowDown,
  FlaskConical
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateMockChatResponse } from "@/lib/mockChatService";

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  context?: 'story' | 'criteria' | 'testing' | 'dev-notes' | 'points';
  suggestion?: any;
  field?: string;
  hasUserFacingSuggestion?: boolean;
}

interface ChatPanelProps {
  onApplySuggestion?: (type: string, content: any) => void;
  onUndoSuggestion?: () => void;
  isHorizontallyCollapsed?: boolean;
  onHorizontalToggle?: () => void;
  currentStory?: any;
}

export function ChatPanel({ onApplySuggestion, onUndoSuggestion, isHorizontallyCollapsed = false, onHorizontalToggle, currentStory }: ChatPanelProps = {}) {
  // Helper function to format suggestion preview
  const getPreviewMessage = (message: ChatMessage): string => {
    const context = message.context;
    const suggestion = message.suggestion;
    
    if (!context) return "Apply this suggestion";
    
    switch (context) {
      case 'criteria':
        return `Add acceptance criterion: "${typeof suggestion === 'string' ? suggestion.substring(0, 80) + (suggestion.length > 80 ? '...' : '') : suggestion}"`;
      case 'points':
        return `Change story points to: ${suggestion}`;
      case 'testing':
        return `Add test scenario: "${typeof suggestion === 'string' ? suggestion.substring(0, 80) + (suggestion.length > 80 ? '...' : '') : suggestion}"`;
      case 'dev-notes':
        return `Add developer note: "${typeof suggestion === 'string' ? suggestion.substring(0, 60) + (suggestion.length > 60 ? '...' : '') : suggestion}"`;
      case 'story':
        return `Update story description`;
      default:
        return "Apply this suggestion";
    }
  };


  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'ai',
      content: "How can I help refine your story? I can strengthen acceptance criteria, explore edge cases, adjust story points, or provide technical insights.",
      timestamp: new Date(),
      context: 'story',
      suggestion: "",
      hasUserFacingSuggestion: false
    }
  ]);

  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  const [lastAppliedSuggestion, setLastAppliedSuggestion] = useState<ChatMessage | null>(null);
  
  // Scroll management
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }
  };

  // Check if user is near bottom of scroll area
  const checkScrollPosition = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollToBottom(!isNearBottom);
      }
    }
  };

  // Handle scroll events
  const handleScroll = () => {
    setIsUserScrolling(true);
    checkScrollPosition();
    
    // Reset user scrolling flag after a delay
    setTimeout(() => setIsUserScrolling(false), 1000);
  };

  // Auto-scroll when new messages are added (unless user is actively scrolling)
  useEffect(() => {
    if (!isUserScrolling) {
      scrollToBottom();
    }
    checkScrollPosition();
  }, [messages, isTyping]);

  // Set up scroll listener
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', handleScroll);
        return () => scrollContainer.removeEventListener('scroll', handleScroll);
      }
    }
  }, [scrollAreaRef.current]);

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = inputValue;
    setInputValue("");
    setIsTyping(true);

    // Realistic typing delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

    // Generate mock response using the new service
    const mockResponse = generateMockChatResponse(userInput, currentStory);
    
    const aiResponse: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'ai',
      content: mockResponse.text,
      timestamp: new Date(),
      context: mockResponse.context.type,
      suggestion: mockResponse.context.suggestion,
      field: mockResponse.context.field,
      hasUserFacingSuggestion: !!mockResponse.context.suggestion
    };

    setMessages(prev => [...prev, aiResponse]);
    setIsTyping(false);
  };


  const ContextIcon = ({ context }: { context?: ChatMessage['context'] }) => {
    switch (context) {
      case 'testing':
        return <TestTube className="h-3 w-3" />;
      case 'dev-notes':
        return <Code className="h-3 w-3" />;
      case 'criteria':
        return <Sparkles className="h-3 w-3" />;
      default:
        return <Bot className="h-3 w-3" />;
    }
  };

  const applySuggestion = (message: ChatMessage) => {
    if (!message.suggestion || !message.context) return;
    
    setLastAppliedSuggestion(message);
    
    let handlerType = message.context;
    let content = message.suggestion;
    
    // For story type with a field, wrap in object so StoryBuilder can identify title/description
    if (message.context === 'story' && message.field) {
      content = { suggestion: message.suggestion, field: message.field };
    }
    
    onApplySuggestion?.(handlerType, content);
  };

  const undoLastSuggestion = () => {
    if (onUndoSuggestion && lastAppliedSuggestion) {
      onUndoSuggestion();
      setLastAppliedSuggestion(null);
      
      toast({
        title: "Suggestion Undone",
        description: "Last AI suggestion has been reverted.",
      });
    }
  };

  const quickActions = [
    { label: "Add edge cases", action: () => setInputValue("What edge cases should we consider for email validation?") },
    { label: "Strengthen criteria", action: () => setInputValue("Can you make the acceptance criteria more specific?") },
    { label: "Adjust story points", action: () => setInputValue("Is 5 story points appropriate for this complexity?") },
    { label: "Technical details", action: () => setInputValue("What technical considerations should developers know?") }
  ];

  if (isHorizontallyCollapsed) {
    return (
      <div className="w-12 h-full bg-card border-l flex flex-col items-center shadow-lg">
        <Button
          variant="default"
          size="lg"
          onClick={onHorizontalToggle}
          className="w-10 h-16 flex flex-col items-center justify-center text-sm font-medium rounded-l-lg rounded-r-none shadow-md hover:shadow-lg transition-all duration-200"
          title="Open Story Refinement Chat"
        >
          <MessageSquare className="h-5 w-5 mb-1" />
          <span className="text-xs leading-none">Chat</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onHorizontalToggle}
              className="h-8 w-8 hover:bg-muted/80 transition-colors"
              title="Collapse chat panel"
            >
              <span className="text-lg font-bold">⟨</span>
            </Button>
            <div className="flex flex-col">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Story Refinement Chat
              </CardTitle>
              <span className="text-xs text-amber-600 flex items-center gap-1 ml-7">
                <FlaskConical className="h-3 w-3" />
                Using simulated responses
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <div className="flex-1 p-0 flex flex-col min-h-96 relative">
        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-2",
                  message.type === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] p-3 rounded-lg text-sm",
                    message.type === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {message.type === 'ai' && (
                      <div className="flex items-center gap-1 mb-1">
                        <ContextIcon context={message.context} />
                        {message.context && (
                          <Badge variant="outline" className="text-xs h-5">
                            {message.context.replace('-', ' ')}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <p>{message.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs opacity-70">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                    <div className="flex gap-1">
                      {message.type === 'ai' && message.suggestion && String(message.suggestion).trim() && message.hasUserFacingSuggestion && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => applySuggestion(message)}
                                className="gap-1 text-xs h-6"
                              >
                                <CheckCircle className="h-3 w-3" />
                                Apply Suggestion
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-xs">{getPreviewMessage(message)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {message.type === 'ai' && lastAppliedSuggestion?.id === message.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={undoLastSuggestion}
                          className="gap-1 text-xs h-6 text-muted-foreground hover:text-foreground"
                        >
                          <Undo2 className="h-3 w-3" />
                          Undo
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 justify-start">
                <div className="bg-muted p-3 rounded-lg text-sm flex items-center gap-2">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  AI is thinking...
                </div>
              </div>
            )}
            
            {/* Invisible element to scroll to */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Scroll to Bottom Button */}
        {showScrollToBottom && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => scrollToBottom()}
            className="absolute bottom-20 right-4 z-10 gap-1 shadow-lg hover:shadow-xl transition-all duration-200 rounded-full h-10 px-3"
            title="Scroll to bottom"
          >
            <ArrowDown className="h-4 w-4" />
            <span className="text-xs">Scroll to Bottom</span>
          </Button>
        )}



            {/* Enhanced Input */}
            <div className="p-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="refinement-prompt" className="text-sm font-medium">
                  Refinement Prompt
                </Label>
                <Textarea
                  id="refinement-prompt"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask me to refine criteria, explore edge cases, or adjust story points…"
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  rows={4}
                  className="resize-none min-h-[4rem] max-h-[6rem]"
                  style={{
                    height: `${Math.min(Math.max(inputValue.split('\n').length, 4), 6) * 1.5}rem`
                  }}
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={sendMessage} 
                    disabled={!inputValue.trim() || isTyping}
                    size="sm"
                    className="gap-2"
                  >
                    <Send className="h-3 w-3" />
                    Send
                  </Button>
                </div>
                
                {/* Quick Actions */}
                <Collapsible defaultOpen={true}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between text-xs font-medium h-8 px-0 hover:bg-accent/50 focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      Quick Actions
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-1 mt-2">
                      {quickActions.map((action, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs h-8 justify-start focus-visible:ring-1 focus-visible:ring-ring"
                          onClick={action.action}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </div>
    </div>
  );
}