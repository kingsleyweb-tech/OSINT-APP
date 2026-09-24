import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/Dashboard/Dashboard';
import { NewInvestigationPage } from './pages/NewInvestigation/NewInvestigation';
import { InvestigationDetailPage } from './pages/Investigation/InvestigationDetail';
import { InvestigationsListPage } from './pages/Investigations/InvestigationsList';
import { PeoplePage } from './pages/People/People';
import { SourcesPage } from './pages/Sources/Sources';
import { SettingsPage } from './pages/Settings/Settings';
import { HelpPage } from './pages/Help/Help';
import { AuthPage } from './pages/Auth/AuthPages';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { subscribeToAuth } from './firebase/auth';
import { getUserProfileFromDb, createUserProfileInDb } from './firebase/firestore';
import { ToastProvider } from './components/ui/Toast';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { CoilingSnakeLoader } from './components/search/CoilingSnakeLoader';

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

function App() {
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('osint_user_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const handleUpdateUserSession = (userData: any) => {
    setCurrentUser(userData);
    if (userData) {
      localStorage.setItem('osint_user_session', JSON.stringify(userData));
    } else {
      localStorage.removeItem('osint_user_session');
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (user) => {
      if (user) {
        try {
          const profile = await getUserProfileFromDb(user.uid);
          const userData = {
            uid: user.uid,
            email: user.email,
            displayName: profile?.displayName || user.displayName || user.email?.split('@')[0] || 'Investigator',
            role: profile?.role || 'Investigator',
            photoURL: profile?.photoURL || user.photoURL
          };
          if (!profile) {
            const newProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: userData.displayName,
              role: 'Investigator',
              createdAt: new Date().toISOString()
            };
            createUserProfileInDb(newProfile).catch(err => console.error("Profile creation error:", err));
          }
          handleUpdateUserSession(userData);
        } catch (err) {
          console.error("Error fetching user profile:", err);
          handleUpdateUserSession(user);
        }
      } else {
        const saved = localStorage.getItem('osint_user_session');
        if (saved) {
          try {
            setCurrentUser(JSON.parse(saved));
          } catch (e) {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        backgroundColor: '#090d16',
        color: '#94a3b8' 
      }}>
        <CoilingSnakeLoader query="Authenticating session..." searchType="Auth" />
      </div>
    );
  }

  const userDisplayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || "Investigator";

  return (
    <ThemeProvider>
      <NotificationProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Landing Pages */}
              <Route element={<LandingLayout currentUser={currentUser} />}>
                <Route path="/" element={<HomePage currentUser={currentUser} />} />
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

              {/* Auth Route */}
              <Route 
                path="/auth" 
                element={
                  currentUser ? <Navigate to="/dashboard" replace /> : <AuthPage onLoginSuccess={(u) => handleUpdateUserSession(u)} />
                } 
              />

              {/* Protected Application Dashboard Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute user={currentUser}>
                    <Layout userName={userDisplayName}>
                      <DashboardPage currentUser={currentUser} />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/new-investigation"
                element={
                  <ProtectedRoute user={currentUser}>
                    <Layout userName={userDisplayName}>
                      <NewInvestigationPage currentUser={currentUser} />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/search"
                element={
                  <ProtectedRoute user={currentUser}>
                    <Layout userName={userDisplayName}>
                      <NewInvestigationPage currentUser={currentUser} />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/investigations"
                element={
                  <ProtectedRoute user={currentUser}>
                    <Layout userName={userDisplayName}>
                      <InvestigationsListPage currentUser={currentUser} />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/investigations/:id"
                element={
                  <ProtectedRoute user={currentUser}>
                    <Layout userName={userDisplayName}>
                      <InvestigationDetailPage activeTabRoute="overview" />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/investigations/:id/overview"
                element={
                  <ProtectedRoute user={currentUser}>
                    <Layout userName={userDisplayName}>
                      <InvestigationDetailPage activeTabRoute="overview" />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/investigations/:id/profiles"
                element={
                  <ProtectedRoute user={currentUser}>
                    <Layout userName={userDisplayName}>
                      <InvestigationDetailPage activeTabRoute="profiles" />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/investigations/:id/activity"
                element={
                  <ProtectedRoute user={currentUser}>
                    <Layout userName={userDisplayName}>
                      <InvestigationDetailPage activeTabRoute="activity" />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/investigations/:id/associations"
                element={
                  <ProtectedRoute user={currentUser}>
                    <Layout userName={userDisplayName}>
                      <InvestigationDetailPage activeTabRoute="associations" />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/investigations/:id/sources"
                element={
                  <ProtectedRoute user={currentUser}>
                    <Layout userName={userDisplayName}>
                      <InvestigationDetailPage activeTabRoute="sources" />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/investigations/:id/webnews"
                element={
                  <ProtectedRoute user={currentUser}>
                    <Layout userName={userDisplayName}>
                      <InvestigationDetailPage activeTabRoute="webnews" />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/investigations/:id/notes"
                element={
                  <ProtectedRoute user={currentUser}>
                    <Layout userName={userDisplayName}>
                      <InvestigationDetailPage activeTabRoute="notes" />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/investigations/:id/stats"
                element={
                  <ProtectedRoute user={currentUser}>
                    <Layout userName={userDisplayName}>
                      <InvestigationDetailPage activeTabRoute="stats" />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/investigations/:id/:tab"
                element={
                  <ProtectedRoute user={currentUser}>
                    <Layout userName={userDisplayName}>
                      <InvestigationDetailPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/people"
                element={
                  <ProtectedRoute user={currentUser}>
                    <Layout userName={userDisplayName}>
                      <PeoplePage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/sources"
                element={
                  <ProtectedRoute user={currentUser}>
                    <Layout userName={userDisplayName}>
                      <SourcesPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/help"
                element={
                  <ProtectedRoute user={currentUser}>
                    <Layout userName={userDisplayName}>
                      <HelpPage />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute user={currentUser}>
                    <Layout userName={userDisplayName}>
                      <SettingsPage 
                        currentUser={currentUser} 
                        onUpdateUser={(updatedName) => setCurrentUser((prev: any) => ({ ...prev, displayName: updatedName }))}
                      />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* Catch-all route to avoid 404 errors */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;
