from django.db import models
from Planos.models import Plano

class Lote(models.Model):
    ESTADO_CHOICES = [
        ('disponible', 'Disponible'),
        ('reservado', 'Reservado'),
        ('vendido', 'Vendido'),
    ]
    
    plano = models.ForeignKey(Plano, on_delete=models.CASCADE, related_name='lotes', null=True, blank=True)
    nombre = models.CharField(max_length=255, blank=True, null=True)
    descripcion = models.TextField(blank=True, null=True)
    vertices = models.JSONField(default=list, help_text="Coordenadas de los vértices del lote")
    area = models.FloatField(null=True, blank=True)
    medidas_lados = models.TextField(blank=True, null=True, help_text="Medidas de los lados del lote")
    precio = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='disponible')
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Lote"
        verbose_name_plural = "Lotes"
        ordering = ['-creado']

    def __str__(self):
        return f"Lote {self.nombre or self.id}"
