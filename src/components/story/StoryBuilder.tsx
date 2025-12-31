import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  CheckCircle, 
  Clock, 
  Zap, 
  User, 
  FileText, 
  GitBranch, 
  Upload, 
  Download, 
  RotateCcw, 
  Sparkles, 
  Code, 
  Database,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  Eye,
  Trash2,
  Send,
  AlertCircle,
  Plus,
  Minus,
  History,
  MessageSquare,
  Settings as SettingsIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { NewStoryConfirmDialog } from "@/components/ui/new-story-confirm-dialog";
import { useVersionHistory, StoryVersion } from "@/hooks/useVersionHistory";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateMockChatResponse } from "@/lib/mockChatService";
import { ComparePanel } from "./ComparePanel";
import { RunEvaluationCard } from "./RunEvaluationCard";

// Type for backend run response
interface RunResponse {
  run_id: string;
  model_id: string;
  story_id: string;
  final_story: {
    title: string;
    description: string;
    acceptance_criteria: string[];
  };
  dor: {
    passed: boolean;
    iterations: number;
    fail_reasons: string[];
  };
  eval: {
    overall: number;
    needs_review: boolean;
    dimensions: Record<string, number>;
    flags: string[];
  };
}

interface UserStory {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string[];
  storyPoints: number;
  status: 'draft' | 'ready' | 'in-progress' | 'done';
  iteration?: string;
  tags: string[];
}

interface TestData {
  userInputs: string[];
  edgeCases: string[];
  apiResponses: any[];
  codeSnippets: string[];
}

interface UploadedFile {
  id: string;
  name: string;
  description: string;
  type: string;
  size: number;
  uploadDate: Date;
}

import { Preset, PRESETS } from "@/types/preset";

interface StoryBuilderProps {
  showChat?: boolean;
  onToggleChat?: () => void;
  onSetApplySuggestionHandler?: (
    handler: (type: string, content: string) => void, 
    restoreHandler?: (version: StoryVersion) => void,
    undoHandler?: () => void
  ) => void;
  onSetRestartStoryHandler?: (handler: () => void) => void;
  onNewStory?: () => void;
  storyGenerated?: boolean;
  onStoryGenerated?: () => void;
  onVersionsChange?: (versions: StoryVersion[], currentContent: any) => void;
  onSetNewStoryHandler?: (handler: () => void) => void;
  onStoryUpdate?: (story: any) => void;
  onSetPresetHandlers?: (
    selectedPreset: string,
    onPresetChange: (value: string) => void,
    onApplyPreset: () => void
  ) => void;
}

