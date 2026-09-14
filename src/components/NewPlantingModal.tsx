import React, { useState } from 'react';
import { X, Sprout, Plus } from 'lucide-react';
import { CropCatalogItem, Farm, Field } from '../types.js';

interface NewPlantingModalProps {
  farms: Farm[];
  crops: CropCatalogItem[];
  onClose: () => void;
  onSubmit: (data: {
    fieldId: string;
    cropId: string;
    cropName: string;
    varietyName: string;
    plantingDate: string;
    targetAcreage: number;
    currentGrowthStage: string;
  }) => Promise<void>;
}

export const NewPlantingModal: React.FC<NewPlantingModalProps> = ({
  farms,
  crops,
  onClose,
  onSubmit,
}) => {
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || '');
  const [selectedCropId, setSelectedCropId] = useState(crops[0]?.id || '');
  const [varietyName, setVarietyName] = useState(crops[0]?.commonVarietiesInLiberia[0] || '');
  const [plantingDate, setPlantingDate] = useState(new Date().toISOString().split('T')[0]);
  const [acreage, setAcreage] = useState(1.5);
  const [growthStage, setGrowthStage] = useState('Vegetative');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCrop = crops.find((c) => c.id === selectedCropId);

  const handleCropChange = (id: string) => {
    setSelectedCropId(id);
    const crop = crops.find((c) => c.id === id);
    if (crop && crop.commonVarietiesInLiberia.length > 0) {
      setVarietyName(crop.commonVarietiesInLiberia[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCrop) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        fieldId: 'field_001',
        cropId: selectedCrop.id,
        cropName: selectedCrop.name,
        varietyName,
        plantingDate,
        targetAcreage: Number(acreage),
        currentGrowthStage: growthStage,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-stone-800 text-stone-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
            <Sprout className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Register New Crop Plot</h3>
            <p className="text-xs text-stone-400">Initialize continuous health monitoring</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-stone-300 font-semibold mb-1">Crop Type</label>
            <select
              value={selectedCropId}
              onChange={(e) => handleCropChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-800 text-white"
            >
              {crops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-stone-300 font-semibold mb-1">Liberian Variety / Cultivar</label>
            <input
              type="text"
              value={varietyName}
              onChange={(e) => setVarietyName(e.target.value)}
              placeholder="e.g. CARICASS-1, Suakoko 8, WAB 56-104"
              className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-800 text-white"
              required
            />
            {selectedCrop && (
              <p className="text-[10px] text-stone-400 mt-1">
                Common in Liberia: {selectedCrop.commonVarietiesInLiberia.join(', ')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-stone-300 font-semibold mb-1">Planting Date</label>
              <input
                type="date"
                value={plantingDate}
                onChange={(e) => setPlantingDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-800 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-stone-300 font-semibold mb-1">Area (Acres)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={acreage}
                onChange={(e) => setAcreage(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-800 text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-300 font-semibold mb-1">Current Growth Stage</label>
            <select
              value={growthStage}
              onChange={(e) => setGrowthStage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-800 text-white"
            >
              <option value="Emergence / Seedling">Emergence / Seedling</option>
              <option value="Early Vegetative">Early Vegetative</option>
              <option value="Active Tillering / Branching">Active Tillering / Branching</option>
              <option value="Flowering / Booting">Flowering / Booting</option>
              <option value="Tuber Bulking / Grain Filling">Tuber Bulking / Grain Filling</option>
              <option value="Maturity / Ripening">Maturity / Ripening</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Registering...' : 'Register Plot & Begin Tracking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
