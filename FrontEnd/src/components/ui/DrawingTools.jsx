import React, { useState } from 'react';

const TOOL_TYPES = {
  SELECT: 'select',
  DELETE_VERTEX: 'delete_vertex',
  ADD_VERTEX: 'add_vertex',
  DRAW_LINE: 'draw_line',
  DRAW_POLYGON: 'draw_polygon',
  CONNECT_POINTS: 'connect_points',
  MANUAL_SUBLOT: 'manual_sublot',
  PAN: 'pan'
};

function DrawingTools({ 
  activeTool, 
  onToolChange, 
  onDeleteSelectedVertices,
  vectorCount,
  className = '' 
}) {
  const [showTooltip, setShowTooltip] = useState(null);

  const tools = [
    {
      id: TOOL_TYPES.SELECT,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      ),
      title: 'Seleccionar',
      description: 'Seleccionar y mover vértices',
      shortcut: 'S'
    },
    {
      id: TOOL_TYPES.DELETE_VERTEX,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      title: 'Eliminar Vértice',
      description: 'Eliminar puntos de vectores',
      shortcut: 'D',
      disabled: vectorCount === 0
    },
    {
      id: TOOL_TYPES.ADD_VERTEX,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      title: 'Agregar Vértice',
      description: 'Agregar puntos en líneas existentes',
      shortcut: 'A',
      disabled: vectorCount === 0
    },
    {
      id: TOOL_TYPES.DRAW_LINE,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      title: 'Línea Recta',
      description: 'Dibujar líneas rectas',
      shortcut: 'L'
    },
    {
      id: TOOL_TYPES.CONNECT_POINTS,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      ),
      title: 'Conectar Puntos',
      description: 'Conectar dos puntos seleccionados',
      shortcut: 'C'
    },
    {
      id: TOOL_TYPES.MANUAL_SUBLOT,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.3"/>
        </svg>
      ),
      title: 'Crear Sublote',
      description: 'Seleccionar vértices para crear sublote manualmente',
      shortcut: 'M'
    },
    {
      id: TOOL_TYPES.PAN,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
      ),
      title: 'Navegar',
      description: 'Mover y hacer zoom en el plano',
      shortcut: 'Space'
    }
  ];

  const handleToolClick = (toolId) => {
    onToolChange(toolId);
  };

  return (
    <div className={`bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-200 ${className}`}>
      {/* Título */}
      <div className="mb-3 pb-2 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">Herramientas</h3>
        <p className="text-xs text-gray-600">Herramientas de edición vectorial</p>
      </div>

      {/* Herramientas */}
      <div className="grid grid-cols-2 gap-2">
        {tools.map((tool) => {
          const isActive = activeTool === tool.id;
          const isDisabled = tool.disabled;
          
          return (
            <div key={tool.id} className="relative">
              <button
                onClick={() => !isDisabled && handleToolClick(tool.id)}
                onMouseEnter={() => setShowTooltip(tool.id)}
                onMouseLeave={() => setShowTooltip(null)}
                disabled={isDisabled}
                className={`
                  w-full p-2 rounded-lg border transition-all duration-200 flex flex-col items-center space-y-1
                  ${isActive 
                    ? 'bg-blue-100 border-blue-300 text-blue-700 shadow-sm' 
                    : isDisabled 
                      ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                  }
                `}
              >
                {tool.icon}
                <span className="text-xs font-medium leading-tight text-center">
                  {tool.title}
                </span>
                <kbd className="text-xs px-1 py-0.5 bg-gray-100 rounded text-gray-500">
                  {tool.shortcut}
                </kbd>
              </button>

              {/* Tooltip */}
              {showTooltip === tool.id && !isDisabled && (
                <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap">
                  <div className="font-medium">{tool.title}</div>
                  <div className="text-gray-300">{tool.description}</div>
                  <div className="text-gray-400">Tecla: {tool.shortcut}</div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Acciones adicionales */}
      <div className="mt-3 pt-2 border-t border-gray-200">
        <button
          onClick={onDeleteSelectedVertices}
          disabled={!vectorCount}
          className="w-full text-xs py-2 px-3 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Eliminar Vértices Seleccionados
        </button>
      </div>

      {/* Info */}
      <div className="mt-3 pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Vectores totales:</span>
            <span className="font-medium">{vectorCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Herramienta activa:</span>
            <span className="font-medium capitalize">
              {tools.find(t => t.id === activeTool)?.title || 'Ninguna'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Exportar tipos de herramientas para uso en otros componentes
export { TOOL_TYPES };
export default DrawingTools;
