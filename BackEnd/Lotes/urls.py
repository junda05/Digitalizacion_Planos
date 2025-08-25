from django.urls import path
from .views import LoteListCreateAPIView, LoteDetailAPIView

urlpatterns = [
    path('', LoteListCreateAPIView.as_view(), name='listar-crear-lotes'),
    path('<int:pk>/', LoteDetailAPIView.as_view(), name='detalle-lote'),
]