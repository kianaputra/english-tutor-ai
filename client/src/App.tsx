import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import TutorPageMediaPipe from "./pages/TutorPageMediaPipe";
import PasswordGate from "./pages/PasswordGate";
import ApiKeySetup from "./pages/ApiKeySetup";
import { useState, useEffect } from "react";

type Stage = 'password' | 'apikey' | 'app';

function Router() {
  return (
    <Switch>
      <Route path="/" component={TutorPageMediaPipe} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [stage, setStage] = useState<Stage>('password');

  useEffect(() => {
    const unlocked = localStorage.getItem('msmaria_unlocked') === 'true';
    const hasKey = !!localStorage.getItem('eng_tutor_groq');

    if (unlocked && hasKey) setStage('app');
    else if (unlocked) setStage('apikey');
    else setStage('password');
  }, []);

  const handleUnlocked = () => {
    const hasKey = !!localStorage.getItem('eng_tutor_groq');
    setStage(hasKey ? 'app' : 'apikey');
  };

  const handleApiKeySet = (_key: string) => {
    setStage('app');
  };

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          {stage === 'password' && <PasswordGate onUnlock={handleUnlocked} />}
          {stage === 'apikey'  && <ApiKeySetup onComplete={handleApiKeySet} />}
          {stage === 'app'     && <Router />}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
