import { useState, useCallback, useRef } from 'react';

/**
 * Hook para crear sublotes manualmente seleccionando vértices
 */
function useManualSublotCreation() {
  const [selectedVertices, setSelectedVertices] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const [showCreateSublotOption, setShowCreateSublotOption] = useState(false);
  const [sublotPreview, setSublotPreview] = useState(null);

  /**
   * Activa o desactiva el modo de selección manual
   */
  const toggleManualMode = useCallback((active) => {
    if (isActive !== active) {
      setIsActive(active);
      if (!active) {
        // Limpiar selección al desactivar
        setSelectedVertices([]);
        setShowCreateSublotOption(false);
        setSublotPreview(null);
      }
      // Solo log cuando hay cambio real
      console.log(`🎯 Modo selección manual: ${active ? 'ACTIVADO' : 'DESACTIVADO'}`);
    }
  }, [isActive]);

  /**
   * Encuentra el vértice más cercano a las coordenadas dadas
   */
  const findNearestVertex = useCallback((clickX, clickY, vectors, tolerance = 15) => {
    let nearestVertex = null;
    let minDistance = tolerance;

    // Buscar en todos los vectores (bordes externos y sublotes existentes)
    const allVectors = [
      ...(vectors.bordes_externos || []),
      ...(vectors.sublotes || [])
    ];

    allVectors.forEach((vector, vectorIndex) => {
      vector.forEach((point, pointIndex) => {
        const distance = Math.sqrt(
          Math.pow(clickX - point[0], 2) + Math.pow(clickY - point[1], 2)
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestVertex = {
            coordinates: [point[0], point[1]],
            vectorIndex,
            pointIndex,
            distance
          };
        }
      });
    });

    return nearestVertex;
  }, []);

  /**
   * Maneja el clic en el canvas cuando está activo el modo manual
   */
  const handleCanvasClick = useCallback((clickX, clickY, vectors) => {
    if (!isActive) return false;

    const nearestVertex = findNearestVertex(clickX, clickY, vectors);
    
    if (nearestVertex) {
      const vertexKey = `${nearestVertex.coordinates[0]},${nearestVertex.coordinates[1]}`;
      
      // Verificar si el vértice ya está seleccionado
      const alreadySelected = selectedVertices.some(v => 
        v.coordinates[0] === nearestVertex.coordinates[0] && 
        v.coordinates[1] === nearestVertex.coordinates[1]
      );

      if (alreadySelected) {
        // Deseleccionar vértice
        const newSelection = selectedVertices.filter(v => 
          !(v.coordinates[0] === nearestVertex.coordinates[0] && 
            v.coordinates[1] === nearestVertex.coordinates[1])
        );
        setSelectedVertices(newSelection);
        // console.log(`➖ Vértice deseleccionado: ${vertexKey}`); // Comentado para reducir logs
        
        // Ocultar opción si hay menos de 3 vértices
        if (newSelection.length < 3) {
          setShowCreateSublotOption(false);
          setSublotPreview(null);
        } else {
          updateSublotPreview(newSelection);
        }
      } else {
        // Seleccionar nuevo vértice
        const newSelection = [...selectedVertices, nearestVertex];
        setSelectedVertices(newSelection);
        // console.log(`➕ Vértice seleccionado: ${vertexKey} (Total: ${newSelection.length})`); // Comentado para reducir logs
        
        // Mostrar opción de crear sublote si hay 3 o más vértices
        if (newSelection.length >= 3) {
          setShowCreateSublotOption(true);
          updateSublotPreview(newSelection);
        }
      }
      
      return true; // Clic manejado
    }

    return false; // Clic no manejado
  }, [isActive, selectedVertices, findNearestVertex]);

  /**
   * Actualiza la vista previa del sublote
   */
  const updateSublotPreview = useCallback((vertices) => {
    if (vertices.length < 3) {
      setSublotPreview(null);
      return;
    }

    const coordinates = vertices.map(v => v.coordinates);
    const area = calculatePolygonArea(coordinates);
    
    setSublotPreview({
      vertices: coordinates,
      area: area,
      isValid: area > 100 // Área mínima para ser válido
    });
  }, []);

  /**
   * Calcula el área de un polígono usando el algoritmo Shoelace
   */
  const calculatePolygonArea = useCallback((vertices) => {
    if (vertices.length < 3) return 0;
    
    let area = 0;
    const n = vertices.length;
    
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += vertices[i][0] * vertices[j][1];
      area -= vertices[j][0] * vertices[i][1];
    }
    
    return Math.abs(area) / 2;
  }, []);

  /**
   * Crea el sublote con los vértices seleccionados
   */
  const createSublot = useCallback(() => {
    if (selectedVertices.length < 3) {
      // console.warn('⚠️ Se necesitan al menos 3 vértices para crear un sublote'); // Comentado para reducir logs
      return null;
    }

    const coordinates = selectedVertices.map(v => v.coordinates);
    const area = calculatePolygonArea(coordinates);

    if (area < 100) {
      // console.warn('⚠️ El área del sublote es demasiado pequeña'); // Comentado para reducir logs
      return null;
    }

    const sublot = {
      vertices: coordinates,
      area: area,
      createdManually: true,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ Sublote creado: ${area.toFixed(0)}px² (${coordinates.length} vértices)`);
    
    // Limpiar selección después de crear
    setSelectedVertices([]);
    setShowCreateSublotOption(false);
    setSublotPreview(null);

    return sublot;
  }, [selectedVertices, calculatePolygonArea]);

  /**
   * Cancela la selección actual
   */
  const cancelSelection = useCallback(() => {
    setSelectedVertices([]);
    setShowCreateSublotOption(false);
    setSublotPreview(null);
    // console.log('❌ Selección cancelada'); // Comentado para reducir logs
  }, []);

  /**
   * Verifica si un vértice está seleccionado
   */
  const isVertexSelected = useCallback((x, y) => {
    return selectedVertices.some(v => 
      Math.abs(v.coordinates[0] - x) < 2 && 
      Math.abs(v.coordinates[1] - y) < 2
    );
  }, [selectedVertices]);

  return {
    // Estado
    selectedVertices,
    isActive,
    showCreateSublotOption,
    sublotPreview,
    
    // Funciones principales
    toggleManualMode,
    handleCanvasClick,
    createSublot,
    cancelSelection,
    
    // Funciones auxiliares
    findNearestVertex,
    isVertexSelected,
    calculatePolygonArea,
    
    // Estado derivado
    canCreateSublot: selectedVertices.length >= 3 && sublotPreview?.isValid
  };
}

export default useManualSublotCreation;
