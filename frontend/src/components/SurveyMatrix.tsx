import React from 'react';

export default function SurveyMatrix({ papers, language="ja" }: { papers: any[], language?: "ja"|"en" }) {
  if (!papers || papers.length === 0) return null;

  return (
    <div className="w-full relative overflow-x-auto custom-scrollbar flex-1 pb-4">
      <table className="w-full text-left text-sm text-gray-300 min-w-[800px]">
        <thead className="text-xs uppercase bg-black/40 text-gray-400 sticky top-0 backdrop-blur-md z-10 border-b border-white/10 shadow-sm">
          <tr>
            <th className="py-4 px-5 font-semibold whitespace-nowrap text-indigo-300">
              {language === 'ja' ? 'ファイルと題名 (File & Title)' : 'File & Title'}
            </th>
            <th className="py-4 px-5 font-semibold whitespace-nowrap text-indigo-300">
              {language === 'ja' ? '年 / 著者 (Year & Author)' : 'Year & Author'}
            </th>
            <th className="py-4 px-5 font-semibold text-purple-300">
              {language === 'ja' ? '主要な新規性 (Key Novelty)' : 'Key Novelty'}
            </th>
            <th className="py-4 px-5 font-semibold text-rose-300">
              {language === 'ja' ? '手法と背景 (Methodology)' : 'Methodology'}
            </th>
            <th className="py-4 px-5 font-semibold text-amber-300">
              {language === 'ja' ? '研究の限界点 (Limitations)' : 'Limitations'}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {papers.map((paper, idx) => (
            <tr key={paper.id} className="hover:bg-white/[0.04] transition-colors group">
              <td className="py-5 px-5 align-top min-w-[200px]">
                <div className="font-semibold text-gray-100 line-clamp-2 leading-snug group-hover:text-indigo-200 transition-colors">{paper.title || '-'}</div>
                <div className="text-[10px] text-gray-500 font-mono mt-2 flex items-center gap-1 opacity-70">📄 {paper.filename || 'No File'}</div>
              </td>
              <td className="py-5 px-5 align-top whitespace-nowrap">
                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 mb-1">{paper.year}</div>
                <div className="text-xs text-gray-400 max-w-[120px] truncate" title={paper.author || ''}>{paper.author || (language === 'ja' ? '不明な著者' : 'Unknown Author')}</div>
              </td>
              <td className="py-5 px-5 align-top text-gray-300 min-w-[250px] leading-relaxed font-light">
                {paper.novelty}
              </td>
              <td className="py-5 px-5 align-top text-gray-300 min-w-[250px] leading-relaxed font-light">
                {paper.method}
              </td>
              <td className="py-5 px-5 align-top text-gray-400 min-w-[200px] leading-relaxed italic text-sm font-light">
                {paper.limitations}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
