from rest_framework import serializers
from .models import Lote

class LoteSerializer(serializers.ModelSerializer):
    area_calculada = serializers.SerializerMethodField()
    
    class Meta:
        model = Lote
        fields = [
            'id', 'plano', 'nombre', 'descripcion', 'vertices', 
            'area', 'area_calculada', 'medidas_lados', 'precio', 'estado', 
            'creado', 'actualizado'
        ]
        extra_kwargs = {
            'plano': {'required': False},
            'nombre': {'required': False},
            'area': {'required': False},
            'precio': {'required': False},
        }

    def get_area_calculada(self, obj):
        """Calcula el área del polígono usando los vértices"""
        if not obj.vertices or len(obj.vertices) < 3:
            return None
        
        # Fórmula del área usando el algoritmo de Shoelace
        vertices = obj.vertices
        n = len(vertices)
        area = 0
        
        for i in range(n):
            j = (i + 1) % n
            area += vertices[i][0] * vertices[j][1]
            area -= vertices[j][0] * vertices[i][1]
        
        return abs(area) / 2.0

    def create(self, validated_data):
        # Generar nombre automático si no se proporciona
        if not validated_data.get('nombre'):
            last_lote = Lote.objects.last()
            next_id = (last_lote.id + 1) if last_lote else 1
            validated_data['nombre'] = f'Lote-{next_id:03d}'
        
        return super().create(validated_data)