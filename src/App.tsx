import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.js';
import { FarmerDashboard } from './components/FarmerDashboard.js';
import { ExpertReviewCenter } from './components/ExpertReviewCenter.js';
import { AdminConsole } from './components/AdminConsole.js';
import { KnowledgeView } from './components/KnowledgeView.js';
import { ScanModal } from './components/ScanModal.js';
import { ObservationDetailModal } from './components/ObservationDetailModal.js';
import { NewPlantingModal } from './components/NewPlantingModal.js';
import { AuthModal } from './components/AuthModal.js';
import { supabase } from './lib/supabase.js';
import {
  getOfflineScans,
  saveOfflineScan,
  removeOfflineScan,
  cachePlantingsOffline,
  getCachedPlantingsOffline,
  cacheObservationsOffline,
  getCachedObservationsOffline,
  OfflinePendingScan,
} from './lib/offlineDb.js';
import {
  User,
  ExpertProfile,
  Farm,
  Field,
  CropPlanting,
  PlantObservation,
  ExpertReviewCase,
  AgriculturalKnowledgeItem,
  CropCatalogItem,
  RoutingThresholdsConfig,
  SystemAuditLog,
  WeatherContext,
} from './types.js';

export default function App() {
  // Authentication state
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('cropwatch_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [expertProfile, setExpertProfile] = useState<ExpertProfile | undefined>(undefined);
  const [allDemoUsers, setAllDemoUsers] = useState<User[]>([]);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Navigation View
  const [activeView, setActiveView] = useState<'farmer' | 'expert' | 'admin' | 'knowledge'>('farmer');

  // Network & Offline states
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [pendingScans, setPendingScans] = useState<OfflinePendingScan[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Core Data Collections
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plantings, setPlantings] = useState<CropPlanting[]>([]);
  const [observations, setObservations] = useState<PlantObservation[]>([]);
  const [expertCases, setExpertCases] = useState<ExpertReviewCase[]>([]);
  const [knowledge, setKnowledge] = useState<AgriculturalKnowledgeItem[]>([]);
  const [crops, setCrops] = useState<CropCatalogItem[]>([]);
  const [weather, setWeather] = useState<WeatherContext | null>(null);
  const [thresholds, setThresholds] = useState<RoutingThresholdsConfig>({
    aiHighConfidenceCutoff: 0.9,
    aiMediumConfidenceCutoff: 0.7,
    rapidDeclineThresholdScore: 20,
    stapleCropsMandatoryEscalation: ['Cassava', 'Lowland Rice (Swamp)', 'Upland Rice'],
    highRiskDiseases: ['Cassava Mosaic Disease', 'Cassava Brown Streak Disease', 'Rice Blast'],
    mandatoryExtensionReviewForChemicals: true,
    autoEscalateFarmerDisagreement: true,
  });
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);
  const [expertProfiles, setExpertProfiles] = useState<ExpertProfile[]>([]);

  // Modals state
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanDefaultPlantingId, setScanDefaultPlantingId] = useState<string | undefined>(undefined);
  const [selectedObservation, setSelectedObservation] = useState<PlantObservation | null>(null);
  const [newPlantingModalOpen, setNewPlantingModalOpen] = useState(false);

  const effectiveOnline = isOnline && !isSimulatedOffline;

  // Authenticated fetch wrapper
  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const activeToken = token || localStorage.getItem('cropwatch_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };

      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }

      const res = await fetch(url, {
        ...options,
        credentials: 'include',
        headers,
      });

      if (res.status === 401) {
        console.warn(`401 Unauthorized on ${url}`);
      }

      return res;
    },
    [token]
  );

  // Toggle online/offline mode simulation
  const handleToggleOnlineMode = () => {
    setIsSimulatedOffline((prev) => !prev);
  };

  // Fetch pending offline scans from IndexedDB
  const refreshPendingScans = useCallback(async () => {
    try {
      const scans = await getOfflineScans();
      setPendingScans(scans);
    } catch (err) {
      console.warn('Error reading offline scans', err);
    }
  }, []);

  // Fetch all core data from server
  const loadServerData = useCallback(
    async (activeOverrideToken?: string) => {
      const currentAuthToken = activeOverrideToken || token || localStorage.getItem('cropwatch_token');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (currentAuthToken) {
        headers['Authorization'] = `Bearer ${currentAuthToken}`;
      }

      try {
        // Auth & Profile check
        const authRes = await fetch('/api/auth/me', {
          credentials: 'include',
          headers,
        }).then((r) => r.json());

        if (authRes.success) {
          setIsDemoMode(authRes.isDemoMode || false);
          if (authRes.allUsers) setAllDemoUsers(authRes.allUsers);

          if (authRes.isAuthenticated && authRes.user) {
            setCurrentUser(authRes.user);
            setExpertProfile(authRes.expertProfile);
          } else {
            setCurrentUser(null);
            setExpertProfile(undefined);
          }
        }

        // Public or Authenticated Core Data
        const [farmsRes, plantingsRes, obsRes, weatherRes, cropsRes] = await Promise.all([
          fetch('/api/farms', { credentials: 'include', headers }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/plantings', { credentials: 'include', headers }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/observations', { credentials: 'include', headers }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/weather?county=Bong').then((r) => r.json()).catch(() => ({})),
          fetch('/api/crops').then((r) => r.json()).catch(() => ({})),
        ]);

        if (farmsRes?.success) setFarms(farmsRes.farms || []);
        if (plantingsRes?.success) {
          setPlantings(plantingsRes.plantings || []);
          await cachePlantingsOffline(plantingsRes.plantings || []);
        }
        if (obsRes?.success) {
          setObservations(obsRes.observations || []);
          await cacheObservationsOffline(obsRes.observations || []);
        }
        if (weatherRes?.success) setWeather(weatherRes.weather);
        if (cropsRes?.success) setCrops(cropsRes.crops || []);

        // Expert / Admin Collections
        const [casesRes, knowledgeRes, thresholdsRes, auditRes, profilesRes] = await Promise.all([
          fetch('/api/expert/cases', { credentials: 'include', headers }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/knowledge', { credentials: 'include', headers }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/admin/thresholds', { credentials: 'include', headers }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/admin/audit-logs', { credentials: 'include', headers }).then((r) => r.json()).catch(() => ({})),
          fetch('/api/admin/expert-profiles', { credentials: 'include', headers }).then((r) => r.json()).catch(() => ({})),
        ]);

        if (casesRes?.success) setExpertCases(casesRes.cases || []);
        if (knowledgeRes?.success) setKnowledge(knowledgeRes.knowledge || []);
        if (thresholdsRes?.success) setThresholds(thresholdsRes.thresholds);
        if (auditRes?.success) setAuditLogs(auditRes.auditLogs || []);
        if (profilesRes?.success) setExpertProfiles(profilesRes.expertProfiles || profilesRes.profiles || []);
      } catch (err) {
        console.warn('Network fetch error, attempting offline fallback:', err);
        // Fallback to IndexedDB cache
        const cachedP = await getCachedPlantingsOffline();
        const cachedO = await getCachedObservationsOffline();
        if (cachedP.length > 0) setPlantings(cachedP);
        if (cachedO.length > 0) setObservations(cachedO);
      } finally {
        setAuthLoading(false);
      }
    },
    [token]
  );

  // Initial mount & connectivity listeners
  useEffect(() => {
    const initApp = async () => {
      // Check auth status
      try {
        const storedToken = localStorage.getItem('cropwatch_token');
        const h: Record<string, string> = {};
        if (storedToken) h['Authorization'] = `Bearer ${storedToken}`;

        const authRes = await fetch('/api/auth/me', { credentials: 'include', headers: h }).then((r) => r.json());
        setIsDemoMode(authRes.isDemoMode || false);
        if (authRes.allUsers) setAllDemoUsers(authRes.allUsers);

        if (authRes.success && authRes.isAuthenticated && authRes.user) {
          setCurrentUser(authRes.user);
          setExpertProfile(authRes.expertProfile);
          await loadServerData(storedToken || undefined);
        } else if (authRes.isDemoMode && authRes.allUsers && authRes.allUsers.length > 0) {
          // If in local dev DEMO_MODE, auto-initialize with the primary farmer account
          const defaultUser = authRes.allUsers[0];
          const switchRes = await fetch('/api/auth/switch-demo-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userId: defaultUser.id }),
          }).then((r) => r.json());

          if (switchRes.success) {
            localStorage.setItem('cropwatch_token', switchRes.token);
            setToken(switchRes.token);
            setCurrentUser(switchRes.user);
            setExpertProfile(switchRes.expertProfile);
            await loadServerData(switchRes.token);
          } else {
            setAuthModalOpen(true);
          }
        } else {
          // Production or non-demo without session
          setAuthModalOpen(true);
          await loadServerData();
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setAuthModalOpen(true);
      } finally {
        setAuthLoading(false);
      }
    };

    initApp();
    refreshPendingScans();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle User/Persona switch (Local dev Demo Mode)
  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/switch-demo-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('cropwatch_token', data.token);
        setToken(data.token);
        setCurrentUser(data.user);
        setExpertProfile(data.expertProfile);
        await loadServerData(data.token);

        // Auto-navigate to appropriate view
        if (data.user.role === 'expert' || data.user.role === 'senior_expert') {
          setActiveView('expert');
        } else if (data.user.role === 'admin') {
          setActiveView('admin');
        } else {
          setActiveView('farmer');
        }
      }
    } catch (err) {
      console.error('Failed to switch demo user:', err);
    }
  };

  const handleLoginSuccess = async (newToken: string, user: User, expertProf?: ExpertProfile) => {
    localStorage.setItem('cropwatch_token', newToken);
    setToken(newToken);
    setCurrentUser(user);
    setExpertProfile(expertProf);
    setAuthModalOpen(false);
    await loadServerData(newToken);

    if (user.role === 'expert' || user.role === 'senior_expert') {
      setActiveView('expert');
    } else if (user.role === 'admin') {
      setActiveView('admin');
    } else {
      setActiveView('farmer');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('Logout request failed', err);
    }
    // Also sign out from Supabase client
    supabase.auth.signOut().catch(() => {});

    localStorage.removeItem('cropwatch_token');
    setToken(null);
    setCurrentUser(null);
    setExpertProfile(undefined);
    setFarms([]);
    setPlantings([]);
    setObservations([]);
    setExpertCases([]);
    setAuthModalOpen(true);
  };

  // Sync queued offline observations
  const handleSyncPendingScans = async () => {
    if (!effectiveOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const scans = await getOfflineScans();
      for (const scan of scans) {
        const res = await fetchWithAuth('/api/observations', {
          method: 'POST',
          body: JSON.stringify({
            plantingId: scan.plantingId,
            imageBase64OrUrl: scan.imageBase64,
            notes: scan.notes,
            farmerReportedSymptoms: scan.farmerReportedSymptoms,
          }),
        });

        const data = await res.json();
        if (data.success) {
          await removeOfflineScan(scan.id);
        }
      }
      await refreshPendingScans();
      await loadServerData();
    } catch (err) {
      console.error('Error syncing offline scans', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Scan submission (Online AI or Offline IndexedDB)
  const handleSubmitScan = async (payload: {
    plantingId: string;
    imageBase64: string;
    notes: string;
    farmerReportedSymptoms: string;
    isOffline: boolean;
  }) => {
    if (payload.isOffline || !effectiveOnline) {
      // Save locally to IndexedDB
      const targetPlanting = plantings.find((p) => p.id === payload.plantingId);
      await saveOfflineScan({
        plantingId: payload.plantingId,
        cropName: targetPlanting?.cropName || 'Crop',
        imageBase64: payload.imageBase64,
        notes: payload.notes,
        farmerReportedSymptoms: payload.farmerReportedSymptoms,
        capturedAt: new Date().toISOString(),
      });
      await refreshPendingScans();
      alert('Saved observation to local offline queue. Will sync when connection is restored.');
    } else {
      // Online execution with Gemini AI Vision & safety engine
      const res = await fetchWithAuth('/api/observations', {
        method: 'POST',
        body: JSON.stringify({
          plantingId: payload.plantingId,
          imageBase64OrUrl: payload.imageBase64,
          notes: payload.notes,
          farmerReportedSymptoms: payload.farmerReportedSymptoms,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Diagnostic scan failed');
      }

      await loadServerData();

      // Open detail modal directly to show diagnosis/status
      if (data.observation) {
        setSelectedObservation(data.observation);
      }
    }
  };

  // Request expert review for an observation
  const handleRequestExpertReview = async (observationId: string, reason?: string) => {
    const res = await fetchWithAuth('/api/expert/request-review', {
      method: 'POST',
      body: JSON.stringify({
        observationId,
        reason: reason || 'Farmer requested field specialist verification',
      }),
    });

    const data = await res.json();
    if (data.success) {
      await loadServerData();
      const updatedCase = data.case || data.expertCase;
      if (updatedCase && selectedObservation) {
        setSelectedObservation({
          ...selectedObservation,
          expertReviewCase: updatedCase,
        });
      }
    }
  };

  // Claim case by specialist
  const handleClaimCase = async (caseId: string) => {
    const res = await fetchWithAuth(`/api/expert/cases/${caseId}/claim`, {
      method: 'POST',
    });
    const data = await res.json();
    if (data.success) {
      await loadServerData();
    }
  };

  // Submit expert assessment
  const handleSubmitAssessment = async (caseId: string, assessmentData: any) => {
    const res = await fetchWithAuth(`/api/expert/cases/${caseId}/assess`, {
      method: 'POST',
      body: JSON.stringify(assessmentData),
    });
    const data = await res.json();
    if (data.success) {
      await loadServerData();
    } else {
      throw new Error(data.error || 'Failed to submit assessment');
    }
  };

  // Request info from farmer
  const handleRequestInfo = async (caseId: string, message: string) => {
    const res = await fetchWithAuth(`/api/expert/cases/${caseId}/request-info`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (data.success) {
      await loadServerData();
    }
  };

  // Escalate case to senior expert
  const handleEscalateCase = async (caseId: string, reason: string) => {
    const res = await fetchWithAuth(`/api/expert/cases/${caseId}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (data.success) {
      await loadServerData();
    }
  };

  // Resolve escalated case (Senior Expert)
  const handleResolveEscalation = async (caseId: string, assessmentData: any) => {
    const res = await fetchWithAuth(`/api/expert/cases/${caseId}/resolve-escalation`, {
      method: 'POST',
      body: JSON.stringify(assessmentData),
    });
    const data = await res.json();
    if (data.success) {
      await loadServerData();
    } else {
      throw new Error(data.error || 'Failed to resolve escalation');
    }
  };

  // Submit feedback / dispute
  const handleSubmitFeedback = async (observationId: string, category: string, notes: string) => {
    await fetchWithAuth(`/api/observations/${observationId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ category, notes }),
    });
    await loadServerData();
  };

  // Verify expert account (Admin)
  const handleVerifyExpert = async (userId: string, status: 'verified' | 'rejected' | 'suspended', notes?: string) => {
    const res = await fetchWithAuth(`/api/admin/expert-profiles/${userId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    });
    const data = await res.json();
    if (data.success) {
      await loadServerData();
    }
  };

  // Update thresholds (Admin)
  const handleUpdateThresholds = async (newThresholds: Partial<RoutingThresholdsConfig>) => {
    const res = await fetchWithAuth('/api/admin/thresholds', {
      method: 'PUT',
      body: JSON.stringify(newThresholds),
    });
    const data = await res.json();
    if (data.success) {
      await loadServerData();
    }
  };

  // Add knowledge article
  const handleAddKnowledge = async (article: any) => {
    const res = await fetchWithAuth('/api/knowledge', {
      method: 'POST',
      body: JSON.stringify(article),
    });
    const data = await res.json();
    if (data.success) {
      await loadServerData();
    }
  };

  // Submit article for review
  const handleSubmitKnowledgeForReview = async (id: string) => {
    const res = await fetchWithAuth(`/api/knowledge/${id}/submit-for-review`, {
      method: 'POST',
    });
    const data = await res.json();
    if (data.success) {
      await loadServerData();
    } else {
      throw new Error(data.error || 'Failed to submit article for review');
    }
  };

  // Validate article (Expert review)
  const handleValidateKnowledge = async (id: string) => {
    const res = await fetchWithAuth(`/api/knowledge/${id}/validate`, {
      method: 'POST',
    });
    const data = await res.json();
    if (data.success) {
      await loadServerData();
    } else {
      throw new Error(data.error || 'Failed to validate article');
    }
  };

  // Publish article (MOA/CARI Admin endorsement)
  const handlePublishKnowledge = async (id: string) => {
    const res = await fetchWithAuth(`/api/knowledge/${id}/publish`, {
      method: 'POST',
    });
    const data = await res.json();
    if (data.success) {
      await loadServerData();
    } else {
      throw new Error(data.error || 'Failed to publish article');
    }
  };

  // Add new planting / plot
  const handleCreatePlanting = async (plantingData: any) => {
    const res = await fetchWithAuth('/api/plantings', {
      method: 'POST',
      body: JSON.stringify(plantingData),
    });
    const data = await res.json();
    if (data.success) {
      await loadServerData();
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* Universal Navigation Header */}
      <Header
        currentUser={currentUser}
        expertProfile={expertProfile}
        allDemoUsers={allDemoUsers}
        onSwitchUser={handleSwitchUser}
        isOnline={effectiveOnline}
        onToggleOnlineMode={handleToggleOnlineMode}
        pendingScans={pendingScans}
        onSyncPendingScans={handleSyncPendingScans}
        isSyncing={isSyncing}
        activeView={activeView}
        setActiveView={setActiveView}
        isDemoMode={isDemoMode}
        onOpenAuthModal={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Unauthenticated Alert Banner */}
      {!currentUser && !authLoading && (
        <div className="bg-amber-950/40 border-b border-amber-900/60 py-2.5 px-4 text-center text-xs text-amber-200 flex items-center justify-center gap-3">
          <span>You are viewing CropWatch Liberia as an unauthenticated guest. Sign in to access your farm data.</span>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold rounded text-xs transition-colors"
          >
            Sign In / Register
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {activeView === 'farmer' && (
          <FarmerDashboard
            user={
              currentUser || {
                id: 'guest',
                role: 'farmer',
                fullName: 'Guest Farmer',
                county: 'Bong',
                createdAt: new Date().toISOString(),
              }
            }
            farms={farms}
            plantings={plantings}
            observations={observations}
            weather={weather}
            onOpenScanModal={(plantingId) => {
              if (!currentUser) {
                setAuthModalOpen(true);
                return;
              }
              setScanDefaultPlantingId(plantingId);
              setScanModalOpen(true);
            }}
            onSelectObservation={(obs) => setSelectedObservation(obs)}
            onOpenNewPlantingModal={() => {
              if (!currentUser) {
                setAuthModalOpen(true);
                return;
              }
              setNewPlantingModalOpen(true);
            }}
          />
        )}

        {activeView === 'expert' && (
          <ExpertReviewCenter
            currentUser={
              currentUser || {
                id: 'guest',
                role: 'farmer',
                fullName: 'Guest',
                county: 'Bong',
                createdAt: new Date().toISOString(),
              }
            }
            expertProfile={expertProfile}
            cases={expertCases}
            observations={observations}
            onClaimCase={handleClaimCase}
            onSubmitAssessment={handleSubmitAssessment}
            onRequestInfo={handleRequestInfo}
            onEscalateCase={handleEscalateCase}
            onResolveEscalation={handleResolveEscalation}
          />
        )}

        {activeView === 'admin' && (
          <AdminConsole
            expertProfiles={expertProfiles}
            onVerifyExpert={handleVerifyExpert}
            thresholds={thresholds}
            onUpdateThresholds={handleUpdateThresholds}
            auditLogs={auditLogs}
          />
        )}

        {activeView === 'knowledge' && (
          <KnowledgeView
            currentUser={
              currentUser || {
                id: 'guest',
                role: 'farmer',
                fullName: 'Guest',
                county: 'Bong',
                createdAt: new Date().toISOString(),
              }
            }
            knowledge={knowledge}
            crops={crops}
            onAddArticle={handleAddKnowledge}
            onSubmitForReview={handleSubmitKnowledgeForReview}
            onValidateArticle={handleValidateKnowledge}
            onPublishArticle={handlePublishKnowledge}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-850 py-6 text-center text-xs text-stone-400 bg-stone-950">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-medium text-stone-300">
            CropWatch Liberia — Central Agricultural Research Institute (CARI) & Ministry of Agriculture Pilot
          </p>
          <p className="mt-1 text-stone-400">
            Multimodal Vision AI Diagnostics • Certified Agronomic Expert Escalation • Low-Bandwidth Offline Protection
          </p>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        isDemoMode={isDemoMode}
      />

      {scanModalOpen && (
        <ScanModal
          plantings={plantings}
          defaultPlantingId={scanDefaultPlantingId}
          isOnline={effectiveOnline}
          onClose={() => setScanModalOpen(false)}
          onSubmitScan={handleSubmitScan}
        />
      )}

      {selectedObservation && (
        <ObservationDetailModal
          observation={selectedObservation}
          onClose={() => setSelectedObservation(null)}
          onRequestExpertReview={handleRequestExpertReview}
          onSubmitFeedback={handleSubmitFeedback}
        />
      )}

      {newPlantingModalOpen && (
        <NewPlantingModal
          farms={farms}
          crops={crops}
          onClose={() => setNewPlantingModalOpen(false)}
          onSubmit={handleCreatePlanting}
        />
      )}
    </div>
  );
}
