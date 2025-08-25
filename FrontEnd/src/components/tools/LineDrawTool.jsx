import React from 'react';
import { Pen } from 'lucide-react';

const LineDrawTool = ({ 
  isActive, 
  onActivate,
  isDrawing = false,
  currentPathLength = 0,
  onFinishDrawing,
  onCancelDrawing,
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
        <Pen className="w-5 h-5" />
        <div className="text-left">
          <div className="font-medium">Dibujar Línea</div>
          <div className="text-xs text-gray-500">Vectores rectos (L)</div>
        </div>
      </button>

      {isActive && isDrawing && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-yellow-700">
              Dibujando: {currentPathLength} puntos
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onFinishDrawing}
              className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
            >
              Finalizar
            </button>
            <button
              onClick={onCancelDrawing}
              className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isActive && (
        <div className="text-xs text-gray-600 space-y-1">
          <div>• Clic izquierdo para agregar punto</div>
          <div>• Clic derecho o doble clic para terminar</div>
          <div>• Conexión automática a 15px</div>
          <div>• Escape para cancelar</div>
          {isDrawing && (
            <div className="text-yellow-600 font-medium">
              → Dibujando línea activa
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LineDrawTool;
