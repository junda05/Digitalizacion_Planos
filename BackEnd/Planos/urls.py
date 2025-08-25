from django.urls import path
from . import views

urlpatterns = [
    path('procesar/', views.ProcesarPlanoAPIView.as_view(), name='procesar-plano'),
    path('guardar/', views.GuardarPlanoAPIView.as_view(), name='guardar-plano'),
    path('listar/', views.ListarPlanosAPIView.as_view(), name='listar-planos'),
    path('<int:pk>/', views.ObtenerPlanoAPIView.as_view(), name='obtener-plano'),
]