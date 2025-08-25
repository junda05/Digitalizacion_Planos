import React from 'react';

/**
 * Componente compacto para crear sublotes manualmente
 * Versión minimalista que no obstruye la vista del plano
 */
function ManualSublotCreator({ 
  show, 
  selectedVertices, 
  sublotPreview, 
  onCreateSublot, 
  onCancel,
  canvasRect 
}) {
  if (!show || selectedVertices.length < 3) {
    return null;
  }

  // Posicionar en la esquina superior derecha, más discreto
  const style = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    zIndex: 1000
  };

  return (
    <div style={style}>
      <div className="bg-white/90 backdrop-blur-sm border border-blue-200 rounded-lg shadow-md p-3 max-w-64">
        {/* Header compacto */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <h3 className="text-xs font-medium text-gray-900">
              Crear Sublote
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            title="Cancelar"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info compacta */}
        <div className="mb-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Vértices:</span>
            <span className="font-medium text-blue-600">{selectedVertices.length}</span>
          </div>
          
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Estado:</span>
            <span className={`font-medium ${
              sublotPreview?.isValid ? 'text-green-600' : 'text-amber-600'
            }`}>
              {sublotPreview?.isValid ? '✓ Listo' : '⚠ Muy pequeño'}
            </span>
          </div>
        </div>

        {/* Acciones compactas */}
        <div className="flex space-x-2">
          <button
            onClick={onCreateSublot}
            disabled={!sublotPreview?.isValid}
            className={`
              flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors
              ${sublotPreview?.isValid
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {sublotPreview?.isValid ? 'Crear' : 'N/A'}
          </button>

          <button
            onClick={onCancel}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-medium transition-colors"
          >
            Cancelar
          </button>
        </div>

        {/* Tip mínimo */}
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            💡 Clic en vértices para seleccionar
          </p>
        </div>
      </div>
    </div>
  );
}

export default ManualSublotCreator;
