import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit3, Calendar, FileImage, MapPin, Grid, List } from 'lucide-react';
import planosService from '../../services/api/PlanosService';
import lotesService from '../../services/api/LotesService';

/**
 * Página principal para listar todos los planos guardados
 * Permite navegar entre planos y crear nuevos
 */
function PlanosListPage() {
  const navigate = useNavigate();
  
  const [planos, setPlanos] = useState([]);
  const [lotesStats, setLotesStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' o 'list'

  useEffect(() => {
    loadPlanos();
  }, []);

  const loadPlanos = async () => {
    try {
      setIsLoading(true);
      
      // Cargar planos y estadísticas de lotes
      const [planosData, lotesData] = await Promise.all([
        planosService.obtenerPlanos(),
        lotesService.obtenerLotes()
      ]);
      
      setPlanos(planosData);
      
      // Calcular estadísticas de lotes por plano
      const stats = {};
      lotesData.forEach(lote => {
        const planoIdKey = String(lote.plano); // Ensure consistent string comparison
        if (!stats[planoIdKey]) {
          stats[planoIdKey] = {
            total: 0,
            disponibles: 0,
            reservados: 0,
            vendidos: 0,
            areaTotal: 0
          };
        }
        
        stats[planoIdKey].total += 1;
        
        // Count by status with proper field name
        const estado = lote.estado || 'disponible';
        if (estado === 'disponible') {
          stats[planoIdKey].disponibles += 1;
        } else if (estado === 'reservado') {
          stats[planoIdKey].reservados += 1;
        } else if (estado === 'vendido') {
          stats[planoIdKey].vendidos += 1;
        }
        
        if (lote.area) {
          stats[planoIdKey].areaTotal += parseFloat(lote.area);
        }
      });
      
      setLotesStats(stats);
      
    } catch (err) {
      console.error('Error al cargar planos:', err);
      setError('Error al cargar la lista de planos');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (estado) => {
    switch (estado) {
      case 'disponible': return 'bg-green-100 text-green-800';
      case 'reservado': return 'bg-yellow-100 text-yellow-800';
      case 'vendido': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Cargando planos...</h3>
              <p className="text-gray-600">Obteniendo la lista de planos guardados</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-600 mb-4">
              <FileImage className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error de Carga</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={loadPlanos}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header mejorado */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            {/* Título y descripción */}
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-600 rounded-lg">
                <FileImage className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Planos Digitalizados
                </h1>
                <p className="text-gray-600 mt-1">
                  Gestiona y visualiza todos tus planos digitalizados
                </p>
              </div>
            </div>
            
            {/* Controles del header */}
            <div className="flex items-center space-x-4">
              {/* Selector de vista */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid className="w-4 h-4 inline mr-2" />
                  Cuadrícula
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="w-4 h-4 inline mr-2" />
                  Lista
                </button>
              </div>
              
              {/* Botón para crear nuevo plano */}
              <button
                onClick={() => navigate('/plano')}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Nuevo Plano</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {planos.length === 0 ? (
          // Estado vacío
          <div className="text-center py-16">
            <div className="bg-white rounded-lg shadow-sm p-12 max-w-md mx-auto">
              <div className="text-gray-400 mb-6">
                <MapPin className="w-24 h-24 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No hay planos guardados
              </h3>
              <p className="text-gray-600 mb-6">
                Comienza creando tu primer plano digitalizado
              </p>
              <button
                onClick={() => navigate('/plano')}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors mx-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Crear Primer Plano</span>
              </button>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          // Vista de cuadrícula
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {planos.map((plano) => {
              const stats = lotesStats[String(plano.id)] || { total: 0, disponibles: 0, reservados: 0, vendidos: 0, areaTotal: 0 };
              
              return (
                <div key={plano.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Preview de imagen */}
                  <div className="h-48 bg-gray-100 relative overflow-hidden">
                    {plano.imagen_url ? (
                      <img 
                        src={plano.imagen_url} 
                        alt={plano.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <FileImage className="w-16 h-16" />
                      </div>
                    )}
                    
                    {/* Overlay con información */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 hover:opacity-100 transition-all duration-300">
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => navigate(`/plano-digital/${plano.id}`)}
                            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Ver Plano</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Información del plano */}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                      {plano.nombre}
                    </h3>
                    
                    <div className="flex items-center text-sm text-gray-600 mb-4">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Creado el {formatDate(plano.creado)}</span>
                    </div>
                    
                    {/* Estadísticas de lotes */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Total de lotes:</span>
                        <span className="font-semibold">{stats.total}</span>
                      </div>
                      
                      {stats.total > 0 && (
                        <>
                          <div className="flex justify-between items-center">
                            <div className="flex space-x-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor('disponible')}`}>
                                {stats.disponibles} Disp.
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor('reservado')}`}>
                                {stats.reservados} Res.
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor('vendido')}`}>
                                {stats.vendidos} Vend.
                              </span>
                            </div>
                          </div>
                          
                          {stats.areaTotal > 0 && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-gray-600">Área total:</span>
                              <span className="font-semibold">{stats.areaTotal.toFixed(0)} m²</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Vista de lista
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plano
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha de Creación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lotes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {planos.map((plano) => {
                    const stats = lotesStats[String(plano.id)] || { total: 0, disponibles: 0, reservados: 0, vendidos: 0, areaTotal: 0 };
                    
                    return (
                      <tr key={plano.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-12 w-12">
                              {plano.imagen_url ? (
                                <img 
                                  src={plano.imagen_url} 
                                  alt={plano.nombre}
                                  className="h-12 w-12 rounded object-cover"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded bg-gray-100 flex items-center justify-center">
                                  <FileImage className="w-8 h-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                            
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {plano.nombre}
                              </div>
                              <div className="text-sm text-gray-500">
                                Creado el {formatDate(plano.creado)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(plano.creado)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{stats.total} lotes</div>
                          {stats.areaTotal > 0 && (
                            <div className="text-sm font-medium text-gray-900">
                              <div className="text-sm text-gray-500">{stats.areaTotal.toFixed(0)} m² total</div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {stats.total > 0 ? (
                            <div className="flex space-x-1">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor('disponible')}`}>
                                {stats.disponibles}
                              </span>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor('reservado')}`}>
                                {stats.reservados}
                              </span>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor('vendido')}`}>
                                {stats.vendidos}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Sin lotes</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => navigate(`/plano-digital/${plano.id}`)}
                            className="text-blue-600 hover:text-blue-900 flex items-center space-x-1 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Ver</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlanosListPage;
