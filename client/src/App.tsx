import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import TutorPageMediaPipe from "./pages/TutorPageMediaPipe";
import PasswordGate from "./pages/PasswordGate";
import { useState, useEffect } from "react";

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
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    // Check if already unlocked in this session
    const saved = localStorage.getItem('msmaria_unlocked');
    if (saved === 'true') setUnlocked(true);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          {unlocked ? <Router /> : <PasswordGate onUnlock={() => setUnlocked(true)} />}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
