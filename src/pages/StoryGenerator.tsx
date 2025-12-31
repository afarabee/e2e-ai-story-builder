import { useState, useRef, useCallback, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { StoryBuilder } from "@/components/story/StoryBuilder";
import { ProjectSidebar } from "@/components/sidebar/ProjectSidebar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { StoryVersion } from "@/hooks/useVersionHistory";
import { PromptVersion } from "@/types/promptVersion";
import { getPromptVersions } from "@/lib/supabase/promptVersions";
import { PromptViewModal } from "@/components/prompts/PromptViewModal";
import { PromptCreateModal } from "@/components/prompts/PromptCreateModal";

const StoryGenerator = () => {
  const [storyGenerated, setStoryGenerated] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatCollapsed, setChatCollapsed] = useState(true); // Chat panel collapsed by default
  const [story, setStory] = useState<any>(null);
  const [versions, setVersions] = useState<StoryVersion[]>([]);
  const [currentStoryContent, setCurrentStoryContent] = useState<{
    title: string;
    description: string;
    acceptanceCriteria: string[];
    storyPoints: number;
    testData?: any;
  } | null>(null);

  // Refs to store handlers from StoryBuilder
  const applySuggestionRef = useRef<((type: string, content: any) => void) | null>(null);
  const undoSuggestionRef = useRef<(() => void) | null>(null);
  const restartStoryRef = useRef<(() => void) | null>(null);
  const newStoryRef = useRef<(() => void) | null>(null);
  const restoreVersionRef = useRef<((version: StoryVersion) => void) | null>(null);

  // Preset state and handlers from StoryBuilder
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const presetChangeRef = useRef<((value: string) => void) | null>(null);
  const applyPresetRef = useRef<(() => void) | null>(null);
  const runPresetRef = useRef<((presetId: string) => void) | null>(null);

  // Prompt version state
  const [promptVersions, setPromptVersions] = useState<PromptVersion[]>([]);
  const [selectedPromptVersionId, setSelectedPromptVersionId] = useState<string>('');
  const [viewPromptModalOpen, setViewPromptModalOpen] = useState(false);
  const [createPromptModalOpen, setCreatePromptModalOpen] = useState(false);

  // Fetch prompt versions on mount
  useEffect(() => {
    fetchPromptVersions();
  }, []);

  const fetchPromptVersions = async () => {
    try {
      const versions = await getPromptVersions();
      setPromptVersions(versions);
      // Auto-select active version if none selected
      if (!selectedPromptVersionId && versions.length > 0) {
        const activeVersion = versions.find(v => v.status === 'active');
        if (activeVersion) {
          setSelectedPromptVersionId(activeVersion.id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch prompt versions:', error);
    }
  };

  const handleSelectPromptVersion = (id: string) => {
    setSelectedPromptVersionId(id);
  };

  const handleViewPromptVersion = () => {
    setViewPromptModalOpen(true);
  };

  const handleCreatePromptVersion = () => {
    setCreatePromptModalOpen(true);
  };

  const handlePromptCreated = () => {
    fetchPromptVersions();
  };

  const selectedPromptVersion = promptVersions.find(pv => pv.id === selectedPromptVersionId) || null;

  const handleStoryGenerated = () => {
    setStoryGenerated(true);
    setShowChat(true);
  };

  const handleNewStory = () => {
    // Call StoryBuilder's internal reset function first
    if (newStoryRef.current) {
      newStoryRef.current();
    }
    // Then reset parent state
    setStoryGenerated(false);
    setShowChat(false);
    setChatCollapsed(true); // Reset chat to collapsed on new story
    setStory(null);
  };

  const handleToggleChatCollapse = () => {
    setChatCollapsed(prev => !prev);
  };

  const handleToggleChat = () => {
    setShowChat(!showChat);
  };

  const handleApplySuggestion = (type: string, content: any) => {
    if (applySuggestionRef.current) {
      applySuggestionRef.current(type, content);
    }
  };

  const handleUndoSuggestion = () => {
    if (undoSuggestionRef.current) {
      undoSuggestionRef.current();
    }
  };

  const handleRestartStory = () => {
    if (restartStoryRef.current) {
      restartStoryRef.current();
    }
  };

  const handleVersionsChange = useCallback((newVersions: StoryVersion[], content: any) => {
    setVersions(prev => {
      // Only update if versions actually changed
      if (prev.length !== newVersions.length) {
        return newVersions;
      }
      return prev;
    });
    setCurrentStoryContent(content);
  }, []);

  const handleRestoreVersion = (version: StoryVersion) => {
    if (restoreVersionRef.current) {
      restoreVersionRef.current(version);
    }
  };

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    if (presetChangeRef.current) {
      presetChangeRef.current(value);
    }
  };

  const handleApplyPreset = () => {
    if (applyPresetRef.current) {
      applyPresetRef.current();
    }
  };

  const handleRunPreset = (presetId: string) => {
    if (runPresetRef.current) {
      runPresetRef.current(presetId);
    }
  };

  return (
    <AppLayout
      sidebarContent={
        <ProjectSidebar 
          onNewStory={handleNewStory}
          onRestartStory={handleRestartStory}
          versions={versions}
          currentStoryContent={currentStoryContent}
          onRestoreVersion={handleRestoreVersion}
          selectedPreset={selectedPreset}
          onPresetChange={handlePresetChange}
          onApplyPreset={handleApplyPreset}
          onRunPreset={handleRunPreset}
          promptVersions={promptVersions}
          selectedPromptVersionId={selectedPromptVersionId}
          onSelectPromptVersion={handleSelectPromptVersion}
          onViewPromptVersion={handleViewPromptVersion}
          onCreatePromptVersion={handleCreatePromptVersion}
        />
      }
      chatContent={
        <ChatPanel 
          key={storyGenerated ? 'story' : 'no-story'} 
          currentStory={story}
          onApplySuggestion={handleApplySuggestion}
          onUndoSuggestion={handleUndoSuggestion}
          isHorizontallyCollapsed={chatCollapsed}
          onHorizontalToggle={handleToggleChatCollapse}
        />
      }
      showChat={showChat}
      chatCollapsed={chatCollapsed}
    >
      <StoryBuilder 
        storyGenerated={storyGenerated}
        onStoryGenerated={handleStoryGenerated}
        showChat={showChat}
        onToggleChat={handleToggleChat}
        onStoryUpdate={setStory}
        onVersionsChange={handleVersionsChange}
        onSetApplySuggestionHandler={(applyHandler, restoreHandler, undoHandler) => {
          applySuggestionRef.current = applyHandler;
          restoreVersionRef.current = restoreHandler;
          undoSuggestionRef.current = undoHandler;
        }}
        onSetRestartStoryHandler={(restartHandler) => {
          restartStoryRef.current = restartHandler;
        }}
        onSetNewStoryHandler={(newStoryHandler) => {
          newStoryRef.current = newStoryHandler;
        }}
        onSetPresetHandlers={(currentPreset, presetChange, applyPreset, runPreset) => {
          setSelectedPreset(currentPreset);
          presetChangeRef.current = presetChange;
          applyPresetRef.current = applyPreset;
          runPresetRef.current = runPreset;
        }}
      />

      {/* Prompt Version Modals */}
      <PromptViewModal
        isOpen={viewPromptModalOpen}
        onClose={() => setViewPromptModalOpen(false)}
        promptVersion={selectedPromptVersion}
      />
      <PromptCreateModal
        isOpen={createPromptModalOpen}
        onClose={() => setCreatePromptModalOpen(false)}
        onCreated={handlePromptCreated}
      />
    </AppLayout>
  );
};

export default StoryGenerator;
