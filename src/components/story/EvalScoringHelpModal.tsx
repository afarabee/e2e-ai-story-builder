import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EvalScoringHelpModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-xs text-muted-foreground hover:text-foreground h-auto p-0"
        >
          <HelpCircle className="h-3 w-3" />
          How scoring works
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How Scoring Works</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          {/* Overall Score */}
          <section>
            <h3 className="font-semibold mb-2">Overall Score (1–5)</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">4.5–5.0:</span> Clear, specific, testable
              </li>
              <li>
                <span className="font-medium text-foreground">3.5–4.4:</span> Usable, may need minor refinement
              </li>
              <li>
                <span className="font-medium text-foreground">&lt; 3.5:</span> Likely missing context, constraints, or testability
              </li>
            </ul>
          </section>

          {/* Needs Review */}
          <section>
            <h3 className="font-semibold mb-2">Needs Review</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>A warning that the story may be risky or underspecified</li>
              <li>Does not block generation; it's a human-in-the-loop signal</li>
            </ul>
          </section>

          {/* Dimensions */}
          <section>
            <h3 className="font-semibold mb-2">Dimensions</h3>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Clarity:</span> Is the intent unambiguous?
              </li>
              <li>
                <span className="font-medium text-foreground">Testability:</span> Can each criterion be verified objectively?
              </li>
              <li>
                <span className="font-medium text-foreground">Completeness:</span> Are key scenarios and constraints covered?
              </li>
              <li>
                <span className="font-medium text-foreground">Scope:</span> Is it bounded and feasible?
              </li>
              <li>
                <span className="font-medium text-foreground">Consistency:</span> Do story + criteria align without contradictions?
              </li>
            </ul>
          </section>

          {/* Flags */}
          <section>
            <h3 className="font-semibold mb-2">Flags</h3>
            <p className="text-muted-foreground mb-2">
              Specific reasons the eval is concerned. Examples:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><code className="text-xs bg-muted px-1 rounded">ambiguous_scope</code></li>
              <li><code className="text-xs bg-muted px-1 rounded">missing_edge_cases</code></li>
              <li><code className="text-xs bg-muted px-1 rounded">parse_error</code></li>
              <li><code className="text-xs bg-muted px-1 rounded">llm_error</code></li>
              <li><code className="text-xs bg-muted px-1 rounded">model_fallback_used</code></li>
            </ul>
          </section>

          {/* How to use */}
          <section>
            <h3 className="font-semibold mb-2">How to Use This</h3>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Review flagged items first</li>
              <li>Add missing constraints or edge cases</li>
              <li>Clarify ambiguous requirements</li>
              <li>Regenerate if needed</li>
            </ol>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
