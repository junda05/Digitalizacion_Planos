import React, { useRef } from 'react';
import usePlanoContext from '../../hooks/usePlanoContext';

function UploadSection({ onFileUpload }) {
  const { procesarPlano, isLoading } = usePlanoContext();
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (onFileUpload) {
        onFileUpload(file);
      } else {
        procesarPlano(file);
      }
      // Reset the input to allow selecting the same file again
      e.target.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      if (onFileUpload) {
        onFileUpload(files[0]);
      } else {
        procesarPlano(files[0]);
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
  };

  const handleClick = (e) => {
    e.stopPropagation(); // Evitar que se propague el evento
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div id="uploadSection" className="lg:col-span-4">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div 
          id="dropZone" 
          className="border-3 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-primary transition-all duration-300 cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Cargar Plano</h3>
              <p className="text-gray-600 mb-4">Arrastra y suelta tu archivo aquí o haz clic para seleccionar</p>
              <p className="text-sm text-gray-500">Formatos soportados: PNG, JPG, PDF (máx. 10MB)</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation(); // Evitar propagación del evento
                handleClick(e);
              }}
              className="bg-gradient-to-r from-primary to-blue-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? 'Procesando...' : 'Seleccionar Archivo'}
            </button>
          </div>
        </div>
        <input
          type="file"
          id="fileInput"
          className="hidden"
          accept=".png,.jpg,.jpeg,.pdf"
          onChange={handleFileSelect}
          ref={fileInputRef}
        />
      </div>
    </div>
  );
}

export default UploadSection;