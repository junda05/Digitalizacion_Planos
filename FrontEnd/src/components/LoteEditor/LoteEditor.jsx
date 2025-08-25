import React, { useState, useEffect } from 'react';

/**
 * Editor de propiedades de lotes detectados
 * Permite editar área, precio, estado y nombre de cada sublote
 */
const LoteEditor = ({ 
  sublotes = [], 
  onSaveLote, 
  onDeleteLote, 
  onClose,
  isVisible = false 
}) => {
  const [editingLotes, setEditingLotes] = useState([]);
  const [selectedLote, setSelectedLote] = useState(null);

  // Estados para el formulario
  const [formData, setFormData] = useState({
    nombre: '',
    area: '',
    precio: '',
    estado: 'disponible',
    descripcion: ''
  });

  // Inicializar lotes editables desde sublotes detectados
  useEffect(() => {
    if (sublotes.length > 0) {
      const initialLotes = sublotes.map((sublote, index) => ({
        id: `temp-${index}`,
        nombre: `Lote ${index + 1}`,
        vertices: sublote.vertices,
        area: sublote.area || 0,
        precio: 0,
        estado: 'disponible',
        descripcion: '',
        isNew: true,
        method: sublote.method || 'unknown'
      }));
      setEditingLotes(initialLotes);
    }
  }, [sublotes]);

  // Manejar selección de lote
  const handleSelectLote = (lote) => {
    setSelectedLote(lote);
    setFormData({
      nombre: lote.nombre || '',
      area: lote.area?.toString() || '',
      precio: lote.precio?.toString() || '',
      estado: lote.estado || 'disponible',
      descripcion: lote.descripcion || ''
    });
  };

  // Manejar cambios en el formulario
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Guardar cambios del lote seleccionado
  const handleSaveLote = () => {
    if (!selectedLote) return;

    const updatedLote = {
      ...selectedLote,
      nombre: formData.nombre,
      area: parseFloat(formData.area) || selectedLote.area,
      precio: parseFloat(formData.precio) || 0,
      estado: formData.estado,
      descripcion: formData.descripcion
    };

    // Actualizar en la lista local
    setEditingLotes(prev => 
      prev.map(lote => 
        lote.id === selectedLote.id ? updatedLote : lote
      )
    );

    // Callback al componente padre
    if (onSaveLote) {
      onSaveLote(updatedLote);
    }

    // Limpiar selección
    setSelectedLote(null);
    setFormData({
      nombre: '',
      area: '',
      precio: '',
      estado: 'disponible',
      descripcion: ''
    });
  };

  // Eliminar lote
  const handleDeleteLote = (loteId) => {
    setEditingLotes(prev => prev.filter(lote => lote.id !== loteId));
    
    if (selectedLote?.id === loteId) {
      setSelectedLote(null);
      setFormData({
        nombre: '',
        area: '',
        precio: '',
        estado: 'disponible',
        descripcion: ''
      });
    }

    if (onDeleteLote) {
      onDeleteLote(loteId);
    }
  };

  // Guardar todos los lotes
  const handleSaveAll = () => {
    editingLotes.forEach(lote => {
      if (onSaveLote) {
        onSaveLote(lote);
      }
    });
    
    if (onClose) {
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">
            Editor de Lotes - {editingLotes.length} sublotes detectados
          </h2>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Lista de lotes */}
          <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-3">Lotes Detectados</h3>
              <div className="space-y-2">
                {editingLotes.map((lote) => (
                  <div
                    key={lote.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedLote?.id === lote.id
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                    }`}
                    onClick={() => handleSelectLote(lote)}
                  >
                    <div className="font-medium">{lote.nombre}</div>
                    <div className="text-sm text-gray-600">
                      Área: {lote.area?.toFixed(0) || 0} m²
                    </div>
                    <div className="text-sm text-gray-500">
                      Método: {lote.method}
                    </div>
                    <div className="text-sm text-gray-500">
                      Vértices: {lote.vertices?.length || 0}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded mt-1 inline-block ${
                      lote.estado === 'disponible' 
                        ? 'bg-green-100 text-green-800'
                        : lote.estado === 'reservado'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {lote.estado}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panel de edición */}
          <div className="w-2/3 overflow-y-auto">
            {selectedLote ? (
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Editar: {selectedLote.nombre}
                </h3>

                <div className="space-y-4">
                  {/* Nombre */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Lote
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => handleInputChange('nombre', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: Lote A-1"
                    />
                  </div>

                  {/* Área */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Área (m²)
                    </label>
                    <input
                      type="number"
                      value={formData.area}
                      onChange={(e) => handleInputChange('area', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Área calculada automáticamente"
                      step="0.01"
                    />
                  </div>

                  {/* Precio */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Precio (COP)
                    </label>
                    <input
                      type="number"
                      value={formData.precio}
                      onChange={(e) => handleInputChange('precio', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>

                  {/* Estado */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <select
                      value={formData.estado}
                      onChange={(e) => handleInputChange('estado', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="disponible">Disponible</option>
                      <option value="reservado">Reservado</option>
                      <option value="vendido">Vendido</option>
                    </select>
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => handleInputChange('descripcion', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Descripción adicional del lote"
                    />
                  </div>

                  {/* Información técnica */}
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h4 className="font-medium text-gray-700 mb-2">Información Técnica</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Vértices: {selectedLote.vertices?.length || 0}</div>
                      <div>Área detectada: {selectedLote.area?.toFixed(2) || 0} m²</div>
                      <div>Método de detección: {selectedLote.method}</div>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={handleSaveLote}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Guardar Cambios
                    </button>
                    <button
                      onClick={() => handleDeleteLote(selectedLote.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      Eliminar Lote
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <div className="text-lg mb-2">Selecciona un lote para editar</div>
                <div className="text-sm">
                  Haz clic en cualquier lote de la lista para ver y editar sus propiedades
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveAll}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Guardar Todos los Lotes ({editingLotes.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoteEditor;


