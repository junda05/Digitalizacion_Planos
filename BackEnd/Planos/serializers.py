from rest_framework import serializers
from .models import Plano

class PlanoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plano
        fields = ['id', 'nombre', 'vectores', 'bordes_externos', 'sublotes', 'imagen_url', 'creado']
        
    def create(self, validated_data):
        # Si no se proporcionan bordes_externos y sublotes pero sí vectores,
        # intentar extraerlos de la estructura antigua
        if 'vectores' in validated_data and not validated_data.get('bordes_externos') and not validated_data.get('sublotes'):
            # Esto mantiene retrocompatibilidad con datos antiguos
            pass
        
        return super().create(validated_data)