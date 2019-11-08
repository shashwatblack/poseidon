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
