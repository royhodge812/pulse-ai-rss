import React, { useEffect, useState } from 'react';
import { Article, Feed, AnalysisPreset, FeedType } from '../types';
import { generateSmartDigest, generateVirtualFeed } from '../services/geminiService';
import { fetchRssFeed, generateRssXml } from '../services/rssService';
import { 
  Newspaper, Sparkles, Loader2, Play, Save, Download, FileText, 
  Trash2, Plus, ChevronDown, ChevronUp, Rss, CheckSquare, Search, Briefcase, Share2
} from 'lucide-react';

interface DashboardProps {
  articles: Article[]; // passed from parent, though we might fetch our own
  feeds: Feed[]; // Available feeds
}

const DEFAULT_PRESETS: AnalysisPreset[] = [
  {
    id: 'default_digest',
    name: 'Daily Smart Digest',
    description: 'General overview of news grouped by theme.',
    prompt: 'Create a "Daily Smart Digest" based on the provided articles. Group them by theme. Write in a professional, engaging newsletter style. Include source links.',
    icon: 'newspaper'
  },
  {
    id: 'job_hunter',
    name: 'Job Opportunity Scout',
    description: 'Scan for jobs, career advice, and application strategies.',
    prompt: 'Analyze the content for job opportunities, career advice, or companies that are hiring. List specific roles mentioned, required skills, and suggest the best method to apply based on the context. If no direct jobs are found, identify companies expanding or launching new products that might imply hiring needs. Format as a clear Markdown table followed by a "Strategy" section.',
    icon: 'briefcase'
  },
  {
    id: 'checklist_gen',
    name: 'Action Checklist',
    description: 'Convert insights into a To-Do list.',
    prompt: 'Review these articles and create a prioritized markdown checklist of actionable items, learning opportunities, or technologies to research. Use check boxes [ ] for each item. Be specific.',
    icon: 'check-square'
  },
  {
    id: 'market_intel',
    name: 'Market Research',
    description: 'Trends, competitors, and business sentiment.',
    prompt: 'Identify emerging trends, market shifts, and competitor moves. Summarize the sentiment (Positive/Negative/Neutral) and potential business impacts in a structured report. Highlight any "Red Flags" or "Green Lights" for investors or stakeholders.',
    icon: 'search'
  }
];

