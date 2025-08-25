import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PlanosPage from './pages/PlanosPage/PlanosPage';
import PlanosListPage from './pages/PlanosListPage/PlanosListPage';
import PlanoDigitalPageNew from './pages/PlanoDigitalPage/PlanoDigitalPageNew';
import PlanoFinalizadoPage from './pages/PlanoFinalizadoPage/PlanoFinalizadoPage';
import { PlanoProvider } from './context/PlanoContext';
import { Toaster } from 'react-hot-toast';
import './App.css';

function App() {
  return (
    <PlanoProvider>
      <Router>
        <Routes>
          <Route path="/" element={<PlanosListPage />} />
          <Route path="/planos" element={<PlanosListPage />} />
          <Route path="/plano" element={<PlanosPage />} />
          <Route path="/plano-digital/:planoId" element={<PlanoDigitalPageNew />} />
          <Route path="/plano-finalizado/:planoId" element={<PlanoFinalizadoPage />} />
        </Routes>
      </Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#333',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          },
        }}
      />
    </PlanoProvider>
  );
}

export default App;