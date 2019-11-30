from django.conf.urls import url
from api import views as api_views

urlpatterns = [
    url(r'^simulation/', api_views.DisasterSimulationView.as_view()),
    url(r'^earthquake/', api_views.EarthquakeView.as_view()),
]