const Dashboard: React.FC<DashboardProps> = ({ articles: initialArticles, feeds }) => {
  // Context State
  const [selectedFeedIds, setSelectedFeedIds] = useState<Set<string>>(new Set());
  const [contextArticles, setContextArticles] = useState<Article[]>(initialArticles);
  const [isFetchingContext, setIsFetchingContext] = useState(false);

  // Analysis State
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Prompt State
  const [customPrompt, setCustomPrompt] = useState(DEFAULT_PRESETS[0].prompt);
  const [activePresetId, setActivePresetId] = useState<string>(DEFAULT_PRESETS[0].id);
  const [savedPresets, setSavedPresets] = useState<AnalysisPreset[]>(() => {
    const saved = localStorage.getItem('pulse_presets');
    return saved ? JSON.parse(saved) : DEFAULT_PRESETS;
  });
  
  // UI State
  const [newPresetName, setNewPresetName] = useState('');
  const [isSaveMode, setIsSaveMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [broadcastConfigOpen, setBroadcastConfigOpen] = useState(false);

  // Effects
  useEffect(() => {
    localStorage.setItem('pulse_presets', JSON.stringify(savedPresets));
  }, [savedPresets]);

  // Initialize context with something if empty
  useEffect(() => {
    if (contextArticles.length === 0 && initialArticles.length > 0) {
      setContextArticles(initialArticles);
    }
  }, [initialArticles]);

  // Handlers for Context
  const toggleFeedSelection = (id: string) => {
    const newSet = new Set(selectedFeedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedFeedIds(newSet);
  };

  const fetchSelectedContext = async () => {
    if (selectedFeedIds.size === 0) return;
    setIsFetchingContext(true);
    setContextArticles([]); // Clear current
    
    try {
      const promises = Array.from(selectedFeedIds).map(id => {
        const feed = feeds.find(f => f.id === id);
        if (!feed) return Promise.resolve([]);
        if (feed.type === FeedType.RSS) return fetchRssFeed(feed);
        return generateVirtualFeed(feed.url, feed.id);
      });

      const results = await Promise.all(promises);
      const flattened = results.flat().sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      setContextArticles(flattened);
    } catch (err) {
      console.error("Error fetching context", err);
    } finally {
      setIsFetchingContext(false);
    }
  };

  // Handlers for Analysis
  const handleAnalyze = async () => {
    if (contextArticles.length === 0) return;
    setIsAnalyzing(true);
    const result = await generateSmartDigest(contextArticles, customPrompt);
    setAnalysisResult(result);
    setIsAnalyzing(false);
  };

  // Handlers for Presets
  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset: AnalysisPreset = {
        id: Date.now().toString(),
        name: newPresetName,
        description: 'Custom saved preset',
        prompt: customPrompt,
        icon: 'file-text'
    };
    setSavedPresets([...savedPresets, newPreset]);
    setActivePresetId(newPreset.id);
    setNewPresetName('');
    setIsSaveMode(false);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (DEFAULT_PRESETS.find(p => p.id === id)) return;
    setSavedPresets(savedPresets.filter(p => p.id !== id));
    if (activePresetId === id) {
        setActivePresetId(DEFAULT_PRESETS[0].id);
        setCustomPrompt(DEFAULT_PRESETS[0].prompt);
    }
  };

  // Export Handlers
  const handleDownloadMd = () => {
    if (!analysisResult) return;
    const element = document.createElement("a");
    const file = new Blob([analysisResult], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `pulse_analysis_${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleBroadcastRss = () => {
    if (!analysisResult && contextArticles.length === 0) return;

    // Create items for RSS
    const items = [];

    // If analysis exists, make it the top item
    if (analysisResult) {
        items.push({
            title: `Pulse AI Digest - ${new Date().toLocaleDateString()}`,
            link: `https://pulse.local/digest/${Date.now()}`, // Placeholder link
            description: analysisResult.replace(/\n/g, '<br/>'), // Simple HTML conversion for RSS desc
            pubDate: new Date().toUTCString(),
            guid: `digest-${Date.now()}`
        });
    }

    // Add context articles
    contextArticles.forEach(a => {
        items.push({
            title: a.title,
            link: a.link,
            description: a.content,
            pubDate: a.pubDate,
            guid: a.id
        });
    });

    const xml = generateRssXml("Pulse AI Broadcast", "AI Curated feed based on custom analysis.", items);
    
    const element = document.createElement("a");
    const file = new Blob([xml], {type: 'application/rss+xml'});
    element.href = URL.createObjectURL(file);
    element.download = `pulse_broadcast_${new Date().toISOString().slice(0,10)}.xml`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setBroadcastConfigOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">Intelligence Hub</h1>
          <p className="text-slate-500">Synthesize multiple feeds, discover opportunities, and broadcast your curated insights.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Configuration */}
        <div className="lg:col-span-4 space-y-6">
            
            {/* Source Selector */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                    <Rss className="w-4 h-4 text-brand-500" /> Select Data Sources
                </h3>
                <div className="max-h-60 overflow-y-auto space-y-2 mb-4 pr-2">
                    {feeds.length === 0 && <p className="text-sm text-slate-400 italic">No feeds available.</p>}
                    {feeds.map(feed => (
                        <label key={feed.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                            <input 
                                type="checkbox" 
                                checked={selectedFeedIds.has(feed.id)}
                                onChange={() => toggleFeedSelection(feed.id)}
                                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate flex-1">{feed.title}</span>
                            <span className="text-[10px] uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {feed.type === FeedType.VIRTUAL ? 'AI' : 'RSS'}
                            </span>
                        </label>
                    ))}
                </div>
                <button 
                    onClick={fetchSelectedContext}
                    disabled={selectedFeedIds.size === 0 || isFetchingContext}
                    className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isFetchingContext ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {selectedFeedIds.size > 0 ? `Fetch ${selectedFeedIds.size} Feeds` : "Select Feeds"}
                </button>
                <div className="mt-2 text-xs text-slate-500 text-center">
                    Current Context: <strong>{contextArticles.length} articles</strong>
                </div>
            </div>

            {/* Analysis Config */}
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-5">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-purple-500" /> Analysis Goal
                </h3>
                
                {/* Presets Dropdown/Grid */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {savedPresets.map(preset => (
                        <button
                            key={preset.id}
                            onClick={() => {
                                setActivePresetId(preset.id);
                                setCustomPrompt(preset.prompt);
                            }}
                            className={`p-2 rounded-lg text-left border transition-all relative group ${
                                activePresetId === preset.id 
                                ? 'bg-brand-50 border-brand-300 ring-1 ring-brand-300 dark:bg-brand-900/20 dark:border-brand-700' 
                                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-brand-200'
                            }`}
                        >
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mb-0.5">{preset.name}</div>
                            {!DEFAULT_PRESETS.find(p => p.id === preset.id) && (
                                <div onClick={(e) => handleDeletePreset(preset.id, e)} className="absolute top-1 right-1 p-1 text-slate-300 hover:text-red-500 cursor-pointer">
                                    <Trash2 className="w-3 h-3" />
                                </div>
                            )}
                        </button>
                    ))}
                    <button 
                        onClick={() => { setActivePresetId('custom'); setCustomPrompt(''); }}
                        className="p-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:text-brand-500 hover:border-brand-300 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                {/* Prompt Editor */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <label className="text-xs font-bold text-slate-400 uppercase">Prompt</label>
                        {activePresetId === 'custom' && !isSaveMode && (
                            <button onClick={() => setIsSaveMode(true)} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                                <Save className="w-3 h-3" /> Save Preset
                            </button>
                        )}
                    </div>

                    {isSaveMode && (
                        <div className="flex gap-2 mb-2 animate-fade-in">
                            <input 
                                autoFocus
                                className="flex-1 px-2 py-1 text-sm border rounded dark:bg-slate-950 dark:border-slate-700"
                                placeholder="Preset Name"
                                value={newPresetName}
                                onChange={e => setNewPresetName(e.target.value)}
                            />
                            <button onClick={handleSavePreset} className="text-xs bg-brand-600 text-white px-2 rounded">Save</button>
                        </div>
                    )}

                    <textarea 
                        value={customPrompt}
                        onChange={(e) => { setCustomPrompt(e.target.value); setActivePresetId('custom'); }}
                        className="w-full h-40 p-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                        placeholder="Enter instructions for the AI..."
                    />
                </div>

                <button 
                    onClick={handleAnalyze}
                    disabled={contextArticles.length === 0 || isAnalyzing}
                    className="w-full mt-4 py-3 bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                    Analyze Opportunities
                </button>
            </div>

        </div>

        {/* RIGHT COLUMN: Results */}
        <div className="lg:col-span-8">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 h-full min-h-[600px] flex flex-col relative overflow-hidden">
                {/* Decorative Top Bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-purple-500 via-brand-500 to-emerald-500"></div>
                
                {/* Header */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-slate-500" />
                        <span className="font-semibold text-slate-700 dark:text-slate-200">Output Console</span>
                    </div>
                    <div className="flex gap-2">
                        {analysisResult && (
                            <button onClick={handleDownloadMd} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300">
                                <Download className="w-4 h-4" /> MD
                            </button>
                        )}
                        <div className="relative">
                             <button 
                                onClick={() => setBroadcastConfigOpen(!broadcastConfigOpen)}
                                disabled={!analysisResult && contextArticles.length === 0}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg hover:opacity-90 transition-opacity shadow-md disabled:opacity-50"
                             >
                                <Share2 className="w-4 h-4" /> Broadcast RSS
                            </button>
                            
                            {/* Simple Popover for RSS Broadcast Confirm */}
                            {broadcastConfigOpen && (
                                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 z-20 animate-in fade-in zoom-in-95 duration-100">
                                    <h4 className="font-bold text-sm mb-2">Create Feed</h4>
                                    <p className="text-xs text-slate-500 mb-4">
                                        Generate an RSS XML file containing your analysis {analysisResult ? 'and selected articles' : ''}.
                                    </p>
                                    <button 
                                        onClick={handleBroadcastRss}
                                        className="w-full py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                                    >
                                        Download XML
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950">
                    {isAnalyzing ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 animate-pulse space-y-4">
                            <Sparkles className="w-12 h-12 text-purple-500" />
                            <div className="text-center">
                                <p className="text-lg font-medium text-slate-600 dark:text-slate-300">Processing Intelligence...</p>
                                <p className="text-sm">Analyzing context from {contextArticles.length} articles.</p>
                            </div>
                        </div>
                    ) : analysisResult ? (
                        <div className="prose prose-lg dark:prose-invert max-w-none">
                            <div className="whitespace-pre-wrap font-serif leading-relaxed">{analysisResult}</div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                             <Newspaper className="w-16 h-16 mb-4" />
                             <p>Select feeds on the left and run an analysis to generate insights.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
