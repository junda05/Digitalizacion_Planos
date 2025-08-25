import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import usePlanoContext from '../../hooks/usePlanoContext';
import UploadSection from '../../components/ui/UploadSection';
import CanvasSection from '../../components/ui/CanvasSection';

function PlanosPage() {
  const navigate = useNavigate();
  const {
    planoCargado,
    isLoading,
    procesarPlano
  } = usePlanoContext();

  const [showUploader, setShowUploader] = useState(!planoCargado);

  // Show uploader if no plan is loaded
  useEffect(() => {
    setShowUploader(!planoCargado);
  }, [planoCargado]);

  const handleFileUpload = async (file) => {
    try {
      await procesarPlano(file);
      setShowUploader(false);
    } catch (error) {
      console.error('Error al procesar archivo:', error);
    }
  };

  const handleNewPlan = () => {
    // Limpiar la ruta y navegar a la ruta base
    navigate('/plano');
    setShowUploader(true);
    // Reset plan state could be added here if needed
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Procesando plano...</h3>
              <p className="text-gray-600">Analizando y extrayendo vectores</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Sistema de Digitalización</h1>
                <p className="text-sm text-gray-600">Editor Interactivo de Planos</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {planoCargado && (
                <button 
                  onClick={handleNewPlan}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Nuevo Plano</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {showUploader ? (
          // Upload Section
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <UploadSection onFileUpload={handleFileUpload} />
            
            {/* Información del sistema */}
            <div className="lg:col-span-4 bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">¿Cómo usar el sistema?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold text-sm">1</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Subir Plano</h3>
                    <p className="text-sm text-gray-600">Sube una imagen o PDF del plano que deseas digitalizar</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-semibold text-sm">2</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Editar Vectores</h3>
                    <p className="text-sm text-gray-600">El sistema detectará automáticamente bordes y sublotes que puedes editar</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-semibold text-sm">3</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Guardar</h3>
                    <p className="text-sm text-gray-600">Guarda los vectores editados para uso posterior</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Main Editor
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <CanvasSection />
          </div>
        )}
      </div>
    </div>
  );
}

export default PlanosPage;
