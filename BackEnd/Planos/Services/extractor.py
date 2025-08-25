import cv2
import numpy as np
from pdf2image import convert_from_bytes
from PIL import Image
import io
from typing import List, Tuple, Dict
import math
from collections import defaultdict

def distance_point_to_line(point: np.ndarray, line_start: np.ndarray, line_end: np.ndarray) -> float:
    """Calcula la distancia perpendicular de un punto a una línea."""
    if np.array_equal(line_start, line_end):
        return np.linalg.norm(point - line_start)
    
    line_vec = line_end - line_start
    point_vec = point - line_start
    line_length = np.linalg.norm(line_vec)
    line_unit_vec = line_vec / line_length
    projection_length = np.dot(point_vec, line_unit_vec)
    
    if projection_length < 0:
        return np.linalg.norm(point - line_start)
    elif projection_length > line_length:
        return np.linalg.norm(point - line_end)
    else:
        projection = line_start + projection_length * line_unit_vec
        return np.linalg.norm(point - projection)

def ramer_douglas_peucker(points: np.ndarray, epsilon: float) -> List[np.ndarray]:
    """Implementa el algoritmo de Ramer-Douglas-Peucker para simplificar una curva."""
    if len(points) <= 2:
        return points.tolist()
    
    # Encuentra el punto más lejano
    dmax = 0
    index = 0
    end = len(points) - 1
    
    for i in range(1, end):
        d = distance_point_to_line(points[i], points[0], points[end])
        if d > dmax:
            index = i
            dmax = d
    
    # Si la distancia máxima es mayor que epsilon, recursivamente simplifica
    if dmax > epsilon:
        results1 = ramer_douglas_peucker(points[:index + 1], epsilon)
        results2 = ramer_douglas_peucker(points[index:], epsilon)
        return results1[:-1] + results2
    else:
        return [points[0], points[end]]

def simplify_contours(contours: List[np.ndarray], epsilon: float) -> List[List[List[int]]]:
    """Simplifica una lista de contornos usando Ramer-Douglas-Peucker."""
    simplified = []
    for contour in contours:
        if len(contour) >= 2:  # Asegurarse de que hay al menos 2 puntos
            points = np.array(contour)
            simplified_contour = ramer_douglas_peucker(points, epsilon)
            # Convertir a enteros y formato de lista
            simplified_contour = [[int(x), int(y)] for x, y in simplified_contour]
            if len(simplified_contour) >= 2:  # Solo agregar si hay al menos 2 puntos
                simplified.append(simplified_contour)
    return simplified

