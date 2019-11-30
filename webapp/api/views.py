import json
import random

from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import View

from poseidon.infrastructure.road_network_revised import RoadNetwork
from poseidon.utils.constants import Constants
from poseidon.disasters.earthquakes import GaussianEarthquake


@method_decorator(csrf_exempt, name='dispatch')
class EarthquakeView(View):
    """
    Just an example dummy view
    This is just an example. We probably DON'T need separate views for earthquake and hurricanes and stuff.
    That said, we can possibly think of EarthquakeView as a controller for earthquake disaster related methods
        -- a mediary between our earthquake simulations and the UI interactions.
    """
    def get(self, request):
        return JsonResponse({
            "success": True,
            "EARTH_RADIUS": Constants.EARTH_RADIUS
        })

    def post(self, request):
        data = json.loads(request.body)
        magnitude = float(data['magnitude'] or 0)
        return JsonResponse({
            "success": True,
            "energy": GaussianEarthquake.get_energy_from_magnitude(magnitude)
        })


@method_decorator(csrf_exempt, name='dispatch')
class MapView(View):
    """
    Returns the tile/settlement views of the map
    """
    def get(self, request):
        requested_map_type = request.GET.get('map_type', Constants.SETTLEMENT_VIEW)
        if requested_map_type == Constants.SETTLEMENT_VIEW:
            return JsonResponse(self.get_settlement_view())
        elif requested_map_type == Constants.TILE_VIEW:
            return JsonResponse({})  # todo

    @staticmethod
    def get_dummy_settlement_view():
        # imported locally because just dummy
        import csv
        import random
        cities = list()
        with open('dat/cal.csv') as f:
            for row in csv.DictReader(f):
                cities.append({
                    "city": row['city'],
                    "population": int(row['population']),
                    "lat": float(row['lat']),
                    "lng": float(row['lng']),
                    "damage": random.randint(0, 100)
                })

        edges = list()
        for city1 in random.sample(cities, 10):
            city2 = random.choice(cities)
            edges.append({
                "start": [float(city1['lat']), float(city1['lng'])],
                "end": [float(city2['lat']), float(city2['lng'])],
                "damage": random.randint(0, 100)
            })

        return {
            "cities": cities,
            "edges": edges
        }

    @staticmethod
    def get_settlement_view():
        road_network = RoadNetwork()
        graph_settlement_view = road_network.graph_settlement_view
        cities = list()
        nodes = graph_settlement_view.nodes(data=True)
        for node, attr in nodes:
            pos = attr['pos']
            cities.append({
                "city": attr['name'],
                "population": int(attr['population']),
                "lat": pos.deg_lat,
                "lng": pos.deg_lon,
                "damage": random.randint(0, 100)
            })

        edges = list()
        for u, v in graph_settlement_view.edges():
            start = nodes[u]['pos']
            end = nodes[v]['pos']
            edges.append({
                "start": [start.deg_lat, start.deg_lon],
                "end": [end.deg_lat, end.deg_lon],
                "damage": random.randint(0, 100)
            })

        return {
            "cities": cities,
            "edges": edges
        }
