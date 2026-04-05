"use client";

import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Maximize2, Minimize2, Settings2 } from 'lucide-react';

// Dynamically import both 2D and 3D graphs to avoid SSR 'window is not defined'
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

interface Props {
  data: { nodes: any[]; links: any[] };
  language?: "ja" | "en";
  onPaperSelect?: (nodeId: string) => void;
}

export default function CitationGraph({ data, language = "ja", onPaperSelect }: Props) {
  const [is3D, setIs3D] = useState(false);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);

  // Resize observer
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDims({ w: containerRef.current.clientWidth, h: containerRef.current.clientHeight });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Deep-clone + compute node sizes based on total link strength (degree centrality).
  // react-force-graph MUTATES the data objects internally (adds x, y, vx, vy, and replaces
  // link source/target strings with object references). Deep-cloning isolates the simulation.
  const processedData = useMemo(() => {
    const degreeMap: Record<string, number> = {};
    data.links.forEach((l: any) => {
      const src = typeof l.source === 'object' ? l.source.id : l.source;
      const tgt = typeof l.target === 'object' ? l.target.id : l.target;
      const v = l.value || 1;
      degreeMap[src] = (degreeMap[src] || 0) + v;
      degreeMap[tgt] = (degreeMap[tgt] || 0) + v;
    });
    const maxDeg = Math.max(1, ...Object.values(degreeMap));
    const nodes = data.nodes.map((n: any) => ({
      id: n.id, title: n.title, filename: n.filename, author: n.author, group: n.group,
      val: 2 + ((degreeMap[n.id] || 0) / maxDeg) * 12
    }));
    const links = data.links.map((l: any) => ({
      source: typeof l.source === 'object' ? l.source.id : l.source,
      target: typeof l.target === 'object' ? l.target.id : l.target,
      value: l.value, label: l.label
    }));
    return { nodes, links };
  }, [data]);

  // Apply D3 forces AFTER graph mounts / data changes (2D only)
  useEffect(() => {
    if (is3D) return;
    const t = setTimeout(() => {
      const fg = fgRef.current;
      if (!fg) return;
      try {
        // Charge: moderate repulsion
        const charge = fg.d3Force('charge');
        if (charge && typeof charge.strength === 'function') charge.strength(-200);

        // Link distance: strong links = close, weak = far
        const link = fg.d3Force('link');
        if (link && typeof link.distance === 'function') {
          link.distance((l: any) => {
            const v = l.value || 1;
            return 350 - v * 60; // v=5 → 50px, v=1 → 290px
          });
        }

        // Center gravity
        const center = fg.d3Force('center');
        if (center && typeof center.strength === 'function') center.strength(0.05);

        fg.d3ReheatSimulation();
      } catch (e) {
        console.warn('d3Force config skipped:', e);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [processedData, is3D]);

  const onNodeClick = useCallback((node: any) => {
    // Zoom to node
    const fg = fgRef.current;
    if (fg) {
      if (!is3D) {
        fg.centerAt?.(node.x, node.y, 1000);
        fg.zoom?.(4, 2000);
      } else {
        fg.cameraPosition?.({ x: node.x, y: node.y, z: (node.z || 0) + 200 }, node, 1000);
      }
    }
    // Open detail modal via parent callback
    if (onPaperSelect && node.id) {
      onPaperSelect(node.id);
    }
  }, [is3D, onPaperSelect]);

  const nodeTooltip = (n: any) => `
    <div style="background:rgba(10,10,15,.95);padding:10px 14px;border:1px solid rgba(255,255,255,.12);border-radius:8px;font-family:sans-serif;box-shadow:0 8px 20px rgba(0,0,0,.5);max-width:260px">
      <div style="color:#fff;font-size:13px;font-weight:600;white-space:pre-wrap;margin-bottom:4px">${n.title || (language === 'ja' ? 'タイトルなし' : 'No Title')}</div>
      ${n.filename ? `<div style="color:#818cf8;font-size:10px;font-family:monospace">📄 ${n.filename}</div>` : ''}
      ${n.author ? `<div style="color:#aaa;font-size:10px;margin-top:2px">✍ ${n.author}</div>` : ''}
    </div>`;

  const linkTooltip = (l: any) => {
    if (!l.label) return '';
    let color = '#a5b4fc'; // neutral
    if (l.relation_type === 'similarity' || l.relation_type === 'extension') color = '#34d399'; // green
    if (l.relation_type === 'difference' || l.relation_type === 'baseline') color = '#fbbf24'; // amber/orange

    return `
    <div style="background:rgba(20,20,25,.95);padding:10px 14px;border:1px solid ${color}40;border-radius:8px;font-family:sans-serif;box-shadow:0 8px 20px rgba(0,0,0,.5);max-width:280px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};box-shadow:0 0 8px ${color}"></span>
        <span style="color:#e5e7eb;font-size:12px;font-weight:700">${l.label}</span>
      </div>
      ${l.reason ? `<p style="margin:4px 0 0;color:#9ca3af;font-size:11px;line-height:1.4">${l.reason}</p>` : ''}
      <div style="margin-top:6px;color:#6b7280;font-size:10px;font-family:monospace">${language === 'ja' ? '強度' : 'str'}: ${Math.round(l.value)}</div>
    </div>`;
  };

  const getLinkColor = (l: any) => {
    if (l.relation_type === 'similarity') return "rgba(52,211,153,0.5)"; // emerald
    if (l.relation_type === 'extension') return "rgba(45,212,191,0.5)";  // teal
    if (l.relation_type === 'difference' || l.relation_type === 'baseline') return "rgba(251,146,60,0.5)"; // orange
    return "rgba(165,180,252,0.4)"; // indigo neutral
  };

  const sharedProps = {
    ref: fgRef,
    width: dims.w,
    height: dims.h,
    graphData: processedData,
    nodeLabel: nodeTooltip,
    linkLabel: linkTooltip,
    nodeColor: (n: any) => n.group === 1 ? '#818cf8' : '#e879f9',
    nodeRelSize: 4,
    linkColor: getLinkColor,
    linkWidth: (l: any) => Math.max(1.5, (l.value || 1) * 0.7),
    onNodeClick,
    backgroundColor: "#030303",
    linkDirectionalParticles: (l: any) => (l.relation_type === 'difference' || l.relation_type === 'baseline') ? 1 : Math.min(3, Math.ceil(l.value/2)),
    linkDirectionalParticleWidth: (l: any) => (l.relation_type === 'difference' || l.relation_type === 'baseline') ? 3 : 2,
    linkDirectionalParticleColor: (l: any) => {
      if (l.relation_type === 'similarity') return "#10b981";
      if (l.relation_type === 'extension') return "#0ea5e9";
      if (l.relation_type === 'difference' || l.relation_type === 'baseline') return "#f97316";
      return "#818cf8";
    },
    linkDirectionalParticleSpeed: 0.004,
  };

  return (
    <div className="relative w-full h-full bg-[#030303] overflow-hidden" ref={containerRef}>
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button onClick={() => setIs3D(!is3D)} title={is3D ? '2D' : '3D'}
          className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white p-2.5 rounded-xl transition-all shadow-lg">
          {is3D ? <Minimize2 className="w-5 h-5 text-indigo-400" /> : <Maximize2 className="w-5 h-5 text-indigo-400" />}
        </button>
        <button onClick={() => fgRef.current?.zoomToFit?.(1000)} title="Fit"
          className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white p-2.5 rounded-xl transition-all shadow-lg">
          <Settings2 className="w-5 h-5 text-gray-300" />
        </button>
      </div>

      <div className="cursor-grab active:cursor-grabbing w-full h-full">
        {is3D ? (
          <ForceGraph3D {...sharedProps} />
        ) : (
          <ForceGraph2D {...sharedProps} onNodeDragEnd={(node: any) => { node.fx = node.x; node.fy = node.y; }} />
        )}
      </div>
    </div>
  );
}
