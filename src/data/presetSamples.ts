/**
 * Self-contained diagnostic botanical sample images for Liberian crops.
 * Encoded as high-resolution vector SVG Data URLs to guarantee:
 * 1. 100% offline availability in low-connectivity rural zones (Bong, Nimba, Lofa)
 * 2. Zero cross-origin canvas tainting (prevents CanvasRenderingContext2D SecurityError)
 * 3. Instant loading without external CDN latency
 */

const cassavaMosaicSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#142618" />
      <stop offset="100%" stop-color="#0d1810" />
    </linearGradient>
    <radialGradient id="soil" cx="50%" cy="80%" r="50%">
      <stop offset="0%" stop-color="#3d2b1f" />
      <stop offset="100%" stop-color="#1c130d" />
    </radialGradient>
    <linearGradient id="healthyLeaf" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2d6a36" />
      <stop offset="100%" stop-color="#1b4322" />
    </linearGradient>
    <radialGradient id="mosaicYellow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#e2cf38" stop-opacity="0.9" />
      <stop offset="60%" stop-color="#c9b027" stop-opacity="0.7" />
      <stop offset="100%" stop-color="#2d6a36" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="chlorosis" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#f5e866" stop-opacity="0.95" />
      <stop offset="50%" stop-color="#bfad20" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#24542a" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Background Farm Setting -->
  <rect width="800" height="600" fill="url(#bgGrad)" />
  <ellipse cx="400" cy="550" rx="360" ry="120" fill="url(#soil)" opacity="0.6" />

  <!-- Cassava Petiole (Stem) -->
  <path d="M400,560 Q405,420 400,320" stroke="#8a3324" stroke-width="12" fill="none" stroke-linecap="round" />
  <path d="M400,320 Q398,280 400,260" stroke="#a33d2b" stroke-width="8" fill="none" stroke-linecap="round" />

  <!-- Palmate Cassava Leaf Lobes (7 lobes) -->
  <!-- Central Lobe (Curled / distorted by CMD) -->
  <g transform="translate(400,260)">
    <!-- Central Lobe -->
    <path d="M0,0 C-25,-80 -45,-170 -10,-230 C25,-170 30,-80 0,0" fill="url(#healthyLeaf)" stroke="#193b1e" stroke-width="2" />
    <!-- Yellow Mosaic Patches -->
    <circle cx="-10" cy="-140" r="28" fill="url(#chlorosis)" />
    <ellipse cx="8" cy="-180" rx="18" ry="24" fill="url(#mosaicYellow)" />
    <circle cx="2" cy="-90" r="20" fill="url(#mosaicYellow)" />

    <!-- Left Upper Lobe -->
    <g transform="rotate(-35)">
      <path d="M0,0 C-30,-70 -50,-150 -20,-205 C15,-155 25,-70 0,0" fill="url(#healthyLeaf)" stroke="#193b1e" stroke-width="2" />
      <ellipse cx="-12" cy="-120" rx="22" ry="32" fill="url(#chlorosis)" />
      <circle cx="4" cy="-160" r="16" fill="url(#mosaicYellow)" />
    </g>

    <!-- Right Upper Lobe -->
    <g transform="rotate(35)">
      <path d="M0,0 C-25,-70 -20,-155 18,-210 C45,-150 25,-70 0,0" fill="url(#healthyLeaf)" stroke="#193b1e" stroke-width="2" />
      <circle cx="5" cy="-130" r="26" fill="url(#chlorosis)" />
      <ellipse cx="-5" cy="-80" rx="16" ry="22" fill="url(#mosaicYellow)" />
    </g>

    <!-- Left Mid Lobe -->
    <g transform="rotate(-70)">
      <path d="M0,0 C-25,-60 -45,-130 -15,-180 C15,-135 22,-60 0,0" fill="url(#healthyLeaf)" stroke="#193b1e" stroke-width="2" />
      <circle cx="-6" cy="-110" r="22" fill="url(#mosaicYellow)" />
      <ellipse cx="2" cy="-60" rx="14" ry="18" fill="url(#chlorosis)" />
    </g>

    <!-- Right Mid Lobe -->
    <g transform="rotate(70)">
      <path d="M0,0 C-22,-60 -15,-135 15,-180 C40,-130 20,-60 0,0" fill="url(#healthyLeaf)" stroke="#193b1e" stroke-width="2" />
      <circle cx="8" cy="-100" r="24" fill="url(#chlorosis)" />
      <circle cx="-4" cy="-140" r="14" fill="url(#mosaicYellow)" />
    </g>

    <!-- Left Low Lobe -->
    <g transform="rotate(-105)">
      <path d="M0,0 C-20,-45 -35,-95 -10,-135 C10,-100 16,-45 0,0" fill="url(#healthyLeaf)" stroke="#193b1e" stroke-width="2" />
      <circle cx="-4" cy="-80" r="16" fill="url(#mosaicYellow)" />
    </g>

    <!-- Right Low Lobe -->
    <g transform="rotate(105)">
      <path d="M0,0 C-16,-45 -10,-100 10,-135 C30,-95 18,-45 0,0" fill="url(#healthyLeaf)" stroke="#193b1e" stroke-width="2" />
      <circle cx="4" cy="-80" r="16" fill="url(#mosaicYellow)" />
    </g>

    <!-- Main veins -->
    <path d="M0,0 L-10,-225" stroke="#a3c49e" stroke-width="2.5" opacity="0.8" />
    <path d="M0,0 L-110,-170" stroke="#a3c49e" stroke-width="2" opacity="0.7" />
    <path d="M0,0 L115,-175" stroke="#a3c49e" stroke-width="2" opacity="0.7" />
    <path d="M0,0 L-165,-60" stroke="#a3c49e" stroke-width="1.8" opacity="0.6" />
    <path d="M0,0 L165,-60" stroke="#a3c49e" stroke-width="1.8" opacity="0.6" />
  </g>

  <!-- Diagnostic Overlay Watermark & Annotation -->
  <rect x="25" y="25" width="280" height="42" rx="8" fill="#000000" fill-opacity="0.6" />
  <text x="38" y="52" fill="#e2cf38" font-family="sans-serif" font-size="14" font-weight="bold">
    CASSAVA MOSAIC (CMD) SAMPLE
  </text>
  <text x="28" y="580" fill="#a0a0a0" font-family="sans-serif" font-size="12">
    Diagnostic features: Asymmetric chlorotic mottling, leaf distortion, curled margins
  </text>
