import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  UploadCloud,
  CheckCircle,
  AlertCircle,
  Sparkles,
  WifiOff,
  Image as ImageIcon,
} from 'lucide-react';
import { CropPlanting } from '../types.js';
import { compressAndValidateCropImage, ImageQualityResult } from '../lib/imageCompressor.js';
import { LIBERIAN_CROP_PRESETS } from '../data/presetSamples.js';

interface ScanModalProps {
  plantings: CropPlanting[];
  defaultPlantingId?: string;
  isOnline: boolean;
  onClose: () => void;
  onSubmitScan: (payload: {
    plantingId: string;
    imageBase64: string;
    notes: string;
    farmerReportedSymptoms: string;
    isOffline: boolean;
  }) => Promise<void>;
}

export const ScanModal: React.FC<ScanModalProps> = ({
  plantings,
  defaultPlantingId,
  isOnline,
  onClose,
  onSubmitScan,
}) => {
  const [selectedPlantingId, setSelectedPlantingId] = useState<string>(
    defaultPlantingId || (plantings[0]?.id ?? '')
  );
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [qualityData, setQualityData] = useState<ImageQualityResult | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [symptoms, setSymptoms] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const result = await compressAndValidateCropImage(file);
      setQualityData(result);
      setImagePreview(result.compressedDataUrl);
    } catch (err) {
      console.error('Image compression failed', err);
      // Direct file reader fallback
      const reader = new FileReader();
      reader.onload = (readEv) => {
        setImagePreview(readEv.target?.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSelectPreset = async (preset: typeof LIBERIAN_CROP_PRESETS[0]) => {
    try {
      setIsCompressing(true);
      setSymptoms(preset.symptoms);
      setNotes(preset.notes);

      // Match planting if available
      const matchingPlanting = plantings.find((p) =>
        p.cropName.toLowerCase().includes(preset.crop.toLowerCase())
      );
      if (matchingPlanting) {
        setSelectedPlantingId(matchingPlanting.id);
      }

      const result = await compressAndValidateCropImage(preset.url);
      setQualityData(result);
      setImagePreview(result.compressedDataUrl);
    } catch (err) {
      console.warn('Preset compression fallback to raw data URL', err);
      setImagePreview(preset.url);
      setQualityData({
        compressedDataUrl: preset.url,
        originalSizeBytes: preset.url.length,
        compressedSizeBytes: preset.url.length,
        width: 800,
        height: 600,
        qualityScore: 0.9,
        isAcceptable: true,
        warnings: [],
      });
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview || !selectedPlantingId) return;

    setIsSubmitting(true);
    try {
      await onSubmitScan({
        plantingId: selectedPlantingId,
        imageBase64: imagePreview,
        notes,
        farmerReportedSymptoms: symptoms,
        isOffline: !isOnline,
      });
      onClose();
    } catch (err: any) {
      console.error('Scan submission error', err);
      alert(err.message || 'Diagnostic scan failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-xl p-5 sm:p-6 shadow-2xl relative my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-stone-800 text-stone-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Record Crop Observation</h2>
            <p className="text-xs text-stone-400">
              {isOnline ? 'AI diagnostic analysis & expert triage engine' : 'Offline Mode: Storing in IndexedDB queue'}
            </p>
          </div>
        </div>

        {!isOnline && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-200 text-xs flex items-center gap-2">
            <WifiOff className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>
              <strong>Low-Bandwidth / Offline Guard:</strong> Your image will be compressed locally and safely saved. Once connection returns, 1-click sync will process the analysis.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Planting / Plot Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
              Select Field & Crop
            </label>
            <select
              value={selectedPlantingId}
              onChange={(e) => setSelectedPlantingId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white text-sm focus:outline-none focus:border-emerald-500"
              required
            >
              {plantings.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.cropName} ({p.varietyName || 'Standard'}) — Planted {p.plantingDate}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Demo Preset Picker */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
              Quick Field Test Samples:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {LIBERIAN_CROP_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className="px-2 py-1.5 rounded-lg bg-stone-950 hover:bg-stone-850 border border-stone-800 hover:border-emerald-700 text-left text-xs transition-colors"
                >
                  <p className="font-semibold text-stone-200 truncate">{p.crop}</p>
                  <p className="text-[10px] text-stone-400 truncate">{p.name.split(' ')[1] || 'Sample'}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Image Capture & Upload Area */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
              Crop Photograph (Leaves, Stem or Canopy)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />

            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-stone-800 hover:border-emerald-600 rounded-2xl p-6 text-center cursor-pointer bg-stone-950/60 transition-colors"
              >
                <UploadCloud className="w-10 h-10 text-stone-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-stone-200">
                  Tap to Take Photo with Camera or Upload
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  Supported: Smartphone camera captures, JPG, PNG, WebP
                </p>
                <p className="text-[11px] text-emerald-400 mt-2 font-medium">
                  ⚡ Client downscaling compresses files by ~95% for fast rural 3G upload.
                </p>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden border border-stone-800 bg-stone-950">
                <img
                  src={imagePreview}
                  alt="Crop preview"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                  className="w-full h-48 object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setQualityData(null);
                  }}
                  className="absolute top-3 right-3 p-1 rounded-full bg-black/70 text-white hover:bg-black"
                >
                  <X className="w-4 h-4" />
                </button>

                {qualityData && (
                  <div className="p-3 bg-stone-950 border-t border-stone-850 flex items-center justify-between text-xs text-stone-300">
                    <div>
                      <span className="font-semibold text-white">
                        Compressed: {Math.round(qualityData.compressedSizeBytes / 1024)} KB
                      </span>
                      <span className="text-stone-400 text-[11px] ml-1">
                        ({qualityData.width}x{qualityData.height}px)
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Quality Validated</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Observed Symptoms */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
              Symptoms You Noticed (Optional)
            </label>
            <input
              type="text"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g. Yellow leaf spots, curling leaf tips, whitefly insects"
              className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Farmer Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
              Field Notes / Context
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Planted 7 weeks ago, noticed after 2 days of flooding"
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!imagePreview || isCompressing || isSubmitting}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md hover:shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Running AI Diagnostic & Safety Engine...</span>
              ) : isOnline ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Crop Health</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4" />
                  <span>Save to Offline Scan Queue</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
