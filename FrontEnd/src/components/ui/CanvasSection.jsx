import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import usePlanoContext from '../../hooks/usePlanoContext';
import useCanvasCoordinates from '../../hooks/useCanvasCoordinates';
import useVectorEditing from '../../hooks/useVectorEditing';
import useManualSublotCreation from '../../hooks/useManualSublotCreation';
import DrawingTools, { TOOL_TYPES } from './DrawingTools';
import ZoomControls from './ZoomControls';
import ManualSublotCreator from './ManualSublotCreator';
import SelectedVerticesOverlay from './SelectedVerticesOverlay';
import lotesService from '../../services/api/LotesService';
import { CustomNotification, useNotification } from '../common/CustomNotification';
// LoteEditor importación eliminada - funcionalidad automática
import { 
  drawGrid, 
  drawBackgroundImage, 
  drawVector, 
  drawLote,
  drawSelectedVertices,
  drawConnectionPoints,
  drawTemporaryPath,
  drawToolCursor,
  clearCanvas,
  generateUniqueSubplotColor,
  generateSubplotBorderColor
} from '../../utils/canvasUtils';
import './CanvasSection.css';

function CanvasSection() {
  const navigate = useNavigate();
  const { 
    plano, 
    lotes, 
    selectedLot, 
    showLabels, 
    imagenUrl, 
    guardarPlano 
  } = usePlanoContext();

  // Canvas references
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  
  // Transform state  
  const [transform, setTransform] = useState({
    scale: 1,
    translateX: 0,
    translateY: 0
  });
  
  // Image dimensions
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  // Coordinate system hook
  const coordinates = useCanvasCoordinates(transform, imageDimensions, canvasRef, containerRef);
  
  // Vector editing state
  const [editableVectors, setEditableVectors] = useState({
    bordes_externos: [],
    sublotes: []
  });
  
  // Vector editing tools hook
  const vectorEditing = useVectorEditing(editableVectors, setEditableVectors, coordinates, transform);
  
  // Manual sublot creation hook
  const manualSublot = useManualSublotCreation();

  // Hook para notificaciones personalizadas
  const notification = useNotification();

  // Exponer funciones de vectorEditing para acceso global
  useEffect(() => {
    window.vectorEditingInstance = vectorEditing;
    
    // Información de debug
    window.debugVectorInfo = () => {
      console.log('🔧 === INFORMACIÓN DE VECTORES ===');
      console.log('Bordes externos:', editableVectors.bordes_externos.length);
      console.log('Sublotes actuales:', editableVectors.sublotes.length);
      
      editableVectors.bordes_externos.forEach((vector, index) => {
        console.log(`Vector ${index}:`, {
          puntos: vector.length,
          inicio: vector[0],
          fin: vector[vector.length - 1],
          todos: vector
        });
      });
      
      return editableVectors;
    };
    
    // Solo mostrar funciones debug una vez al cargar
    if (!window.debugFunctionsLogged) {
      console.log('🔧 Funciones debug disponibles:');
      console.log('  - window.debugVectorInfo() - Ver información de vectores');
      console.log('  - Nueva funcionalidad: Selección manual de sublotes activada');
      window.debugFunctionsLogged = true;
    }
    
    return () => {
      delete window.vectorEditingInstance;
      delete window.debugVectorInfo;
    };
  }, [vectorEditing, editableVectors]);

  // Effect to handle manual sublot mode activation/deactivation
  useEffect(() => {
    const isManualSublotActive = vectorEditing.activeTool === TOOL_TYPES.MANUAL_SUBLOT;
    manualSublot.toggleManualMode(isManualSublotActive);
  }, [vectorEditing.activeTool, manualSublot.toggleManualMode]);

  // Custom tool change handler to manage both vector editing and manual sublot
  const handleToolChange = useCallback((toolType) => {
    vectorEditing.setTool(toolType);
    
    if (toolType === TOOL_TYPES.MANUAL_SUBLOT) {
      // console.log('🎯 Activando modo de creación manual de sublotes'); // Comentado para reducir logs
    } else if (manualSublot.isActive) {
      // console.log('🔄 Desactivando modo de creación manual de sublotes'); // Comentado para reducir logs
      manualSublot.cancelSelection();
    }
  }, [vectorEditing, manualSublot]);

  // Handle manual sublot creation
  const handleCreateManualSublot = useCallback(() => {
    const newSublot = manualSublot.createSublot();
    if (newSublot) {
      setEditableVectors(prev => ({
        ...prev,
        sublotes: [...prev.sublotes, newSublot.vertices]
      }));
      
      notification.showSuccess(
        'Sublote Creado',
        `Nuevo sublote creado manualmente con ${newSublot.vertices.length} vértices`,
        [`Área: ${newSublot.area.toFixed(0)} px²`]
      );
    }
  }, [manualSublot, setEditableVectors, notification]);
  

  
  // Interaction state
  const [dragState, setDragState] = useState({
    isDragging: false,
    dragType: null, // 'pan' | 'vertex'
    startX: 0,
    startY: 0,
    targetData: null,
    willMergeWith: null // Para marcar fusión de vértices
  });
  
  // Mouse tracking for tool cursors
  const [mousePosition, setMousePosition] = useState(null);

  // Load image and set dimensions
  useEffect(() => {
    if (imagenUrl) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
        imageRef.current = img;
      };
      img.src = imagenUrl;
    }
  }, [imagenUrl]);

  // Sync editable vectors with plano data
  useEffect(() => {
    if (plano) {
      setEditableVectors({
        bordes_externos: plano.bordes_externos ? 
          plano.bordes_externos.map(vec => vec.map(pt => [pt[0], pt[1]])) : [],
        sublotes: plano.sublotes ? 
          plano.sublotes.map(vec => vec.map(pt => [pt[0], pt[1]])) : []
      });
    } else {
      setEditableVectors({ bordes_externos: [], sublotes: [] });
    }
  }, [plano]);

  // Validar y limpiar selecciones cuando cambien los vectores editables
  // NOTA: Removido el useEffect que causaba bucle infinito
  // La validación se hace manualmente cuando sea necesario

  // Función de detección de sublotes eliminada - ahora es automática

  // Funciones de lotes eliminadas - detección automática implementada

  // Main rendering effect with proper layering
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match container
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    clearCanvas(ctx);

    // Get image bounds
    const imageBounds = coordinates.getImageBounds();

    // Layer 1: Draw background image
    if (imageRef.current && imageDimensions.width > 0) {
      drawBackgroundImage(ctx, imageRef.current, imageBounds, transform);
    }

    // Layer 2: Draw grid over image
    drawGrid(ctx, 20, transform);

    // Layer 3: Draw vectors over grid
    editableVectors.bordes_externos.forEach(vector => {
      drawVector(ctx, vector, 'border', transform, coordinates.imageToCanvas, true);
    });

    // NUEVA FUNCIONALIDAD: Sublotes con colores únicos automáticos
    editableVectors.sublotes.forEach((vector, index) => {
      const uniqueColor = generateUniqueSubplotColor(index, editableVectors.sublotes.length);
      const borderColor = generateSubplotBorderColor(uniqueColor);
      
      // Renderizar sublote con color único
      drawVector(ctx, vector, 'sublot', transform, coordinates.imageToCanvas, true, {
        fillColor: uniqueColor,
        strokeColor: borderColor
      });
    });

    // Layer 4: Draw existing lots
    lotes.forEach(lote => {
      if (lote.vertices && lote.vertices.length >= 3) {
        drawLote(ctx, lote, selectedLot === lote.id, showLabels, transform, coordinates.imageToCanvas);
      }
    });



    // Layer 6: Draw temporary drawing path
    if (vectorEditing.isDrawing && vectorEditing.drawingPath.length > 0) {
      drawTemporaryPath(ctx, vectorEditing.drawingPath, coordinates.imageToCanvas, transform, false);
    }

    // Layer 7: Draw selected vertices
    if (vectorEditing.selectedVertices.length > 0) {
      const selectedWithPoints = vectorEditing.selectedVertices
        .map(vertex => {
          // Validar que el vértice tenga la estructura correcta
          if (!vertex || typeof vertex.type !== 'string' || 
              typeof vertex.vectorIndex !== 'number' || 
              typeof vertex.pointIndex !== 'number') {
            console.warn('Vértice seleccionado con estructura inválida:', vertex);
            return null;
          }
          
          // Validar que el vector y punto existan
          const vectorArray = editableVectors[vertex.type];
          if (!vectorArray || !vectorArray[vertex.vectorIndex]) {
            console.warn('Vector no encontrado:', vertex.type, vertex.vectorIndex);
            return null;
          }
          
          const vector = vectorArray[vertex.vectorIndex];
          if (!vector || vertex.pointIndex < 0 || vertex.pointIndex >= vector.length) {
            console.warn('Punto no encontrado en vector:', vertex);
            return null;
          }
          
          const point = vector[vertex.pointIndex];
          if (!point || !Array.isArray(point) || point.length < 2) {
            console.warn('Punto con estructura inválida:', point);
            return null;
          }
          
          return {
            ...vertex,
            point: point
          };
        })
        .filter(vertex => vertex !== null); // Filtrar vértices inválidos
      
      if (selectedWithPoints.length > 0) {
        drawSelectedVertices(ctx, selectedWithPoints, coordinates.imageToCanvas, transform);
      }
    }

    // Layer 7.5: Draw points selected for connection
    if (vectorEditing.pointsToConnect.length > 0) {
      const connectPointsWithCoords = vectorEditing.pointsToConnect
        .map(vertex => {
          // Aplicar las mismas validaciones que para vértices seleccionados
          if (!vertex || typeof vertex.type !== 'string' || 
              typeof vertex.vectorIndex !== 'number' || 
              typeof vertex.pointIndex !== 'number') {
            console.warn('Punto de conexión con estructura inválida:', vertex);
            return null;
          }
          
          const vectorArray = editableVectors[vertex.type];
          if (!vectorArray || !vectorArray[vertex.vectorIndex]) {
            console.warn('Vector no encontrado para conexión:', vertex.type, vertex.vectorIndex);
            return null;
          }
          
          const vector = vectorArray[vertex.vectorIndex];
          if (!vector || vertex.pointIndex < 0 || vertex.pointIndex >= vector.length) {
            console.warn('Punto no encontrado para conexión:', vertex);
            return null;
          }
          
          const point = vector[vertex.pointIndex];
          if (!point || !Array.isArray(point) || point.length < 2) {
            console.warn('Punto de conexión con estructura inválida:', point);
            return null;
          }
          
          return {
            ...vertex,
            point: point
          };
        })
        .filter(vertex => vertex !== null);
      
      if (connectPointsWithCoords.length > 0) {
        drawConnectionPoints(ctx, connectPointsWithCoords, coordinates.imageToCanvas, transform);
      }
    }

    // Layer 7.6: Draw merge indicator if vertex will merge
    if (dragState.willMergeWith) {
      const mergePoint = coordinates.imageToCanvas(
        dragState.willMergeWith.point[0], 
        dragState.willMergeWith.point[1]
      );
      
      ctx.save();
      ctx.setTransform(transform.scale, 0, 0, transform.scale, transform.translateX, transform.translateY);
      
      // Círculo pulsante para indicar fusión
      const pulseRadius = (12 + Math.sin(Date.now() * 0.01) * 3) / transform.scale;
      
      ctx.beginPath();
      ctx.arc(mergePoint.x, mergePoint.y, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 3 / transform.scale;
      ctx.setLineDash([4 / transform.scale, 4 / transform.scale]);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Indicador de fusión (icono de imán)
      ctx.fillStyle = '#ff6b35';
      ctx.font = `${12 / transform.scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', mergePoint.x, mergePoint.y - pulseRadius - 10 / transform.scale);
      
      ctx.restore();
    }

    // Layer 8: Draw tool cursor
    if (mousePosition && vectorEditing.activeTool !== TOOL_TYPES.SELECT && vectorEditing.activeTool !== TOOL_TYPES.PAN) {
      drawToolCursor(ctx, vectorEditing.activeTool, mousePosition, transform);
    }
  }, [
    transform, 
    imageDimensions, 
    editableVectors, 
    lotes, 
    selectedLot, 
    showLabels, 
    coordinates,
    vectorEditing.isDrawing,
    vectorEditing.drawingPath,
    vectorEditing.selectedVertices,
    vectorEditing.activeTool,
    vectorEditing.pointsToConnect,
    mousePosition,
    dragState.willMergeWith
  ]);

  // Render on state changes
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Transform functions mejoradas
  const handleZoomIn = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Punto del mundo antes del zoom (centro del canvas)
    const worldX = (centerX - transform.translateX) / transform.scale;
    const worldY = (centerY - transform.translateY) / transform.scale;
    
    const newScale = Math.min(transform.scale * 1.2, 8);
    
    // Calcular nueva posición para mantener el centro fijo
    const newTranslateX = centerX - worldX * newScale;
    const newTranslateY = centerY - worldY * newScale;
    
    setTransform({
      scale: newScale,
      translateX: newTranslateX,
      translateY: newTranslateY
    });
  }, [transform]);

  const handleZoomOut = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Punto del mundo antes del zoom (centro del canvas)
    const worldX = (centerX - transform.translateX) / transform.scale;
    const worldY = (centerY - transform.translateY) / transform.scale;
    
    const newScale = Math.max(transform.scale * 0.8, 0.05);
    
    // Calcular nueva posición para mantener el centro fijo
    const newTranslateX = centerX - worldX * newScale;
    const newTranslateY = centerY - worldY * newScale;
    
    setTransform({
      scale: newScale,
      translateX: newTranslateX,
      translateY: newTranslateY
    });
  }, [transform]);

  const handleResetView = useCallback(() => {
    if (imageDimensions.width > 0 && imageDimensions.height > 0) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      
      // Calcular escala para ajustar la imagen al canvas
      const scaleX = rect.width / imageDimensions.width;
      const scaleY = rect.height / imageDimensions.height;
      const fitScale = Math.min(scaleX, scaleY) * 0.9; // 90% para dejar margen
      
      // Centrar la imagen
      const offsetX = (rect.width - imageDimensions.width * fitScale) / 2;
      const offsetY = (rect.height - imageDimensions.height * fitScale) / 2;
      
      console.log('Reset view:', {
        imageDims: imageDimensions,
        canvasDims: [rect.width, rect.height],
        scale: fitScale,
        offset: [offsetX, offsetY]
      });
      
      setTransform({
        scale: fitScale,
        translateX: offsetX,
        translateY: offsetY
      });
    } else {
      // Fallback si no hay imagen cargada
    setTransform({
      scale: 1,
      translateX: 0,
      translateY: 0
    });
    }
  }, [imageDimensions]);

    // Mouse event handlers
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    
    const canvasCoord = coordinates.screenToCanvas(e.clientX, e.clientY);
    const worldCoord = coordinates.canvasToWorld(canvasCoord.x, canvasCoord.y);
    
    // Handle different tools
    switch (vectorEditing.activeTool) {
      case TOOL_TYPES.DELETE_VERTEX:
        // Usar coordenadas de imagen para borrar vértices
        const imageCoordForDelete = coordinates.screenToImageCoordinates(e.clientX, e.clientY);
        if (vectorEditing.eraseVertexAt(imageCoordForDelete.x, imageCoordForDelete.y)) {
          // Iniciar modo de arrastre para borrar múltiples vértices
          setDragState({
            isDragging: true,
            dragType: 'erase',
            startX: e.clientX,
            startY: e.clientY,
            targetData: null
          });
        }
        return;

      case TOOL_TYPES.ADD_VERTEX:
        if (vectorEditing.addVertexToEdge(worldCoord.x, worldCoord.y)) {
          return; // Successfully added vertex
        }
        break;

      case TOOL_TYPES.DRAW_LINE:
        if (!vectorEditing.isDrawing) {
          vectorEditing.startDrawing(e.clientX, e.clientY);
        } else {
          // Add point to current drawing
          vectorEditing.continueDrawing(e.clientX, e.clientY);
          
          // Double click or right click to finish
          if (e.detail === 2 || e.button === 2) {
            vectorEditing.finishDrawing();
          }
        }
        return;

      case TOOL_TYPES.SELECT:
        // NUEVA IMPLEMENTACIÓN: Selección de vértices precisa desde cero
        const imageCoord = coordinates.screenToImageCoordinates(e.clientX, e.clientY);
        
        // Usar tolerancia muy pequeña para detección precisa (solo 8px en imagen)
        const preciseTolerance = 8;
        const vertexAtPosition = vectorEditing.findVertexAt(imageCoord.x, imageCoord.y, preciseTolerance);
        
        if (vertexAtPosition) {
          console.log('🎯 Vértice detectado con precisión:', vertexAtPosition);
          
          // Solo permitir drag si el cursor está EXACTAMENTE sobre el vértice
          setDragState({
            isDragging: true,
            dragType: 'precise-vertex',
            startX: e.clientX,
            startY: e.clientY,
            targetVertex: vertexAtPosition,
            originalPosition: {
              x: vertexAtPosition.point[0],
              y: vertexAtPosition.point[1]
            }
          });
          
          console.log('🎯 Iniciando arrastre preciso de vértice');
          e.preventDefault();
          return;
        } else {
          // Si no hay vértice exactamente bajo el cursor, comportamiento normal (pan)
          console.log('Sin vértice exacto bajo cursor - permitir pan normal');
        }
        break;

      case TOOL_TYPES.CONNECT_POINTS:
        // Seleccionar puntos para conectar - CORRECCIÓN: usar coordenadas de imagen
        const imageCoordConnect = coordinates.screenToImageCoordinates(e.clientX, e.clientY);
        const pointToConnect = vectorEditing.findVertexAt(imageCoordConnect.x, imageCoordConnect.y);
        if (pointToConnect) {
          vectorEditing.selectPointToConnect({
            type: pointToConnect.type,
            vectorIndex: pointToConnect.vectorIndex,
            pointIndex: pointToConnect.pointIndex,
            point: pointToConnect.point
          });
        }
        return;

      case TOOL_TYPES.MANUAL_SUBLOT:
        // Manejo de selección manual de vértices para crear sublotes
        const imageCoordManual = coordinates.screenToImageCoordinates(e.clientX, e.clientY);
        const wasHandled = manualSublot.handleCanvasClick(
          imageCoordManual.x, 
          imageCoordManual.y, 
          editableVectors
        );
        
        if (wasHandled) {
          // console.log('🎯 Clic manejado por selección manual de sublotes'); // Comentado para reducir logs
          return;
        }
        break;

      case TOOL_TYPES.PAN:
      default:
        // Pan mode or default behavior
        break;
    }

    // Default: Start panning
    setDragState({
      isDragging: true,
      dragType: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      targetData: null
    });
  }, [
    coordinates, 
    vectorEditing,
    editableVectors,
    manualSublot
  ]);

  const handleMouseMove = useCallback((e) => {
    // Evitar procesamiento si no hay canvas
    if (!canvasRef.current || !coordinates) return;
    
    // Update mouse position for tool cursors
    const canvasCoord = coordinates.screenToCanvas(e.clientX, e.clientY);
    setMousePosition(canvasCoord);

    // Handle drawing mode
    if (vectorEditing.isDrawing && vectorEditing.activeTool === TOOL_TYPES.DRAW_LINE) {
      vectorEditing.continueDrawing(e.clientX, e.clientY);
      return;
    }

    // Handle dragging
    if (!dragState.isDragging) return;

    // CORREGIDO: Pan mode con validaciones
    if (dragState.dragType === 'pan') {
      e.preventDefault();
      const deltaX = e.clientX - dragState.startX;
      const deltaY = e.clientY - dragState.startY;
      
      // Solo aplicar transformación si el delta es significativo
      if (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0) {
      setTransform(prev => ({
        ...prev,
        translateX: prev.translateX + deltaX,
        translateY: prev.translateY + deltaY
      }));
      
        setDragState(prev => ({ 
          ...prev, 
          startX: e.clientX, 
          startY: e.clientY 
        }));
      }
      
    } else if (dragState.dragType === 'precise-vertex' && dragState.targetVertex) {
      e.preventDefault();
      
      try {
        const imageCoord = coordinates.screenToImageCoordinates(e.clientX, e.clientY);
        const targetVertex = dragState.targetVertex;
        
        // NUEVA LÓGICA: Movimiento preciso de vértice usando el sistema compartido
        if (targetVertex.vertexId) {
          // Usar el sistema de vértices compartidos para mover todas las conexiones
          vectorEditing.moveVertexTo(targetVertex.vertexId, imageCoord.x, imageCoord.y);
        } else {
          // Fallback: mover vértice individual
          const { type, vectorIndex, pointIndex } = targetVertex;
          
          if (editableVectors[type] && editableVectors[type][vectorIndex]) {
            setEditableVectors(prev => {
              const newVectors = { ...prev };
              const newVector = [...newVectors[type][vectorIndex]];
              if (pointIndex >= 0 && pointIndex < newVector.length) {
                newVector[pointIndex] = [imageCoord.x, imageCoord.y];
                newVectors[type][vectorIndex] = newVector;
              }
              return newVectors;
            });
          }
        }
        
        console.log('🎯 Moviendo vértice con precisión a:', imageCoord);
        
      } catch (error) {
        console.error('Error en arrastre preciso de vértice:', error);
        setDragState(prev => ({ 
          ...prev, 
          isDragging: false,
          dragType: null
        }));
      }
      
    } else if (dragState.dragType === 'vertex' && dragState.targetData) {
      // MANTENER compatibilidad con sistema anterior para otras funcionalidades
      e.preventDefault();
      
      try {
        const imageCoord = coordinates.screenToImageCoordinates(e.clientX, e.clientY);
        const targetData = dragState.targetData;
        
        // Si el vértice tiene un vertexId (vértice compartido), usar el sistema mejorado
        if (targetData.vertexId) {
          // Detectar si hay un vértice cercano para fusionar
          const nearbyVertex = vectorEditing.findVertexAt(imageCoord.x, imageCoord.y, 150);
          
          if (nearbyVertex && nearbyVertex.vertexId && nearbyVertex.vertexId !== targetData.vertexId) {
            // Marcar para fusión posterior
            setDragState(prev => ({ 
              ...prev, 
              willMergeWith: nearbyVertex 
            }));
          } else {
            // Limpiar marca de fusión y mover el vértice
            setDragState(prev => ({ 
              ...prev, 
              willMergeWith: null 
            }));
            
            // Mover vértice usando el sistema compartido
            vectorEditing.moveVertexTo(targetData.vertexId, imageCoord.x, imageCoord.y);
          }
        } else {
          // Fallback para vértices no compartidos (sistema anterior)
          const { type, vectorIndex, pointIndex } = targetData;
          
          if (editableVectors[type] && editableVectors[type][vectorIndex]) {
            setEditableVectors(prev => {
              const newVectors = { ...prev };
              const newVector = [...newVectors[type][vectorIndex]];
              if (pointIndex >= 0 && pointIndex < newVector.length) {
                newVector[pointIndex] = [imageCoord.x, imageCoord.y];
                newVectors[type][vectorIndex] = newVector;
              }
              return newVectors;
            });
          }
        }
      } catch (error) {
        console.error('Error en arrastre de vértice:', error);
        setDragState(prev => ({ 
          ...prev, 
          isDragging: false,
          dragType: null,
          willMergeWith: null 
        }));
      }
      
    } else if (dragState.dragType === 'erase') {
      e.preventDefault();
      // Modo borrador: eliminar vértices mientras se arrastra
      try {
        const imageCoordForErase = coordinates.screenToImageCoordinates(e.clientX, e.clientY);
        vectorEditing.eraseVertexAt(imageCoordForErase.x, imageCoordForErase.y);
      } catch (error) {
        console.error('Error en modo borrador:', error);
      }
    }
  }, [dragState, coordinates, vectorEditing, editableVectors, canvasRef]);

  // Función auxiliar para fusionar vértices con manejo mejorado de conexiones
  const mergeVertices = useCallback((draggedVertex, targetVertex) => {
    if (!draggedVertex || !targetVertex) {
      console.warn('Vértices inválidos para fusión:', { draggedVertex, targetVertex });
      return;
    }
    
    console.log('Fusionando vértices:', draggedVertex, 'con', targetVertex);
    
    // Limpiar selecciones antes de fusionar para evitar referencias rotas
    vectorEditing.clearSelection();
    
    setEditableVectors(prev => {
      try {
        const newVectors = JSON.parse(JSON.stringify(prev)); // Deep copy
        
        // Validar que los vectores existan
        if (!newVectors[draggedVertex.type] || !newVectors[targetVertex.type] ||
            !newVectors[draggedVertex.type][draggedVertex.vectorIndex] ||
            !newVectors[targetVertex.type][targetVertex.vectorIndex]) {
          console.warn('Vectores no encontrados para fusión');
          return prev;
        }
        
        const draggedVector = newVectors[draggedVertex.type][draggedVertex.vectorIndex];
        const targetVector = newVectors[targetVertex.type][targetVertex.vectorIndex];
        
        // Validar índices de puntos
        if (draggedVertex.pointIndex < 0 || draggedVertex.pointIndex >= draggedVector.length ||
            targetVertex.pointIndex < 0 || targetVertex.pointIndex >= targetVector.length) {
          console.warn('Índices de puntos inválidos');
          return prev;
        }
        
        // Caso 1: Mismo vector - fusionar puntos internos
        if (draggedVertex.type === targetVertex.type && 
            draggedVertex.vectorIndex === targetVertex.vectorIndex) {
          
          // No permitir fusión si los puntos son adyacentes
          if (Math.abs(draggedVertex.pointIndex - targetVertex.pointIndex) <= 1) {
            console.log('No se pueden fusionar puntos adyacentes en el mismo vector');
            return prev;
          }
          
          // Mover conexiones del punto que desaparecerá
          // const keepIndex = Math.min(draggedVertex.pointIndex, targetVertex.pointIndex);
          const removeIndex = Math.max(draggedVertex.pointIndex, targetVertex.pointIndex);
          
          // Remover el punto duplicado
          draggedVector.splice(removeIndex, 1);
          
          console.log('Fusión dentro del mismo vector completada');
          
        } 
        // Caso 2: Vectores diferentes
        else {
          // Mover el punto arrastrado a la posición del objetivo
          draggedVector[draggedVertex.pointIndex] = [...targetVertex.point];
          
          // Si ambos puntos son extremos, intentar conectar vectores
          const isDraggedExtreme = draggedVertex.pointIndex === 0 || 
                                   draggedVertex.pointIndex === draggedVector.length - 1;
          const isTargetExtreme = targetVertex.pointIndex === 0 || 
                                 targetVertex.pointIndex === targetVector.length - 1;
          
          if (isDraggedExtreme && isTargetExtreme) {
            console.log('Conectando vectores por extremos');
            
            try {
              const draggedAtStart = draggedVertex.pointIndex === 0;
              const targetAtStart = targetVertex.pointIndex === 0;
              let combinedVector = [];
              
              if (draggedAtStart && targetAtStart) {
                // Ambos al inicio: invertir arrastrado y concatenar
                combinedVector = [...draggedVector.slice().reverse(), ...targetVector.slice(1)];
              } else if (draggedAtStart && !targetAtStart) {
                // Arrastrado al inicio + objetivo al final
                combinedVector = [...targetVector, ...draggedVector.slice(1)];
              } else if (!draggedAtStart && targetAtStart) {
                // Arrastrado al final + objetivo al inicio  
                combinedVector = [...draggedVector, ...targetVector.slice(1)];
              } else {
                // Ambos al final: invertir objetivo y concatenar
                combinedVector = [...draggedVector, ...targetVector.slice().reverse().slice(1)];
              }
              
              // Reemplazar el vector objetivo con el combinado
              newVectors[targetVertex.type][targetVertex.vectorIndex] = combinedVector;
              
              // Marcar el vector arrastrado para eliminación
              newVectors[draggedVertex.type][draggedVertex.vectorIndex] = null;
              
            } catch (error) {
              console.error('Error conectando vectores:', error);
            }
          }
          
          console.log('Fusión entre vectores diferentes completada');
        }
        
        // Limpiar vectores marcados para eliminación y filtrar vacíos
        Object.keys(newVectors).forEach(type => {
          newVectors[type] = newVectors[type]
            .filter(vector => vector !== null && vector && vector.length >= 2);
        });
        
        return newVectors;
        
      } catch (error) {
        console.error('Error en fusión de vértices:', error);
        return prev; // Retornar estado anterior en caso de error
      }
    });

    // Limpiar selecciones después de la fusión para evitar referencias rotas
    // NOTA: Removido setTimeout que podría causar problemas de estado
  }, [setEditableVectors, vectorEditing]);

  const handleMouseUp = useCallback((e) => {
    e?.preventDefault?.();
    
    // MEJORA: Fusionar vértices usando el sistema compartido
    if (dragState.willMergeWith && dragState.targetData) {
      try {
        if (dragState.targetData.vertexId && dragState.willMergeWith.vertexId) {
          // Usar el sistema de vértices compartidos para la fusión
          const mergeResult = vectorEditing.vertexSystem.connectVertices(
            dragState.targetData.vertexId, 
            dragState.willMergeWith.vertexId
          );
          
          if (mergeResult) {
            console.log('✅ Vértices fusionados exitosamente:', mergeResult);
            
            // Actualizar vectores para reflejar la fusión
            setEditableVectors(prev => {
              const newVectors = JSON.parse(JSON.stringify(prev));
              
              mergeResult.allConnections.forEach(conn => {
                const vector = newVectors[conn.vectorType][conn.vectorIndex];
                if (vector && vector[conn.pointIndex]) {
                  const pos = vectorEditing.vertexSystem.getVertexPosition(mergeResult.mergedVertexId);
                  if (pos) {
                    vector[conn.pointIndex] = [pos.x, pos.y];
                  }
                }
              });
              
              return newVectors;
            });
          }
        } else {
          // Fallback al sistema anterior
          mergeVertices(dragState.targetData, dragState.willMergeWith);
        }
      } catch (error) {
        console.error('Error al fusionar vértices:', error);
      }
    }
    
    // Limpiar estado de arrastre
    setDragState({
      isDragging: false,
      dragType: null,
      startX: 0,
      startY: 0,
      targetData: null,
      willMergeWith: null
    });
  }, [dragState.willMergeWith, dragState.targetData, mergeVertices, vectorEditing.vertexSystem]);

  const handleWheel = useCallback((e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      
      // Validaciones iniciales
      const canvas = canvasRef.current;
      if (!canvas || !coordinates) return;
      
      try {
        const rect = canvas.getBoundingClientRect();
        
        // Obtener posición del mouse relativa al canvas
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Validar posición del mouse
        if (mouseX < 0 || mouseX > rect.width || mouseY < 0 || mouseY > rect.height) {
          return; // Mouse fuera del canvas
        }
        
        // Punto del mundo antes del zoom
        const worldX = (mouseX - transform.translateX) / transform.scale;
        const worldY = (mouseY - transform.translateY) / transform.scale;
        
        // Aplicar zoom con validaciones
        const zoomFactor = e.deltaY > 0 ? 0.85 : 1.15;
        const newScale = Math.min(Math.max(transform.scale * zoomFactor, 0.05), 8);
        
        // Solo aplicar si hay cambio significativo
        if (Math.abs(newScale - transform.scale) < 0.001) return;
        
        // Calcular nueva posición para mantener el punto del mouse fijo
        const newTranslateX = mouseX - worldX * newScale;
        const newTranslateY = mouseY - worldY * newScale;
        
        // Validar que los valores son finitos
        if (!isFinite(newScale) || !isFinite(newTranslateX) || !isFinite(newTranslateY)) {
          console.warn('Valores de transformación inválidos detectados');
          return;
        }
        
        console.log('Zoom aplicado:', {
          oldScale: transform.scale.toFixed(3),
          newScale: newScale.toFixed(3),
          mousePos: [mouseX.toFixed(1), mouseY.toFixed(1)],
          worldPos: [worldX.toFixed(1), worldY.toFixed(1)]
        });
        
        setTransform({
        scale: newScale,
          translateX: newTranslateX,
          translateY: newTranslateY
        });
      } catch (error) {
        console.error('Error en handleWheel:', error);
      }
    }
  }, [transform, canvasRef, coordinates]);



  const handleSave = useCallback(async () => {
    // Validate vectors
    const allVectors = [...editableVectors.bordes_externos, ...editableVectors.sublotes];
    if (allVectors.length === 0) {
      alert('No hay vectores para guardar.');
      return;
    }

    for (const vector of allVectors) {
      if (!Array.isArray(vector) || vector.length < 2) {
        alert('Cada vector debe tener al menos 2 vértices.');
        return;
      }
      for (const point of vector) {
        if (!isFinite(point[0]) || !isFinite(point[1])) {
          alert('Coordenadas no válidas detectadas.');
          return;
        }
      }
    }

    // Pedir nombre del plano
    const nombrePlano = prompt('Ingrese el nombre del plano:', 'Plano ' + new Date().toLocaleDateString());
    if (!nombrePlano) {
      return; // Usuario canceló
    }

    try {
      // Preparar datos del plano
      const planoData = {
        nombre: nombrePlano,
        vectores: allVectors,
        bordes_externos: editableVectors.bordes_externos,
        sublotes: editableVectors.sublotes
      };

      // Guardar plano
      const savedPlano = await guardarPlano(planoData);
      console.log('Plano guardado:', savedPlano);

      // Crear lotes de los sublotes detectados
      if (editableVectors.sublotes.length > 0) {
        for (let i = 0; i < editableVectors.sublotes.length; i++) {
          const sublote = editableVectors.sublotes[i];
          
          const loteData = {
            plano: savedPlano.id,
            numero: `L${i + 1}`,
            descripcion: `Sublote detectado automáticamente`,
            vertices: sublote,
            area: null, // El área será ingresada manualmente por el usuario
            estado: 'disponible'
          };

          try {
            await lotesService.crearLote(loteData);
            console.log(`Lote ${i + 1} creado exitosamente`);
          } catch (error) {
            console.error(`Error al crear lote ${i + 1}:`, error);
          }
        }
      }

      alert(`Plano "${nombrePlano}" guardado exitosamente con ${editableVectors.sublotes.length} lotes.`);
      
      // Navigate to digital plano visualization page instead of lotes list
      if (savedPlano && savedPlano.id) {
        navigate(`/plano-digital/${savedPlano.id}`);
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar el plano. Por favor, intente nuevamente.');
    }
  }, [editableVectors, guardarPlano, navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle shortcuts when canvas container is focused or no input is focused
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 's':
          vectorEditing.setTool(TOOL_TYPES.SELECT);
          break;
        case 'd':
          if (editableVectors.bordes_externos.length > 0 || editableVectors.sublotes.length > 0) {
            vectorEditing.setTool(TOOL_TYPES.DELETE_VERTEX);
          }
          break;
        case 'a':
          if (editableVectors.bordes_externos.length > 0 || editableVectors.sublotes.length > 0) {
            vectorEditing.setTool(TOOL_TYPES.ADD_VERTEX);
          }
          break;
        case 'l':
          vectorEditing.setTool(TOOL_TYPES.DRAW_LINE);
          break;
        case 'c':
          if (editableVectors.bordes_externos.length > 0 || editableVectors.sublotes.length > 0) {
            vectorEditing.setTool(TOOL_TYPES.CONNECT_POINTS);
          }
          break;
        case 'm':
          if (editableVectors.bordes_externos.length > 0 || editableVectors.sublotes.length > 0) {
            vectorEditing.setTool(TOOL_TYPES.MANUAL_SUBLOT);
          }
          break;
        case ' ':
          e.preventDefault();
          vectorEditing.setTool(TOOL_TYPES.PAN);
          break;
        case 'escape':
          vectorEditing.cancelDrawing();
          vectorEditing.clearSelection();
          break;
        case 'delete':
        case 'backspace':
          e.preventDefault();
          vectorEditing.deleteSelectedVertices();
          break;
        default:
          // Ignore other keys
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [vectorEditing, editableVectors]);

  // Add event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (vectorEditing.isDrawing) {
        vectorEditing.finishDrawing();
      }
    });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
      canvas.removeEventListener('contextmenu', () => {});
    };
  }, [handleWheel, handleMouseDown, handleMouseMove, handleMouseUp, vectorEditing, handleToolChange]);

  // Get appropriate cursor for current tool
  const getCursor = useCallback(() => {
    if (dragState.isDragging) {
      if (dragState.dragType === 'vertex' || dragState.dragType === 'precise-vertex') {
        return 'grabbing';
      }
      return 'move';
    }

    // NUEVA LÓGICA: Detectar si el mouse está EXACTAMENTE sobre un vértice en modo SELECT
    if (vectorEditing.activeTool === TOOL_TYPES.SELECT && mousePosition) {
      // Convertir posición del mouse a coordenadas de imagen
      const imageCoord = coordinates.canvasToImage(mousePosition.x, mousePosition.y);
      
      // Usar la misma tolerancia precisa que en mouseDown (8px)
      const preciseTolerance = 150;
      const nearestVertex = vectorEditing.findVertexAt(imageCoord.x, imageCoord.y, preciseTolerance);
      
      if (nearestVertex) {
        return 'grab'; // Solo mostrar cursor de grab cuando está exactamente sobre el vértice
      }
    }
    
    switch (vectorEditing.activeTool) {
      case TOOL_TYPES.SELECT:
        return 'default';
      case TOOL_TYPES.DELETE_VERTEX:
        return 'none'; // Ocultar cursor nativo para mostrar el borrador personalizado
      case TOOL_TYPES.ADD_VERTEX:
        return 'none'; // Ocultar cursor nativo para mostrar el plus personalizado
      case TOOL_TYPES.DRAW_LINE:
        return 'none'; // Ocultar cursor nativo para mostrar la cruz personalizada
      case TOOL_TYPES.CONNECT_POINTS:
        return 'none'; // Ocultar cursor nativo para mostrar el icono de conexión personalizado
      case TOOL_TYPES.MANUAL_SUBLOT:
        return 'crosshair'; // Cursor de selección para crear sublotes manualmente
      case TOOL_TYPES.PAN:
        return 'grab';
      default:
        return 'default';
    }
  }, [dragState, mousePosition, coordinates, vectorEditing]);

  return (
    <div id="canvasSection" className="hidden lg:block lg:col-span-12">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Plano Interactivo</h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Bordes: {editableVectors.bordes_externos.length} | Sublotes: {editableVectors.sublotes.length} 
                | Zoom: {Math.round(transform.scale * 100)}%
              </span>

              <button
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-lg hover:shadow-lg transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSave}
                disabled={editableVectors.bordes_externos.length === 0 && editableVectors.sublotes.length === 0}
              >
                Guardar Vectores
              </button>
            </div>
          </div>
        </div>
        
        <div className="relative">
          <div 
            ref={containerRef}
            className="relative overflow-hidden bg-gray-100"
            style={{
              width: '100%',
              height: '80vh',
              cursor: getCursor()
            }}
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0"
              style={{ 
                width: '100%', 
                height: '100%',
              }}
            />
            
            {/* Selected Vertices Overlay for Manual Sublot Creation */}
            <SelectedVerticesOverlay
              selectedVertices={manualSublot.selectedVertices}
              sublotPreview={manualSublot.sublotPreview}
              isActive={manualSublot.isActive}
              canvasScale={transform.scale}
              canvasOffset={{ x: transform.translateX, y: transform.translateY }}
            />
            
            {/* Manual Sublot Creator Dialog */}
            <ManualSublotCreator
              show={manualSublot.showCreateSublotOption}
              selectedVertices={manualSublot.selectedVertices}
              sublotPreview={manualSublot.sublotPreview}
              onCreateSublot={handleCreateManualSublot}
              onCancel={manualSublot.cancelSelection}
              canvasRect={containerRef.current?.getBoundingClientRect()}
            />
            
            {/* Zoom Controls */}
            <ZoomControls
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetView={handleResetView}
            />

            {/* Drawing Tools */}
            {imagenUrl && (
              <DrawingTools
                activeTool={vectorEditing.activeTool}
                onToolChange={handleToolChange}
                onDeleteSelectedVertices={vectorEditing.deleteSelectedVertices}
                vectorCount={editableVectors.bordes_externos.length + editableVectors.sublotes.length}
                className="absolute top-4 left-4 max-w-64"
              />
            )}
          </div>
        </div>
      </div>

      {/* Editor de Lotes eliminado - funcionalidad automática */}

      {/* Notificación personalizada */}
      {notification.notification && (
        <CustomNotification
          type={notification.notification.type}
          title={notification.notification.title}
          message={notification.notification.message}
          details={notification.notification.details}
          isVisible={true}
          onClose={notification.hideNotification}
          duration={notification.notification.duration}
        />
      )}
    </div>
  );
}

export default CanvasSection;