</svg>`;

const riceBlastSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="riceBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#102118" />
      <stop offset="100%" stop-color="#0a140e" />
    </linearGradient>
    <linearGradient id="riceBlade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#3d824d" />
      <stop offset="50%" stop-color="#55a86a" />
      <stop offset="100%" stop-color="#2d6b3c" />
    </linearGradient>
    <!-- Rice Blast Lesion Gradient: Diamond shape with ash gray center and brown/necrotic border -->
    <radialGradient id="blastLesion" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#d4d4d8" />
      <stop offset="35%" stop-color="#a1a1aa" />
      <stop offset="70%" stop-color="#78350f" />
      <stop offset="90%" stop-color="#451a03" />
      <stop offset="100%" stop-color="#55a86a" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="yellowHalo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ca8a04" stop-opacity="0.8" />
      <stop offset="70%" stop-color="#eab308" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#55a86a" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="800" height="600" fill="url(#riceBg)" />

  <!-- Swamp water hint at base -->
  <rect x="0" y="520" width="800" height="80" fill="#0f261f" opacity="0.8" />

  <!-- Rice Leaf Blade 1 (Diagonal Primary) -->
  <path d="M120,600 Q320,380 480,120 Q560,0 600,-20 Q570,30 500,160 Q360,400 200,600 Z" fill="url(#riceBlade)" stroke="#225430" stroke-width="2" />
  <!-- Midrib Vein -->
  <path d="M160,600 Q340,390 490,140 Q550,40 585,0" stroke="#a7f3d0" stroke-width="2" opacity="0.6" fill="none" />

  <!-- Rice Leaf Blade 2 (Secondary background) -->
  <path d="M350,600 Q440,350 380,80 Q370,30 360,10 Q390,40 410,100 Q480,360 420,600 Z" fill="#2d6b3c" opacity="0.8" />

  <!-- Diamond / Spindle Shaped Blast Lesions (Magnaporthe oryzae) -->
  <!-- Lesion 1 (Acute diamond on mid blade) -->
  <g transform="translate(390, 270) rotate(-45)">
    <!-- Yellow Chlorotic Halo -->
    <ellipse cx="0" cy="0" rx="45" ry="18" fill="url(#yellowHalo)" />
    <!-- Necrotic Border & Ash Gray Center -->
    <path d="M-36,0 Q-18,-12 0,-14 Q18,-12 36,0 Q18,12 0,14 Q-18,12 -36,0 Z" fill="url(#blastLesion)" />
    <path d="M-18,0 Q-9,-5 0,-6 Q9,-5 18,0 Q9,5 0,6 Q-9,5 -18,0 Z" fill="#e4e4e7" />
  </g>

  <!-- Lesion 2 (Smaller spindle lesion) -->
  <g transform="translate(440, 200) rotate(-48)">
    <ellipse cx="0" cy="0" rx="30" ry="12" fill="url(#yellowHalo)" />
    <path d="M-24,0 Q-12,-8 0,-9 Q12,-8 24,0 Q12,8 0,9 Q-12,8 -24,0 Z" fill="url(#blastLesion)" />
    <path d="M-10,0 Q-5,-3 0,-4 Q5,-3 10,0 Q5,3 0,4 Q-5,3 -10,0 Z" fill="#e4e4e7" />
  </g>

  <!-- Lesion 3 (Early stage lesion) -->
  <g transform="translate(310, 380) rotate(-40)">
    <ellipse cx="0" cy="0" rx="26" ry="10" fill="url(#yellowHalo)" />
    <path d="M-20,0 Q-10,-6 0,-7 Q10,-6 20,0 Q10,6 0,7 Q-10,6 -20,0 Z" fill="url(#blastLesion)" />
  </g>

  <!-- Lesion 4 (Collar/sheath lesion) -->
  <g transform="translate(240, 480) rotate(-35)">
    <ellipse cx="0" cy="0" rx="35" ry="14" fill="url(#yellowHalo)" />
    <path d="M-28,0 Q-14,-9 0,-10 Q14,-9 28,0 Q14,9 0,10 Q-14,9 -28,0 Z" fill="url(#blastLesion)" />
  </g>

  <rect x="25" y="25" width="310" height="42" rx="8" fill="#000000" fill-opacity="0.6" />
  <text x="38" y="52" fill="#38bdf8" font-family="sans-serif" font-size="14" font-weight="bold">
    LOWLAND RICE BLAST (Magnaporthe)
  </text>
  <text x="28" y="580" fill="#a0a0a0" font-family="sans-serif" font-size="12">
    Diagnostic features: Spindle/diamond eye lesions, ash-gray necrotic centers, brown borders
  </text>
</svg>`;

const healthyOkraSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
  <defs>
    <linearGradient id="gardenBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#122416" />
      <stop offset="100%" stop-color="#0a170d" />
    </linearGradient>
    <linearGradient id="okraVigor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#4ade80" />
      <stop offset="40%" stop-color="#22c55e" />
      <stop offset="100%" stop-color="#15803d" />
    </linearGradient>
    <radialGradient id="dew" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="60%" stop-color="#93c5fd" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="800" height="600" fill="url(#gardenBg)" />

  <!-- Thick Okra Stem -->
  <path d="M400,600 Q400,380 400,240" stroke="#166534" stroke-width="22" fill="none" stroke-linecap="round" />
  <path d="M400,420 Q480,360 520,320" stroke="#15803d" stroke-width="14" fill="none" stroke-linecap="round" />

  <!-- Emerging Healthy Okra Pod & Flower Bud -->
  <path d="M400,340 Q440,310 470,250 Q430,280 400,310 Z" fill="#86efac" stroke="#15803d" stroke-width="2" />
  <!-- Pale Yellow Flower Blossom -->
  <circle cx="475" cy="245" r="22" fill="#fef08a" opacity="0.9" />
  <circle cx="475" cy="245" r="8" fill="#713f12" />

  <!-- Broad Healthy Palmate Okra Leaf (Clean, deep green, no lesions) -->
  <g transform="translate(360, 260)">
    <!-- Central Lobes -->
    <path d="M0,0 C-60,-80 -120,-160 0,-240 C120,-160 60,-80 0,0 Z" fill="url(#okraVigor)" stroke="#14532d" stroke-width="2" />
    <path d="M0,0 C-100,-40 -200,-100 -220,-20 C-160,50 -60,40 0,0 Z" fill="url(#okraVigor)" stroke="#14532d" stroke-width="2" />
    <path d="M0,0 C100,-40 200,-100 220,-20 C160,50 60,40 0,0 Z" fill="url(#okraVigor)" stroke="#14532d" stroke-width="2" />
    <path d="M0,0 C-80,60 -180,80 -160,160 C-90,140 -40,70 0,0 Z" fill="url(#okraVigor)" stroke="#14532d" stroke-width="2" />
    <path d="M0,0 C80,60 180,80 160,160 C90,140 40,70 0,0 Z" fill="url(#okraVigor)" stroke="#14532d" stroke-width="2" />

    <!-- Sharp Palmate Venation -->
    <path d="M0,0 L0,-230" stroke="#bbf7d0" stroke-width="3.5" opacity="0.85" />
    <path d="M0,0 L-210,-20" stroke="#bbf7d0" stroke-width="3" opacity="0.8" />
    <path d="M0,0 L210,-20" stroke="#bbf7d0" stroke-width="3" opacity="0.8" />
    <path d="M0,0 L-150,150" stroke="#bbf7d0" stroke-width="2.5" opacity="0.75" />
    <path d="M0,0 L150,150" stroke="#bbf7d0" stroke-width="2.5" opacity="0.75" />

    <!-- Lateral Veins -->
    <path d="M0,-80 L-50,-140" stroke="#bbf7d0" stroke-width="1.8" opacity="0.7" />
    <path d="M0,-80 L50,-140" stroke="#bbf7d0" stroke-width="1.8" opacity="0.7" />
    <path d="M0,-140 L-40,-190" stroke="#bbf7d0" stroke-width="1.8" opacity="0.7" />
    <path d="M0,-140 L40,-190" stroke="#bbf7d0" stroke-width="1.8" opacity="0.7" />

    <!-- Morning Dew Drops on Healthy Leaf -->
    <circle cx="-35" cy="-110" r="7" fill="url(#dew)" />
    <circle cx="60" cy="-60" r="5" fill="url(#dew)" />
    <circle cx="-110" cy="-30" r="6" fill="url(#dew)" />
    <circle cx="80" cy="80" r="8" fill="url(#dew)" />
  </g>

  <rect x="25" y="25" width="280" height="42" rx="8" fill="#000000" fill-opacity="0.6" />
  <text x="38" y="52" fill="#4ade80" font-family="sans-serif" font-size="14" font-weight="bold">
    HEALTHY OKRA VIGOR BENCHMARK
  </text>
  <text x="28" y="580" fill="#a0a0a0" font-family="sans-serif" font-size="12">
    Healthy indicators: Deep uniform green chlorophyll, intact serrations, robust stem
  </text>
