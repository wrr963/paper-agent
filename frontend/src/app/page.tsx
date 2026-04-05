"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Search, Upload, FileText, Network, LayoutGrid, Bot, ArrowRight, X, Globe, ExternalLink, BookOpen, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SurveyMatrix from "../components/SurveyMatrix";
import dynamic from "next/dynamic";

const CitationGraph = dynamic(() => import("../components/CitationGraph"), { ssr: false });

// ─── i18n dictionary ────────────────────────
const T: Record<string, Record<string, any>> = {
  ja: {
    knowledgeGraph: "ナレッジグラフ",
    myLibrary: "マイライブラリ",
    surveyMatrix: "調査マトリクス",
    uploadPdf: "PDFをアップロード",
    searchPlaceholder: "概念・著者・知見を検索…",
    showMock: "モックデータを表示",
    hideMock: "モックデータを非表示",
    emptyGraph: "ナレッジグラフが空です",
    emptyGraphSub: "最初の論文をアップロードしてネットワークを構築しましょう。",
    noMatch: "該当する論文が見つかりません",
    noMatchSub: "別の検索キーワードをお試しください。",
    citationNetwork: "引用ネットワーク",
    nodesAndLinks: (n: number, l: number) => `${n} ノード & ${l} 接続`,
    papers: (n: number) => `${n} 件の論文`,
    viewDetails: "詳細を見る",
    noTitle: "タイトルなし",
    unknownAuthor: "不明な著者",
    uploadResource: "リソースをアップロード",
    clickToBrowse: "クリックしてファイルを選択",
    cancel: "キャンセル",
    processDoc: "解析を開始",
    processing: "処理中…",
    close: "閉じる",
    methodology: "手法と背景",
    keyNovelty: "主要な新規性",
    limitations: "研究の限界点",
    uploadSuccess: "論文の解析が成功しました！",
    uploadFail: "アップロード失敗。サーバー状態を確認してください。",
    noResults: "論文がまだありません。",
    surveyMatrixTitle: "調査マトリクス",
    noNovelty: "新規性が見つかりませんでした",
    noMethod: "手法が抽出できませんでした",
    noLimit: "限界点が見つかりませんでした",
    uploadPaper: "論文をアップロード",
    externalSearch: "類似論文を検索",
    searchExtPlaceholder: "キーワードや論文タイトルを入力…",
    searchBtn: "検索する",
    searching: "検索中…",
    citations: "引用",
    openLink: "論文を開く",
    noSearchResults: "結果が見つかりませんでした。",
    filesSelected: (n: number) => `${n} 件のファイルを選択中`,
    processingN: (cur: number, total: number) => `処理中 ${cur}/${total}…`,
    batchDone: (n: number) => `${n} 件の論文の解析が完了しました！`,
    importToLibrary: "ライブラリにインポート",
    importing: "インポート中…",
    importSuccess: "ライブラリにインポートしました！",
    abstract: "概要",
    citationCount: "被引用数",
    source: "出典",
    alreadyImported: "インポート済み",
    translating: "翻訳中…",
  },
  en: {
    knowledgeGraph: "Knowledge Graph",
    myLibrary: "My Library",
    surveyMatrix: "Survey Matrix",
    uploadPdf: "Upload PDF",
    searchPlaceholder: "Search concepts, authors, insights...",
    showMock: "Show Mock Data",
    hideMock: "Hide Mock Data",
    emptyGraph: "Your Knowledge Graph is Empty",
    emptyGraphSub: "Upload your first academic paper to map out the citation network.",
    noMatch: "No matches found",
    noMatchSub: "Try a different search term.",
    citationNetwork: "Citation Network",
    nodesAndLinks: (n: number, l: number) => `${n} nodes & ${l} connections`,
    papers: (n: number) => `${n} Papers`,
    viewDetails: "View Details",
    noTitle: "Untitled",
    unknownAuthor: "Unknown Author",
    uploadResource: "Upload Resources",
    clickToBrowse: "Click to browse (multiple OK)",
    cancel: "Cancel",
    processDoc: "Process Documents",
    processing: "Processing...",
    close: "Close",
    methodology: "Methodology",
    keyNovelty: "Key Novelty",
    limitations: "Limitations",
    uploadSuccess: "Paper analysis complete!",
    uploadFail: "Upload failed. Check server status.",
    noResults: "No papers yet.",
    surveyMatrixTitle: "Survey Matrix",
    noNovelty: "No novelty extracted",
    noMethod: "No method extracted",
    noLimit: "No limitations extracted",
    uploadPaper: "Upload Paper",
    externalSearch: "Find Similar Papers",
    searchExtPlaceholder: "Enter keywords or paper title...",
    searchBtn: "Search",
    searching: "Searching...",
    citations: "citations",
    openLink: "Open Paper",
    noSearchResults: "No results found.",
    filesSelected: (n: number) => `${n} file(s) selected`,
    processingN: (cur: number, total: number) => `Processing ${cur}/${total}...`,
    batchDone: (n: number) => `${n} paper(s) analyzed!`,
    importToLibrary: "Import to Library",
    importing: "Importing...",
    importSuccess: "Imported to library!",
    abstract: "Abstract",
    citationCount: "Citations",
    source: "Source",
    alreadyImported: "Already Imported",
    translating: "Translating...",
  }
};

