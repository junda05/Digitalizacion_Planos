import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const VertexEditor = ({ 
  addVertexActive,
  deleteVertexActive,
  onActivateAddVertex,
  onActivateDeleteVertex,
  vectorCount = 0,
  disabled = false 
}) => {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700 mb-2">Editor de Vértices</div>
      
      <div className="grid grid-cols-2 gap-2">
        {/* Add Vertex Tool */}
        <button
          onClick={onActivateAddVertex}
          disabled={disabled || vectorCount === 0}
          className={`
            p-2 rounded-lg border transition-all duration-200 flex flex-col items-center space-y-1
            ${addVertexActive 
              ? 'bg-green-100 border-green-300 text-green-700 shadow-sm' 
              : disabled || vectorCount === 0
                ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
            }
          `}
        >
          <Plus className="w-4 h-4" />
          <span className="text-xs font-medium">Agregar</span>
          <kbd className="text-xs px-1 py-0.5 bg-gray-100 rounded text-gray-500">A</kbd>
        </button>

        {/* Delete Vertex Tool */}
        <button
          onClick={onActivateDeleteVertex}
          disabled={disabled || vectorCount === 0}
          className={`
            p-2 rounded-lg border transition-all duration-200 flex flex-col items-center space-y-1
            ${deleteVertexActive 
              ? 'bg-red-100 border-red-300 text-red-700 shadow-sm' 
              : disabled || vectorCount === 0
                ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
            }
          `}
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-xs font-medium">Eliminar</span>
          <kbd className="text-xs px-1 py-0.5 bg-gray-100 rounded text-gray-500">D</kbd>
        </button>
      </div>

      {(addVertexActive || deleteVertexActive) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          {addVertexActive && (
            <div className="text-xs text-gray-600 space-y-1">
              <div className="font-medium text-green-700">Modo: Agregar Vértice</div>
              <div>• Clic en línea existente</div>
              <div>• Se añade punto en posición exacta</div>
              <div>• Detección automática de bordes</div>
            </div>
          )}
          
          {deleteVertexActive && (
            <div className="text-xs text-gray-600 space-y-1">
              <div className="font-medium text-red-700">Modo: Eliminar Vértice</div>
              <div>• Clic en vértice para eliminar</div>
              <div>• Arrastrar para borrar múltiples</div>
              <div>• Radio de acción: 15px</div>
            </div>
          )}
        </div>
      )}

      {vectorCount === 0 && (
        <div className="text-xs text-gray-500 text-center py-2">
          Dibuja vectores primero
        </div>
      )}
    </div>
  );
};

export default VertexEditor;