</svg>`;

export const CASSAVA_MOSAIC_PRESET_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cassavaMosaicSvg)}`;
export const RICE_BLAST_PRESET_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(riceBlastSvg)}`;
export const HEALTHY_OKRA_PRESET_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(healthyOkraSvg)}`;

export const LIBERIAN_CROP_PRESETS = [
  {
    name: 'Cassava Mosaic (Bong County)',
    crop: 'Cassava',
    url: CASSAVA_MOSAIC_PRESET_DATA_URL,
    fallbackExternalUrl: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=800&q=80',
    symptoms: 'Yellow mosaic mottling, distorted upper leaf blades, small whiteflies spotted under leaves',
    notes: 'Observed on Plot 1 upland ridge after 3 days of heavy rain. Suspected CMD infection.',
  },
  {
    name: 'Lowland Rice Blast (Swamp)',
    crop: 'Lowland Rice (Swamp)',
    url: RICE_BLAST_PRESET_DATA_URL,
    fallbackExternalUrl: 'https://images.unsplash.com/photo-1598512752271-33f913a5af13?auto=format&fit=crop&w=800&q=80',
    symptoms: 'Elliptical diamond lesions on leaf blades with gray centers and reddish brown borders',
    notes: 'Inland swamp plot water level dropped during dry week. Severe blast symptoms visible on leaves.',
  },
  {
    name: 'Healthy Okra Canopy',
    crop: 'Okra',
    url: HEALTHY_OKRA_PRESET_DATA_URL,
    fallbackExternalUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb22d57?auto=format&fit=crop&w=800&q=80',
    symptoms: 'Clean green palmate leaves with emerging flower buds, no visible leaf spots',
    notes: 'Regular morning inspection. Plot looks vigorous with healthy vegetative growth.',
  },
];
