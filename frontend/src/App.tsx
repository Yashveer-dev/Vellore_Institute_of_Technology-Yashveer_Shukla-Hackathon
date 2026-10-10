import { useState } from "react";
import { 
  ShieldAlert, 
  Activity, 
  Terminal, 
  Database,
  BarChart3,
  Loader2
} from "lucide-react";
import { RiskGlobe } from "./RiskGlobe";
import { useRiskSignals } from "./useRiskSignals";

const WHOLESALE_ASSETS = [
  { id: "AST-101", name: "Energy Transition Loan", class: "Corporate Loan", rating: "BBB-", value: 50.0, shock: -0.15, stressedVal: 42.5, pdShock: "+200%" },
  { id: "AST-102", name: "US Sovereign 10Y Bond", class: "Sovereign Bond", rating: "AA+", value: 98.5, shock: 0.00, stressedVal: 98.5, pdShock: "0%" },
  { id: "AST-103", name: "Semiconductor Swaption", class: "Derivatives", rating: "A", value: 27.2, shock: 0.00, stressedVal: 27.2, pdShock: "0%" },
  { id: "AST-104", name: "Metro CRE Office Loan", class: "Commercial Real Estate", rating: "BB+", value: 74.0, shock: -0.10, stressedVal: 66.6, pdShock: "+150%" },
  { id: "AST-105", name: "High-Yield Telecom Note", class: "High Yield Bond", rating: "B", value: 28.8, shock: -0.35, stressedVal: 18.72, pdShock: "+350%" },
];

