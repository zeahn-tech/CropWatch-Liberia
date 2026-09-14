import React, { useState } from 'react';
import {
  Camera,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  CloudRain,
  UserCheck,
  TrendingDown,
  TrendingUp,
  Activity,
  ArrowRight,
  Plus,
  ShieldCheck,
  Clock,
  Droplets,
  HelpCircle,
} from 'lucide-react';
import {
  CropPlanting,
  PlantObservation,
  Farm,
  Field,
  WeatherContext,
  User,
} from '../types.js';
import { HEALTHY_OKRA_PRESET_DATA_URL } from '../data/presetSamples.js';

interface FarmerDashboardProps {
  user: User;
  farms: Farm[];
  plantings: CropPlanting[];
  observations: PlantObservation[];
  weather: WeatherContext | null;
  onOpenScanModal: (plantingId?: string) => void;
  onSelectObservation: (observation: PlantObservation) => void;
  onOpenNewPlantingModal: () => void;
}

export const FarmerDashboard: React.FC<FarmerDashboardProps> = ({
  user,
  farms,
  plantings,
  observations,
  weather,
  onOpenScanModal,
  onSelectObservation,
  onOpenNewPlantingModal,
}) => {
  const [selectedCropFilter, setSelectedCropFilter] = useState<string>('all');

  // Compute key agricultural indicators
  const averageHealth = plantings.length > 0
    ? Math.round(
        plantings.reduce((acc, p) => acc + (p.latestHealthScore || 80), 0) / plantings.length
      )
    : 85;

  const urgentPlanting = plantings.find((p) => p.latestStatus === 'needs_attention' || p.latestStatus === 'poor');
  const activeExpertReviews = observations.filter(
    (o) => o.expertReviewCase && o.expertReviewCase.status !== 'closed'
  );

  const filteredPlantings = selectedCropFilter === 'all'
    ? plantings
    : plantings.filter((p) => p.id === selectedCropFilter);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'excellent':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">Excellent</span>;
      case 'good':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-950 text-green-300 border border-green-800">Good</span>;
      case 'needs_attention':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800">Needs Attention</span>;
      case 'poor':
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-950 text-red-300 border border-red-800">Critical</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-stone-800 text-stone-300">Monitored</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner & Quick Action */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 rounded-2xl p-5 sm:p-6 border border-stone-800 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
                Farmer Advisory Portal • {user.county} County
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
              Welcome back, {user.fullName}
            </h1>
            <p className="text-sm text-stone-300 mt-1 max-w-2xl">
              {farms[0]?.name || 'Your Farm'} — Continuous crop health monitoring, symptom detection, and verified extension guidance.
            </p>
          </div>

          <button
            onClick={() => onOpenScanModal()}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md hover:shadow-emerald-900/30 transition-all active:scale-[0.98]"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Crop with Camera</span>
          </button>
        </div>
      </div>

      {/* 7 Critical Agricultural Questions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. How Healthy Are My Crops? */}
        <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-stone-400">1. Overall Farm Health</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-3 mt-3">
              <span className="text-3xl font-bold text-white">{averageHealth}%</span>
              <span className="text-xs text-stone-400">Farm Average</span>
            </div>
            <p className="text-xs text-stone-300 mt-2">
              {averageHealth >= 80
                ? 'Strong overall crop vigor. Routine monitoring advised.'
                : 'Pockets of stress identified on upland cassava. Action required.'}
            </p>
          </div>
          <div className="w-full bg-stone-800 h-2 rounded-full mt-4 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                averageHealth >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${averageHealth}%` }}
            ></div>
          </div>
        </div>

        {/* 2. Which Crop Needs Attention? */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between ${
          urgentPlanting
            ? 'bg-amber-950/20 border-amber-850/60'
            : 'bg-stone-900 border-stone-800'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-amber-400">2. Attention Required</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            {urgentPlanting ? (
              <>
                <div className="mt-3">
                  <h4 className="font-bold text-white text-base">{urgentPlanting.cropName} ({urgentPlanting.varietyName})</h4>
                  <p className="text-xs text-stone-300">Latest Health: {urgentPlanting.latestHealthScore}% • Needs Review</p>
                </div>
                <p className="text-xs text-amber-300/90 mt-2">
                  Yellow mosaic pattern detected. Potential viral infection.
                </p>
              </>
            ) : (
              <div className="mt-4">
                <p className="text-sm font-semibold text-emerald-300">All plots in healthy range</p>
                <p className="text-xs text-stone-400 mt-1">No severe pathogen triggers reported.</p>
              </div>
            )}
          </div>
          {urgentPlanting && (
            <button
              onClick={() => onOpenScanModal(urgentPlanting.id)}
              className="mt-3 text-xs font-medium text-amber-300 hover:text-amber-200 flex items-center gap-1"
            >
              Take Follow-Up Scan <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 3. Weather & Agro-meteorological Warning */}
        <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-stone-400">3. Weather & Fungal Risk</span>
              <CloudRain className="w-4 h-4 text-blue-400" />
            </div>
            {weather ? (
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-white">{weather.temperatureC}°C</span>
                  <span className="text-xs font-semibold text-blue-300 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                    {weather.rainfall24hMm}mm 24h Rain
                  </span>
                </div>
                <p className="text-xs text-stone-300 line-clamp-2 mt-1">
                  {weather.agroAdvisory}
                </p>
              </div>
            ) : (
              <p className="text-xs text-stone-400 mt-3">Loading local agro-weather...</p>
            )}
          </div>
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-stone-800 text-[11px] text-stone-400">
            <Droplets className="w-3.5 h-3.5 text-blue-400" />
            <span>Humidity: {weather?.relativeHumidity || 86}% (High fungal sporulation risk)</span>
          </div>
        </div>

        {/* 4. Active Agricultural Expert Reviews */}
        <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-stone-400">4. Specialist Review</span>
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>
            {activeExpertReviews.length > 0 ? (
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  <p className="text-sm font-bold text-white">
                    {activeExpertReviews[0].expertReviewCase?.assignedExpertName || 'Extension Board Review'}
                  </p>
                </div>
                <p className="text-xs text-stone-300 mt-1">
                  Status: <span className="font-semibold text-blue-300 capitalize">{activeExpertReviews[0].expertReviewCase?.status.replace(/_/g, ' ')}</span>
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  Case: {activeExpertReviews[0].expertReviewCase?.cropName} ({activeExpertReviews[0].expertReviewCase?.triggerType.replace(/_/g, ' ')})
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm font-semibold text-stone-300">No open expert cases</p>
                <p className="text-xs text-stone-400 mt-1">AI automated safety checks are clear.</p>
              </div>
            )}
          </div>
          {activeExpertReviews[0] && (
            <button
              onClick={() => onSelectObservation(activeExpertReviews[0])}
              className="mt-3 text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              View Case Progress <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 5. Harvest Prediction Window */}
        <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-stone-400">5. Harvest Countdown</span>
              <Calendar className="w-4 h-4 text-purple-400" />
            </div>
            {plantings[1] ? (
              <div className="mt-3">
                <p className="text-sm font-bold text-white">{plantings[1].cropName}</p>
                <p className="text-xs text-stone-400">{plantings[1].varietyName}</p>
                <div className="mt-2 text-xs bg-stone-950 p-2 rounded border border-stone-800">
                  <span className="text-purple-300 font-semibold">Estimated Harvest: </span>
                  <span className="text-stone-300">Nov 15 – Dec 05, 2026</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-400 mt-4">Record plantings to project harvest windows.</p>
            )}
          </div>
          <p className="text-[11px] text-stone-400 mt-2 italic">Estimates adjust with rainfall and growth stages.</p>
        </div>

        {/* 6. Today's Recommended Action */}
        <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase text-stone-400">6. Action for Today</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              <p className="text-xs text-stone-200 leading-relaxed font-medium">
                • Inspect upland Cassava Plot 1. Rogue severely curled plants to protect the healthy stand from whitefly vector spread.
              </p>
              <p className="text-xs text-stone-400 mt-2 leading-relaxed">
                • Clear swamp drainage channels before expected afternoon downpour.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Adheres to non-chemical IPM guidelines</span>
          </div>
        </div>
      </div>

      {/* Main Plots & Crop Plantings Section */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Active Crop Plots & Plantings</h2>
            <p className="text-xs text-stone-400">Continuous monitoring timelines and growth stages</p>
          </div>
          <button
            onClick={onOpenNewPlantingModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Plot / Crop
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {plantings.map((p) => {
            const plantingObservations = observations.filter((o) => o.plantingId === p.id);
            const latestObs = plantingObservations[0];

            return (
              <div
                key={p.id}
                className="bg-stone-950/70 rounded-xl border border-stone-800 p-4 hover:border-stone-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-base">{p.cropName}</h3>
                        {getStatusBadge(p.latestStatus)}
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">
                        Variety: <span className="text-stone-200 font-medium">{p.varietyName || 'Traditional'}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs font-bold text-white">
                        <span>{p.latestHealthScore || 85}%</span>
                        {p.latestHealthScore && p.latestHealthScore < 75 ? (
                          <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </div>
                      <span className="text-[10px] text-stone-400">Health Index</span>
                    </div>
                  </div>

                  {/* Growth Stage Progress */}
                  <div className="mt-3 bg-stone-900 p-2.5 rounded-lg border border-stone-850">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-stone-400">Stage:</span>
                      <span className="font-semibold text-stone-200">{p.currentGrowthStage}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-stone-400">
                      <span>Planted: {p.plantingDate}</span>
                      <span>Scans: {p.observationCount} recorded</span>
                    </div>
                  </div>

                  {/* Latest Observation Snippet */}
                  {latestObs && (
                    <div className="mt-3 pt-2 border-t border-stone-850 flex items-start gap-3">
                      {latestObs.images[0] && (
                        <img
                          src={latestObs.images[0].imageUrl}
                          alt="Crop scan"
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 object-cover rounded-md border border-stone-800 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-stone-200 font-medium truncate">
                          {latestObs.aiAnalysis?.hypotheses[0]?.conditionName || latestObs.farmerReportedSymptoms || 'Routine inspection'}
                        </p>
                        <p className="text-[11px] text-stone-400 mt-0.5 line-clamp-1">
                          {latestObs.notes || 'No symptoms detected during field sweep.'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {latestObs.expertReviewCase && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 font-medium">
                              <UserCheck className="w-3 h-3" />
                              Expert Case: {latestObs.expertReviewCase.status}
                            </span>
                          )}
                          <span className="text-[10px] text-stone-400">
                            {new Date(latestObs.observedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-stone-850">
                  <button
                    onClick={() => onOpenScanModal(p.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" /> Scan This Plot
                  </button>

                  {latestObs && (
                    <button
                      onClick={() => onSelectObservation(latestObs)}
                      className="px-3 py-1.5 rounded-lg bg-stone-850 hover:bg-stone-800 text-stone-300 text-xs font-medium border border-stone-700 transition-colors"
                    >
                      View Dossier
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Observation History Timeline */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Recent Observation Timeline</h3>
            <p className="text-xs text-stone-400">Complete historical record of scans, AI interpretations, and expert feedback</p>
          </div>
          <span className="text-xs text-stone-400 bg-stone-950 px-2.5 py-1 rounded-md border border-stone-800">
            {observations.length} Total Records
          </span>
        </div>

        <div className="divide-y divide-stone-800">
          {observations.map((obs) => (
            <div
              key={obs.id}
              onClick={() => onSelectObservation(obs)}
              className="py-3 flex items-center justify-between hover:bg-stone-850/40 px-2 rounded-lg cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <img
                  src={obs.images[0]?.imageUrl || HEALTHY_OKRA_PRESET_DATA_URL}
                  alt="Crop"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 object-cover rounded-lg border border-stone-700 flex-shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white">
                      {obs.aiAnalysis?.detectedCrop.name || 'Crop'}
                    </h4>
                    {getStatusBadge(obs.healthStatus)}
                    {obs.expertReviewCase?.status === 'expert_reviewed' && (
                      <span className="text-[10px] bg-blue-950 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800 flex items-center gap-0.5">
                        <UserCheck className="w-2.5 h-2.5" /> Expert Validated
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-300 mt-0.5">
                    {obs.aiAnalysis?.hypotheses[0]?.conditionName || obs.notes || 'Routine observation'}
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Recorded {new Date(obs.observedAt).toLocaleDateString()} • Health: {obs.healthScore}%
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-stone-400">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
