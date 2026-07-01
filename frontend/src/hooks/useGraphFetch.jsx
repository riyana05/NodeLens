import { useState, useCallback } from 'react';
import api from '../api/axios';

const useGraphFetch = (endpoint) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(endpoint, { params });
      setData(res.data);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  return { data, loading, error, fetch };
};

/**
 * Build a mongoId → displayName lookup map from a nodes array.
 * The backend sends nodes as [{ id: mongoId, label: username }, ...]
 * Fall back to a shortened ID only if label is genuinely missing.
 */
export const buildNameMap = (nodes = []) => {
  const map = {};
  nodes.forEach(n => {
    map[n.id] = n.label && n.label.trim() !== '' ? n.label : n.id.slice(-6);
  });
  return map;
};

/**
 * Resolve a mongoId to a display name using the nameMap.
 * If not in map, returns the last 6 chars of the id as fallback.
 */
export const resolveName = (id, nameMap = {}) =>
  nameMap[id] || (id ? id.slice(-6) : '?');

/**
 * Convert backend node/edge arrays to Cytoscape elements.
 * Now uses the label field from each node directly — no ID slicing.
 */
export const toCytoscapeElements = (nodes = [], edges = [], options = {}) => {
  const {
    pageRankScores  = {},
    communityColors = {},
    highlightPath   = [],
    backboneEdges   = new Set(),
  } = options;

  const elements = [];

  nodes.forEach(n => {
    // Use the username label directly — never fall back to raw mongoId
    const displayName = (n.label && n.label.trim() !== '') ? n.label : n.id.slice(-4);
    elements.push({
      data: {
        id:        n.id,
        label:     displayName,
        pageRank:  pageRankScores[n.id]  ?? 0.1,
        community: communityColors[n.id] ?? 0,
        isOnPath:  highlightPath.includes(n.id),
      }
    });
  });

  edges.forEach((e, i) => {
    const edgeKey = `${e.src}->${e.dst}`;
    elements.push({
      data: {
        id:         `e${i}`,
        source:     e.src,
        target:     e.dst,
        weight:     e.weight,
        isBackbone: backboneEdges.has(edgeKey),
        isOnPath:   false,
      }
    });
  });

  return elements;
};

export default useGraphFetch;