export default function App() {
  const { pins, loading } = useRiskSignals();
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"stream" | "stress" | "schema">("stream");

  // Fallback if backend is empty or loading
  const currentSignal = pins[selectedIdx] || {
    source: "Waiting for Stream...",
    headline: "Initializing real-time ingestion pipeline...",
    entity: "N/A",
    sentiment: 0,
    category: "General",
    impactScore: 0,
    city: "Unknown",
    country: "Unknown",
    lat: 0,
    lng: 0,
  };
  
  const isHighRisk = currentSignal.impactScore >= 7;

  // Mumbai = portfolio hub (arc destination)
  const PORTFOLIO_HUB = { lat: 19.076, lng: 72.877 };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-200">
      {/* Glow Backdrop */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[140px] opacity-25 transition-all duration-700 ${isHighRisk ? "bg-rose-600" : "bg-sky-500"}`} />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-900/15 rounded-full blur-[160px]" />
      </div>

      {/* Modern Glass Header */}
      <header className="relative z-20 border-b border-white/[0.06] backdrop-blur-md bg-black/30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-400/30 flex items-center justify-center shadow-lg shadow-sky-500/10">
            <ShieldAlert className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white">CRISIL / S&amp;P</span>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-400/20 text-sky-300">
                AI RISK ENGINE v2.4
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Institutional Intelligence &amp; Wholesale Stress Testing Platform</p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-mono text-[11px]">FinBERT Engine Active</span>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-xs">
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-300 font-mono text-[11px]">Wholesale EAD: \$278.5M</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 lg:p-8 flex flex-col gap-6">
        
        {loading && pins.length === 0 && (
          <div className="flex items-center justify-center py-4 text-xs font-mono text-sky-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Fetching live risk intelligence feed from API...
          </div>
        )}

        {/* Top Hero Section: Real-time Ingestion & Interactive 3D Hologram */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Hero Card: Live Signal Details */}
          <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl" />
            
            <div>
              {/* Badge Row */}
              <div className="flex flex-wrap items-center gap-2.5 mb-4">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium tracking-wide bg-sky-500/10 border border-sky-400/20 text-sky-300">
                  {currentSignal.source}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-white/[0.04] border border-white/[0.08] text-slate-300">
                  {currentSignal.category}
                </span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-indigo-500/10 border border-indigo-400/20 text-indigo-300">
                  📍 {currentSignal.city}, {currentSignal.country}
                </span>
                {isHighRisk && (
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-rose-500/15 border border-rose-500/30 text-rose-300 animate-pulse">
                    HIGH IMPACT DETECTED
                  </span>
                )}
              </div>

              {/* Headline */}
              <h2 className="text-xl sm:text-2xl md:text-3xl font-medium tracking-tight text-white mb-4 leading-snug">
                &ldquo;{currentSignal.headline}&rdquo;
              </h2>
            </div>

            {/* Signal Metric Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/[0.06] mt-4">
              <div className="p-3 rounded-xl bg-black/30 border border-white/[0.05]">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono mb-1">Entity</div>
                <div className="text-base font-semibold text-white truncate">{currentSignal.entity}</div>
              </div>

              <div className="p-3 rounded-xl bg-black/30 border border-white/[0.05]">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono mb-1">Sentiment</div>
                <div className={`text-base font-semibold font-mono ${currentSignal.sentiment < 0 ? "text-rose-400" : currentSignal.sentiment > 0 ? "text-emerald-400" : "text-slate-300"}`}>
                  {currentSignal.sentiment > 0 ? `+${currentSignal.sentiment.toFixed(2)}` : currentSignal.sentiment.toFixed(2)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/30 border border-white/[0.05]">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono mb-1">Severity</div>
                <div className="text-base font-semibold font-mono text-white">
                  <span className={isHighRisk ? "text-rose-400" : "text-sky-400"}>{currentSignal.impactScore}</span>
                  <span className="text-slate-500 text-xs">/10</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/30 border border-white/[0.05]">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono mb-1">Module B</div>
                <div className={`text-xs font-semibold font-mono uppercase px-2 py-1 rounded inline-block ${isHighRisk ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"}`}>
                  {isHighRisk ? "Stress Triggered" : "Normal"}
                </div>
              </div>
            </div>
          </div>

          {/* Right Hero Card: 3D Geolocated Risk Globe */}
          <div className="lg:col-span-5 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] backdrop-blur-xl relative overflow-hidden flex flex-col justify-between p-6">
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                <span className="text-xs uppercase font-mono tracking-wider text-slate-300">3D Risk Geosphere</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />Credit/Geo</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Macro</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />M&amp;A</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Launch</span>
              </div>
            </div>

            {/* 3D Canvas */}
            <div className="w-full h-72 sm:h-80 flex items-center justify-center relative mt-2">
              <RiskGlobe
                impactScore={currentSignal.impactScore}
                sentiment={currentSignal.sentiment}
                pins={pins}
                portfolioHub={PORTFOLIO_HUB}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/[0.06] relative z-10 font-mono">
              <span>Active Signal: <strong className={isHighRisk ? "text-rose-400" : "text-sky-400"}>{currentSignal.category}</strong></span>
              <span>Hub: <strong className="text-amber-300">Mumbai, IN</strong> · Arcs = contagion flows</span>
            </div>
          </div>

        </div>

        {/* Feed Selector & Ingestion Stream */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300 uppercase tracking-wider">
              <Terminal className="w-4 h-4 text-sky-400" />
              <span>Live REST API Ingestion Stream (Polled every 5s)</span>
            </div>
            <span className="text-xs text-slate-500 font-mono">{pins.length} signals loaded</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
            {pins.map((sig, i) => (
              <button
                key={sig.id || i}
                onClick={() => setSelectedIdx(i)}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                  selectedIdx === i 
                    ? "bg-sky-500/10 border-sky-400/50 shadow-lg shadow-sky-500/10" 
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]"
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                  <span className="text-slate-400 truncate max-w-[120px]">{sig.entity}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] ${sig.impactScore >= 7 ? "bg-rose-500/20 text-rose-300" : "bg-slate-800 text-slate-300"}`}>
                    {sig.impactScore}/10
                  </span>
                </div>
                <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
                  {sig.headline}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Downstream Module B: Wholesale Banking Portfolio Stress Dashboard */}
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/[0.06] gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-sky-400" />
                <h3 className="text-lg font-medium text-white tracking-tight">
                  Module B: Event-Driven Wholesale Portfolio Stress Test
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Basel III expected loss &amp; mark-to-market stress simulation against \$278.5M wholesale banking assets.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/[0.06] text-xs font-mono">
              <button
                onClick={() => setActiveTab("stream")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === "stream" ? "bg-sky-500/20 text-sky-300 border border-sky-400/30" : "text-slate-400 hover:text-white"}`}
              >
                Asset Impairments
              </button>
              <button
                onClick={() => setActiveTab("stress")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === "stress" ? "bg-sky-500/20 text-sky-300 border border-sky-400/30" : "text-slate-400 hover:text-white"}`}
              >
                Macro Shocks
              </button>
              <button
                onClick={() => setActiveTab("schema")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === "schema" ? "bg-sky-500/20 text-sky-300 border border-sky-400/30" : "text-slate-400 hover:text-white"}`}
              >
                JSON Payload
              </button>
            </div>
          </div>

          {activeTab === "stream" && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/[0.06] text-slate-400 uppercase tracking-wider text-[11px]">
                    <th className="pb-3 font-medium">Asset ID</th>
                    <th className="pb-3 font-medium">Facility / Asset Name</th>
                    <th className="pb-3 font-medium">Asset Class</th>
                    <th className="pb-3 font-medium">Rating</th>
                    <th className="pb-3 font-medium">Baseline EAD</th>
                    <th className="pb-3 font-medium">MTM Shock</th>
                    <th className="pb-3 font-medium">Stressed Value</th>
                    <th className="pb-3 font-medium">PD Multiplier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {WHOLESALE_ASSETS.map((asset) => {
                    const finalShock = isHighRisk ? asset.shock : 0;
                    const finalVal = isHighRisk ? asset.stressedVal : asset.value;
                    const finalPd = isHighRisk ? asset.pdShock : "0%";

                    return (
                      <tr key={asset.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 text-sky-400 font-semibold">{asset.id}</td>
                        <td className="py-3 text-white font-sans text-xs">{asset.name}</td>
                        <td className="py-3 text-slate-300">{asset.class}</td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.1] text-slate-200 text-[10px]">
                            {asset.rating}
                          </span>
                        </td>
                        <td className="py-3 text-slate-300">\${asset.value.toFixed(1)}M</td>
                        <td className={`py-3 font-semibold ${finalShock < 0 ? "text-rose-400" : "text-emerald-400"}`}>
                          {finalShock < 0 ? `${(finalShock * 100).toFixed(0)}%` : "0.0%"}
                        </td>
                        <td className="py-3 text-white font-semibold">\${finalVal.toFixed(2)}M</td>
                        <td className={`py-3 ${finalPd !== "0%" ? "text-amber-400 font-semibold" : "text-slate-400"}`}>
                          {finalPd}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Stress Summary Banner */}
              <div className="mt-6 p-4 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-400">Total Pre-Stress Exposure: </span>
                  <strong className="text-white">\$278.50M USD</strong>
                </div>
                <div>
                  <span className="text-slate-400">Post-Stress Portfolio: </span>
                  <strong className={isHighRisk ? "text-rose-400" : "text-emerald-400"}>
                    {isHighRisk ? "\$253.52M USD (-8.97% MTM)" : "\$278.50M USD (No Depletion)"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">Stressed Expected Loss (EL): </span>
                  <strong className={isHighRisk ? "text-amber-400" : "text-slate-300"}>
                    {isHighRisk ? "\$8.35M USD (+\$5.83M Surge)" : "\$2.51M USD (Baseline)"}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {activeTab === "stress" && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-4 rounded-xl bg-black/30 border border-white/[0.05]">
                <div className="text-sky-400 font-semibold mb-2">[Credit Event Shocks]</div>
                <p className="text-slate-300 leading-relaxed font-sans">
                  High Yield note repricing -35%, Corporate Loan haircut -15%, CRE loan devaluation -10%. PD surge up to 3.5x.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-black/30 border border-white/[0.05]">
                <div className="text-indigo-400 font-semibold mb-2">[Macroeconomic Tightening]</div>
                <p className="text-slate-300 leading-relaxed font-sans">
                  Yield curve shift sparks 10Y Sovereign Bond haircut -12%, Derivative swaption repricing -18%, CRE valuation -15%.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-black/30 border border-white/[0.05]">
                <div className="text-rose-400 font-semibold mb-2">[Geopolitical Risk Flight]</div>
                <p className="text-slate-300 leading-relaxed font-sans">
                  Derivatives hit -30%, HY bonds -20%, with sovereign flight-to-safety appreciation (+3% buffer).
                </p>
              </div>
            </div>
          )}

          {activeTab === "schema" && (
            <div className="mt-6 p-4 rounded-xl bg-black/50 border border-white/[0.08] font-mono text-xs text-sky-300 overflow-x-auto">
              <pre>{JSON.stringify({
                source: currentSignal.source,
                headline_or_text: currentSignal.headline,
                entity_mentioned: currentSignal.entity,
                sentiment_score: currentSignal.sentiment,
                event_classification: currentSignal.category,
                impact_score: currentSignal.impactScore,
                trigger_stress_test: isHighRisk
              }, null, 2)}</pre>
            </div>
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-4 px-6 text-center text-xs font-mono text-slate-500">
        CRISIL &bull; S&amp;P Global Hackathon Submission &bull; Real-time AI/NLP Risk Engine &amp; Wholesale Stress Tester
      </footer>
    </div>
  );
}