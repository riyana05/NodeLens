import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';

cytoscape.use(coseBilkent);

// Community palette — lavender/blush tones
const COMM_COLORS = [
  '#e878ad', '#a67ff7', '#c9aee0', '#f2a8cc',
  '#8b52ef', '#d94f8e', '#ddd0ff', '#f8d0e3',
];

export default function GraphCanvas({
  elements = [],
  showBackboneOnly = false,
  highlightPath    = [],
  style            = {},
}) {
  const containerRef = useRef(null);
  const cyRef        = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const pathSet = new Set(highlightPath);

    const filteredElements = showBackboneOnly
      ? elements.filter(el =>
          el.data.source == null ||    // keep nodes
          el.data.isBackbone            // keep backbone edges
        )
      : elements;

    const cy = cytoscape({
      container: containerRef.current,
      elements:  filteredElements,
      style: [
        {
          selector: 'node',
          style: {
            'width':              'mapData(pageRank, 0, 0.5, 24, 60)',
            'height':             'mapData(pageRank, 0, 0.5, 24, 60)',
            'background-color':   (el) => COMM_COLORS[el.data('community') % COMM_COLORS.length],
            'border-width':       (el) => pathSet.has(el.id()) ? 3 : 1,
            'border-color':       (el) => pathSet.has(el.id()) ? '#e878ad' : 'rgba(200,160,200,0.4)',
            'label':              'data(label)',
            'font-size':          10,
            'font-family':        'DM Sans, sans-serif',
            'color':              '#2d1b35',
            'text-valign':        'bottom',
            'text-margin-y':      4,
            'text-background-color': 'rgba(253,244,247,0.85)',
            'text-background-padding': '2px',
            'text-background-opacity': 0.9,
            'text-background-shape': 'roundrectangle',
            'box-shadow':         '0 4px 12px rgba(168,100,180,0.2)',
          },
        },
        {
          selector: 'node[?isOnPath]',
          style: {
            'background-color': '#e878ad',
            'border-width': 3,
            'border-color': '#a67ff7',
            'box-shadow': '0 0 16px rgba(232,120,173,0.6)',
          },
        },
        {
          selector: 'edge',
          style: {
            'width':           'mapData(weight, 0, 1, 1, 4)',
            'line-color':      (el) =>
              el.data('isOnPath')   ? '#e878ad' :
              el.data('isBackbone') ? '#a67ff7' :
              'rgba(200,160,210,0.35)',
            'opacity':         (el) => el.data('isBackbone') ? 1 : 0.6,
            'curve-style':     'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': (el) => el.data('isOnPath') ? '#e878ad' : 'rgba(200,160,210,0.4)',
            'arrow-scale': 0.8,
          },
        },
        {
          selector: 'edge[?isOnPath]',
          style: {
            'line-color':  '#e878ad',
            'width': 3,
            'opacity': 1,
          },
        },
      ],
      layout: {
        name:            'cose-bilkent',
        animate:         true,
        animationDuration: 800,
        nodeRepulsion:   6000,
        idealEdgeLength: 100,
        edgeElasticity:  0.45,
        nestingFactor:   0.1,
        gravity:         0.25,
        numIter:         2500,
        tile:            true,
      },
    });

    cyRef.current = cy;

    return () => { cy.destroy(); cyRef.current = null; };
  }, [elements, showBackboneOnly, highlightPath]);

  return (
    <div style={{
      width: '100%', height: '480px',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      background: 'linear-gradient(145deg, rgba(253,244,247,0.95), rgba(237,229,255,0.85))',
      border: '1px solid var(--border-soft)',
      boxShadow: 'var(--shadow-md)',
      ...style,
    }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
