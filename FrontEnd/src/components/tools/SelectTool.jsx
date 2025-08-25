import React from 'react';
import { MousePointer2 } from 'lucide-react';

const SelectTool = ({ 
  isActive, 
  onActivate,
  selectedVertices = [],
  onDeleteSelected,
  disabled = false 
}) => {
  return (
    <div className="space-y-2">
      <button
        onClick={onActivate}
        disabled={disabled}
        className={`
          w-full p-3 rounded-lg border transition-all duration-200 flex items-center space-x-3
          ${isActive 
            ? 'bg-blue-100 border-blue-300 text-blue-700 shadow-sm' 
            : disabled 
              ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
          }
        `}
      >
        <MousePointer2 className="w-5 h-5" />
        <div className="text-left">
          <div className="font-medium">Seleccionar</div>
          <div className="text-xs text-gray-500">Mover vértices (S)</div>
        </div>
      </button>

      {isActive && selectedVertices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">
              {selectedVertices.length} vértice{selectedVertices.length !== 1 ? 's' : ''} seleccionado{selectedVertices.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onDeleteSelected}
              className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
            >
              Eliminar
            </button>
            <button
              onClick={() => {/* TODO: Implement duplicate */}}
              className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
            >
              Duplicar
            </button>
          </div>
        </div>
      )}

      {isActive && (
        <div className="text-xs text-gray-600 space-y-1">
          <div>• Clic en vértice para seleccionar</div>
          <div>• Arrastrar para mover</div>
          <div>• Acercar a otro vértice para fusionar</div>
          <div>• Radio de detección: 15px</div>
        </div>
      )}
    </div>
  );
};

export default SelectTool;
