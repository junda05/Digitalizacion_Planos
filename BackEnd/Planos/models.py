from django.db import models

class Plano(models.Model):
    nombre = models.CharField(max_length=255)
    vectores = models.JSONField(default=list)  # Mantener para retrocompatibilidad
    bordes_externos = models.JSONField(default=list)  # Nuevos campos estructurados
    sublotes = models.JSONField(default=list)
    imagen_url = models.URLField(blank=True, null=True)  # Para guardar la URL de la imagen si es necesario
    creado = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.nombre