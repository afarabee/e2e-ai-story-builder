import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Edit, Eye } from "lucide-react";
import { RunEvaluationCard } from "./RunEvaluationCard";

interface EvalResult {
  overall: number;
  needs_review: boolean;
  dimensions: Record<string, number>;
  flags: string[];
}

interface FinalStory {
  title: string;
  description: string;
  acceptance_criteria: string[];
}

interface Run {
  run_id: string;
  model_id: string;
  story_id: string;
  final_story: FinalStory;
  dor: {
    passed: boolean;
    iterations: number;
    fail_reasons: string[];
  };
  eval: EvalResult;
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

interface ComparePanelProps {
  run: Run;
  onEditVersion?: (run: Run) => void;
  onViewInput?: (run: Run) => void;
}

export function ComparePanel({ run, onEditVersion, onViewInput }: ComparePanelProps) {
  const { model_id, story_id, final_story, eval: evalResult } = run;

  return (
    <Card className="flex-1 min-w-0">
      <CardHeader className="pb-3">
        <div className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2">
            {model_id}
          </CardTitle>
          <p className="text-xs text-muted-foreground font-mono">
            ID: {story_id}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Story Content */}
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Title</h4>
            <p className="text-sm font-medium">{final_story.title}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
            <p className="text-sm">{final_story.description}</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              Acceptance Criteria
            </h4>
            <ul className="space-y-1">
              {final_story.acceptance_criteria.map((criterion, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-status-ready flex-shrink-0 mt-0.5" />
                  <span>{criterion}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <RunEvaluationCard evalResult={evalResult} />

        {/* Action buttons */}
        <div className="flex gap-2">
          {/* View Run Input - Always shown */}
          {onViewInput && (
            <Button 
              variant="outline"
              size="sm"
              onClick={() => onViewInput(run)}
              className="flex-1 gap-2"
            >
              <Eye className="h-4 w-4" />
              View Input
            </Button>
          )}
          
          {/* Edit this version button */}
          {onEditVersion && (
            <Button 
              size="sm"
              onClick={() => onEditVersion(run)}
              className="flex-1 gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit this version
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
