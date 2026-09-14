import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { TravelDraftProvider } from '@/context/TravelDraftContext';
import { TabLayout } from '@/components/Layout';
import { ChatPage, MatchingPage } from '@/pages/ComingSoonPages';
import { ChecklistPage } from '@/pages/ChecklistPage';
import { CreateTravelPage } from '@/pages/CreateTravelPage';
import { GeneratingPage } from '@/pages/GeneratingPage';
import { HomePage } from '@/pages/HomePage';
import { ItineraryPage } from '@/pages/ItineraryPage';
import { KakaoCallbackPage } from '@/pages/KakaoCallbackPage';
import { LoginPage } from '@/pages/LoginPage';
import { MapSearchPage } from '@/pages/MapSearchPage';
import { MatchingSettingsPage } from '@/pages/MatchingSettingsPage';
import { MyPage } from '@/pages/MyPage';
import { MyTripsPage } from '@/pages/MyTripsPage';
import { NotificationSettingsPage } from '@/pages/NotificationSettingsPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { PlacesPage } from '@/pages/PlacesPage';
import { PoliciesPage } from '@/pages/PoliciesPage';
import { PreferencePage } from '@/pages/PreferencePage';
import { VideoPage } from '@/pages/VideoPage';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

function Gate() {
  const { ready, user } = useAuth();
  if (!ready) {
    return (
      <div className="splash">
        <div className="splash-mark">AUDIGO</div>
      </div>
    );
  }
  return <Navigate to={user ? '/home' : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TravelDraftProvider>
          <div className="app-shell">
            <div className="phone">
              <ToastProvider>
                <Routes>
                  <Route path="/" element={<Gate />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/auth/kakao" element={<KakaoCallbackPage />} />
                  <Route element={<TabLayout />}>
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/matching" element={<MatchingPage />} />
                    <Route path="/chat" element={<ChatPage />} />
                    <Route path="/my" element={<MyPage />} />
                  </Route>
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/create-travel" element={<CreateTravelPage />} />
                  <Route path="/create-travel/preference" element={<PreferencePage />} />
                  <Route path="/create-travel/places" element={<PlacesPage />} />
                  <Route path="/create-travel/map-search" element={<MapSearchPage />} />
                  <Route path="/generating/:id" element={<GeneratingPage />} />
                  <Route path="/itinerary/:id" element={<ItineraryPage />} />
                  <Route path="/checklist/:id" element={<ChecklistPage />} />
                  <Route path="/video/:id" element={<VideoPage />} />
                  <Route path="/my-trips" element={<MyTripsPage />} />
                  <Route path="/matching-settings" element={<MatchingSettingsPage />} />
                  <Route path="/notification-settings" element={<NotificationSettingsPage />} />
                  <Route path="/policies" element={<PoliciesPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ToastProvider>
            </div>
          </div>
        </TravelDraftProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
