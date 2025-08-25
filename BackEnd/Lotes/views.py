from rest_framework import generics
from .models import Lote
from .serializers import LoteSerializer

class LoteListCreateAPIView(generics.ListCreateAPIView):
    queryset = Lote.objects.all()
    serializer_class = LoteSerializer

class LoteDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Lote.objects.all()
    serializer_class = LoteSerializer