def unify_close_points(contours: List[List[List[int]]], image_shape: Tuple[int, int], merge_distance_percent: float = 0.005) -> List[List[List[int]]]:
    """
    Unifica puntos que están muy cerca usando algoritmo optimizado de clustering espacial.
    OPTIMIZADO: Usa distancias relativas al tamaño de la imagen.
    
    Args:
        contours: Lista de contornos
        image_shape: Tupla (height, width) con las dimensiones de la imagen
        merge_distance_percent: Porcentaje de la diagonal de la imagen para considerar puntos como duplicados
    
    Returns:
        Lista de contornos con puntos unificados y filtrados
    """
    if not contours:
        return contours
    
    # Calcular la distancia de fusión basada en la diagonal de la imagen
    image_height, image_width = image_shape
    image_diagonal = math.sqrt(image_width**2 + image_height**2)
    merge_distance = image_diagonal * merge_distance_percent
    if not contours:
        return contours
    
    print(f"🔄 [OPTIMIZADO] Unificando puntos cercanos con distancia máxima: {merge_distance}px")
    
    # 1. Crear índice espacial para búsqueda eficiente
    spatial_index = defaultdict(list)
    grid_size = merge_distance * 2  # Tamaño de grilla para indexing espacial
    
    all_points = []
    for contour_idx, contour in enumerate(contours):
        for point_idx, point in enumerate(contour):
            x, y = point[0], point[1]
            
            # Indexar por grilla espacial para búsqueda O(1)
            grid_x = int(x // grid_size)
            grid_y = int(y // grid_size)
            grid_key = (grid_x, grid_y)
            
            point_data = {
                'coords': (x, y),
                'contour_idx': contour_idx,
                'point_idx': point_idx,
                'grid_key': grid_key,
                'merged': False,
                'cluster_id': None
            }
            
            all_points.append(point_data)
            spatial_index[grid_key].append(len(all_points) - 1)
    
    # 2. Clustering optimizado usando índice espacial
    clusters = []
    cluster_id = 0
    
    for point_idx, point_data in enumerate(all_points):
        if point_data['merged']:
            continue
        
        # Iniciar nuevo cluster
        cluster = [point_idx]
        point_data['merged'] = True
        point_data['cluster_id'] = cluster_id
        
        # Buscar en grillas adyacentes (3x3)
        grid_x, grid_y = point_data['grid_key']
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                adjacent_key = (grid_x + dx, grid_y + dy)
                
                for candidate_idx in spatial_index.get(adjacent_key, []):
                    candidate = all_points[candidate_idx]
                    
                    if candidate['merged'] or candidate_idx == point_idx:
                        continue
                    
                    # Calcular distancia euclidiana
                    x1, y1 = point_data['coords']
                    x2, y2 = candidate['coords']
                    distance = math.sqrt((x1 - x2)**2 + (y1 - y2)**2)
                    
                    if distance <= merge_distance:
                        cluster.append(candidate_idx)
                        candidate['merged'] = True
                        candidate['cluster_id'] = cluster_id
        
        if len(cluster) > 1:
            clusters.append(cluster)
            print(f"📍 Cluster {cluster_id}: {len(cluster)} puntos cercanos")
        
        cluster_id += 1
    
    print(f"📊 Clustering completado: {len(clusters)} clusters de puntos duplicados")
    
    # 3. Calcular centroides optimizados para cada cluster
    cluster_centroids = {}
    
    for cluster in clusters:
        # Usar weighted centroid para mejor precisión
        total_weight = 0
        weighted_x = 0
        weighted_y = 0
        
        for point_idx in cluster:
            point_data = all_points[point_idx]
            x, y = point_data['coords']
            
            # Peso basado en posición (extremos tienen más peso)
            contour = contours[point_data['contour_idx']]
            is_endpoint = (point_data['point_idx'] == 0 or 
                          point_data['point_idx'] == len(contour) - 1)
            weight = 2.0 if is_endpoint else 1.0
            
            weighted_x += x * weight
            weighted_y += y * weight
            total_weight += weight
        
        centroid_x = int(round(weighted_x / total_weight))
        centroid_y = int(round(weighted_y / total_weight))
        
        # Mapear todos los puntos del cluster al centroide
        for point_idx in cluster:
            point_data = all_points[point_idx]
            key = (point_data['contour_idx'], point_data['point_idx'])
            cluster_centroids[key] = [centroid_x, centroid_y]
    
    # 4. Aplicar unificación con eliminación agresiva de duplicados
    unified_contours = []
    
    for contour_idx, contour in enumerate(contours):
        unified_contour = []
        prev_point = None
        
        for point_idx, original_point in enumerate(contour):
            key = (contour_idx, point_idx)
            
            # Usar centroide si el punto está en un cluster
            if key in cluster_centroids:
                new_point = cluster_centroids[key]
            else:
                new_point = [original_point[0], original_point[1]]
            
            # NUEVA OPTIMIZACIÓN: Eliminar duplicados consecutivos con tolerancia más estricta
            if prev_point is None:
                unified_contour.append(new_point)
                prev_point = new_point
            else:
                distance_to_prev = math.sqrt(
                    (new_point[0] - prev_point[0])**2 + 
                    (new_point[1] - prev_point[1])**2
                )
                
                # Solo agregar si está suficientemente lejos del punto anterior
                if distance_to_prev >= merge_distance * 0.5:  # 50% de la distancia de merge
                    unified_contour.append(new_point)
                    prev_point = new_point
        
        # Validación final del contorno
        if len(unified_contour) >= 2:
            # Verificar que el contorno no sea degenerado
            total_length = 0
            for i in range(len(unified_contour) - 1):
                p1 = unified_contour[i]
                p2 = unified_contour[i + 1]
                total_length += math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)
            
            # Solo mantener contornos con longitud significativa
            if total_length >= merge_distance * 2:
                unified_contours.append(unified_contour)
            else:
                print(f"⚠️ Contorno {contour_idx} descartado por longitud insuficiente: {total_length:.1f}px")
    
    reduction_ratio = (len(contours) - len(unified_contours)) / len(contours) * 100
    print(f"✅ Unificación OPTIMIZADA completada:")
    print(f"   - Contornos: {len(contours)} → {len(unified_contours)} ({reduction_ratio:.1f}% reducción)")
    print(f"   - Clusters eliminados: {len(clusters)}")
    
    return unified_contours

def merge_nearby_endpoints(contours: List[List[List[int]]], image_shape: Tuple[int, int], merge_distance_percent: float = 0.01) -> List[List[List[int]]]:
    """
    Fusiona extremos de contornos que están muy cerca entre sí.
    Útil para conectar líneas que deberían formar un contorno continuo.
    
    Args:
        contours: Lista de contornos
        image_shape: Tupla (height, width) con las dimensiones de la imagen
        merge_distance_percent: Porcentaje de la diagonal de la imagen para fusionar extremos
    
    Returns:
        Lista de contornos con extremos fusionados
    """
    if len(contours) < 2:
        return contours

    # Calcular la distancia de fusión basada en la diagonal de la imagen
    image_height, image_width = image_shape
    image_diagonal = math.sqrt(image_width**2 + image_height**2)
    merge_distance = image_diagonal * merge_distance_percent

    print(f"🔗 Fusionando extremos cercanos con distancia relativa: {merge_distance_percent*100:.3f}% de la diagonal ({merge_distance:.1f}px)")
    if len(contours) < 2:
        return contours
    
    print(f"🔗 Fusionando extremos cercanos con distancia máxima: {merge_distance}px")
    
    # Recolectar información de extremos
    endpoints = []  # Lista de (x, y, contour_idx, is_start)
    
    for contour_idx, contour in enumerate(contours):
        if len(contour) >= 2:
            # Extremo inicial
            start_point = contour[0]
            endpoints.append((start_point[0], start_point[1], contour_idx, True))
            
            # Extremo final
            end_point = contour[-1]
            endpoints.append((end_point[0], end_point[1], contour_idx, False))
    
    # Buscar pares de extremos cercanos
    merge_pairs = []
    used_endpoints = set()
    
    for i, (x1, y1, c1, is_start1) in enumerate(endpoints):
        if i in used_endpoints:
            continue
            
        for j, (x2, y2, c2, is_start2) in enumerate(endpoints[i+1:], i+1):
            if j in used_endpoints or c1 == c2:  # No fusionar extremos del mismo contorno
                continue
                
            distance = math.sqrt((x1 - x2)**2 + (y1 - y2)**2)
            if distance <= merge_distance:
                merge_pairs.append(((c1, is_start1), (c2, is_start2), distance))
                used_endpoints.add(i)
                used_endpoints.add(j)
                break
    
    print(f"🎯 Encontrados {len(merge_pairs)} pares de extremos para fusionar")
    
    # Aplicar fusiones (implementación básica - conectar contornos)
    merged_contours = list(contours)  # Copia inicial
    
    # Ordenar por distancia (fusionar los más cercanos primero)
    merge_pairs.sort(key=lambda x: x[2])
    
    for (c1, is_start1), (c2, is_start2), distance in merge_pairs:
        # Evitar índices fuera de rango
        if c1 >= len(merged_contours) or c2 >= len(merged_contours):
            continue
            
        contour1 = merged_contours[c1]
        contour2 = merged_contours[c2]
        
        if not contour1 or not contour2:
            continue
        
        print(f"🔗 Fusionando contornos {c1} y {c2} (distancia: {distance:.1f}px)")
        
        # Determinar cómo conectar los contornos
        try:
            if is_start1 and is_start2:
                # Conectar inicio con inicio: invertir uno y concatenar
                merged_contour = list(reversed(contour1)) + contour2
            elif is_start1 and not is_start2:
                # Conectar inicio de c1 con final de c2
                merged_contour = contour2 + contour1
            elif not is_start1 and is_start2:
                # Conectar final de c1 con inicio de c2
                merged_contour = contour1 + contour2
            else:
                # Conectar final con final: invertir uno y concatenar
                merged_contour = contour1 + list(reversed(contour2))
            
            # Reemplazar el primer contorno y marcar el segundo para eliminación
            merged_contours[c1] = merged_contour
            merged_contours[c2] = None  # Marcar para eliminación
            
        except Exception as e:
            print(f"⚠️ Error fusionando contornos {c1} y {c2}: {e}")
    
    # Filtrar contornos marcados como None
    final_contours = [c for c in merged_contours if c is not None and len(c) >= 2]
    
    print(f"✅ Fusión de extremos completada: {len(contours)} → {len(final_contours)} contornos")
    return final_contours

def calculate_polygon_angles(polygon: List[List[int]]) -> List[float]:
    """Calcula todos los ángulos internos de un polígono en grados."""
    if len(polygon) < 3:
        return []
    
    angles = []
    n = len(polygon)
    
    for i in range(n):
        # Obtener tres puntos consecutivos
        p1 = polygon[i-1]
        p2 = polygon[i]
        p3 = polygon[(i+1) % n]
        
        # Vectores desde el punto central
        v1 = np.array([p1[0] - p2[0], p1[1] - p2[1]])
        v2 = np.array([p3[0] - p2[0], p3[1] - p2[1]])
        
        # Calcular el ángulo usando producto punto
        cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
        cos_angle = np.clip(cos_angle, -1.0, 1.0)  # Evitar errores de precisión
        angle_rad = np.arccos(cos_angle)
        angle_deg = math.degrees(angle_rad)
        
        angles.append(angle_deg)
    
    return angles

def is_valid_sublot(polygon: List[List[int]], cfg: Dict) -> bool:
    """Valida si un polígono es un sublote válido (3-7 vértices, ángulos > min_angle)."""
    # Verificar número de vértices
    if len(polygon) < 3 or len(polygon) > 7:
        return False
    
    # Verificar que el área sea suficiente (evitar polígonos muy pequeños)
    vertices_np = np.array(polygon, dtype=np.int32)
    area = cv2.contourArea(vertices_np)
    min_sublot_area = cfg.get("min_sublot_area", 500)
    if area < min_sublot_area:
        return False
    
    # Verificar ángulos mínimos
    min_angle = cfg.get("min_angle", 40.0)
    angles = calculate_polygon_angles(polygon)
    if any(angle < min_angle for angle in angles):
        return False
    
    return True

def classify_contours(contours: List[np.ndarray], hierarchy: np.ndarray, cfg: Dict) -> Dict[str, List[List[List[int]]]]:
    """Clasifica contornos en externos e internos (sublotes)."""
    external_contours = []
    internal_contours = []
    
    for i, contour in enumerate(contours):
        if len(contour) >= 3:
            # Convertir a formato de puntos
            points = contour.squeeze()
            if points.ndim == 2:
                polygon = [[int(x), int(y)] for x, y in points]
                
                # Verificar si es contorno externo o interno usando jerarquía
                # hierarchy[i] = [Next, Previous, First_Child, Parent]
                if hierarchy[0][i][3] == -1:  # Sin padre = contorno externo
                    external_contours.append(polygon)
                else:  # Tiene padre = contorno interno potencial
                    if is_valid_sublot(polygon, cfg):
                        internal_contours.append(polygon)
    
    return {
        'bordes_externos': external_contours,
        'sublotes': internal_contours
    }

def procesar_imagen(archivo, cfg):
    # Detectar si es PDF o imagen
    contenido = archivo.read()
    if archivo.name.lower().endswith('.pdf'):
        pages = convert_from_bytes(contenido, dpi=600, first_page=1, last_page=1)
        img_pil = pages[0].convert('RGB')
        img_np = np.array(img_pil)
        img_np = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
    else:
        img_pil = Image.open(io.BytesIO(contenido)).convert('RGB')
        img_np = np.array(img_pil)
        img_np = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
    
    archivo.close()

    # Preprocesamiento de la imagen
    gray = cv2.cvtColor(img_np, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (cfg["blur"], cfg["blur"]), 0)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    contrast = clahe.apply(blurred)
    
    # Detección de bordes y contornos
    edges = cv2.Canny(contrast, cfg["canny_low"], cfg["canny_high"])
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (cfg["morph_kernel"], cfg["morph_kernel"]))
    edges_morph = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
    
    # Usar RETR_TREE para obtener jerarquía de contornos (externos e internos)
    contours, hierarchy = cv2.findContours(edges_morph, cv2.RETR_TREE, cv2.CHAIN_APPROX_TC89_KCOS)
    
    # Filtrar contornos por área mínima
    filtered_contours = []
    filtered_hierarchy = []
    
    for i, contour in enumerate(contours):
        if cv2.contourArea(contour) > cfg["min_contour_area"]:
            filtered_contours.append(contour)
            if hierarchy is not None:
                filtered_hierarchy.append(hierarchy[0][i])
    
    # Convertir la jerarquía filtrada al formato numpy esperado
    if filtered_hierarchy:
        filtered_hierarchy = np.array([filtered_hierarchy])
    else:
        filtered_hierarchy = np.array([[]])
    
    # Clasificar contornos en externos e internos
    classified_contours = classify_contours(filtered_contours, filtered_hierarchy, cfg)
    
    # Simplificar los contornos clasificados
    epsilon = cfg.get("epsilon", 2.0)
    
    # Usar distancias relativas al tamaño de la imagen para unificación y fusión
    image_shape = img_np.shape[:2]  # (height, width)
    
    # Unificar puntos cercanos en bordes externos con algoritmo optimizado
    merge_distance_percent = cfg.get("merge_distance_percent", 0.005)  # 0.5% de la diagonal
    unified_borders = unify_close_points(classified_contours['bordes_externos'], image_shape, merge_distance_percent)
    
    # Fusionar extremos cercanos con distancia relativa para mejor conectividad
    border_merge_percent = cfg.get("border_merge_percent", 0.005)  # 1% de la diagonal
    merged_borders = merge_nearby_endpoints(unified_borders, image_shape, border_merge_percent)
    
    # También unificar puntos en sublotes con parámetros más estrictos
    unified_sublots = unify_close_points(classified_contours['sublotes'], image_shape, merge_distance_percent * 0.8)
    
    result = {
        'bordes_externos': simplify_contours(
            [np.array(contour) for contour in merged_borders], 
            epsilon
        ),
        'sublotes': simplify_contours(
            [np.array(contour) for contour in unified_sublots], 
            epsilon
        )
    }
    
    # Mantener retrocompatibilidad devolviendo también 'vectores' (todos los contornos)
    all_vectors = result['bordes_externos'] + result['sublotes']
    result['vectores'] = all_vectors
    
    return result