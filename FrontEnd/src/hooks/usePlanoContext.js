import { useContext } from 'react';
import { PlanoContext } from '../context/PlanoContext';

const usePlanoContext = () => {
  const context = useContext(PlanoContext);
  if (!context) {
    throw new Error('usePlanoContext debe ser usado dentro de un PlanoProvider');
  }
  return context;
};

export default usePlanoContext;