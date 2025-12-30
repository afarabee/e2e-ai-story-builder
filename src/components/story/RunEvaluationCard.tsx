import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { EvalScoringHelpModal } from "./EvalScoringHelpModal";

export interface EvalResult {
  overall: number;
  needs_review: boolean;
  dimensions: Record<string, number>;
  flags: string[];
}

export function RunEvaluationCard({ evalResult }: { evalResult: EvalResult }) {
  return (
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
  );
}
