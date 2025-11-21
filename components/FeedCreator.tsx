import React, { useState } from 'react';
import { Rss, Search, Loader2, Globe } from 'lucide-react';
import { FeedType } from '../types';
import { validateRssUrl } from '../services/rssService';

interface FeedCreatorProps {
  onAddFeed: (title: string, url: string, type: FeedType) => void;
  onClose: () => void;
}

const FeedCreator: React.FC<FeedCreatorProps> = ({ onAddFeed, onClose }) => {
  const [activeTab, setActiveTab] = useState<'rss' | 'virtual'>('rss');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (activeTab === 'rss') {
        const metadata = await validateRssUrl(input);
        if (metadata) {
          onAddFeed(metadata.title, input, FeedType.RSS);
          onClose();
        } else {
          setError("Could not validate RSS feed. Please check the URL.");
        }
      } else {
        // Virtual Feed
        if (input.trim().length < 3) {
            setError("Topic must be at least 3 characters.");
            setIsLoading(false);
            return;
        }
        onAddFeed(input, input, FeedType.VIRTUAL); // URL is the topic for virtual feeds
        onClose();
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl w-full mx-auto mt-10 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-bold">Add Content Source</h2>
        <p className="text-slate-500 text-sm mt-1">Follow a traditional RSS feed or create a dynamic AI feed.</p>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('rss')}
          className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'rss' ? 'text-brand-600 border-b-2 border-brand-600 bg-slate-50 dark:bg-slate-800/50' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Rss className="w-4 h-4" />
          RSS URL
        </button>
        <button
          onClick={() => setActiveTab('virtual')}
          className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'virtual' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50 dark:bg-slate-800/50' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Search className="w-4 h-4" />
          AI Discovery
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {activeTab === 'rss' ? 'Feed URL' : 'Topic or Interest'}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {activeTab === 'rss' ? <Globe className="h-5 w-5 text-slate-400" /> : <Search className="h-5 w-5 text-slate-400" />}
            </div>
            <input
              type={activeTab === 'rss' ? 'url' : 'text'}
              required
              className="block w-full pl-10 pr-3 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
              placeholder={activeTab === 'rss' ? "https://example.com/feed.xml" : "e.g., Quantum Computing Breakthroughs"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {activeTab === 'rss' 
              ? "Enter a valid RSS or Atom feed URL." 
              : "Pulse AI will use Google Search Grounding to find the latest articles on this topic every time you refresh."}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isLoading}
            className={`px-6 py-2 rounded-lg text-white font-medium shadow-lg transition-all flex items-center gap-2 ${activeTab === 'rss' ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/30' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/30'}`}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Feed"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FeedCreator;