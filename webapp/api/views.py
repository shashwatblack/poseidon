import json
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.generic import View
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
            return JsonResponse(self.get_dummy_settlement_view())
        elif requested_map_type == Constants.TILE_VIEW:
            return JsonResponse({})  # todo

    @staticmethod
    def get_dummy_settlement_view():
        import csv
        cities = list()
        with open('dat/cal.csv') as f:
            for row in csv.DictReader(f):
                cities.append({
                    "city": row['city'],
                    "population": int(row['population']),
                    "lat": float(row['lat']),
                    "lng": float(row['lng']),
                })
        return {
            "cities": cities,
            "edges": []  # todo
        }
