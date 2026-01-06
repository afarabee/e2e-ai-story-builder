import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EvalScoringHelpModal } from "./EvalScoringHelpModal";

export interface EvalResult {
  overall: number;
  needs_review: boolean;
  dimensions: Record<string, number>;
  flags: string[];
  explanations?: Record<string, string[]>;
  unclear_ac_indices?: number[];
}

export function RunEvaluationCard({ evalResult }: { evalResult: EvalResult }) {
  const [expandedFlags, setExpandedFlags] = useState<string[]>([]);

  const toggleFlag = (flag: string) => {
    setExpandedFlags(prev => 
      prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]
    );
  };

  const hasExplanation = (flag: string) => 
    evalResult.explanations?.[flag]?.length > 0;

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
          <div className="mt-2 space-y-1">
            {evalResult.flags.map((flag, idx) => {
              const hasDetails = hasExplanation(flag);
              const isExpanded = expandedFlags.includes(flag);
              
              return (
                <div key={idx}>
                  {hasDetails ? (
                    <Collapsible open={isExpanded} onOpenChange={() => toggleFlag(flag)}>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-1.5 rounded bg-secondary/50 hover:bg-secondary cursor-pointer">
                          <Badge variant="secondary" className="text-xs">
                            {flag.replace(/_/g, " ")}
                          </Badge>
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-1 p-2 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-100 dark:border-amber-900">
                          <ul className="space-y-0.5 pl-4">
                            {evalResult.explanations![flag].map((reason, ridx) => (
                              <li key={ridx} className="text-xs text-amber-800 dark:text-amber-300 list-disc">
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {flag.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
