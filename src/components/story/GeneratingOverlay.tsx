import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

const LOADING_MESSAGES = [
  "AI magic is happening...",
  "Crafting your user stories...",
  "Analyzing requirements...",
  "Building acceptance criteria...",
  "Almost there...",
  "Evaluating story quality...",
  "Running testability checks...",
  "Polishing the details...",
];

export function GeneratingOverlay() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-24 space-y-6 animate-fade-in">
      {/* Pulsing sparkle icon */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 border border-primary/20">
          <Sparkles className="h-8 w-8 text-primary animate-pulse" />
        </div>
      </div>

      {/* Rotating message */}
      <p
        key={messageIndex}
        className="text-lg font-medium text-muted-foreground animate-fade-in"
      >
        {LOADING_MESSAGES[messageIndex]}
      </p>

      {/* Animated dots bar */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-primary/60"
            style={{
              animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
