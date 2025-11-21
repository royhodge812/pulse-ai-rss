import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import FeedView from './components/FeedView';
import ArticleReader from './components/ArticleReader';
import FeedCreator from './components/FeedCreator';
import Dashboard from './components/Dashboard';
import { Feed, Article, ViewMode, FeedType } from './types';
import { fetchRssFeed } from './services/rssService';
import { generateVirtualFeed } from './services/geminiService';
import { Menu, X } from 'lucide-react';

// Mock initial data if storage is empty
const INITIAL_FEEDS: Feed[] = [
  { id: '1', title: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', type: FeedType.RSS },
  { id: '2', title: 'Wired', url: 'https://www.wired.com/feed/rss', type: FeedType.RSS },
];

const App: React.FC = () => {
  // State
  const [feeds, setFeeds] = useState<Feed[]>(() => {
    const saved = localStorage.getItem('pulse_feeds');
    return saved ? JSON.parse(saved) : INITIAL_FEEDS;
  });
  
  const [activeFeedId, setActiveFeedId] = useState<string | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);

  // Effects
  useEffect(() => {
    localStorage.setItem('pulse_feeds', JSON.stringify(feeds));
  }, [feeds]);

  useEffect(() => {
    if (activeFeedId) {
      loadFeed(activeFeedId);
    }
  }, [activeFeedId]);

  const loadFeed = async (feedId: string) => {
    setIsLoadingArticles(true);
    const feed = feeds.find(f => f.id === feedId);
    if (!feed) return;

    try {
      let fetchedArticles: Article[] = [];
      if (feed.type === FeedType.RSS) {
        fetchedArticles = await fetchRssFeed(feed);
      } else {
        // Virtual Feed
        fetchedArticles = await generateVirtualFeed(feed.url, feed.id);
      }
      setArticles(fetchedArticles);
      setViewMode('feed');
    } catch (error) {
      console.error("Failed to load feed", error);
      // Keep old articles or show error state in a real app
    } finally {
      setIsLoadingArticles(false);
    }
  };

  // Handlers
  const handleAddFeed = (title: string, url: string, type: FeedType) => {
    const newFeed: Feed = {
      id: Date.now().toString(),
      title,
      url,
      type
    };
    setFeeds([...feeds, newFeed]);
    setViewMode('feed');
    setActiveFeedId(newFeed.id);
  };

  const handleDeleteFeed = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFeeds(feeds.filter(f => f.id !== id));
    if (activeFeedId === id) {
      setActiveFeedId(null);
      setViewMode('dashboard');
    }
  };

  const renderContent = () => {
    if (viewMode === 'creator') {
      return <FeedCreator onAddFeed={handleAddFeed} onClose={() => setViewMode('dashboard')} />;
    }

    if (viewMode === 'article' && currentArticle) {
      return <ArticleReader article={currentArticle} onBack={() => setViewMode('feed')} />;
    }

    if (viewMode === 'dashboard') {
      // We pass both the current 'articles' (context if coming from a feed) AND 'feeds' list
      return <Dashboard articles={articles} feeds={feeds} />;
    }

    if (viewMode === 'feed' && activeFeedId) {
      const feed = feeds.find(f => f.id === activeFeedId);
      if (isLoadingArticles) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">
                        {feed?.type === FeedType.VIRTUAL ? "AI is curating your feed..." : "Fetching articles..."}
                    </p>
                </div>
            </div>
        );
      }
      return (
        <FeedView 
          articles={articles} 
          feedTitle={feed?.title || 'Feed'} 
          onSelectArticle={(article) => {
            setCurrentArticle(article);
            setViewMode('article');
          }}
          isVirtual={feed?.type === FeedType.VIRTUAL}
        />
      );
    }

    return <Dashboard articles={[]} feeds={feeds} />;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Mobile Sidebar Toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button 
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700"
        >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <Sidebar 
          feeds={feeds}
          activeFeedId={activeFeedId}
          onSelectFeed={(id) => setActiveFeedId(id)}
          onAddFeed={() => setViewMode('creator')}
          onDeleteFeed={handleDeleteFeed}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 scroll-smooth">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
