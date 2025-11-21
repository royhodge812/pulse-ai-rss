import React, { useState, useEffect, useRef } from 'react';
import { Article, ChatMessage } from '../types';
import { summarizeArticle, chatWithArticle } from '../services/geminiService';
import { ArrowLeft, ExternalLink, Bot, Sparkles, Send, User } from 'lucide-react';

interface ArticleReaderProps {
  article: Article;
  onBack: () => void;
}

const ArticleReader: React.FC<ArticleReaderProps> = ({ article, onBack }) => {
  const [summary, setSummary] = useState<string | null>(article.aiSummary || null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  // Chat state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleSummarize = async () => {
    if (summary) return;
    setIsSummarizing(true);
    const result = await summarizeArticle(article.content, article.title);
    setSummary(result);
    setIsSummarizing(false);
    // In a real app, we would save this back to the article in state/storage
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    const response = await chatWithArticle(article.content, chatHistory, userMsg.text);
    
    setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    setIsChatLoading(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-white dark:bg-slate-950">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-10 border-r border-slate-200 dark:border-slate-800">
        <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to feed
        </button>

        <article className="max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                {article.title}
            </h1>
            
            <div className="flex items-center gap-4 text-sm text-slate-500 mb-8 border-b border-slate-200 dark:border-slate-800 pb-6">
                <span>{article.author || "Unknown Author"}</span>
                <span>•</span>
                <time>{new Date(article.pubDate).toLocaleDateString()}</time>
                <a href={article.link} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center text-brand-600 hover:underline">
                    Original Source <ExternalLink className="w-3 h-3 ml-1" />
                </a>
            </div>

            {/* AI Summary Section */}
            <div className="mb-10 bg-slate-50 dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-brand-400 to-purple-500"></div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500" /> AI Smart Summary
                    </h3>
                    {!summary && (
                        <button 
                            onClick={handleSummarize} 
                            disabled={isSummarizing}
                            className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                        >
                            {isSummarizing ? "Generating..." : "Generate Summary"}
                        </button>
                    )}
                </div>
                {isSummarizing && (
                    <div className="space-y-2 animate-pulse">
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
                    </div>
                )}
                {summary && (
                    <div className="prose dark:prose-invert text-sm max-w-none leading-relaxed text-slate-700 dark:text-slate-300">
                        {/* Render markdown-like summary */}
                        <div className="whitespace-pre-line">{summary}</div>
                    </div>
                )}
            </div>

            {/* Main Article Content */}
            <div 
                className="prose prose-lg dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-loose"
                dangerouslySetInnerHTML={{ __html: article.content }} 
            />
        </article>
      </div>

      {/* Chat Sidebar */}
      <div className="w-full lg:w-96 bg-slate-50 dark:bg-slate-900 flex flex-col border-l border-slate-200 dark:border-slate-800 h-[500px] lg:h-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-950">
            <Bot className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold">Chat with Article</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.length === 0 && (
                <div className="text-center text-slate-500 text-sm mt-10 px-6">
                    <p>Ask questions about this article. Gemini AI will answer based on the content.</p>
                    <div className="mt-4 space-y-2">
                        <button onClick={() => setChatInput("What is the main argument?")} className="block w-full text-left p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-xs hover:border-brand-400 transition-colors">"What is the main argument?"</button>
                        <button onClick={() => setChatInput("Explain the key terms.")} className="block w-full text-left p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-xs hover:border-brand-400 transition-colors">"Explain the key terms."</button>
                    </div>
                </div>
            )}
            {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-200 dark:bg-slate-700' : 'bg-brand-100 dark:bg-brand-900/30'}`}>
                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-brand-600" />}
                    </div>
                    <div className={`p-3 rounded-lg text-sm max-w-[80%] ${msg.role === 'user' ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm'}`}>
                        {msg.text}
                    </div>
                </div>
            ))}
            {isChatLoading && (
                <div className="flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-brand-600" />
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-1">
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleChatSubmit} className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
            <div className="relative">
                <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask Gemini..."
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-100 dark:bg-slate-900 border-none rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                />
                <button 
                    type="submit" 
                    disabled={!chatInput.trim() || isChatLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-brand-600 hover:bg-brand-100 dark:hover:bg-brand-900/30 rounded-md disabled:opacity-50 transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default ArticleReader;