import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { EvalScoringHelpModal } from "./EvalScoringHelpModal";

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
  dor: string[];
  eval: EvalResult;
}

interface ComparePanelProps {
  run: Run;
}

export function ComparePanel({ run }: ComparePanelProps) {
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

        {/* Eval Card */}
        <Card className="bg-muted/50">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>Evaluation</span>
                <EvalScoringHelpModal />
              </div>
              <div className="flex items-center gap-2">
                {evalResult.needs_review && (
                  <Badge variant="destructive" className="gap-1 text-xs">
                    <AlertTriangle className="h-3 w-3" />
                    Needs Review
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  Overall: {evalResult.overall}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-3">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(evalResult.dimensions).map(([dimension, score]) => (
                <div
                  key={dimension}
                  className="flex items-center justify-between text-xs bg-background rounded px-2 py-1"
                >
                  <span className="capitalize text-muted-foreground">
                    {dimension.replace(/_/g, " ")}
                  </span>
                  <span className="font-medium">{score}</span>
                </div>
              ))}
            </div>
            {evalResult.flags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {evalResult.flags.map((flag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {flag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