const INITIAL_GRAPH_DATA = {
  nodes: [
    { id: "m1", title: "Attention Is All You Need", filename: "vaswani_2017.pdf", author: "Ashish Vaswani et al.", group: 1 },
    { id: "m2", title: "BERT", filename: "devlin_2018.pdf", author: "Jacob Devlin et al.", group: 2 },
    { id: "m3", title: "GPT-3", filename: "brown_2020.pdf", author: "Tom Brown et al.", group: 2 }
  ],
  links: [
    { source: "m2", target: "m1", value: 4, label: "比較対象（ベースライン）" },
    { source: "m3", target: "m1", value: 3, label: "アーキテクチャの基礎" }
  ]
};

const INITIAL_PAPERS = [
  {
    id: "m1", title: "Attention Is All You Need", filename: "vaswani_2017.pdf", author: "Ashish Vaswani et al.", year: 2017,
    novelty: "RNNを置き換える純粋な自己注意機構によるTransformerアーキテクチャの導入",
    method: "マルチヘッドアテンション、位置エンコーディング",
    limitations: "系列長に対する二次関数の計算量爆発"
  },
  {
    id: "m2", title: "BERT: Pre-training of Deep Bidirectional Transformers", filename: "devlin_2018.pdf", author: "Jacob Devlin et al.", year: 2018,
    novelty: "言語表現のための深層双方向事前学習の提案",
    method: "Masked Language Modeling (MLM)",
    limitations: "事前学習時の[MASK]トークンとファインチューニング時の差異"
  }
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("graph");
  const [isUploading, setIsUploading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [lang, setLang] = useState<"ja"|"en">("ja");
  const t = T[lang] as any;

  const [papers, setPapers] = useState<any[]>(INITIAL_PAPERS);
  const [graphData, setGraphData] = useState<any>(INITIAL_GRAPH_DATA);
  const [showMock, setShowMock] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedPaper, setSelectedPaper] = useState<any|null>(null);

  // External Search State
  const [extSearchQuery, setExtSearchQuery] = useState("");
  const [extSearchResults, setExtSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedExtPaper, setSelectedExtPaper] = useState<any|null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [translatedAbstracts, setTranslatedAbstracts] = useState<any>({});

  useEffect(() => { setIsClient(true); }, []);
  if (!isClient) return null;

  const displayPapers = showMock ? papers : papers.filter(p => !p.id.startsWith("m"));
  const rawNodes = showMock ? graphData.nodes : graphData.nodes.filter((n:any) => !n.id.startsWith("m"));
  const rawLinks = showMock ? graphData.links : graphData.links.filter((l:any) => {
    const s = typeof l.source==='object'?l.source.id:l.source;
    const t2 = typeof l.target==='object'?l.target.id:l.target;
    return !String(s).startsWith("m")&&!String(t2).startsWith("m");
  });

  const q = searchQuery.toLowerCase().trim();
  const match = (i:any) => !q||i.title?.toLowerCase().includes(q)||i.author?.toLowerCase().includes(q)||i.novelty?.toLowerCase().includes(q)||i.method?.toLowerCase().includes(q)||i.filename?.toLowerCase().includes(q);

  const finalPapers = displayPapers.filter(match);
  const finalNodes = rawNodes.filter(match);
  const ids = new Set(finalNodes.map((n:any)=>String(n.id)));
  const finalGraph = {
    nodes: finalNodes,
    links: rawLinks.filter((l:any)=>{
      const s=typeof l.source==='object'?l.source.id:l.source;
      const t2=typeof l.target==='object'?l.target.id:l.target;
      return ids.has(String(s))&&ids.has(String(t2));
    })
  };

  const processSingleFile = async (file: File): Promise<{paper: any, node: any, links: any[]} | null> => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/upload`, { method:"POST", body:fd });
      if (!res.ok) throw new Error("HTTP "+res.status);
      const data = await res.json();
      const newId = `usr_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
      const newTitle = data.metadata?.title || "";
      const newAuthor = data.metadata?.author || t.unknownAuthor;
      const keywords = data.analysis?.keywords || [];

      const newPaper = {
        id: newId, filename: file.name, title: newTitle, author: newAuthor,
        year: new Date().getFullYear(),
        novelty: data.analysis?.novelty || t.noNovelty,
        method: data.analysis?.method || t.noMethod,
        limitations: data.analysis?.limitations || t.noLimit,
        keywords
      };

      let semanticLinks: any[] = [];
      const existingUserPapers = papers.filter(p => !p.id.startsWith("m"));
      if (existingUserPapers.length > 0) {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const relRes = await fetch(`${apiUrl}/find-relations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              new_paper: { title: newTitle, method: data.analysis?.method, keywords },
              existing_papers: existingUserPapers.map(p => ({
                id: p.id, title: p.title, method: p.method, keywords: p.keywords || []
              }))
            })
          });
          if (relRes.ok) {
            const relData = await relRes.json();
            semanticLinks = (relData.relations || []).map((r: any) => ({
              source: newId, 
              target: r.target_id, 
              value: r.strength || 2, 
              label: r.label || "関連",
              relation_type: r.relation_type || "neutral",
              reason: r.reason || ""
            }));
          }
        } catch (e) { console.warn("find-relations failed:", e); }
      }

      return {
        paper: newPaper,
        node: { id:newId, title:newTitle, filename:file.name, author:newAuthor, group:1 },
        links: semanticLinks
      };
    } catch (err) {
      console.error(`Failed to process ${file.name}:`, err);
      return null;
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);

    const allNewPapers: any[] = [];
    const allNewNodes: any[] = [];
    const allNewLinks: any[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      setProcessProgress(t.processingN(i + 1, selectedFiles.length));
      const result = await processSingleFile(selectedFiles[i]);
      if (result) {
        allNewPapers.push(result.paper);
        allNewNodes.push(result.node);
        allNewLinks.push(...result.links);
        // Update state incrementally so user sees progress
        setPapers(prev => [result.paper, ...prev]);
        setGraphData((prev:any) => ({
          nodes: [...prev.nodes, result.node],
          links: [...prev.links, ...result.links]
        }));
      }
    }

    alert(t.batchDone(allNewPapers.length));
    setIsUploading(false);
    setSelectedFiles([]);
    setProcessProgress("");
    setSearchQuery("");
    setIsProcessing(false);
  };

  const handleExternalSearch = async () => {
    if (!extSearchQuery.trim()) return;
    setIsSearching(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/search-papers?query=${encodeURIComponent(extSearchQuery.trim())}&limit=10`);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      setExtSearchResults(data.results || []);
    } catch (e) {
      console.error("External search failed:", e);
      setExtSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleImportExternal = async (extPaper: any) => {
    setIsImporting(true);
    try {
      // Analyze the abstract via LLM to get method/novelty/limitations/keywords
      let analysis: any = {};
      if (extPaper.abstract || extPaper.title) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/analyze-abstract`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: extPaper.title, abstract: extPaper.abstract || "" })
        });
        if (res.ok) {
          const data = await res.json();
          analysis = data.analysis || {};
        }
      }

      const newId = `ext_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
      const keywords = analysis.keywords || [];
      const newPaper = {
        id: newId,
        filename: `[External] ${extPaper.title?.slice(0,40)}`,
        title: extPaper.title || t.noTitle,
        author: extPaper.authors || t.unknownAuthor,
        year: extPaper.year || new Date().getFullYear(),
        novelty: analysis.novelty || extPaper.abstract?.slice(0, 200) || t.noNovelty,
        method: analysis.method || t.noMethod,
        limitations: analysis.limitations || t.noLimit,
        keywords,
        url: extPaper.url
      };

      // Find relations with existing papers
      let semanticLinks: any[] = [];
      const existingUserPapers = papers.filter(p => !p.id.startsWith("m"));
      if (existingUserPapers.length > 0) {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          const relRes = await fetch(`${apiUrl}/find-relations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              new_paper: { title: newPaper.title, method: newPaper.method, keywords },
              existing_papers: existingUserPapers.map(p => ({
                id: p.id, title: p.title, method: p.method, keywords: p.keywords || []
              }))
            })
          });
          if (relRes.ok) {
            const relData = await relRes.json();
            semanticLinks = (relData.relations || []).map((r: any) => ({
              source: newId, 
              target: r.target_id, 
              value: r.strength || 2, 
              label: r.label || "関連",
              relation_type: r.relation_type || "neutral",
              reason: r.reason || ""
            }));
          }
        } catch (e) { console.warn("find-relations failed:", e); }
      }

      setPapers(prev => [newPaper, ...prev]);
      setGraphData((prev: any) => ({
        nodes: [...prev.nodes, { id: newId, title: newPaper.title, filename: newPaper.filename, author: newPaper.author, group: 2 }],
        links: [...prev.links, ...semanticLinks]
      }));

      setSelectedExtPaper(null);
      alert(t.importSuccess);
    } catch (e) {
      console.error("Import failed:", e);
      alert(t.uploadFail);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#050505] text-gray-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <nav className="border-r border-white/5 bg-[#0A0A0A] flex flex-col pt-6 pb-4 px-4 shrink-0 w-64 z-10">
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Network className="w-4 h-4 text-white" />
          </div>
          <h1 className="font-semibold text-sm tracking-wide text-white">PaperTrail AI</h1>
        </div>

        <div className="flex-1 space-y-2">
          <NavItem icon={<Network />} label={t.knowledgeGraph} active={activeTab==="graph"} onClick={()=>setActiveTab("graph")} />
          <NavItem icon={<FileText />} label={t.myLibrary} active={activeTab==="library"} onClick={()=>setActiveTab("library")} />
          <NavItem icon={<LayoutGrid />} label={t.surveyMatrix} active={activeTab==="matrix"} onClick={()=>setActiveTab("matrix")} />
          <NavItem icon={<BookOpen />} label={t.externalSearch} active={activeTab==="search"} onClick={()=>setActiveTab("search")} />
        </div>

        <div className="mt-auto space-y-2">
          <button onClick={()=>setIsUploading(true)} className="w-full mt-4 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-200 rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-all group shadow-sm">
            <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            {t.uploadPdf}
          </button>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 relative flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center px-8 border-b border-white/5 backdrop-blur-md bg-[#050505]/80 z-10 gap-3">
          <div className="max-w-xl w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 shadow-inner focus-within:border-indigo-500/50 transition-colors">
            <Search className="w-4 h-4 text-gray-500" />
            <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder={t.searchPlaceholder} className="bg-transparent border-none text-sm w-full outline-none text-gray-200 placeholder-gray-600" />
            {searchQuery && <button onClick={()=>setSearchQuery('')} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>}
          </div>

          <div className="flex items-center gap-2 ml-auto shrink-0">
            {/* Language Toggle */}
            <button onClick={()=>setLang(lang==='ja'?'en':'ja')} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 border border-purple-500/30 rounded-lg hover:bg-purple-500/10 transition-colors text-purple-300">
              <Globe className="w-3.5 h-3.5" />
              {lang==='ja' ? 'English' : '日本語'}
            </button>
            {/* Mock Toggle */}
            <button onClick={()=>setShowMock(!showMock)} className="text-xs text-indigo-400 font-medium px-3 py-2 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/10 transition-colors">
              {showMock ? t.hideMock : t.showMock}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto relative">
          <AnimatePresence mode="wait">
            {activeTab === "graph" && (
              <motion.div key="graph" initial={{opacity:0,scale:.98}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.98}} transition={{duration:.2}} className="absolute inset-0 p-6 flex flex-col">
                {finalGraph.nodes.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center"><Bot className="w-8 h-8 text-indigo-400" /></div>
                    <h2 className="text-2xl font-semibold text-white">{searchQuery ? t.noMatch : t.emptyGraph}</h2>
                    <p className="text-gray-400 text-sm max-w-md">{searchQuery ? t.noMatchSub : t.emptyGraphSub}</p>
                    {!searchQuery && <button onClick={()=>setIsUploading(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 px-8 text-sm font-medium">{t.uploadPaper}</button>}
                  </div>
                ) : (
                  <div className="flex-1 w-full h-full rounded-2xl shadow-2xl relative overflow-hidden">
                    <CitationGraph data={finalGraph} language={lang} onPaperSelect={(nodeId: string) => {
                      const paper = papers.find(p => p.id === nodeId);
                      if (paper) setSelectedPaper(paper);
                    }} />
                    <div className="absolute top-6 left-6 pointer-events-none">
                      <h2 className="text-xl font-semibold text-white drop-shadow-md">{t.citationNetwork}</h2>
                      <p className="text-sm text-indigo-300 drop-shadow-md mt-1">{t.nodesAndLinks(finalGraph.nodes.length, finalGraph.links.length)}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "library" && (
              <motion.div key="library" initial={{opacity:0}} animate={{opacity:1}} className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-semibold text-white">{t.myLibrary}</h2>
                  <div className="text-sm text-indigo-400 px-3 py-1 bg-indigo-500/10 rounded-full">{t.papers(finalPapers.length)}</div>
                </div>
                {finalPapers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {finalPapers.map(paper => (
                      <div key={paper.id} onClick={()=>setSelectedPaper(paper)} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.06] hover:border-indigo-500/40 transition-all hover:-translate-y-1 cursor-pointer shadow-lg group flex flex-col">
                        <div className="flex justify-between items-start mb-3">
                          <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded uppercase shrink-0">{paper.year}</span>
                          <span className="text-xs text-gray-500 font-mono truncate ml-2">{paper.filename}</span>
                        </div>
                        <h3 className="font-medium text-gray-100 text-lg leading-tight mb-1 truncate" title={paper.title||paper.filename}>{paper.title||t.noTitle}</h3>
                        <p className="text-xs text-gray-500 mb-3 truncate">{paper.author}</p>
                        <p className="text-gray-400 text-xs line-clamp-3 leading-relaxed mb-4 h-12">{paper.novelty}</p>
                        <div className="mt-auto flex items-center gap-2 pt-4 border-t border-white/5 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors">
                          {t.viewDetails} <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 border border-dashed border-white/10 rounded-2xl flex items-center justify-center text-gray-500">{t.noResults}</div>
                )}
              </motion.div>
            )}

            {activeTab === "matrix" && (
              <motion.div key="matrix" initial={{opacity:0}} animate={{opacity:1}} className="p-8 h-full flex flex-col">
                <h2 className="text-2xl font-semibold text-white mb-2">{t.surveyMatrixTitle}</h2>
                <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-inner backdrop-blur-xl mt-4">
                  <SurveyMatrix papers={finalPapers} language={lang} />
                </div>
              </motion.div>
            )}

            {activeTab === "search" && (
              <motion.div key="search" initial={{opacity:0}} animate={{opacity:1}} className="p-8">
                <h2 className="text-2xl font-semibold text-white mb-6">{t.externalSearch}</h2>
                <div className="flex gap-3 mb-8">
                  <div className="flex-1 flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus-within:border-indigo-500/50 transition-colors">
                    <Search className="w-4 h-4 text-gray-500 shrink-0" />
                    <input type="text" value={extSearchQuery} onChange={e=>setExtSearchQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleExternalSearch()} placeholder={t.searchExtPlaceholder} className="bg-transparent border-none text-sm w-full outline-none text-gray-200 placeholder-gray-600" />
                  </div>
                  <button onClick={handleExternalSearch} disabled={isSearching||!extSearchQuery.trim()} className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2 shrink-0">
                    {isSearching ? <><Loader2 className="w-4 h-4 animate-spin" />{t.searching}</> : t.searchBtn}
                  </button>
                </div>
                {extSearchResults.length > 0 ? (
                  <div className="space-y-4">
                    {extSearchResults.map((r,i) => (
                      <div key={i} onClick={() => {
                        setSelectedExtPaper(r);
                        if (!translatedAbstracts[r.title]) {
                          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
                          fetch(`${apiUrl}/translate`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ text: r.abstract || "", title: r.title, authors: r.authors || "" })
                          }).then(res => res.json()).then(data => {
                            if (data.translatedText) {
                              setTranslatedAbstracts((prev: any) => ({ ...prev, [r.title]: data.translatedText }));
                            }
                          }).catch(e => console.warn("Translation failed", e));
                        }
                      }} className="bg-white/[0.03] border border-white/10 rounded-xl p-5 hover:bg-white/[0.06] hover:border-indigo-500/30 transition-all cursor-pointer">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-medium text-gray-100 leading-snug mb-1">{r.title}</h3>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mb-2 flex-wrap">
                              {r.year && <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded font-bold">{r.year}</span>}
                              <span className="truncate max-w-[300px]">{r.authors}</span>
                              {r.citations > 0 && <span className="text-amber-400">⭐ {r.citations} {t.citations}</span>}
                            </div>
                            {r.abstract && <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{r.abstract}</p>}
                          </div>
                          <div className="shrink-0 flex flex-col gap-2">
                            {r.url && (
                              <a href={r.url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 rounded-lg px-3 py-2 hover:bg-indigo-500/10 transition-colors">
                                <ExternalLink className="w-3.5 h-3.5" />{t.openLink}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  !isSearching && extSearchQuery && <div className="p-12 border border-dashed border-white/10 rounded-2xl flex items-center justify-center text-gray-500">{t.noSearchResults}</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* External Paper Detail + Import Modal */}
      <AnimatePresence>
        {selectedExtPaper && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4" onClick={()=>setSelectedExtPaper(null)}>
            <motion.div initial={{scale:.95,y:10}} animate={{scale:1,y:0}} exit={{scale:.95,y:10}} onClick={e=>e.stopPropagation()} className="w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl p-8 relative overflow-hidden flex flex-col max-h-[90vh]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-cyan-500" />
              <div className="flex justify-between items-start mb-6 shrink-0">
                <div className="pr-4">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    {selectedExtPaper.year && <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded uppercase">{selectedExtPaper.year}</span>}
                    <span className="text-gray-400 text-xs truncate max-w-[250px]">{selectedExtPaper.authors}</span>
                    {selectedExtPaper.citations > 0 && <span className="text-xs text-amber-400">⭐ {selectedExtPaper.citations} {t.citationCount}</span>}
                  </div>
                  <h3 className="text-2xl font-bold text-white leading-tight">{selectedExtPaper.title}</h3>
                </div>
                <button onClick={()=>setSelectedExtPaper(null)} className="text-gray-500 hover:text-white p-2"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-5 overflow-y-auto pr-2 flex-1 pb-4">
                <div className="bg-white/[0.03] rounded-xl p-5 border border-white/5 shadow-inner">
                  <h4 className="text-sm font-semibold text-cyan-400 mb-2 tracking-widest uppercase">{t.abstract}</h4>
                  <p className="text-sm text-gray-300 leading-relaxed font-light">
                    {!translatedAbstracts[selectedExtPaper.title] ? (
                      <><Loader2 className="w-3 h-3 animate-spin inline mr-2 text-cyan-500" />{t.translating}</>
                    ) : (
                      translatedAbstracts[selectedExtPaper.title]
                    )}
                  </p>
                </div>
                {selectedExtPaper.url && (
                  <div className="bg-white/[0.03] rounded-xl p-5 border border-white/5 shadow-inner">
                    <h4 className="text-sm font-semibold text-indigo-400 mb-2 tracking-widest uppercase">{t.source}</h4>
                    <a href={selectedExtPaper.url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-300 hover:text-indigo-200 underline break-all">{selectedExtPaper.url}</a>
                  </div>
                )}
              </div>
              <div className="flex justify-between mt-4 pt-4 border-t border-white/10 shrink-0">
                <button onClick={()=>setSelectedExtPaper(null)} className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors">{t.close}</button>
                {papers.some(p => p.title === selectedExtPaper.title) ? (
                  <span className="px-6 py-2.5 rounded-xl text-sm font-medium text-gray-500 bg-white/5 border border-white/10">{t.alreadyImported}</span>
                ) : (
                  <button onClick={()=>handleImportExternal(selectedExtPaper)} disabled={isImporting} className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 flex items-center gap-2">
                    {isImporting ? <><Loader2 className="w-4 h-4 animate-spin" />{t.importing}</> : <><Upload className="w-4 h-4" />{t.importToLibrary}</>}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedPaper && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4" onClick={()=>setSelectedPaper(null)}>
            <motion.div initial={{scale:.95,y:10}} animate={{scale:1,y:0}} exit={{scale:.95,y:10}} onClick={e=>e.stopPropagation()} className="w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl p-8 relative overflow-hidden flex flex-col max-h-[90vh]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
              <div className="flex justify-between items-start mb-6 shrink-0">
                <div className="pr-4">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-bold rounded uppercase">{selectedPaper.year}</span>
                    <span className="text-gray-400 text-xs truncate max-w-[200px]">{selectedPaper.author}</span>
                    <span className="text-gray-500 text-[10px] font-mono py-1 px-2 border border-white/10 rounded-md">📄 {selectedPaper.filename}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white leading-tight">{selectedPaper.title||selectedPaper.filename||t.noTitle}</h3>
                </div>
                <button onClick={()=>setSelectedPaper(null)} className="text-gray-500 hover:text-white p-2"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-5 overflow-y-auto pr-2 flex-1 pb-4">
                <div className="bg-white/[0.03] rounded-xl p-5 border border-white/5 shadow-inner">
                  <h4 className="text-sm font-semibold text-indigo-400 mb-2 tracking-widest uppercase">{t.methodology}</h4>
                  <p className="text-sm text-gray-300 leading-relaxed font-light">{selectedPaper.method}</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-5 border border-white/5 shadow-inner">
                  <h4 className="text-sm font-semibold text-purple-400 mb-2 tracking-widest uppercase">{t.keyNovelty}</h4>
                  <p className="text-sm text-gray-300 leading-relaxed font-light">{selectedPaper.novelty}</p>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-5 border border-white/5 shadow-inner">
                  <h4 className="text-sm font-semibold text-rose-400 mb-2 tracking-widest uppercase">{t.limitations}</h4>
                  <p className="text-sm text-gray-300 leading-relaxed italic font-light">{selectedPaper.limitations}</p>
                </div>
              </div>
              <div className="flex justify-end mt-4 pt-4 border-t border-white/10 shrink-0">
                <button onClick={()=>setSelectedPaper(null)} className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors">{t.close}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal (Multi-file) */}
      <AnimatePresence>
        {isUploading && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
            <motion.div initial={{scale:.95}} animate={{scale:1}} exit={{scale:.95}} className="w-[550px] bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
              <h3 className="text-xl font-semibold text-white mb-4">{t.uploadResource}</h3>
              <input type="file" accept="application/pdf" multiple className="hidden" ref={fileInputRef} onChange={e=>{
                if(e.target.files && e.target.files.length>0) setSelectedFiles(Array.from(e.target.files));
              }} />
              <div onClick={()=>fileInputRef.current?.click()} className={`border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-10 px-6 cursor-pointer group ${selectedFiles.length>0?'border-indigo-500 bg-indigo-500/10':'border-white/10 hover:border-indigo-500/50'}`}>
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4"><FileText className={`w-6 h-6 ${selectedFiles.length>0?'text-indigo-400':'text-gray-400'}`} /></div>
                <p className="text-sm text-indigo-300 font-medium">{selectedFiles.length>0 ? t.filesSelected(selectedFiles.length) : t.clickToBrowse}</p>
              </div>
              {selectedFiles.length > 0 && (
                <div className="mt-3 max-h-32 overflow-y-auto space-y-1 pr-1">
                  {selectedFiles.map((f,i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-400 bg-white/[0.03] rounded-lg px-3 py-1.5">
                      <FileText className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span className="truncate">{f.name}</span>
                      <span className="text-gray-600 ml-auto shrink-0">{(f.size/1024).toFixed(0)} KB</span>
                    </div>
                  ))}
                </div>
              )}
              {isProcessing && processProgress && (
                <div className="mt-4 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span className="text-sm text-indigo-300">{processProgress}</span>
                </div>
              )}
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={()=>{setIsUploading(false);setSelectedFiles([]);}} disabled={isProcessing} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50">{t.cancel}</button>
                <button onClick={handleUpload} disabled={selectedFiles.length===0||isProcessing} className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 w-40">
                  {isProcessing ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" />{t.processing}</> : t.processDoc}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${active?'bg-indigo-500/10 text-indigo-300 border border-indigo-500/10':'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'}`}>
      <div className={`w-5 h-5 ${active?'text-indigo-400':'text-gray-500'}`}>{icon}</div>
      {label}
    </button>
  );
}
