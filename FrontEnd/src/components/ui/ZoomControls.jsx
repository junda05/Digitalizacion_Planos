import React from 'react';

function ZoomControls({ onZoomIn, onZoomOut, onResetView }) {
  return (
    <div className="absolute top-4 right-4 flex flex-col space-y-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
      <button
        onClick={onZoomIn}
        title="Acercar (Ctrl + Rueda del mouse)"
        className="w-10 h-10 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors"
        type="button"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
      
      <button
        onClick={onZoomOut}
        title="Alejar (Ctrl + Rueda del mouse)"
        className="w-10 h-10 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors"
        type="button"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 12H6" />
        </svg>
      </button>
      
      <button
        onClick={onResetView}
        title="Restablecer vista"
        className="w-10 h-10 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center transition-colors"
        type="button"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
}

export default ZoomControls;
