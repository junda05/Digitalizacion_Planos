import React, { createContext, useState, useCallback } from 'react';
import planosService from '../services/api/PlanosService';
import lotesService from '../services/api/LotesService';
import toast from 'react-hot-toast';

export const PlanoContext = createContext();

export const PlanoProvider = ({ children }) => {
  const [plano, setPlano] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [imagenUrl, setImagenUrl] = useState(null); // Nueva variable para la URL de la imagen
  const [planoCargado, setPlanoCargado] = useState(false); // Nueva variable para indicar si se ha cargado un plano

  // Funciones para manejar el plano
  const procesarPlano = useCallback(async (archivo) => {
    setIsLoading(true);
    try {
      const data = await planosService.procesarPlano(archivo);
      // Crear la URL de la imagen a partir del archivo
      const imageUrl = URL.createObjectURL(archivo);
      setImagenUrl(imageUrl);
      console.log('imagenUrl en procesarPlano:', imageUrl);
      
      // Guardar los vectores con la nueva estructura
      setPlano({
        vectores: data.vectores || [],
        bordes_externos: data.bordes_externos || [],
        sublotes: data.sublotes || [],
        total_vectores: data.total_vectores || 0,
        total_bordes_externos: data.total_bordes_externos || 0,
        total_sublotes: data.total_sublotes || 0
      });
      
      console.log('Datos procesados:', {
        vectores: data.vectores?.length || 0,
        bordes_externos: data.bordes_externos?.length || 0,
        sublotes: data.sublotes?.length || 0
      });
      
      setPlanoCargado(true);
      toast.success(`Plano procesado: ${data.total_bordes_externos || 0} bordes externos, ${data.total_sublotes || 0} sublotes detectados`);
    } catch (error) {
      console.error('Error al procesar el plano:', error);
      toast.error('Error al procesar el plano');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const guardarPlano = useCallback(async (datos, callback = null) => {
    setIsLoading(true);
    try {
      const response = await planosService.guardarPlano({
        nombre: `Plano-${Date.now()}`,
        ...datos
      });
      
      // Actualizar el estado del plano con el ID guardado
      setPlano(prev => ({ ...prev, id: response.id }));
      
      toast.success('Plano guardado con éxito');
      
      // Ejecutar callback si se proporciona (para redirección)
      if (callback) {
        callback(response);
      }
      
      return response;
    } catch (error) {
      console.error('Error al guardar el plano:', error);
      toast.error('Error al guardar el plano');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const obtenerPlano = useCallback(async (id) => {
    setIsLoading(true);
    try {
      const data = await planosService.obtenerPlano(id);
      setPlano(data);
    } catch (error) {
      console.error('Error al obtener el plano:', error);
      toast.error('Error al obtener el plano');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Funciones para manejar los lotes
  const obtenerLotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await lotesService.obtenerLotes();
      setLotes(data);
    } catch (error) {
      console.error('Error al obtener los lotes:', error);
      toast.error('Error al obtener los lotes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const crearLote = useCallback(async (lote) => {
    setIsLoading(true);
    try {
      const data = await lotesService.crearLote(lote);
      setLotes([...lotes, data]);
      toast.success('Lote creado con éxito');
    } catch (error) {
      console.error('Error al crear el lote:', error);
      toast.error('Error al crear el lote');
    } finally {
      setIsLoading(false);
    }
  }, [lotes]);

  const actualizarLote = useCallback(async (id, lote) => {
    setIsLoading(true);
    try {
      const data = await lotesService.actualizarLote(id, lote);
      setLotes(lotes.map(l => (l.id === id ? data : l)));
      toast.success('Lote actualizado con éxito');
    } catch (error) {
      console.error('Error al actualizar el lote:', error);
      toast.error('Error al actualizar el lote');
    } finally {
      setIsLoading(false);
    }
  }, [lotes]);

  const eliminarLote = useCallback(async (id) => {
    setIsLoading(true);
    try {
      await lotesService.eliminarLote(id);
      setLotes(lotes.filter(l => l.id !== id));
      toast.success('Lote eliminado con éxito');
    } catch (error) {
      console.error('Error al eliminar el lote:', error);
      toast.error('Error al eliminar el lote');
    } finally {
      setIsLoading(false);
    }
  }, [lotes]);

  // Funciones para la interacción del usuario
  const selectLot = useCallback((id) => {
    setSelectedLot(id);
  }, []);

  const toggleLabels = useCallback(() => {
    setShowLabels(!showLabels);
  }, [showLabels]);

  const zoom = useCallback((factor) => {
    setScale(prevScale => prevScale * factor);
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const panCanvas = useCallback((delta) => {
    setPan(prevPan => ({
      x: prevPan.x + delta.x,
      y: prevPan.y + delta.y,
    }));
  }, []);

  const value = {
    plano,
    lotes,
    selectedLot,
    isLoading,
    showLabels,
    pan,
    scale,
    imagenUrl, // Pasar la URL de la imagen al contexto
    planoCargado, // Pasar la variable para indicar si se ha cargado un plano
    procesarPlano,
    guardarPlano,
    obtenerPlano,
    obtenerLotes,
    crearLote,
    actualizarLote,
    eliminarLote,
    selectLot,
    toggleLabels,
    zoom,
    resetView,
    panCanvas,
  };

  return (
    <PlanoContext.Provider value={value}>
      {children}
    </PlanoContext.Provider>
  );
};