import api from './config';

const planosService = {
  // Procesar nuevo plano
  procesarPlano: async (archivo) => {
    const formData = new FormData();
    formData.append('archivo', archivo);
    
    const response = await api.post('/planos/procesar/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Guardar plano procesado
  guardarPlano: async (datos) => {
    const response = await api.post('/planos/guardar/', datos);
    return response.data;
  },

  // Obtener lista de planos
  obtenerPlanos: async () => {
    const response = await api.get('/planos/listar/');
    return response.data;
  },

  // Obtener detalle de un plano
  obtenerPlano: async (id) => {
    const response = await api.get(`/planos/${id}/`);
    return response.data;
  }
};

export default planosService;