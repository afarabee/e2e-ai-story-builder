import { useState, useRef, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { StoryBuilder } from "@/components/story/StoryBuilder";
import { ProjectSidebar } from "@/components/sidebar/ProjectSidebar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { StoryVersion } from "@/hooks/useVersionHistory";

const StoryGenerator = () => {
  const [storyGenerated, setStoryGenerated] = useState(false);
  const [showChat, setShowChat] = useState(false);
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
    setStory(null);
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
        />
      }
      chatContent={
        <ChatPanel 
          key={storyGenerated ? 'story' : 'no-story'} 
          currentStory={story}
          onApplySuggestion={handleApplySuggestion}
          onUndoSuggestion={handleUndoSuggestion}
        />
      }
      showChat={showChat}
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
        onSetPresetHandlers={(currentPreset, presetChange, applyPreset) => {
          setSelectedPreset(currentPreset);
          presetChangeRef.current = presetChange;
          applyPresetRef.current = applyPreset;
        }}
      />
    </AppLayout>
  );
};

export default StoryGenerator;
