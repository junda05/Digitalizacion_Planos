import React from 'react';

const PolygonTool = ({ 
  detectedSubplots = [],
  onDetectSubplots,
  onClearSubplots,
  isDetecting = false,
  borderVectorCount = 0,
  disabled = false 
}) => {
  // DESHABILITADO: Detección automática reemplazada por selección manual
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700 mb-2">Creación Manual de Sublotes</div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="text-sm text-blue-800">
          <div className="font-medium mb-1">Nueva Funcionalidad:</div>
          <div className="text-xs">
            • Usa la herramienta "Crear Sublote" en la barra lateral<br/>
            • Selecciona vértices manualmente haciendo clic<br/>
            • Crea sublotes precisos con 3+ vértices
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-600 space-y-1">
        <div>• Selección manual de vértices</div>
        <div>• Vista previa en tiempo real</div>
        <div>• Validación automática de área</div>
        <div>• Control total sobre la forma</div>
      </div>
    </div>
  );
};

export default PolygonTool;
