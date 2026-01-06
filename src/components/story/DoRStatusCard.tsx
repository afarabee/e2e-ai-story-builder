import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface DoRResult {
  passed: boolean;
  iterations: number;
  fail_reasons: string[];
}

export function DoRStatusCard({ dor }: { dor: DoRResult }) {
  return (
    <Card className={dor.passed ? "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900" : "bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-900"}>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            {dor.passed ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            <span>Definition of Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={dor.passed ? "outline" : "destructive"} className="text-xs">
              {dor.passed ? "Passed" : "Failed"}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {dor.iterations} iteration{dor.iterations !== 1 ? 's' : ''}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      {!dor.passed && dor.fail_reasons.length > 0 && (
        <CardContent className="pt-0 pb-3">
          <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/30 rounded border border-red-100 dark:border-red-900">
            <p className="text-xs font-medium text-red-800 dark:text-red-300 mb-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Why it failed:
            </p>
            <ul className="space-y-0.5 pl-4">
              {dor.fail_reasons.map((reason, idx) => (
                <li key={idx} className="text-xs text-red-700 dark:text-red-400 list-disc">
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
