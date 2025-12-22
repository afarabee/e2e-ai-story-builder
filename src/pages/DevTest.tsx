import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  createSession, 
  getSession, 
  getSessionHistory,
  createStorySnapshot,
  createAction
} from "@/lib/supabase";

interface TestResult {
  name: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export default function DevTest() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const runTests = async () => {
    setResults([]);
    setIsRunning(true);

    try {
      // Test 1: createSession
      const { session } = await createSession("Dev Test Session", { test: true });
      setSessionId(session.id);
      addResult({ 
        name: "createSession", 
        success: true, 
        data: { id: session.id, title: session.title, status: session.status } 
      });

      // Test 2: getSession
      const sessionResult = await getSession(session.id);
      addResult({ 
        name: "getSession", 
        success: true, 
        data: { 
          sessionId: sessionResult.session.id,
          currentStory: sessionResult.currentStory,
          lastAction: sessionResult.lastAction
        }
      });

      // Test 3: getSessionHistory (should be empty)
      const { actions } = await getSessionHistory(session.id);
      addResult({ 
        name: "getSessionHistory", 
        success: true, 
        data: { count: actions.length, actions }
      });

      // Test 4: createStorySnapshot
      const testStory = { title: "Test Story", scenes: [] };
      const { storyRow } = await createStorySnapshot(session.id, testStory, "manual");
      addResult({ 
        name: "createStorySnapshot", 
        success: true, 
        data: { id: storyRow.id, source: storyRow.source }
      });

      // Test 5: createAction
      const { actionRow } = await createAction(session.id, {
        action_type: "generate",
        prompt_version: "test-v1",
        inputs: { prompt: "test input" },
        output_format: "json",
        after_story_id: storyRow.id
      });
      addResult({ 
        name: "createAction", 
        success: true, 
        data: { id: actionRow.id, action_type: actionRow.action_type }
      });

      // Test 6: getSessionHistory again (should have 1 action)
      const { actions: actionsAfter } = await getSessionHistory(session.id);
      addResult({ 
        name: "getSessionHistory (after)", 
        success: true, 
        data: { count: actionsAfter.length }
      });

    } catch (err) {
      addResult({ 
        name: "ERROR", 
        success: false, 
        error: err instanceof Error ? err.message : String(err)
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Supabase Service Layer Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Dev-only page to verify database operations. Safe to remove.
            </p>
            <Button onClick={runTests} disabled={isRunning}>
              {isRunning ? "Running..." : "Run All Tests"}
            </Button>
            {sessionId && (
              <p className="text-xs text-muted-foreground">
                Session ID: <code className="bg-muted px-1 rounded">{sessionId}</code>
              </p>
            )}
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground text-lg">Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.map((result, i) => (
                <div 
                  key={i} 
                  className={`p-3 rounded-md border ${
                    result.success 
                      ? "bg-green-500/10 border-green-500/30" 
                      : "bg-destructive/10 border-destructive/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={result.success ? "text-green-500" : "text-destructive"}>
                      {result.success ? "✓" : "✗"}
                    </span>
                    <span className="font-medium text-foreground">{result.name}</span>
                  </div>
                  <pre className="text-xs text-muted-foreground overflow-x-auto">
                    {result.error || JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
