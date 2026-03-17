import { useState, useCallback, useRef } from 'react';
import type {
  LayoutConfig,
  ComponentConfig,
  ComponentType,
} from '@/services/label.service';

export interface EditorState {
  name: string;
  layout: LayoutConfig;
  components: ComponentConfig[];
}

const MAX_HISTORY = 50;

const DEFAULT_LAYOUT: LayoutConfig = {
  width: 100,
  height: 50,
  unit: 'mm',
  dpi: 300,
  orientation: 'landscape',
  margins: { top: 2, right: 2, bottom: 2, left: 2 },
};

function defaultPropertiesForType(type: ComponentType): Record<string, unknown> {
  switch (type) {
    case 'text':
      return { text: 'Ornek Metin', fontFamily: 'Arial', fontSize: 12, fontWeight: 'normal', color: '#000000', align: 'left' };
    case 'barcode':
      return { data: '123456789', symbology: 'code128', showText: true, barColor: '#000000' };
    case 'qrcode':
      return { data: 'https://example.com', errorCorrectionLevel: 'M', color: '#000000' };
    case 'shape':
      return { shape: 'rect', fill: '#3b82f6', stroke: '#1e40af', strokeWidth: 1, cornerRadius: 0 };
    case 'image':
      return { src: '', objectFit: 'contain' };
    default:
      return {};
  }
}

function defaultSizeForType(type: ComponentType): { width: number; height: number } {
  switch (type) {
    case 'text':
      return { width: 30, height: 8 };
    case 'barcode':
      return { width: 40, height: 15 };
    case 'qrcode':
      return { width: 20, height: 20 };
    case 'shape':
      return { width: 20, height: 15 };
    case 'image':
      return { width: 25, height: 20 };
    default:
      return { width: 20, height: 15 };
  }
}

export function useEditorState() {
  const [state, setState] = useState<EditorState>({
    name: '',
    layout: { ...DEFAULT_LAYOUT },
    components: [],
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  // History for undo/redo
  const historyRef = useRef<EditorState[]>([]);
  const historyIndexRef = useRef(-1);

  const pushHistory = useCallback((newState: EditorState) => {
    const idx = historyIndexRef.current;
    // Trim any future states
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push(JSON.parse(JSON.stringify(newState)));
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current = historyRef.current.length - 1;
    }
  }, []);

  const updateState = useCallback(
    (updater: (prev: EditorState) => EditorState) => {
      setState((prev) => {
        const next = updater(prev);
        pushHistory(next);
        setIsDirty(true);
        return next;
      });
    },
    [pushHistory]
  );

  const initState = useCallback((s: EditorState) => {
    setState(s);
    historyRef.current = [JSON.parse(JSON.stringify(s))];
    historyIndexRef.current = 0;
    setIsDirty(false);
  }, []);

  const setName = useCallback(
    (name: string) => updateState((s) => ({ ...s, name })),
    [updateState]
  );

  const setLayout = useCallback(
    (layout: LayoutConfig) => updateState((s) => ({ ...s, layout })),
    [updateState]
  );

  const addComponent = useCallback(
    (type: ComponentType, x = 10, y = 10) => {
      const size = defaultSizeForType(type);
      const comp: ComponentConfig = {
        id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        x,
        y,
        ...size,
        rotation: 0,
        zIndex: state.components.length,
        properties: defaultPropertiesForType(type),
      };
      updateState((s) => ({ ...s, components: [...s.components, comp] }));
      setSelectedId(comp.id);
      return comp.id;
    },
    [state.components.length, updateState]
  );

  const updateComponent = useCallback(
    (id: string, changes: Partial<ComponentConfig>) => {
      updateState((s) => ({
        ...s,
        components: s.components.map((c) =>
          c.id === id ? { ...c, ...changes } : c
        ),
      }));
    },
    [updateState]
  );

  const updateComponentProperties = useCallback(
    (id: string, propChanges: Record<string, unknown>) => {
      updateState((s) => ({
        ...s,
        components: s.components.map((c) =>
          c.id === id
            ? { ...c, properties: { ...c.properties, ...propChanges } }
            : c
        ),
      }));
    },
    [updateState]
  );

  const removeComponent = useCallback(
    (id: string) => {
      updateState((s) => ({
        ...s,
        components: s.components.filter((c) => c.id !== id),
      }));
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId, updateState]
  );

  const duplicateComponent = useCallback(
    (id: string) => {
      const comp = state.components.find((c) => c.id === id);
      if (!comp) return;
      const dup: ComponentConfig = {
        ...JSON.parse(JSON.stringify(comp)),
        id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        x: comp.x + 5,
        y: comp.y + 5,
        zIndex: state.components.length,
      };
      updateState((s) => ({ ...s, components: [...s.components, dup] }));
      setSelectedId(dup.id);
    },
    [state.components, updateState]
  );

  const undo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx > 0) {
      historyIndexRef.current = idx - 1;
      const prev = JSON.parse(JSON.stringify(historyRef.current[idx - 1]));
      setState(prev);
      setIsDirty(true);
    }
  }, []);

  const redo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx < historyRef.current.length - 1) {
      historyIndexRef.current = idx + 1;
      const next = JSON.parse(JSON.stringify(historyRef.current[idx + 1]));
      setState(next);
      setIsDirty(true);
    }
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const selectedComponent = state.components.find((c) => c.id === selectedId) || null;

  return {
    state,
    selectedId,
    selectedComponent,
    zoom,
    showGrid,
    isDirty,
    canUndo,
    canRedo,

    setSelectedId,
    setZoom,
    setShowGrid,
    setIsDirty,
    initState,
    setName,
    setLayout,
    addComponent,
    updateComponent,
    updateComponentProperties,
    removeComponent,
    duplicateComponent,
    undo,
    redo,
  };
}

export type EditorActions = ReturnType<typeof useEditorState>;
