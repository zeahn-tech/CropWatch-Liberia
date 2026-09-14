import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  Sparkles,
  Calendar,
  CloudRain,
  Eye,
  CheckCircle2,
  HelpCircle,
  Clock,
  ArrowRight,
  Send,
  Flag,
} from 'lucide-react';
import { PlantObservation } from '../types.js';

interface ObservationDetailModalProps {
  observation: PlantObservation;
  onClose: () => void;
  onRequestExpertReview: (observationId: string, reason?: string) => Promise<void>;
  onSubmitFeedback: (observationId: string, category: string, notes: string) => Promise<void>;
}

export const ObservationDetailModal: React.FC<ObservationDetailModalProps> = ({
  observation,
  onClose,
  onRequestExpertReview,
  onSubmitFeedback,
}) => {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState('wrong_disease');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isRequestingExpert, setIsRequestingExpert] = useState(false);

  const ai = observation.aiAnalysis;
  const expertCase = observation.expertReviewCase;
  const expertAssessment = observation.latestExpertAssessment;

  const handleRequestExpert = async () => {
    setIsRequestingExpert(true);
    try {
      await onRequestExpertReview(observation.id);
    } finally {
      setIsRequestingExpert(false);
    }
  };

  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmitFeedback(observation.id, feedbackCategory, feedbackNotes);
    setFeedbackSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl relative my-auto overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold ${
                observation.healthScore != null
                  ? 'bg-emerald-950 border-emerald-800 text-emerald-400'
                  : 'bg-stone-850 border-stone-700 text-amber-400 text-xs'
              }`}
            >
              {observation.healthScore != null ? `${observation.healthScore}%` : 'N/A'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {ai?.detectedCrop.name || 'Crop'} Observation Dossier
                </h2>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    observation.healthStatus === 'unknown' || ai?.isAvailable === false
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-stone-800 text-stone-300'
                  }`}
                >
                  {observation.healthStatus === 'unknown' || ai?.isAvailable === false
                    ? 'AI ANALYSIS UNAVAILABLE'
                    : observation.healthStatus.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Observed: {new Date(observation.observedAt).toLocaleString()} • ID: {observation.id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-800 text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Main Visual & Weather Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 rounded-xl overflow-hidden border border-stone-800 bg-stone-950 relative h-64 sm:h-72">
              <img
                src={observation.images[0]?.imageUrl}
                alt="Observed leaf"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-black/75 backdrop-blur-sm text-[11px] text-stone-200 border border-white/10">
                Primary Diagnostic Specimen
              </div>
            </div>

            {/* Environmental & Agro-Weather Context */}
            <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5 mb-3">
                  <CloudRain className="w-3.5 h-3.5 text-blue-400" /> Agro-Weather Snapshot
                </h4>
                {observation.weatherSnapshot ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-stone-850">
                      <span className="text-stone-400">Air Temperature:</span>
                      <span className="font-semibold text-white">{observation.weatherSnapshot.tempC}°C</span>
                    </div>
                    <div className="flex items-center justify-between pb-1.5 border-b border-stone-850">
                      <span className="text-stone-400">Relative Humidity:</span>
                      <span className="font-semibold text-blue-300">{observation.weatherSnapshot.humidity}%</span>
                    </div>
                    <div className="flex items-center justify-between pb-1.5 border-b border-stone-850">
                      <span className="text-stone-400">24h Rainfall:</span>
                      <span className="font-semibold text-white">{observation.weatherSnapshot.rain24hMm} mm</span>
                    </div>
                    <p className="text-[11px] text-stone-400 pt-1 leading-relaxed">
                      {observation.weatherSnapshot.description}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-stone-400">Standard seasonal wet tropical conditions.</p>
                )}
              </div>

              {observation.farmerReportedSymptoms && (
                <div className="mt-3 pt-3 border-t border-stone-850">
                  <span className="text-[11px] uppercase font-semibold text-stone-400 block mb-1">Farmer Notes:</span>
                  <p className="text-xs text-stone-300 italic">"{observation.farmerReportedSymptoms}"</p>
                </div>
              )}
            </div>
          </div>

          {/* AI ANALYSIS UNAVAILABLE BANNER */}
          {ai?.isAvailable === false && (
            <div className="rounded-xl border border-amber-600/70 bg-amber-950/20 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">AI Analysis Unavailable</h4>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-amber-900/60 text-amber-200 border border-amber-700/50">
                      Direct Human Review Required
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 mt-1.5 leading-relaxed">
                    Automated visual analysis could not be completed at this time. Your observation and specimen photograph have been preserved securely. CropWatch never fabricates health scores, synthetic disease names, or confidence numbers when AI services are offline.
                  </p>
                  {!expertAssessment && !expertCase && (
                    <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                      <button
                        type="button"
                        onClick={handleRequestExpert}
                        disabled={isRequestingExpert}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>{isRequestingExpert ? 'Submitting to Specialists...' : 'Request Expert Review'}</span>
                      </button>
                      <span className="text-[11px] text-stone-400">
                        Directly routes your specimen photograph to accredited agronomists at CARI / MOA.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECTION #12: AGRICULTURAL EXPERT REVIEW CARD (IF AVAILABLE OR QUEUED) */}
          {expertAssessment ? (
            <div className="rounded-xl border-2 border-emerald-600/70 bg-emerald-950/20 p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                    <UserCheck className="w-5 h-5" />
                  </span>
                  <div>
                    <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">
                      Official Verified Agricultural Specialist Assessment
                    </span>
                    <h3 className="text-base font-bold text-white">
                      Reviewed by {expertAssessment.expertName}
                    </h3>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold uppercase">
                    Decision: {expertAssessment.decision}
                  </span>
                  <p className="text-[10px] text-stone-400 mt-0.5">Version {expertAssessment.version}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 bg-stone-950/80 p-3 rounded-lg border border-stone-850 text-xs">
                <div>
                  <span className="text-stone-400">Specialist Organization:</span>
                  <p className="font-semibold text-stone-200">{expertAssessment.expertOrganization}</p>
                </div>
                <div>
                  <span className="text-stone-400">Verified Condition:</span>
                  <p className="font-semibold text-emerald-300">{expertAssessment.verifiedCondition}</p>
                </div>
                <div>
                  <span className="text-stone-400">Severity Level:</span>
                  <p className="font-semibold capitalize text-stone-200">{expertAssessment.severity}</p>
                </div>
                <div>
                  <span className="text-stone-400">Expert Confidence:</span>
                  <p className="font-semibold capitalize text-stone-200">{expertAssessment.expertConfidence}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <h5 className="text-xs font-bold text-stone-300 uppercase tracking-wider">Expert Recommendation:</h5>
                  <p className="text-xs sm:text-sm text-stone-100 bg-stone-900/90 p-3 rounded-lg border border-stone-800 leading-relaxed mt-1">
                    {expertAssessment.actionRecommendations}
                  </p>
                </div>

                <div>
                  <h5 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Explanation for Farmer:</h5>
                  <p className="text-xs text-stone-300 mt-0.5 leading-relaxed">
                    {expertAssessment.farmerExplanation}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-900/40 flex items-center justify-between text-[11px] text-stone-400">
                <span>Verified under CARI/MOA peer protocol</span>
                <span>Signed: {new Date(expertAssessment.reviewedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ) : expertCase ? (
            <div className="rounded-xl border border-blue-800 bg-blue-950/20 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-400 animate-spin" />
                <div>
                  <p className="text-sm font-bold text-white">
                    Agricultural Specialist Review in Progress
                  </p>
                  <p className="text-xs text-stone-300">
                    Status: <span className="font-semibold text-blue-300 capitalize">{expertCase.status.replace(/_/g, ' ')}</span> • Priority: {expertCase.priority.toUpperCase()}
                  </p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Triggered by: {expertCase.triggerReason}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-stone-800 bg-stone-950 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white">Want a Certified Agronomist to Review This?</p>
                <p className="text-xs text-stone-400">
                  Request evaluation from extension officers at CARI or Cuttington University.
                </p>
              </div>
              <button
                onClick={handleRequestExpert}
                disabled={isRequestingExpert}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" />
                <span>{isRequestingExpert ? 'Routing Case...' : 'Request Specialist Review'}</span>
              </button>
            </div>
          )}

          {/* SECTION #5: DISTINCT AI CATEGORIES (Observation vs Interpretation vs Prediction vs Safety) */}
          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-wider font-bold text-stone-400">
              AI Diagnostic Breakdown (Automated Analysis)
            </h3>

            {ai?.isAvailable === false ? (
              <div className="bg-stone-950 rounded-xl p-5 border border-stone-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-stone-500" />
                  <h4 className="text-sm font-bold text-stone-200">No Automated Diagnosis Generated</h4>
                </div>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Multimodal vision analysis could not be completed for this specimen. CropWatch does not generate synthetic disease names, artificial confidence scores, or simulated diagnoses.
                </p>
                <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg">
                  <span className="text-[11px] uppercase font-bold text-amber-300 block mb-1">
                    Chemical Application Safety Protocol
                  </span>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    {ai?.recommendedActions?.chemicalAdvisory ||
                      'Do NOT apply synthetic pesticides or chemical fungicides without certified in-person inspection and written recommendation from CARI / Ministry of Agriculture extension agents.'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* 1. VISIBLE OBSERVATION */}
                <div className="bg-stone-950 rounded-xl p-4 border border-stone-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">1. Visible Foliar Observation</h4>
                    <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.2 rounded">Physical Evidence</span>
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    {ai?.rawObservationsText || 'Leaf blade examination recorded.'}
                  </p>

                  {ai?.visualObservations && ai.visualObservations.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {ai.visualObservations.map((vo, idx) => (
                        <div key={idx} className="bg-stone-900 p-2.5 rounded-lg border border-stone-850 text-xs">
                          <span className="font-semibold text-emerald-400">{vo.feature}: </span>
                          <span className="text-stone-300">{vo.visualFinding}</span>
                          <span className="block text-[10px] text-stone-500 mt-1 capitalize">Severity: {vo.severity}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. AI INTERPRETATION / HYPOTHESES */}
                <div className="bg-stone-950 rounded-xl p-4 border border-stone-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h4 className="text-sm font-bold text-white">2. AI Interpretation & Probable Causes</h4>
                    <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.2 rounded">Estimations</span>
                  </div>

                  <div className="space-y-2 mt-3">
                    {ai?.hypotheses && ai.hypotheses.length > 0 ? (
                      ai.hypotheses.map((hypo, idx) => (
                        <div key={idx} className="bg-stone-900 p-3 rounded-lg border border-stone-850">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-white">{hypo.conditionName}</span>
                            <span className="text-xs font-bold text-purple-300">
                              {Math.round(hypo.probability * 100)}% Probability
                            </span>
                          </div>
                          <p className="text-xs text-stone-400 leading-relaxed">{hypo.evidenceJustification}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-stone-400">No diagnostic hypotheses recorded.</p>
                    )}
                  </div>
                </div>

                {/* 3. PREDICTION */}
                <div className="bg-stone-950 rounded-xl p-4 border border-stone-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-bold text-white">3. Growth & Harvest Projection</h4>
                    <span className="text-[10px] bg-stone-800 text-stone-300 px-2 py-0.2 rounded">7-14 Day Outlook</span>
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed mb-3">
                    {ai?.rawPredictionText || 'Projections pending ongoing monitoring.'}
                  </p>
                  {ai?.harvestEstimate && (
                    <div className="flex items-center justify-between bg-stone-900 p-2.5 rounded-lg border border-stone-850 text-xs">
                      <span className="text-stone-400">Estimated Harvest Window:</span>
                      <span className="font-semibold text-white">
                        {ai.harvestEstimate.minimumDays} – {ai.harvestEstimate.maximumDays} days remaining
                      </span>
                    </div>
                  )}
                </div>

                {/* 4. ACTIONS & REGULATED CHEMICAL SAFETY */}
                <div className="bg-stone-950 rounded-xl p-4 border border-stone-800">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">4. Recommended Agronomic Actions</h4>
                  </div>

                  <div className="space-y-2 text-xs">
                    {ai?.recommendedActions?.cultural && ai.recommendedActions.cultural.length > 0 && (
                      <div className="bg-stone-900 p-3 rounded-lg border border-stone-850">
                        <span className="font-bold text-emerald-400 uppercase tracking-wider block mb-1 text-[11px]">
                          Cultural Management (Sanitation & Spacing):
                        </span>
                        <ul className="list-disc list-inside space-y-1 text-stone-300">
                          {ai.recommendedActions.cultural.map((c, idx) => (
                            <li key={idx}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {ai?.recommendedActions?.organic && ai.recommendedActions.organic.length > 0 && (
                      <div className="bg-stone-900 p-3 rounded-lg border border-stone-850">
                        <span className="font-bold text-green-400 uppercase tracking-wider block mb-1 text-[11px]">
                          Organic / Biological Measures:
                        </span>
                        <ul className="list-disc list-inside space-y-1 text-stone-300">
                          {ai.recommendedActions.organic.map((o, idx) => (
                            <li key={idx}>{o}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* CHEMICAL SAFETY RULE */}
                    <div className="bg-amber-950/30 p-3 rounded-lg border border-amber-850/60">
                      <span className="font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 mb-1 text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5" /> Chemical Application Safety Rule:
                      </span>
                      <p className="text-xs text-amber-200/90 leading-relaxed">
                        {ai?.recommendedActions?.chemicalAdvisory}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Section #26: Farmer Disagreement / Dispute Reporting */}
          <div className="pt-2 border-t border-stone-800">
            {!showFeedbackDialog ? (
              <button
                onClick={() => setShowFeedbackDialog(true)}
                className="text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1.5 transition-colors"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Something seems wrong? Report an issue or dispute this assessment</span>
              </button>
            ) : (
              <form onSubmit={handleSendFeedback} className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-stone-200 tracking-wider">
                    Report Issue / Dispute Assessment
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowFeedbackDialog(false)}
                    className="text-stone-400 hover:text-white text-xs"
                  >
                    Cancel
                  </button>
                </div>

                {feedbackSubmitted ? (
                  <p className="text-xs text-emerald-400">
                    Thank you. Your feedback has been queued into the Agronomic Review audit pool.
                  </p>
                ) : (
                  <>
                    <select
                      value={feedbackCategory}
                      onChange={(e) => setFeedbackCategory(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-white text-xs"
                    >
                      <option value="wrong_crop">Wrong Crop Identified</option>
                      <option value="wrong_disease">Wrong Disease / Pathogen</option>
                      <option value="wrong_pest">Wrong Insect / Pest</option>
                      <option value="wrong_health_score">Health Score Unrealistic</option>
                      <option value="inaccurate_recommendation">Recommendation Impractical in My County</option>
                      <option value="other">Other Dispute</option>
                    </select>

                    <textarea
                      value={feedbackNotes}
                      onChange={(e) => setFeedbackNotes(e.target.value)}
                      placeholder="Explain what seems inaccurate based on your field observations..."
                      rows={2}
                      required
                      className="w-full px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-800 text-white text-xs"
                    />

                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1.5"
                    >
                      <Send className="w-3 h-3" /> Submit Dispute to Review Queue
                    </button>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
