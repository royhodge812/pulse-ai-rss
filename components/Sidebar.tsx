import React from 'react';
import { Feed, FeedType } from '../types';
import { Plus, LayoutDashboard, Rss, Zap, Trash2, Search } from 'lucide-react';

interface SidebarProps {
  feeds: Feed[];
  activeFeedId: string | null;
  onSelectFeed: (id: string | null) => void;
  onAddFeed: () => void;
  onDeleteFeed: (id: string, e: React.MouseEvent) => void;
  viewMode: string;
  setViewMode: (mode: any) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  feeds, 
  activeFeedId, 
  onSelectFeed, 
  onAddFeed, 
  onDeleteFeed,
  viewMode,
  setViewMode
}) => {
  return (
    <div className="w-64 h-full bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/30">
          <Zap className="text-white w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Pulse AI</h1>
      </div>

      <div className="px-4 mb-6">
        <button 
          onClick={onAddFeed}
          className="w-full py-2.5 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>New Feed</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        <div className="mb-6">
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Menu</p>
          <button 
            onClick={() => { setViewMode('dashboard'); onSelectFeed(null); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'dashboard' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
        </div>

        <div>
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">My Feeds</p>
          {feeds.length === 0 && (
            <div className="px-3 py-4 text-center text-sm text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
              No feeds yet
            </div>
          )}
          {feeds.map(feed => (
            <div 
              key={feed.id}
              className={`group relative flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${activeFeedId === feed.id && viewMode === 'feed' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
              onClick={() => onSelectFeed(feed.id)}
            >
              {feed.type === FeedType.VIRTUAL ? (
                <Search className="w-4 h-4 text-purple-500" />
              ) : (
                <Rss className="w-4 h-4 text-orange-500" />
              )}
              <span className="truncate flex-1">{feed.title}</span>
              <button 
                onClick={(e) => onDeleteFeed(feed.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 rounded transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-500">
           <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
           <span>AI System Online</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;