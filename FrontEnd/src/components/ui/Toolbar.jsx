import React, { useState } from 'react';
import { Settings, Eye, Save, Minimize2, Maximize2 } from 'lucide-react';
import SelectTool from '../tools/SelectTool';
import LineDrawTool from '../tools/LineDrawTool';
import VertexEditor from '../tools/VertexEditor';
import PolygonTool from '../tools/PolygonTool';
import ColorPicker from './ColorPicker';

const TOOL_TYPES = {
  SELECT: 'select',
  DELETE_VERTEX: 'delete_vertex',
  ADD_VERTEX: 'add_vertex',
  DRAW_LINE: 'draw_line',
  CONNECT_POINTS: 'connect_points',
  PAN: 'pan'
};

const Toolbar = ({
  // Herramientas activas
  activeTool,
  onToolChange,
  
  // Estado de vectores
  editableVectors = { bordes_externos: [], sublotes: [] },
  
  // Estado de dibujo
  isDrawing = false,
  drawingPathLength = 0,
  
  // Selección de vértices
  selectedVertices = [],
  onDeleteSelectedVertices,
  
  // Detección de polígonos
  onDetectSubplots,
  onClearSubplots,
  detectedSubplots = [],
  isDetecting = false,
  
  // Colores
  selectedColor = '#3B82F6',
  onColorChange,
  usedColors = [],
  
  // Acciones principales
  onPreview,
  onSave,
  
  // Configuración
  className = ''
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const vectorCount = editableVectors.bordes_externos.length + editableVectors.sublotes.length;
  const borderVectorCount = editableVectors.bordes_externos.length;

  const handleToolActivation = (toolType) => {
    onToolChange(toolType);
  };

  const handleRandomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 60 + Math.floor(Math.random() * 40);
    const lightness = 45 + Math.floor(Math.random() * 20);
    onColorChange(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  };

  const handleResetColors = () => {
    onColorChange('#3B82F6');
    // TODO: Reset all sublot colors
  };

  if (isMinimized) {
    return (
      <div className={`bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Herramientas</h3>
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title="Expandir herramientas"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {vectorCount} vectores • {detectedSubplots.length} sublotes
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Panel de Herramientas</h3>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              title="Configuración"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
              title="Minimizar herramientas"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-600 mt-1">
          Herramientas profesionales de edición vectorial
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* Herramienta de Selección */}
        <SelectTool
          isActive={activeTool === TOOL_TYPES.SELECT}
          onActivate={() => handleToolActivation(TOOL_TYPES.SELECT)}
          selectedVertices={selectedVertices}
          onDeleteSelected={onDeleteSelectedVertices}
          disabled={vectorCount === 0}
        />

        {/* Herramienta de Dibujo */}
        <LineDrawTool
          isActive={activeTool === TOOL_TYPES.DRAW_LINE}
          onActivate={() => handleToolActivation(TOOL_TYPES.DRAW_LINE)}
          isDrawing={isDrawing}
          currentPathLength={drawingPathLength}
          onFinishDrawing={() => {/* Manejado por el componente padre */}}
          onCancelDrawing={() => {/* Manejado por el componente padre */}}
        />

        {/* Editor de Vértices */}
        <VertexEditor
          addVertexActive={activeTool === TOOL_TYPES.ADD_VERTEX}
          deleteVertexActive={activeTool === TOOL_TYPES.DELETE_VERTEX}
          onActivateAddVertex={() => handleToolActivation(TOOL_TYPES.ADD_VERTEX)}
          onActivateDeleteVertex={() => handleToolActivation(TOOL_TYPES.DELETE_VERTEX)}
          vectorCount={vectorCount}
          disabled={vectorCount === 0}
        />

        {/* Detección de Polígonos */}
        <PolygonTool
          detectedSubplots={detectedSubplots}
          onDetectSubplots={onDetectSubplots}
          onClearSubplots={onClearSubplots}
          isDetecting={isDetecting}
          borderVectorCount={borderVectorCount}
          disabled={borderVectorCount === 0}
        />

        {/* Selector de Colores */}
        <ColorPicker
          selectedColor={selectedColor}
          onColorChange={onColorChange}
          onRandomColor={handleRandomColor}
          onResetColors={handleResetColors}
          usedColors={usedColors}
        />

        {/* Configuración avanzada */}
        {showSettings && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="text-sm font-medium text-gray-700 mb-3">Configuración</div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  Radio de Snap (píxeles)
                </label>
                <input
                  type="range"
                  min="5"
                  max="25"
                  defaultValue="15"
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  onChange={(e) => {
                    // TODO: Implement snap radius change
                    console.log('Snap radius:', e.target.value);
                  }}
                />
              </div>
              
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  Área mínima sublotes (px²)
                </label>
                <input
                  type="number"
                  min="100"
                  max="10000"
                  defaultValue="1000"
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  onChange={(e) => {
                    // TODO: Implement min area change
                    console.log('Min area:', e.target.value);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Acciones principales */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onPreview}
              disabled={vectorCount === 0}
              className="flex items-center justify-center space-x-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>
            
            <button
              onClick={onSave}
              disabled={vectorCount === 0}
              className="flex items-center justify-center space-x-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              <Save className="w-4 h-4" />
              <span>Guardar</span>
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="border-t border-gray-200 pt-3">
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Bordes externos:</span>
              <span className="font-medium">{borderVectorCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Sublotes detectados:</span>
              <span className="font-medium">{detectedSubplots.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Vértices seleccionados:</span>
              <span className="font-medium">{selectedVertices.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Herramienta activa:</span>
              <span className="font-medium capitalize">
                {activeTool?.replace('_', ' ') || 'Ninguna'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { TOOL_TYPES };
export default Toolbar;
