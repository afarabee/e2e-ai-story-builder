import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Your Blank Canvas
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A clean foundation ready for your next great idea
          </p>
          
          <div className="flex gap-4 justify-center pt-8">
            <Button size="lg" className="font-medium">
              Get Started
            </Button>
            <Button size="lg" variant="outline" className="font-medium">
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
