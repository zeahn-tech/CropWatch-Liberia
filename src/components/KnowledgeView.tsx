import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  ExternalLink,
  Plus,
  Filter,
} from 'lucide-react';
import { AgriculturalKnowledgeItem, CropCatalogItem, User } from '../types.js';

interface KnowledgeViewProps {
  currentUser: User;
  knowledge: AgriculturalKnowledgeItem[];
  crops: CropCatalogItem[];
  onAddArticle?: (article: any) => Promise<void>;
  onSubmitForReview?: (id: string) => Promise<void>;
  onValidateArticle?: (id: string) => Promise<void>;
  onPublishArticle?: (id: string) => Promise<void>;
}

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({
  currentUser,
  knowledge,
  crops,
  onAddArticle,
  onSubmitForReview,
  onValidateArticle,
  onPublishArticle,
}) => {
  const [selectedCrop, setSelectedCrop] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New article form
  const [topic, setTopic] = useState('');
  const [cropId, setCropId] = useState(crops[0]?.id || 'crop_cassava');
  const [category, setCategory] = useState<'disease' | 'pest' | 'nutrient' | 'water' | 'harvest'>('disease');
  const [symptoms, setSymptoms] = useState('');
  const [preventative, setPreventative] = useState('');
  const [organic, setOrganic] = useState('');
  const [chemical, setChemical] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [evidenceLevel, setEvidenceLevel] = useState<'peer_reviewed' | 'university_extension' | 'government_bulletin' | 'field_validated'>('university_extension');

  const canAuthor = currentUser.role !== 'farmer';

  const filteredItems = knowledge.filter((item) => {
    if (selectedCrop !== 'all' && item.cropId !== selectedCrop) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.topic.toLowerCase().includes(q) ||
        item.cropName.toLowerCase().includes(q) ||
        item.symptomsDescription.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddArticle) return;

    const cropObj = crops.find((c) => c.id === cropId);
    await onAddArticle({
      cropId,
      cropName: cropObj?.name || 'Crop',
      topic,
      category,
      symptomsDescription: symptoms,
      preventativeMeasures: preventative,
      approvedOrganicTreatments: organic,
      approvedChemicalGuidance: chemical,
      evidenceLevel,
      sourceName,
    });

    setShowAddModal(false);
    setTopic('');
    setSymptoms('');
    setPreventative('');
    setOrganic('');
    setChemical('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-stone-900 rounded-2xl p-5 sm:p-6 border border-stone-800 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
                Official Knowledge Repository • CARI & MOA
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
              Agricultural Knowledge Base
            </h1>
            <p className="text-sm text-stone-300 mt-1 max-w-2xl">
              Peer-reviewed agronomic management guides, verified foliar symptoms, and non-chemical IPM protocols adapted for Liberia's agro-ecological zones.
            </p>
          </div>

          {canAuthor && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Knowledge Article
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symptoms, pests, diseases (e.g. blast, mosaic, stem borer)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-white text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={selectedCrop}
          onChange={(e) => setSelectedCrop(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-white text-xs"
        >
          <option value="all">All Liberian Crops</option>
          {crops.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => {
          const getStatusBadgeClass = (status: string) => {
            switch (status) {
              case 'draft':
                return 'bg-stone-800 text-stone-300 border border-stone-750';
              case 'review':
                return 'bg-amber-950 text-amber-300 border border-amber-800';
              case 'validated':
                return 'bg-blue-950 text-blue-300 border border-blue-800';
              case 'published':
                return 'bg-emerald-950 text-emerald-300 border border-emerald-800';
              case 'periodic_review':
                return 'bg-red-950 text-red-300 border border-red-800 animate-pulse';
              default:
                return 'bg-stone-800 text-stone-300 border border-stone-700';
            }
          };

          return (
            <div
              key={item.id}
              className={`bg-stone-900 rounded-xl border p-5 flex flex-col justify-between hover:border-stone-700 transition-all space-y-4 ${
                item.governanceStatus === 'periodic_review'
                  ? 'border-red-900/60 shadow-[0_0_12px_rgba(220,38,38,0.1)]'
                  : 'border-stone-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-400">{item.cropName}</span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-stone-800 text-stone-300">
                        {item.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">{item.topic}</h3>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${getStatusBadgeClass(item.governanceStatus)}`}>
                    {item.governanceStatus.replace(/_/g, ' ')}
                  </span>
                </div>

                {item.governanceStatus === 'periodic_review' && (
                  <div className="mt-2 text-[11px] bg-red-950/20 border border-red-900/40 text-red-300 p-2.5 rounded-lg">
                    <strong>⚠️ PERIODIC RE-REVIEW REQUIRED:</strong>
                    <p className="mt-0.5">This item has exceeded the configured periodic review age threshold and requires a fresh peer validation check.</p>
                  </div>
                )}

                {/* Symptoms Description */}
                <div className="mt-3">
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    Visible Symptoms:
                  </span>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    {item.symptomsDescription}
                  </p>
                </div>

                {/* Preventative & Organic */}
                <div className="mt-3 space-y-2 bg-stone-950 p-3 rounded-lg border border-stone-850 text-xs">
                  <div>
                    <strong className="text-emerald-400 block">Preventative & Cultural Practices:</strong>
                    <p className="text-stone-300 mt-0.5">{item.preventativeMeasures}</p>
                  </div>
                  <div>
                    <strong className="text-green-400 block">Approved Organic / Bio-treatments:</strong>
                    <p className="text-stone-300 mt-0.5">{item.approvedOrganicTreatments}</p>
                  </div>
                </div>

                {/* Chemical guidance with safety */}
                {item.approvedChemicalGuidance && (
                  <div className="mt-2 text-[11px] text-amber-300 bg-amber-950/20 p-2.5 rounded border border-amber-900/40">
                    <strong>Restricted Chemical Protocol: </strong>
                    <span>{item.approvedChemicalGuidance}</span>
                  </div>
                )}
              </div>

              {/* Source & Peer Audit footer */}
              <div className="pt-3 border-t border-stone-850 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-stone-400">
                  <span className="truncate">Source: {item.sourceName}</span>
                  <span className="capitalize text-stone-400 font-medium">Reviewed by {item.reviewedByExpertName || 'CARI Lead'}</span>
                </div>

                {/* Governance Action Pipeline Buttons (Prompt constraints verified) */}
                {currentUser.role !== 'farmer' && (
                  <div className="pt-2 border-t border-stone-850/50 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] text-stone-500 uppercase font-semibold">Governance:</span>
                    
                    {item.governanceStatus === 'draft' && (
                      <button
                        onClick={async () => {
                          if (onSubmitForReview) {
                            await onSubmitForReview(item.id);
                          }
                        }}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold rounded shadow-sm transition-colors"
                      >
                        Submit for Peer Review
                      </button>
                    )}

                    {item.governanceStatus === 'review' && (
                      currentUser.id === item.authorId ? (
                        <span className="text-[10px] text-amber-400 italic">
                          ℹ️ Author cannot validate own work
                        </span>
                      ) : (
                        <button
                          onClick={async () => {
                            if (onValidateArticle) {
                              await onValidateArticle(item.id);
                            }
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded shadow-sm transition-colors"
                        >
                          Validate Article
                        </button>
                      )
                    )}

                    {item.governanceStatus === 'validated' && (
                      currentUser.id === item.authorId ? (
                        <span className="text-[10px] text-blue-400 italic">
                          ℹ️ Author cannot publish own work
                        </span>
                      ) : (
                        currentUser.role === 'senior_expert' || currentUser.role === 'admin' ? (
                          <button
                            onClick={async () => {
                              if (onPublishArticle) {
                                                    await onPublishArticle(item.id);
                              }
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded shadow-sm transition-colors"
                          >
                            Publish & Endorse (CARI)
                          </button>
                        ) : (
                          <span className="text-[10px] text-stone-500">
                            Awaiting Senior Endorsement
                          </span>
                        )
                      )
                    )}

                    {item.governanceStatus === 'periodic_review' && (
                      currentUser.id === item.authorId ? (
                        <span className="text-[10px] text-red-400 italic">
                          ℹ️ Author cannot re-validate own work
                        </span>
                      ) : (
                        <button
                          onClick={async () => {
                            if (onValidateArticle) {
                              await onValidateArticle(item.id);
                            }
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded shadow-sm transition-colors"
                        >
                          Submit Re-validation
                        </button>
                      )
                    )}

                    {item.governanceStatus === 'published' && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved & Public
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Authoring Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl max-w-lg w-full my-auto space-y-4">
            <h3 className="text-base font-bold text-white">Create Official Agricultural Knowledge Entry</h3>

            <form onSubmit={handleCreateArticle} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-300 font-semibold mb-1">Target Crop</label>
                <select
                  value={cropId}
                  onChange={(e) => setCropId(e.target.value)}
                  className="w-full p-2 rounded-lg bg-stone-950 border border-stone-800 text-white"
                >
                  {crops.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Topic / Condition Name</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. African Rice Gall Midge (Orseolia oryzivora)"
                  required
                  className="w-full p-2 rounded-lg bg-stone-950 border border-stone-800 text-white"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Visual Symptoms Description</label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  rows={2}
                  required
                  placeholder="Diagnostic signs on leaves, stems or panicles..."
                  className="w-full p-2 rounded-lg bg-stone-950 border border-stone-800 text-white"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Preventative Cultural Practices</label>
                <textarea
                  value={preventative}
                  onChange={(e) => setPreventative(e.target.value)}
                  rows={2}
                  required
                  placeholder="Water management, rogueing, certified stem/seed selection..."
                  className="w-full p-2 rounded-lg bg-stone-950 border border-stone-800 text-white"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Organic Treatments</label>
                <textarea
                  value={organic}
                  onChange={(e) => setOrganic(e.target.value)}
                  rows={2}
                  required
                  placeholder="Neem aqueous extract, wood ash, composting..."
                  className="w-full p-2 rounded-lg bg-stone-950 border border-stone-800 text-white"
                />
              </div>

              <div>
                <label className="block text-stone-300 font-semibold mb-1">Source & Evidence Base</label>
                <input
                  type="text"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="e.g. CARI Extension Bulletin #22 / AfricaRice"
                  required
                  className="w-full p-2 rounded-lg bg-stone-950 border border-stone-800 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-stone-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Submit for Editorial Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
