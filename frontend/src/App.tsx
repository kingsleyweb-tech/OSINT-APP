import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/Dashboard/Dashboard';
import { NewInvestigationPage } from './pages/NewInvestigation/NewInvestigation';
import { InvestigationDetailPage } from './pages/Investigation/InvestigationDetail';
import { InvestigationsListPage } from './pages/Investigations/InvestigationsList';
import { PeoplePage } from './pages/People/People';
import { SourcesPage } from './pages/Sources/Sources';
import { SettingsPage } from './pages/Settings/Settings';
import { HelpPage } from './pages/Help/Help';
import { SocialSearchPage } from './pages/Explore/SocialSearch';
import { NewsSearchPage } from './pages/Explore/NewsSearch';
import { MediaSearchPage } from './pages/Explore/MediaSearch';
import { GeoSearchPage } from './pages/Explore/GeoSearch';
import { TrendsSearchPage } from './pages/Explore/TrendsSearch';
import { NetworkPage } from './pages/Analysis/Network';
import { ContentAnalysisPage } from './pages/Analysis/ContentAnalysis';
import { SearchHistoryPage } from './pages/History/SearchHistory';
import { AuthPage } from './pages/Auth/AuthPages';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { ToastProvider } from './components/ui/Toast';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { SessionProvider, useSession } from './context/SessionContext';
import { SignOutPromptProvider, useSignOutPrompt } from './context/SignOutPromptContext';
import { SearchLoader } from './components/ui/SearchLoader';

// Landing Page Integration
import { LandingLayout } from './landing/LandingLayout';
import { HomePage } from './landing/pages/HomePage';
import { FeaturesPage } from './landing/pages/FeaturesPage';
import { HowItWorksPage } from './landing/pages/HowItWorksPage';
import { AboutPage } from './landing/pages/AboutPage';
import { DocumentationPage } from './landing/pages/DocumentationPage';
import { PublicHelpPage } from './landing/pages/HelpPage';
import { PrivacyPage } from './landing/pages/PrivacyPage';
import { TermsPage } from './landing/pages/TermsPage';
import { ResponsibleUsePage } from './landing/pages/ResponsibleUsePage';
import { LawEnforcementPage } from './landing/pages/LawEnforcementPage';

/** Signed-in pages: redirect to the homepage when signed out, otherwise render inside the app layout. */
const AppPage: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user } = useSession();
  const { promptSignOut } = useSignOutPrompt();
  return (
    <ProtectedRoute user={user}>
      <Layout userName={user?.displayName || 'Investigator'} userRole={user?.role} photoURL={user?.photoURL} onSignOut={promptSignOut}>
        {children}
      </Layout>
    </ProtectedRoute>
  );
};

/** The auth page is only for signed-out visitors; signed-in users continue to where they were going. */
const AuthRoute: React.FC = () => {
  const { user } = useSession();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  if (user) return <Navigate to={from && from !== '/auth' ? from : '/dashboard'} replace />;
  return <AuthPage />;
};

const TAB_ROUTES = ['overview', 'profiles', 'activity', 'associations', 'sources', 'webnews', 'stats', 'news', 'images', 'location'];

const AppRoutes: React.FC = () => {
  const { user, loading } = useSession();

  // Wait for Firebase to restore the saved session so a refresh never bounces a signed-in user.
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: 20, backgroundColor: 'var(--bg-dark)', color: 'var(--text-secondary)' }}>
        <SearchLoader title="Restoring your session…" />
      </div>
    );
  }

  return (
    <SignOutPromptProvider>
    <Routes>
      {/* Public landing pages */}
      <Route element={<LandingLayout currentUser={user} />}>
        <Route path="/" element={<HomePage currentUser={user} />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/documentation" element={<DocumentationPage />} />
        <Route path="/help-center" element={<PublicHelpPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/responsible-use" element={<ResponsibleUsePage />} />
        <Route path="/law-enforcement" element={<LawEnforcementPage />} />
      </Route>

      <Route path="/auth" element={<AuthRoute />} />

      {/* Signed-in application */}
      <Route path="/dashboard" element={<AppPage><DashboardPage currentUser={user || undefined} /></AppPage>} />
      <Route path="/new-investigation" element={<AppPage><NewInvestigationPage currentUser={user || undefined} /></AppPage>} />
      <Route path="/search" element={<AppPage><NewInvestigationPage currentUser={user || undefined} /></AppPage>} />
      <Route path="/investigations" element={<AppPage><InvestigationsListPage currentUser={user || undefined} /></AppPage>} />
      <Route path="/investigations/:id" element={<AppPage><InvestigationDetailPage activeTabRoute="overview" /></AppPage>} />
      {TAB_ROUTES.map(tab => (
        <Route key={tab} path={`/investigations/:id/${tab}`} element={<AppPage><InvestigationDetailPage activeTabRoute={tab} /></AppPage>} />
      ))}
      <Route path="/investigations/:id/:tab" element={<AppPage><InvestigationDetailPage /></AppPage>} />
      <Route path="/people" element={<AppPage><PeoplePage currentUser={user || undefined} /></AppPage>} />
      <Route path="/sources" element={<AppPage><SourcesPage /></AppPage>} />
      <Route path="/help" element={<AppPage><HelpPage /></AppPage>} />
      <Route path="/settings" element={<AppPage><SettingsPage /></AppPage>} />
      <Route path="/search/social" element={<AppPage><SocialSearchPage /></AppPage>} />
      <Route path="/search/news" element={<AppPage><NewsSearchPage /></AppPage>} />
      <Route path="/search/media" element={<AppPage><MediaSearchPage /></AppPage>} />
      <Route path="/search/geo" element={<AppPage><GeoSearchPage /></AppPage>} />
      <Route path="/search/trends" element={<AppPage><TrendsSearchPage /></AppPage>} />
      <Route path="/analyse/network" element={<AppPage><NetworkPage /></AppPage>} />
      <Route path="/analyse/content" element={<AppPage><ContentAnalysisPage /></AppPage>} />
      <Route path="/history" element={<AppPage><SearchHistoryPage /></AppPage>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </SignOutPromptProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <NotificationProvider>
          <ToastProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ToastProvider>
        </NotificationProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

export default App;
