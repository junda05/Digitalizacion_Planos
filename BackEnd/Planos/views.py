from rest_framework import generics, views, status
from rest_framework.response import Response
from .models import Plano
from .serializers import PlanoSerializer
from .Services.extractor import procesar_imagen

CFG = {
    "blur": 3,
    "canny_low": 50,
    "canny_high": 150,
    "morph_kernel": 2,
    "min_contour_area": 1000,
    "epsilon": 2.0,  # Simplificación de contornos
    "min_sublot_area": 500,  # Área mínima para sublotes
    "min_angle": 40.0  # Ángulo mínimo para sublotes válidos
}

# Subir imagen y procesar
class ProcesarPlanoAPIView(views.APIView):
    def post(self, request):
        archivo = request.FILES.get('archivo')
        if not archivo:
            return Response({'error': 'Archivo requerido'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            resultado = procesar_imagen(archivo, CFG)
            
            # La nueva estructura incluye clasificación de vectores
            response_data = {
                'vectores': resultado.get('vectores', []),  # Retrocompatibilidad
                'bordes_externos': resultado.get('bordes_externos', []),
                'sublotes': resultado.get('sublotes', []),
                'total_vectores': len(resultado.get('vectores', [])),
                'total_bordes_externos': len(resultado.get('bordes_externos', [])),
                'total_sublotes': len(resultado.get('sublotes', []))
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Error al procesar la imagen', 
                'detalle': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
# Guardar vectores editados
class GuardarPlanoAPIView(generics.CreateAPIView):
    queryset = Plano.objects.all()
    serializer_class = PlanoSerializer
    
# Listar planos
class ListarPlanosAPIView(generics.ListAPIView):
    queryset = Plano.objects.all()
    serializer_class = PlanoSerializer

# Obtener plano por ID
class ObtenerPlanoAPIView(generics.RetrieveAPIView):
    queryset = Plano.objects.all()
    serializer_class = PlanoSerializer