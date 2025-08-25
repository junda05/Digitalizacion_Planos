import api from './config';

const lotesService = {
  // Obtener todos los lotes
  obtenerLotes: async () => {
    const response = await api.get('/lotes/');
    return response.data;
  },

  // Obtener lotes por plano
  obtenerLotesPorPlano: async (planoId) => {
    const response = await api.get(`/lotes/?plano=${planoId}`);
    return response.data;
  },

  // Crear nuevo lote
  crearLote: async (lote) => {
    const response = await api.post('/lotes/', lote);
    return response.data;
  },

  // Actualizar lote existente
  actualizarLote: async (id, lote) => {
    const response = await api.put(`/lotes/${id}/`, lote);
    return response.data;
  },

  // Eliminar lote
  eliminarLote: async (id) => {
    await api.delete(`/lotes/${id}/`);
  }
};

export default lotesService;