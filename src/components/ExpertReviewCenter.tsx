import React, { useState } from 'react';
import {
  UserCheck,
  AlertTriangle,
  Clock,
  Filter,
  CheckCircle,
  FileText,
  Camera,
  CloudRain,
  Send,
  AlertOctagon,
  ArrowUpRight,
  ShieldAlert,
  GraduationCap,
  Info,
  ChevronRight,
} from 'lucide-react';
import {
  ExpertReviewCase,
  PlantObservation,
  User,
  ExpertProfile,
  ExpertAssessment,
} from '../types.js';

interface ExpertReviewCenterProps {
  currentUser: User;
  expertProfile?: ExpertProfile;
  cases: ExpertReviewCase[];
  observations: PlantObservation[];
  onClaimCase: (caseId: string) => Promise<void>;
  onSubmitAssessment: (caseId: string, assessmentData: any) => Promise<void>;
  onRequestInfo: (caseId: string, message: string) => Promise<void>;
  onEscalateCase: (caseId: string, reason: string) => Promise<void>;
  onResolveEscalation?: (caseId: string, assessmentData: any) => Promise<void>;
}

export const ExpertReviewCenter: React.FC<ExpertReviewCenterProps> = ({
  currentUser,
  expertProfile,
  cases,
  observations,
  onClaimCase,
  onSubmitAssessment,
  onRequestInfo,
  onEscalateCase,
  onResolveEscalation,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(cases[0]?.id || null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Review form states
  const [verifiedCondition, setVerifiedCondition] = useState('');
  const [decision, setDecision] = useState<'confirmed' | 'modified' | 'rejected' | 'insufficient_evidence'>('confirmed');
  const [severity, setSeverity] = useState<'low' | 'moderate' | 'high' | 'critical'>('moderate');
  const [expertConfidence, setExpertConfidence] = useState<'high' | 'medium' | 'low'>('high');
  const [actionRecommendations, setActionRecommendations] = useState('');
  const [farmerExplanation, setFarmerExplanation] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [escalationResolutionNotes, setEscalationResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialogs
  const [showRequestInfoDialog, setShowRequestInfoDialog] = useState(false);
  const [requestInfoMessage, setRequestInfoMessage] = useState('');
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');

  const isVerifiedExpert = expertProfile?.verificationStatus === 'verified' || currentUser.role === 'admin' || currentUser.role === 'senior_expert';

  // Metrics
  const pendingCount = cases.filter((c) => c.status === 'queued' || c.status === 'in_review').length;
  const urgentCount = cases.filter((c) => c.priority === 'urgent' || c.priority === 'high').length;
  const lowConfidenceCount = cases.filter((c) => c.triggerType === 'low_confidence').length;
  const farmerRequestedCount = cases.filter((c) => c.triggerType === 'farmer_request').length;

  // Filtered cases
  const filteredCases = cases.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
    return true;
  });

  const activeCase = cases.find((c) => c.id === selectedCaseId);
  const activeObservation = observations.find((o) => o.id === activeCase?.observationId);

  const handleSelectCase = (c: ExpertReviewCase) => {
    setSelectedCaseId(c.id);
    const obs = observations.find((o) => o.id === c.observationId);
    if (obs?.aiAnalysis?.hypotheses[0]) {
      setVerifiedCondition(obs.aiAnalysis.hypotheses[0].conditionName);
      setActionRecommendations(
        obs.aiAnalysis.recommendedActions.cultural.join(' ') + ' ' + obs.aiAnalysis.recommendedActions.organic.join(' ')
      );
      setFarmerExplanation(
        `Based on visual examination of the foliar symptoms in ${c.farmerCounty} County, the condition is consistent with ${obs.aiAnalysis.hypotheses[0].conditionName}.`
      );
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;

    setIsSubmitting(true);
    try {
      const payload: any = {
        cropConfirmed: true,
        verifiedCondition,
        decision,
        severity,
        expertConfidence,
        actionRecommendations,
        farmerExplanation,
        internalNotes,
      };

      if (activeCase?.status === 'escalated') {
        if (!escalationResolutionNotes.trim()) {
          alert('Escalation resolution notes are required to resolve an escalated case.');
          setIsSubmitting(false);
          return;
        }
        payload.escalationResolutionNotes = escalationResolutionNotes;
        if (onResolveEscalation) {
          await onResolveEscalation(selectedCaseId, payload);
          alert('Senior escalation resolution signed and published successfully! Original assessment version preserved in history.');
        } else {
          await onSubmitAssessment(selectedCaseId, payload);
          alert('Official assessment submitted and signed successfully!');
        }
      } else {
        await onSubmitAssessment(selectedCaseId, payload);
        alert('Official assessment submitted and signed successfully!');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || !requestInfoMessage) return;
    await onRequestInfo(selectedCaseId, requestInfoMessage);
    setShowRequestInfoDialog(false);
    setRequestInfoMessage('');
  };

  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId) return;
    await onEscalateCase(selectedCaseId, escalateReason);
    setShowEscalateDialog(false);
    setEscalateReason('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Expert Status Banner */}
      <div className="bg-stone-900 rounded-2xl p-5 sm:p-6 border border-stone-800 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-blue-400">
                National Agricultural Review Center • CARI & MOA
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
              Agricultural Expert Triage & Review
            </h1>
            <p className="text-sm text-stone-300 mt-1 max-w-2xl">
              Human-in-the-Loop decision engine: review AI diagnoses, validate plant pathology, modify guidance, and protect staple food security.
            </p>
          </div>

          <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-xs">
            <p className="text-stone-400">Reviewer Status:</p>
            <p className="font-bold text-white flex items-center gap-1.5 mt-0.5">
              {isVerifiedExpert ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Verified Agricultural Specialist</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span className="text-amber-300">Pending Admin Verification</span>
                </>
              )}
            </p>
            <p className="text-[10px] text-stone-400 mt-1">{expertProfile?.organization || currentUser.organization}</p>
          </div>
        </div>
      </div>

      {/* Metrics Row (Prompt Section #8) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-stone-900 p-4 rounded-xl border border-stone-800">
          <span className="text-xs font-semibold text-stone-400 uppercase">Pending Triage</span>
          <p className="text-2xl font-bold text-white mt-1">{pendingCount}</p>
          <span className="text-[11px] text-blue-400">Awaiting specialist review</span>
        </div>

        <div className="bg-stone-900 p-4 rounded-xl border border-stone-800">
          <span className="text-xs font-semibold text-stone-400 uppercase">High / Urgent Priority</span>
          <p className="text-2xl font-bold text-amber-400 mt-1">{urgentCount}</p>
          <span className="text-[11px] text-amber-300">Rapid decline / virus risk</span>
        </div>

        <div className="bg-stone-900 p-4 rounded-xl border border-stone-800">
          <span className="text-xs font-semibold text-stone-400 uppercase">Low AI Confidence</span>
          <p className="text-2xl font-bold text-purple-400 mt-1">{lowConfidenceCount}</p>
          <span className="text-[11px] text-purple-300">Uncertain differential</span>
        </div>

        <div className="bg-stone-900 p-4 rounded-xl border border-stone-800">
          <span className="text-xs font-semibold text-stone-400 uppercase">Farmer Requested</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{farmerRequestedCount}</p>
          <span className="text-[11px] text-emerald-300">Manual review petitions</span>
        </div>
      </div>

      {/* Main Dual Layout: Triage List + Case Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Triage Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-stone-900 rounded-xl p-4 border border-stone-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-sm">Review Queue ({filteredCases.length})</h3>
              <span className="text-xs text-stone-400">Sort: Highest Priority</span>
            </div>

            {/* Quick Filters */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-stone-200"
              >
                <option value="all">All Statuses</option>
                <option value="queued">Queued</option>
                <option value="in_review">In Review</option>
                <option value="expert_reviewed">Reviewed</option>
                <option value="waiting_for_farmer">Waiting on Farmer</option>
                <option value="escalated">Escalated</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-stone-200"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Case List Items */}
            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {[...filteredCases]
                .sort((a, b) => {
                  const aSuggested = a.suggestedExpertId === currentUser.id;
                  const bSuggested = b.suggestedExpertId === currentUser.id;
                  if (aSuggested && !bSuggested) return -1;
                  if (!aSuggested && bSuggested) return 1;
                  return 0;
                })
                .map((c) => {
                  const isSelected = c.id === selectedCaseId;
                  const isSuggested = c.suggestedExpertId === currentUser.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCase(c)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-950/40 border-blue-600 shadow-md'
                          : isSuggested
                          ? 'bg-emerald-950/15 border-emerald-800/80 hover:border-emerald-700/80 shadow-sm'
                          : 'bg-stone-950/80 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">{c.cropName}</span>
                        <div className="flex items-center gap-1.5">
                          {isSuggested && (
                            <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold px-1.5 py-0.5 rounded">
                              ★ MATCH
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              c.priority === 'urgent'
                                ? 'bg-red-950 text-red-300 border border-red-800'
                                : c.priority === 'high'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-stone-800 text-stone-300'
                            }`}
                          >
                            {c.priority}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-stone-300 mt-1 line-clamp-1">
                        {c.triggerReason}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-stone-400 mt-2 pt-2 border-t border-stone-850">
                        <span>{c.farmerName} • {c.farmerCounty} Co.</span>
                        <span className="capitalize text-stone-300 font-medium">{c.status.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right Column: Case Dossier & Review Form (7 cols) */}
        <div className="lg:col-span-7">
          {activeCase && activeObservation ? (
            <div className="bg-stone-900 rounded-xl p-5 border border-stone-800 space-y-5">
              {/* Dossier Header */}
              <div className="flex items-start justify-between pb-4 border-b border-stone-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold text-blue-400">Case Dossier #{activeCase.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-stone-800 text-stone-200 uppercase font-semibold">
                      {activeCase.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-1">
                    {activeCase.cropName} ({activeCase.varietyName || 'Standard'}) — {activeCase.farmerCounty} County
                  </h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Farmer: <strong className="text-stone-200">{activeCase.farmerName}</strong> • Crop Age: {activeCase.cropAgeDays} days
                  </p>
                  {activeCase.suggestedExpertId && (
                    <p className="text-xs text-stone-300 mt-1.5 flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-900/60 px-2.5 py-1.5 rounded-lg w-fit">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse animate-duration-1000"></span>
                      <span>
                        {activeCase.suggestedExpertId === currentUser.id ? (
                          <>⭐ <strong>Suggested Specialist: You</strong> (matched on specialty &amp; county proximity)</>
                        ) : (
                          <>Suggested Expert Match: <strong>{activeCase.suggestedExpertName}</strong></>
                        )}
                      </span>
                    </p>
                  )}
                </div>

                {activeCase.status === 'queued' && (
                  <button
                    onClick={() => onClaimCase(activeCase.id)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors"
                  >
                    Claim Case
                  </button>
                )}
              </div>

              {/* Photo & Weather Pair */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl overflow-hidden border border-stone-800 bg-stone-950 h-52">
                  <img
                    src={activeObservation.images[0]?.imageUrl}
                    alt="Specimen"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 flex flex-col justify-between text-xs">
                  <div>
                    <h4 className="font-bold uppercase text-stone-400 mb-2">Agronomic Context</h4>
                    <p className="text-stone-300 mb-1">
                      <strong>Symptoms Noticed:</strong> {activeObservation.farmerReportedSymptoms || 'None reported'}
                    </p>
                    <p className="text-stone-400 italic">
                      "{activeObservation.notes || 'Routine field check'}"
                    </p>
                  </div>

                  <div className="pt-2 border-t border-stone-850 text-[11px] text-stone-400 space-y-1">
                    <p>Weather: {activeObservation.weatherSnapshot?.tempC}°C • {activeObservation.weatherSnapshot?.humidity}% RH</p>
                    <p>Rainfall 24h: {activeObservation.weatherSnapshot?.rain24hMm} mm</p>
                  </div>
                </div>
              </div>

              {/* AI Assessment Baseline */}
              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
                <h4 className="text-xs font-bold uppercase text-purple-400 tracking-wider mb-2">
                  AI Diagnostic Hypothesis (To Validate or Modify)
                </h4>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">
                    {activeObservation.aiAnalysis?.hypotheses[0]?.conditionName || 'Uncertain condition'}
                  </span>
                  <span className="text-xs font-semibold text-purple-300">
                    {Math.round((activeObservation.aiAnalysis?.hypotheses[0]?.probability || 0.7) * 100)}% Confidence
                  </span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  {activeObservation.aiAnalysis?.rawObservationsText}
                </p>
                <div className="mt-2 text-[11px] text-stone-400">
                  Routing Reason: <span className="text-amber-400">{activeCase.triggerReason}</span>
                </div>
              </div>

              {/* Structured Review Form (Prompt Section #11) */}
              <form onSubmit={handleFormSubmit} className="space-y-4 pt-2 border-t border-stone-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-400" /> Specialist Assessment Form
                  </h4>
                  <span className="text-[11px] text-stone-400">
                    Signing as: {currentUser.fullName} ({currentUser.role})
                  </span>
                </div>

                {!isVerifiedExpert && (
                  <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800 text-amber-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                    <span>
                      Notice: Your account is awaiting Administrator verification. You can draft assessments, but official endorsement requires administrator sign-off.
                    </span>
                  </div>
                )}

                {activeCase.status === 'escalated' && (
                  <div className="bg-purple-950/20 p-4 rounded-xl border border-purple-800 space-y-2">
                    <label className="block text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-purple-400" /> Senior Escalation Resolution Decision
                    </label>
                    <p className="text-xs text-purple-200">
                      This case is Escalated. Your decision will be signed as a <strong>Senior Agronomist / CARI Lead Assessment</strong> that supersedes the original expert's assessment. Provide your final decision, verified condition, and the formal justification below.
                    </p>
                    <textarea
                      value={escalationResolutionNotes}
                      onChange={(e) => setEscalationResolutionNotes(e.target.value)}
                      required={activeCase.status === 'escalated'}
                      rows={3}
                      placeholder="Detailed justification of the resolution, detailing why this supersedes the original assessment..."
                      className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-purple-800 text-white text-xs focus:outline-none focus:border-purple-500 placeholder-purple-800"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Verified Condition / Pathology
                    </label>
                    <input
                      type="text"
                      value={verifiedCondition}
                      onChange={(e) => setVerifiedCondition(e.target.value)}
                      required
                      placeholder="e.g. Cassava Mosaic Disease (Early Stage)"
                      className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-800 text-white text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Assessment Decision
                    </label>
                    <select
                      value={decision}
                      onChange={(e) => setDecision(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-800 text-white text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="confirmed">Confirmed (Agree with AI)</option>
                      <option value="modified">Modified (Corrected Diagnosis)</option>
                      <option value="rejected">Rejected (False Alarm / Misidentification)</option>
                      <option value="insufficient_evidence">Insufficient Evidence (Need New Photo)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Severity Level
                    </label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-800 text-white text-xs"
                    >
                      <option value="low">Low (Cosmetic/Mild)</option>
                      <option value="moderate">Moderate (Action Advised)</option>
                      <option value="high">High (Threat to Yield)</option>
                      <option value="critical">Critical (Emergency Containment)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Expert Confidence
                    </label>
                    <select
                      value={expertConfidence}
                      onChange={(e) => setExpertConfidence(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-800 text-white text-xs"
                    >
                      <option value="high">High (Definitive symptoms)</option>
                      <option value="medium">Medium (Visual probable)</option>
                      <option value="low">Low (Speculative/Requires visit)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Action Recommendations (Cultural & Safe Interventions)
                  </label>
                  <textarea
                    value={actionRecommendations}
                    onChange={(e) => setActionRecommendations(e.target.value)}
                    required
                    rows={2}
                    placeholder="Specific actionable instructions for the farmer..."
                    className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Farmer-Friendly Explanation
                  </label>
                  <textarea
                    value={farmerExplanation}
                    onChange={(e) => setFarmerExplanation(e.target.value)}
                    required
                    rows={2}
                    placeholder="Plain, non-jargon explanation of what is happening to the plant..."
                    className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Internal Notes */}
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">
                    Internal Extension / CARI Notes (Optional, not seen by farmer)
                  </label>
                  <input
                    type="text"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="e.g. Advise Suakoko field office to track regional vector spread"
                    className="w-full px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-stone-300 text-xs"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRequestInfoDialog(true)}
                      className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs font-medium border border-stone-700 transition-colors"
                    >
                      Request More Photos
                    </button>

                    {activeCase?.status !== 'escalated' && (
                      <button
                        type="button"
                        onClick={() => setShowEscalateDialog(true)}
                        className="px-3 py-2 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-300 text-xs font-medium border border-purple-800 transition-colors"
                      >
                        Escalate to Senior Specialist
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !isVerifiedExpert}
                    className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-2 ${
                      activeCase?.status === 'escalated'
                        ? 'bg-purple-600 hover:bg-purple-500'
                        : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? activeCase?.status === 'escalated'
                          ? 'Resolving...'
                          : 'Signing...'
                        : activeCase?.status === 'escalated'
                        ? 'Sign & Resolve Senior Escalation'
                        : 'Sign & Submit Official Assessment'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-stone-900 rounded-xl p-12 border border-stone-800 text-center text-stone-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-base font-semibold text-stone-300">No Case Selected</p>
              <p className="text-xs mt-1">Select a case from the triage queue on the left to begin review.</p>
            </div>
          )}
        </div>
      </div>

      {/* Dialog for Requesting More Info */}
      {showRequestInfoDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-stone-900 border border-stone-800 p-5 rounded-xl max-w-md w-full">
            <h3 className="text-sm font-bold text-white mb-2">Request Information from Farmer</h3>
            <p className="text-xs text-stone-400 mb-3">
              The case status will switch to "WAITING_FOR_FARMER" and the farmer will be prompted to supply additional details or close-up leaf photographs.
            </p>
            <form onSubmit={handleRequestInfoSubmit}>
              <textarea
                value={requestInfoMessage}
                onChange={(e) => setRequestInfoMessage(e.target.value)}
                placeholder="e.g. Please upload a close-up photo of the leaf underside and one of the stem base."
                rows={3}
                required
                className="w-full p-2.5 rounded-lg bg-stone-950 border border-stone-800 text-white text-xs mb-3"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRequestInfoDialog(false)}
                  className="px-3 py-1.5 text-xs text-stone-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog for Escalation */}
      {showEscalateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-stone-900 border border-stone-800 p-5 rounded-xl max-w-md w-full">
            <h3 className="text-sm font-bold text-white mb-2">Escalate to Senior Agronomic Specialist</h3>
            <p className="text-xs text-stone-400 mb-3">
              Escalate this case to Prof. Josephus Flomo (Senior Agronomist / CARI Lead) for expert consensus or suspected quarantine intervention.
            </p>
            <form onSubmit={handleEscalateSubmit}>
              <textarea
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                placeholder="Reason for escalation: e.g. Possible novel strain of Cassava Brown Streak Disease requiring laboratory PCR authorization."
                rows={3}
                required
                className="w-full p-2.5 rounded-lg bg-stone-950 border border-stone-800 text-white text-xs mb-3"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEscalateDialog(false)}
                  className="px-3 py-1.5 text-xs text-stone-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs"
                >
                  Confirm Escalation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
