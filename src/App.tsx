import { useState, useEffect, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { APIProvider } from '@vis.gl/react-google-maps';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import Listings from './pages/Listings';
import PropertyDetails from './pages/PropertyDetails';
import Dashboard from './pages/Dashboard';
import AuthPage from './pages/AuthPage';
import Agents from './pages/Agents';
import AgentProfile from './pages/AgentProfile';
import SubmitRequest from './pages/SubmitRequest';
import BecomePartner from './pages/BecomePartner';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './components/ui/Toast';
import GeminiChatbot from './components/chat/GeminiChatbot';

const MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';

function MapsProviderWrapper({ children }: { children: ReactNode }) {
  if (!MAPS_API_KEY) return <>{children}</>;
  return (
    <APIProvider
      apiKey={MAPS_API_KEY}
      language="pt"
      region="AO"
      libraries={['marker']}
    >
      {children}
    </APIProvider>
  );
}

export default function App() {
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  return (
    <ToastProvider>
      <AuthProvider>
        <MapsProviderWrapper>
          <Router>
            <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-gray-900 selection:text-white">
              {quotaExceeded && (
                <div
                  role="alert"
                  className="sticky top-0 z-[100] bg-amber-50 border-b border-amber-300 px-4 py-3 text-amber-900 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm"
                >
                  <span>
                    <strong>Google Maps API key expired or quota exceeded.</strong> Enable billing
                    in your Google Cloud Console or create a new project to restore full map
                    functionality.{' '}
                    <a
                      href="https://console.cloud.google.com/billing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-semibold"
                    >
                      Manage Billing
                    </a>
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuotaExceeded(false)}
                    className="px-3 py-1 rounded-lg bg-amber-200/70 hover:bg-amber-200 text-xs font-semibold cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              )}

              <Navbar />
              <main>
                <AnimatePresence mode="wait">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/listings" element={<Listings />} />
                    <Route path="/property/:id" element={<PropertyDetails />} />
                    <Route path="/agents" element={<Agents />} />
                    <Route path="/agents/:id" element={<AgentProfile />} />
                    <Route path="/request-submission" element={<SubmitRequest />} />
                    <Route path="/become-partner" element={<BecomePartner />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/auth" element={<AuthPage />} />
                  </Routes>
                </AnimatePresence>
              </main>
              <GeminiChatbot />
            </div>
          </Router>
        </MapsProviderWrapper>
      </AuthProvider>
    </ToastProvider>
  );
}
