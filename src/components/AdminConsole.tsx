import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  UserCheck,
  Sliders,
  BarChart3,
  FileClock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  RefreshCw,
  Eye,
} from 'lucide-react';
import {
  ExpertProfile,
  RoutingThresholdsConfig,
  SystemAuditLog,
} from '../types.js';

interface AdminConsoleProps {
  expertProfiles: ExpertProfile[];
  onVerifyExpert: (userId: string, status: 'verified' | 'rejected' | 'suspended', notes?: string) => Promise<void>;
  thresholds: RoutingThresholdsConfig;
  onUpdateThresholds: (thresholds: Partial<RoutingThresholdsConfig>) => Promise<void>;
  auditLogs: SystemAuditLog[];
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  expertProfiles,
  onVerifyExpert,
  thresholds,
  onUpdateThresholds,
  auditLogs,
}) => {
  const [activeTab, setActiveTab] = useState<'verification' | 'thresholds' | 'evaluation' | 'audit'>('verification');

  // Local threshold edits
  const [highCutoff, setHighCutoff] = useState(thresholds.aiHighConfidenceCutoff);
  const [medCutoff, setMedCutoff] = useState(thresholds.aiMediumConfidenceCutoff);
  const [rapidDecline, setRapidDecline] = useState(thresholds.rapidDeclineThresholdScore);
  const [isSavingThresholds, setIsSavingThresholds] = useState(false);

  // Evaluation metrics
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/evaluation')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setMetrics(data.metrics);
      })
      .catch((err) => console.warn('Failed to load eval metrics', err));
  }, []);

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingThresholds(true);
    try {
      await onUpdateThresholds({
        aiHighConfidenceCutoff: Number(highCutoff),
        aiMediumConfidenceCutoff: Number(medCutoff),
        rapidDeclineThresholdScore: Number(rapidDecline),
      });
      alert('Threshold configuration updated and saved.');
    } catch (err: any) {
      alert(err.message || 'Failed to update thresholds');
    } finally {
      setIsSavingThresholds(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-stone-900 rounded-2xl p-5 sm:p-6 border border-stone-800 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-amber-400">
            System Administration & Governance
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
          CropWatch Agricultural Oversight Console
        </h1>
        <p className="text-sm text-stone-300 mt-1 max-w-2xl">
          Manage extension specialist credentials, configure AI decision thresholds, audit agricultural safety events, and monitor diagnostic concordance.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-800 space-x-4">
        <button
          onClick={() => setActiveTab('verification')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'verification'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Expert Credential Verification ({expertProfiles.filter((p) => p.verificationStatus === 'pending').length} pending)</span>
        </button>

        <button
          onClick={() => setActiveTab('thresholds')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'thresholds'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Decision & Safety Engine Rules</span>
        </button>

        <button
          onClick={() => setActiveTab('evaluation')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'evaluation'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>AI vs. Expert Concordance</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <FileClock className="w-4 h-4" />
          <span>Audit Log Trail</span>
        </button>
      </div>

      {/* TAB 1: EXPERT VERIFICATION (Section #7) */}
      {activeTab === 'verification' && (
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-5 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Agricultural Specialist Verification Workflow</h3>
            <p className="text-xs text-stone-400">
              Only verified extension agents and agronomists can sign official assessments delivered to Liberian farmers.
            </p>
          </div>

          <div className="divide-y divide-stone-800">
            {expertProfiles.map((p) => (
              <div key={p.userId} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">{p.fullName}</h4>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                        p.verificationStatus === 'verified'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : p.verificationStatus === 'pending'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                          : 'bg-red-950 text-red-300 border border-red-800'
                      }`}
                    >
                      {p.verificationStatus}
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 mt-1">
                    {p.qualification} • {p.organization} ({p.yearsExperience} yrs exp)
                  </p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Specialties: {p.specialties.join(', ')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {p.verificationStatus !== 'verified' && (
                    <button
                      onClick={() => onVerifyExpert(p.userId, 'verified', 'Verified with CARI registrar')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1 shadow-sm"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve & Verify
                    </button>
                  )}

                  {p.verificationStatus !== 'suspended' && (
                    <button
                      onClick={() => onVerifyExpert(p.userId, 'suspended', 'Suspended by admin audit')}
                      className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs border border-stone-700"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: THRESHOLDS & ROUTING RULES (Section #3, #4, #51) */}
      {activeTab === 'thresholds' && (
        <form onSubmit={handleSaveThresholds} className="bg-stone-900 rounded-xl border border-stone-800 p-5 space-y-5">
          <div>
            <h3 className="text-base font-bold text-white">Configurable Decision & Routing Thresholds</h3>
            <p className="text-xs text-stone-400">
              Rules that govern when automated AI diagnostics can be safely shown versus when expert routing is mandated.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-stone-950 p-4 rounded-xl border border-stone-850">
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                AI High Confidence Cutoff (Safe Automation)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.75"
                  max="0.98"
                  step="0.01"
                  value={highCutoff}
                  onChange={(e) => setHighCutoff(Number(e.target.value))}
                  className="flex-1 accent-emerald-500"
                />
                <span className="text-sm font-bold text-white w-12 text-right">
                  {Math.round(highCutoff * 100)}%
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                Assessments above this threshold can display without immediate routing, provided no high-risk rules trigger.
              </p>
            </div>

            <div className="bg-stone-950 p-4 rounded-xl border border-stone-850">
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                AI Medium Confidence Floor (Mandatory Expert Triage)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.50"
                  max="0.85"
                  step="0.01"
                  value={medCutoff}
                  onChange={(e) => setMedCutoff(Number(e.target.value))}
                  className="flex-1 accent-amber-500"
                />
                <span className="text-sm font-bold text-white w-12 text-right">
                  {Math.round(medCutoff * 100)}%
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                Any diagnostic confidence below this value is automatically queued for agricultural extension triage.
              </p>
            </div>

            <div className="bg-stone-950 p-4 rounded-xl border border-stone-850">
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Rapid Health Decline Alert Delta
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="5"
                  max="40"
                  value={rapidDecline}
                  onChange={(e) => setRapidDecline(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-white text-xs w-24"
                />
                <span className="text-xs text-stone-300">point drop between consecutive scans</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                A health score drop equal to or exceeding this threshold triggers immediate High/Urgent priority routing.
              </p>
            </div>

            <div className="bg-stone-950 p-4 rounded-xl border border-stone-850 flex flex-col justify-between">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Chemical Advisory Safety Gate
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-bold text-white">Strict Extension Officer Verification Enforced</span>
                </div>
              </div>
              <p className="text-[11px] text-stone-400 mt-2">
                AI is strictly forbidden from generating proprietary pesticide brand names, application dosages, or unsupervised chemical advice.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingThresholds}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingThresholds ? 'Saving Rules...' : 'Save Configuration Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: AI EVALUATION & CONCORDANCE (Section #22) */}
      {activeTab === 'evaluation' && (
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-5 space-y-5">
          <div>
            <h3 className="text-base font-bold text-white">AI Diagnostic Concordance & Quality Benchmarking</h3>
            <p className="text-xs text-stone-400">
              Evaluates automated multimodal vision hypotheses against verified expert assessments signed by CARI agronomists.
            </p>
          </div>

          {metrics ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-850">
                  <span className="text-[11px] font-semibold text-stone-400 uppercase">AI-Expert Agreement</span>
                  <p className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">
                    {metrics.aiExpertConcordanceRate != null ? `${metrics.aiExpertConcordanceRate}%` : 'Insufficient data'}
                  </p>
                  <span className="text-[10px] text-stone-500">
                    {metrics.totalCompletedReviews > 0 ? `${metrics.totalCompletedReviews} verified reviews` : 'Awaiting expert reviews'}
                  </span>
                </div>
                <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-850">
                  <span className="text-[11px] font-semibold text-stone-400 uppercase">Expert Confirmed</span>
                  <p className="text-2xl font-bold text-white mt-1">{metrics.confirmedCount}</p>
                  <span className="text-[10px] text-stone-500">Validated as accurate</span>
                </div>
                <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-850">
                  <span className="text-[11px] font-semibold text-stone-400 uppercase">Expert Modified</span>
                  <p className="text-2xl font-bold text-amber-400 mt-1">{metrics.modifiedCount}</p>
                  <span className="text-[10px] text-stone-500">Severity or pathogen tuned</span>
                </div>
                <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-850">
                  <span className="text-[11px] font-semibold text-stone-400 uppercase">AI False Positives</span>
                  <p className="text-2xl font-bold text-purple-400 mt-1">{metrics.rejectedCount}</p>
                  <span className="text-[10px] text-stone-500">Rejected by specialist</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-stone-300 tracking-wider mb-2">
                  Diagnostic Concordance by Liberian Crop (Ground-Truth Validations)
                </h4>
                <div className="space-y-2">
                  {metrics.accuracyByCrop.map((c: any) => (
                    <div key={c.crop} className="bg-stone-950 p-3 rounded-lg border border-stone-850 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-white">{c.crop}</span>
                        <span className="text-stone-400 text-[11px] ml-2">({c.sampleSize} verified cases)</span>
                      </div>
                      {c.concordancePct != null ? (
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-stone-800 h-2 rounded-full overflow-hidden hidden sm:block">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${c.concordancePct}%` }}></div>
                          </div>
                          <span className="font-bold text-emerald-400 w-12 text-right">{c.concordancePct}%</span>
                        </div>
                      ) : (
                        <span className="text-stone-400 italic text-[11px] font-medium bg-stone-900 px-2.5 py-1 rounded border border-stone-800">
                          Insufficient data (&lt;5 reviews)
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-stone-400">Loading evaluation benchmarks...</p>
          )}
        </div>
      )}

      {/* TAB 4: AUDIT LOGS (Section #24) */}
      {activeTab === 'audit' && (
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-5 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">System Audit & Regulatory Trail</h3>
            <p className="text-xs text-stone-400">
              Immutable logging of all expert reviews, status modifications, diagnostic routings, and administrative credentialing.
            </p>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="bg-stone-950 p-3 rounded-lg border border-stone-850">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{log.actorName}</span>
                    <span className="text-[10px] bg-stone-800 text-stone-300 px-1.5 py-0.5 rounded capitalize">
                      {log.actorRole.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono font-semibold">
                      {log.action}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-stone-300 text-xs">{log.details}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
