import React from 'react';
import { Article } from '../types';
import { Clock, ChevronRight, Sparkles } from 'lucide-react';

interface FeedViewProps {
  articles: Article[];
  feedTitle: string;
  onSelectArticle: (article: Article) => void;
  isVirtual?: boolean;
}

const FeedView: React.FC<FeedViewProps> = ({ articles, feedTitle, onSelectArticle, isVirtual }) => {
  return (
    <div className="max-w-5xl mx-auto pb-10">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
            {isVirtual && <span className="px-2 py-1 rounded text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 uppercase tracking-wide">AI Generated</span>}
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{feedTitle}</h1>
        </div>
        <p className="text-slate-500">
          {articles.length} articles available
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <article 
            key={article.id} 
            onClick={() => onSelectArticle(article)}
            className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
          >
             {/* Image handling: If virtual, maybe no image, or if RSS has one */}
             <div className="h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                {article.thumbnail ? (
                    <img src={article.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                        {isVirtual ? <Sparkles className="w-12 h-12 opacity-50" /> : <div className="text-4xl font-bold opacity-20">RSS</div>}
                    </div>
                )}
                {article.read && (
                    <div className="absolute top-3 right-3 bg-black/50 backdrop-blur text-white text-xs px-2 py-1 rounded-full">Read</div>
                )}
             </div>
             
             <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                    <Clock className="w-3 h-3" />
                    <time>{new Date(article.pubDate).toLocaleDateString()}</time>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 leading-tight mb-3 line-clamp-2 group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors">
                    {article.title}
                </h3>
                <div className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-4 flex-1" dangerouslySetInnerHTML={{ __html: article.content }}></div>
                
                <div className="flex items-center text-brand-600 dark:text-brand-400 text-sm font-medium mt-auto">
                    Read Article <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
             </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default FeedView;