export function StoryBuilder({ 
  showChat = false, 
  onToggleChat, 
  onSetApplySuggestionHandler,
  onSetRestartStoryHandler, 
  onNewStory, 
  storyGenerated = false, 
  onStoryGenerated,
  onVersionsChange,
  onSetNewStoryHandler,
  onStoryUpdate,
  onSetPresetHandlers
}: StoryBuilderProps = {}) {
  const { toast } = useToast();
  const { versions, saveVersion, getVersion, clearVersions } = useVersionHistory();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dirtyCriteria, setDirtyCriteria] = useState(false);
  const [originalTitle, setOriginalTitle] = useState("");
  const [originalDescription, setOriginalDescription] = useState("");
  const [rawInput, setRawInput] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [savedInput, setSavedInput] = useState(""); // For restart functionality
  const [savedCustomPrompt, setSavedCustomPrompt] = useState(""); // For restart functionality
  const [savedOriginalStory, setSavedOriginalStory] = useState<{
    title: string;
    description: string;
    acceptanceCriteria: string[];
    storyPoints: number;
  } | null>(null);
  const [savedOriginalTestData, setSavedOriginalTestData] = useState<TestData | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showRawInput, setShowRawInput] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [story, setStory] = useState<UserStory>({
    id: "US-001",
    title: "",
    description: "",
    acceptanceCriteria: [],
    storyPoints: 0,
    status: 'draft',
    tags: []
  });

  const [testData, setTestData] = useState<TestData>({
    userInputs: [],
    edgeCases: [],
    apiResponses: [],
    codeSnippets: []
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDevNotes, setIsGeneratingDevNotes] = useState(false);
  const [hasDevNotes, setHasDevNotes] = useState(false);
  const [devNotesOpen, setDevNotesOpen] = useState(true);
  
  // Compare mode state
  const [runs, setRuns] = useState<RunResponse[]>([]);
  const [runMode, setRunMode] = useState<'single' | 'compare'>('compare');
  const [selectedModel, setSelectedModel] = useState<string>('openai:gpt-5-nano');
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [highlightedContent, setHighlightedContent] = useState<{ field: string, index?: number } | null>(null);
  const [showNewStoryConfirm, setShowNewStoryConfirm] = useState(false);
  
  // Auto-save state
  const [lastAutoSaveContent, setLastAutoSaveContent] = useState<string>('');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Pre-undo state for reverting AI suggestions
  const [preUndoState, setPreUndoState] = useState<{
    story: UserStory;
    testData: TestData;
  } | null>(null);

  // Register the new story handler for external use (like sidebar)
  useEffect(() => {
    if (onSetNewStoryHandler) {
      onSetNewStoryHandler(handleNewStoryClick);
    }
  }, [onSetNewStoryHandler]);

  // Register the restart story handler
  useEffect(() => {
    if (onSetRestartStoryHandler) {
      onSetRestartStoryHandler(restartStory);
    }
  }, [onSetRestartStoryHandler]);

  // Register preset handlers for external use (sidebar)
  useEffect(() => {
    if (onSetPresetHandlers) {
      onSetPresetHandlers(selectedPreset, setSelectedPreset, applyPreset);
    }
  }, [onSetPresetHandlers, selectedPreset]);

  // Notify parent component about version changes
  useEffect(() => {
    if (onVersionsChange) {
      const currentContent = {
        title: story.title,
        description: story.description,
        acceptanceCriteria: story.acceptanceCriteria,
        storyPoints: story.storyPoints,
        testData: testData
      };
      onVersionsChange(versions, currentContent);
    }
  }, [versions, story, testData, onVersionsChange]);

  // Auto-save logic - debounced save after 10 seconds of no typing
  const createContentSnapshot = useCallback(() => {
    return JSON.stringify({
      title: story.title,
      description: story.description,
      acceptanceCriteria: story.acceptanceCriteria,
      storyPoints: story.storyPoints,
      testData: testData
    });
  }, [story, testData]);

  const saveAutoVersion = useCallback((label: string) => {
    const storyContent = {
      title: story.title,
      description: story.description,
      acceptanceCriteria: story.acceptanceCriteria,
      storyPoints: story.storyPoints,
      testData: testData
    };
    
    // Check if content has actually changed before saving
    const currentSnapshot = JSON.stringify(storyContent);
    if (currentSnapshot !== lastAutoSaveContent) {
      saveVersion(storyContent, label);
      setLastAutoSaveContent(currentSnapshot);
    }
  }, [story, testData, saveVersion, lastAutoSaveContent]);

  // Debounced auto-save after 10 seconds of no typing
  useEffect(() => {
    const currentSnapshot = createContentSnapshot();
    
    // Only set up auto-save if content has changed and story has meaningful content
    if (currentSnapshot !== lastAutoSaveContent && 
        (story.title.trim() || story.description.trim() || story.acceptanceCriteria.length > 0)) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Set new timeout for 10 seconds
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveAutoVersion("Edited by User");
      }, 10000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [story, testData, lastAutoSaveContent, createContentSnapshot, saveAutoVersion]);

  // Auto-save every 2 minutes if content changed
  useEffect(() => {
    // Set up 2-minute interval
    autoSaveIntervalRef.current = setInterval(() => {
      const currentSnapshot = createContentSnapshot();
      if (currentSnapshot !== lastAutoSaveContent && 
          (story.title.trim() || story.description.trim() || story.acceptanceCriteria.length > 0)) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        });
        saveAutoVersion(`Auto-Save @ ${timeString}`);
      }
    }, 2 * 60 * 1000); // 2 minutes

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [story.title, story.description, story.acceptanceCriteria, createContentSnapshot, lastAutoSaveContent, saveAutoVersion]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, []);

  // Track changes to title/description for dirty criteria indicator
  useEffect(() => {
    const titleChanged = story.title !== originalTitle && originalTitle !== "";
    const descriptionChanged = story.description !== originalDescription && originalDescription !== "";
    setDirtyCriteria(titleChanged || descriptionChanged);
  }, [story.title, story.description, originalTitle, originalDescription]);

  const generateStory = async () => {
    try {
      setIsGenerating(true);
      setShowRawInput(false);
      setSavedInput(rawInput);
      setSavedCustomPrompt(customPrompt);

      // CRITICAL: Reset all previous run state before new generation
      setRuns([]);
      setActiveModelId(null);
      setHighlightedContent(null);
      setHasDevNotes(false);
      setDirtyCriteria(false);
      setOriginalTitle("");
      setOriginalDescription("");

      setStory((prev) => ({
        ...prev,
        title: "",
        description: "",
        acceptanceCriteria: [],
        storyPoints: 0,
        status: "draft" as const,
      }));
      setTestData({
        userInputs: [],
        edgeCases: [],
        apiResponses: [],
        codeSnippets: [],
      });

      onStoryGenerated?.();
      
      // Call sb-run edge function with selected mode
      const models = runMode === 'compare' 
        ? ['openai:gpt-5-nano', 'google:gemini-2.5-flash-lite'] 
        : [selectedModel];
      
      const { data, error } = await supabase.functions.invoke('sb-run', {
        body: {
          raw_input: rawInput,
          project_settings: { customPrompt },
          run_mode: runMode,
          models,
        },
      });

      if (error) throw error;
      if (!data?.runs?.length) throw new Error('No stories returned from backend');

      // Store all runs for compare view
      setRuns(data.runs);

      // Set active model for single mode indicator
      if (runMode === 'single' && data.runs[0]?.model_id) {
        setActiveModelId(data.runs[0].model_id);
      }

      // For single-story state (backward compatibility), use first run
      const run = data.runs[0];
      const finalStory = run.final_story;
      
      const generatedStory = {
        ...story,
        title: finalStory.title,
        description: finalStory.description,
        acceptanceCriteria: finalStory.acceptance_criteria || [],
        storyPoints: 3, // Default for now, backend doesn't return this yet
        status: 'ready' as const
      };

      // Backend doesn't return testData yet, use empty defaults
      const generatedTestData = {
        userInputs: [],
        edgeCases: [],
        apiResponses: [],
        codeSnippets: []
      };

      setStory(generatedStory);
      setTestData(generatedTestData);
      setOriginalTitle(generatedStory.title);
      setOriginalDescription(generatedStory.description);
      setDirtyCriteria(false);
      
      // Save original draft for restart functionality
      setSavedOriginalStory({
        title: generatedStory.title,
        description: generatedStory.description,
        acceptanceCriteria: [...generatedStory.acceptanceCriteria],
        storyPoints: generatedStory.storyPoints
      });
      setSavedOriginalTestData({ ...generatedTestData });
      
      // Notify parent of story update
      onStoryUpdate?.(generatedStory);

      // Auto-save version after generation
      const storyContent = {
        title: generatedStory.title,
        description: generatedStory.description,
        acceptanceCriteria: generatedStory.acceptanceCriteria,
        storyPoints: generatedStory.storyPoints,
        testData: generatedTestData
      };
      saveVersion(storyContent, "Initial Generation");
      setLastAutoSaveContent(JSON.stringify(storyContent));
      
      toast({
        title: "Stories Generated",
        description: `Generated ${data.runs.length} stories for comparison.`,
      });
    } catch (error) {
      console.error("Error generating story:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate story. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateDevNotes = async () => {
    setIsGeneratingDevNotes(true);
    
    // Simulate GitHub scanning
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const devCodeSnippets = [
      "// Authentication service\nclass AuthService {\n  async register(email, password) {\n    const validation = this.validateInput(email, password);\n    if (!validation.isValid) throw new Error(validation.error);\n    return await this.createUser(email, password);\n  }\n}",
      "// Email validation\nconst isValidEmail = (email) => {\n  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n  return emailRegex.test(email);\n};",
      "// Password strength validation\nconst validatePassword = (password) => {\n  const minLength = 8;\n  const hasUpperCase = /[A-Z]/.test(password);\n  const hasLowerCase = /[a-z]/.test(password);\n  const hasNumbers = /\\d/.test(password);\n  const hasNonalphas = /\\W/.test(password);\n  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasNonalphas;\n};"
    ];

    setTestData(prev => ({
      ...prev,
      codeSnippets: devCodeSnippets
    }));

    setHasDevNotes(true);
    setDevNotesOpen(true);
    setIsGeneratingDevNotes(false);
  };

  const newStory = () => {
    try {
      const resetStory = {
        id: `US-${String(Date.now()).slice(-3)}`,
        title: "",
        description: "",
        acceptanceCriteria: [],
        storyPoints: 0,
        status: 'draft' as const,
        tags: []
      };
      
      setStory(resetStory);
      setTestData({
        userInputs: [],
        edgeCases: [],
        apiResponses: [],
        codeSnippets: []
      });
      setRawInput("");
      setCustomPrompt("");
      setSavedInput("");
      setSavedCustomPrompt("");
      setSavedOriginalStory(null);
      setSavedOriginalTestData(null);
      setUploadedFiles([]);
      setShowRawInput(true);
      setHasDevNotes(false);
      setDevNotesOpen(false);
      setOriginalTitle("");
      setOriginalDescription("");
      setDirtyCriteria(false);
      setIsGenerating(false);
      setIsGeneratingDevNotes(false);
      setHighlightedContent(null);
      setRuns([]);
      setActiveModelId(null);
      setRunMode('single');
      setSelectedModel('openai:gpt-5-nano');
      
      clearVersions();
      setLastAutoSaveContent('');
      
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
      
      // Notify parent of story reset
      onStoryUpdate?.(null);
      
      onNewStory?.();
    } catch (error) {
      console.error("Error resetting story:", error);
      toast({
        title: "Reset Failed",
        description: "Failed to reset. Refreshing page...",
        variant: "destructive",
      });
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleNewStoryClick = () => {
    // Show confirmation dialog if there's any content in the current story
    const hasContent = story.title.trim() || story.description.trim() || 
                      story.acceptanceCriteria.length > 0 || rawInput.trim();
    
    if (hasContent) {
      setShowNewStoryConfirm(true);
    } else {
      newStory();
    }
  };

  const handleConfirmNewStory = () => {
    setShowNewStoryConfirm(false);
    newStory();
  };

  const handleCancelNewStory = () => {
    setShowNewStoryConfirm(false);
  };

  // Apply preset to populate inputs and reset results
  const applyPreset = () => {
    const preset = PRESETS.find(p => p.id === selectedPreset);
    if (!preset) {
      toast({
        title: "No Preset Selected",
        description: "Please select a preset first.",
        variant: "destructive",
      });
      return;
    }

    // Populate inputs
    setRawInput(preset.rawInput);
    setCustomPrompt(preset.customPrompt || '');

    // Set mode/models if provided
    if (preset.mode) {
      setRunMode(preset.mode);
    }
    if (preset.models && preset.models.length > 0) {
      setSelectedModel(preset.models[0]);
    }

    // Clear previous results
    setRuns([]);
    setActiveModelId(null);
    setHighlightedContent(null);
    setHasDevNotes(false);
    setDirtyCriteria(false);
    setOriginalTitle("");
    setOriginalDescription("");

    setStory((prev) => ({
      ...prev,
      title: "",
      description: "",
      acceptanceCriteria: [],
      storyPoints: 0,
      status: "draft" as const,
    }));
    setTestData({
      userInputs: [],
      edgeCases: [],
      apiResponses: [],
      codeSnippets: [],
    });

    toast({
      title: "Preset Applied",
      description: `"${preset.name}" loaded. Click Generate to create the story.`,
    });
  };

  const restartStory = () => {
    if (!savedOriginalStory) return;
    
    // Restore from saved original draft
    setStory(prev => ({
      ...prev,
      title: savedOriginalStory.title,
      description: savedOriginalStory.description,
      acceptanceCriteria: [...savedOriginalStory.acceptanceCriteria],
      storyPoints: savedOriginalStory.storyPoints,
      status: 'ready' as const
    }));
    
    if (savedOriginalTestData) {
      setTestData({ ...savedOriginalTestData });
      
      // Restore dev notes state if original had code snippets
      if (savedOriginalTestData.codeSnippets.length > 0) {
        setHasDevNotes(true);
        setDevNotesOpen(true);
      }
    }
    
    // Reset dirty state since we're back to original
    setOriginalTitle(savedOriginalStory.title);
    setOriginalDescription(savedOriginalStory.description);
    setDirtyCriteria(false);
    setActiveModelId(null);
    
    // Save a version noting the restart
    saveVersion({
      title: savedOriginalStory.title,
      description: savedOriginalStory.description,
      acceptanceCriteria: savedOriginalStory.acceptanceCriteria,
      storyPoints: savedOriginalStory.storyPoints,
      testData: savedOriginalTestData
    }, "Restored to Original Draft");
    
    toast({
      title: "Story Restored",
      description: "Your story has been restored to its original generated draft.",
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const newFile: UploadedFile = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        description: "",
        type: file.type,
        size: file.size,
        uploadDate: new Date()
      };
      setUploadedFiles(prev => [...prev, newFile]);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const updateFileDescription = (fileId: string, description: string) => {
    setUploadedFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, description } : f
    ));
  };

  const refreshTestData = (section: keyof TestData) => {
    // Simulate refreshing test data for specific section
    console.log(`Refreshing ${section} test data`);
  };

  const handleApplySuggestion = useCallback((type: string, content: any) => {
    // Save current state for undo functionality BEFORE making changes
    setPreUndoState({
      story: { ...story },
      testData: { ...testData }
    });
    
    let updatedStory = story;
    let updatedTestData = testData;
    let appliedField = '';
    let appliedIndex: number | undefined = undefined;

    // Handle different suggestion types
    if (type === 'testing') {
      // Add edge case as acceptance criterion with visual prefix
      const edgeCase = typeof content === 'string' ? content.split('.')[0] : content;
      const edgeCaseCriterion = `🧪 ${edgeCase}`;
      updatedStory = {
        ...story,
        acceptanceCriteria: [...story.acceptanceCriteria, edgeCaseCriterion]
      };
      setStory(updatedStory);
      appliedField = 'acceptance-criteria';
      appliedIndex = updatedStory.acceptanceCriteria.length - 1;
    } else if (type === 'criteria') {
      // Handle add or remove AC
      if (typeof content === 'object' && content.action === 'remove') {
        const index = content.index === -1 ? story.acceptanceCriteria.length - 1 : content.index;
        updatedStory = {
          ...story,
          acceptanceCriteria: story.acceptanceCriteria.filter((_, i) => i !== index)
        };
        setStory(updatedStory);
        appliedField = 'acceptance-criteria';
      } else {
        // Add new AC
        const newCriterion = typeof content === 'string' ? content.split('.')[0] : content;
        updatedStory = {
          ...story,
          acceptanceCriteria: [...story.acceptanceCriteria, newCriterion]
        };
        setStory(updatedStory);
        appliedField = 'acceptance-criteria';
        appliedIndex = updatedStory.acceptanceCriteria.length - 1; // Track the newly added criterion
      }
    } else if (type === 'points') {
      // Update story points
      const points = typeof content === 'number' ? content : parseInt(content);
      updatedStory = {
        ...story,
        storyPoints: points
      };
      setStory(updatedStory);
      appliedField = 'story-points';
    } else if (type === 'story') {
      // Update story fields (title or description)
      const fieldName = typeof content === 'object' ? content.field : null;
      const suggestionValue = typeof content === 'object' ? content.suggestion : content;
      
      if (fieldName === 'title') {
        updatedStory = {
          ...story,
          title: suggestionValue
        };
        setStory(updatedStory);
        appliedField = 'story-title';
      } else if (fieldName === 'description') {
        updatedStory = {
          ...story,
          description: suggestionValue
        };
        setStory(updatedStory);
        appliedField = 'story-description';
      } else if (typeof suggestionValue === 'string' && suggestionValue.toLowerCase().includes('point')) {
        // Legacy: extract points from string
        const pointsMatch = suggestionValue.match(/(\d+)\s*point/);
        if (pointsMatch) {
          updatedStory = {
            ...story,
            storyPoints: parseInt(pointsMatch[1])
          };
          setStory(updatedStory);
          appliedField = 'story-points';
        }
      }
    } else if (type === 'dev-notes') {
      // Add code snippet
      const codeSnippet = typeof content === 'string' ? content : content.suggestion || content;
      updatedTestData = {
        ...testData,
        codeSnippets: [...testData.codeSnippets, codeSnippet]
      };
      setTestData(updatedTestData);
      setHasDevNotes(true);
      setDevNotesOpen(true);
      appliedField = 'code-snippets';
    }

    // Auto-save version after applying suggestion
    if (appliedField) {
      flashHighlight(appliedField, appliedIndex);
      const storyContent = {
        title: updatedStory.title,
        description: updatedStory.description,
        acceptanceCriteria: updatedStory.acceptanceCriteria,
        storyPoints: updatedStory.storyPoints,
        testData: updatedTestData
      };
      saveVersion(storyContent, "AI Refinement Applied");
      setLastAutoSaveContent(JSON.stringify(storyContent));
      
      // Notify parent of story update
      onStoryUpdate?.(updatedStory);
      
      toast({
        title: "Suggestion Applied",
        description: "Story updated successfully.",
      });
    }
  }, [story, testData, saveVersion, setLastAutoSaveContent, onStoryUpdate, toast]);

  const flashHighlight = (field: string, index?: number) => {
    setHighlightedContent({ field, index });
    setTimeout(() => setHighlightedContent(null), 4000);
  };

  const handleRestoreVersion = useCallback((version: StoryVersion) => {
    setStory(prev => ({
      ...prev,
      title: version.title,
      description: version.description,
      acceptanceCriteria: [...version.acceptanceCriteria],
      storyPoints: version.storyPoints
    }));

    if (version.testData) {
      setTestData({
        userInputs: [...version.testData.userInputs],
        edgeCases: [...version.testData.edgeCases],
        apiResponses: [...version.testData.apiResponses],
        codeSnippets: [...version.testData.codeSnippets]
      });
    }

    toast({
      title: "Version restored successfully",
      description: `Restored: ${version.label}`,
    });
  }, [toast]);

  const handleUndoSuggestion = useCallback(() => {
    if (!preUndoState) return;
    
    setStory(preUndoState.story);
    setTestData(preUndoState.testData);
    setPreUndoState(null);
    
    // Notify parent of story update
    onStoryUpdate?.(preUndoState.story);
    
    toast({
      title: "Suggestion Undone",
      description: "Reverted to previous state.",
    });
  }, [preUndoState, onStoryUpdate, toast]);

  // Register the apply suggestion handler (must be after handler definitions)
  useEffect(() => {
    if (onSetApplySuggestionHandler) {
      onSetApplySuggestionHandler(handleApplySuggestion, handleRestoreVersion, handleUndoSuggestion);
    }
  }, [onSetApplySuggestionHandler, handleApplySuggestion, handleRestoreVersion, handleUndoSuggestion]);

  const handleSaveManual = () => {
    const storyContent = {
      title: story.title,
      description: story.description,
      acceptanceCriteria: story.acceptanceCriteria,
      storyPoints: story.storyPoints,
      testData: testData
    };
    saveVersion(storyContent, "Manual Save");
    setLastAutoSaveContent(JSON.stringify(storyContent));
    
    toast({
      title: "Version saved",
      description: "Current story state has been saved",
    });
  };

  const regenerateCriteria = async () => {
    setIsGenerating(true);
    // Simulate LLM call to regenerate criteria
    await new Promise(resolve => setTimeout(resolve, 1500));
    const newCriteria = [
      `User can enter email and password on registration form`,
      `System validates email format and password strength`,
      `Verification email is sent upon successful registration`,
      `User can complete registration by clicking verification link`,
      `Error messages are displayed for invalid inputs`
    ];
    setStory(prev => ({ ...prev, acceptanceCriteria: newCriteria }));
    flashHighlight('acceptance-criteria');
    setIsGenerating(false);
    setDirtyCriteria(false);
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-status-ready" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-status-in-progress" />;
      case 'done':
        return <CheckCircle className="h-4 w-4 text-status-done" />;
      default:
        return <AlertCircle className="h-4 w-4 text-status-draft" />;
    }
  };

  return (
    <>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <NewStoryConfirmDialog
        isOpen={showNewStoryConfirm}
        onConfirm={handleConfirmNewStory}
        onCancel={handleCancelNewStory}
      />
      <div className="p-6 space-y-6">
      {/* Progress Header - Only show when story is generated */}
      {storyGenerated && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold">Story Builder</h2>
            <Badge variant="outline" className="gap-1">
              <StatusIcon status={story.status} />
              {story.status.replace('-', ' ')}
            </Badge>
            {runMode === 'single' && (
              <Badge 
                variant={(activeModelId || selectedModel).includes('openai') ? 'default' : 'secondary'}
                className="gap-1"
              >
                <span className="text-xs font-normal opacity-70">Model:</span>
                {activeModelId || selectedModel}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={onToggleChat}
              variant={showChat ? "default" : "outline"}
              className="gap-2"
              title="Open Story Refinement Chat"
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </Button>
            <Button 
              onClick={handleNewStoryClick}
              variant="outline"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New User Story
            </Button>
            <Button 
              onClick={restartStory}
              variant="outline"
              disabled={!savedOriginalStory}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Restart Story
            </Button>
          </div>
        </div>
      )}

      {/* Raw Input Zone */}
      {showRawInput && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Raw Input & File Upload</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="raw-input">Specifications & Requirements</Label>
              <Textarea 
                id="raw-input"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="Paste specs or click to upload reference files"
                rows={4}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="custom-prompt">Custom Prompt</Label>
              <Textarea 
                id="custom-prompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Enter any specific instructions or tone for this story…"
                rows={2}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Upload Reference Files</Label>
              <div className="mt-2 border-2 border-dashed border-muted rounded-lg p-4 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">Drop PDFs, DOCs, or images here</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse Files
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* File Library */}
            {uploadedFiles.length > 0 && (
              <div>
                <Label>Uploaded Files</Label>
                <div className="mt-2 space-y-2">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <Input
                          placeholder="Add description..."
                          value={file.description}
                          onChange={(e) => updateFileDescription(file.id, e.target.value)}
                          className="text-xs mt-1"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" title="Preview">
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeFile(file.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Run Mode Toggle */}
            <div className="flex items-center gap-4 p-3 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Mode:</Label>
                <div className="flex rounded-md border bg-background">
                  <button
                    type="button"
                    onClick={() => setRunMode('single')}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-l-md transition-colors",
                      runMode === 'single' 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    )}
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    onClick={() => setRunMode('compare')}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-r-md transition-colors",
                      runMode === 'compare' 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-muted"
                    )}
                  >
                    Compare
                  </button>
                </div>
              </div>

              {runMode === 'single' && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Model:</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai:gpt-5-nano">OpenAI GPT-5 Nano</SelectItem>
                      <SelectItem value="google:gemini-2.5-flash-lite">Gemini 2.5 Flash Lite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {runMode === 'compare' && (
                <span className="text-xs text-muted-foreground">
                  Comparing: OpenAI GPT-5 Nano vs Gemini 2.5 Flash Lite
                </span>
              )}
            </div>

            <Button 
              onClick={generateStory} 
              variant={isGenerating ? "ai" : "default"}
              disabled={isGenerating || !rawInput.trim()}
              className="w-full gap-2"
            >
              {isGenerating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isGenerating ? "Generating Story..." : "Generate User Story"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Compare View - Side by Side Panels */}
      {storyGenerated && runs.length === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Compare Generated Stories</h3>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {runs.map((run) => (
              <ComparePanel key={run.run_id} run={run} />
            ))}
          </div>
        </div>
      )}

      {/* Single Story View - Only show story sections after generation when single run */}
      {storyGenerated && runs.length === 1 && (
        <div className="grid gap-6 grid-cols-1">
          {/* Main Story Content */}
          <div className="space-y-6 col-span-1">
            <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Story Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="story-title">Title</Label>
                <Input 
                  id="story-title"
                  value={story.title}
                  onChange={(e) => setStory(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter story title..."
                  className={cn(
                    highlightedContent?.field === 'story-title' && "text-highlight-applied"
                  )}
                />
              </div>
              
              <div>
                <Label htmlFor="story-description">Description</Label>
                <Textarea 
                  id="story-description"
                  value={story.description}
                  onChange={(e) => setStory(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="As a [user], I want [goal] so that [benefit]..."
                  rows={3}
                  className={cn(
                    highlightedContent?.field === 'story-description' && "text-highlight-applied"
                  )}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label>Acceptance Criteria</Label>
                    {dirtyCriteria && (
                      <Badge variant="outline" title="Criteria may be out of sync" className="text-xs">
                        ⚠️
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={regenerateCriteria}
                      className="gap-1 text-xs"
                      title="Refresh acceptance criteria based on current Title & Description"
                      disabled={isGenerating}
                    >
                      <RefreshCw className={cn("h-4 w-4", isGenerating && "animate-spin")} />
                      Regenerate Criteria
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStory(prev => ({ 
                        ...prev, 
                        acceptanceCriteria: [...prev.acceptanceCriteria, ""] 
                      }))}
                      className="gap-1 text-xs"
                    >
                      <Plus className="h-3 w-3" />
                      Add Criterion
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 mt-2">
                  {story.acceptanceCriteria.map((criterion, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-status-ready flex-shrink-0" />
                        <Input
                          value={criterion}
                          onChange={(e) => {
                            const newCriteria = [...story.acceptanceCriteria];
                            newCriteria[index] = e.target.value;
                            setStory(prev => ({ ...prev, acceptanceCriteria: newCriteria }));
                          }}
                          placeholder="Enter acceptance criterion..."
                          className={cn(
                            "text-sm flex-1",
                            highlightedContent?.field === 'acceptance-criteria' && 
                            highlightedContent?.index === index && 
                            "text-highlight-applied"
                          )}
                        />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newCriteria = story.acceptanceCriteria.filter((_, i) => i !== index);
                          setStory(prev => ({ ...prev, acceptanceCriteria: newCriteria }));
                        }}
                        className="p-1 h-8 w-8"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {story.acceptanceCriteria.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      Generate a story or click "Add Criterion" to add acceptance criteria
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="story-points">Story Points</Label>
                  <Select value={story.storyPoints.toString()} onValueChange={(value) => setStory(prev => ({ ...prev, storyPoints: parseInt(value) }))}>
                    <SelectTrigger className={cn(
                      "w-24",
                      highlightedContent?.field === 'story-points' && "text-highlight-applied"
                    )}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 5, 8, 13].map(points => (
                        <SelectItem key={points} value={points.toString()}>{points}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveManual}
                  className="gap-2"
                  disabled={!story.title}
                >
                  <History className="h-3 w-3" />
                  Save Version
                </Button>
              </div>
            </CardContent>
          </Card>

          {runs[0]?.eval && <RunEvaluationCard evalResult={runs[0].eval} />}

          {/* Developer Notes - Always Visible */}
          <Collapsible open={devNotesOpen} onOpenChange={setDevNotesOpen}>
            <Card>
              <CardHeader className="cursor-pointer">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between w-full">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      Developer Notes
                      {hasDevNotes && (
                        <Badge variant="outline" className="gap-1">
                          <GitBranch className="h-3 w-3" />
                          From GitHub
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateDevNotes();
                        }}
                        disabled={isGeneratingDevNotes}
                        className="gap-2"
                      >
                        {isGeneratingDevNotes ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Code className="h-3 w-3" />}
                        {isGeneratingDevNotes ? "Scanning GitHub..." : "Generate Dev Notes"}
                      </Button>
                      {devNotesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {hasDevNotes ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">Relevant Code Snippets</h4>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => refreshTestData('codeSnippets')}
                          className="gap-1"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Refresh
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {testData.codeSnippets.map((snippet, index) => (
                          <div key={index} className="bg-muted p-3 rounded-md">
                            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{snippet}</pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Generate developer notes to see relevant code snippets and technical context
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Push to ADO - Always Visible */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Push to Azure DevOps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="iteration-select">Iteration</Label>
                  <Select defaultValue="sprint-24.1">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sprint-24.1">Sprint 24.1</SelectItem>
                      <SelectItem value="sprint-24.2">Sprint 24.2</SelectItem>
                      <SelectItem value="backlog">Backlog</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tags-input">Tags</Label>
                  <Input id="tags-input" placeholder="frontend, auth, registration" />
                </div>
              </div>
              
              <Button 
                variant="accent" 
                className="w-full gap-2"
                disabled={!story.title}
              >
                <Send className="h-4 w-4" />
                {story.title ? "Push to Azure DevOps" : "Generate story first"}
              </Button>
            </CardContent>
          </Card>
        </div>
        </div>
      )}
      </div>
    </>
  );
}