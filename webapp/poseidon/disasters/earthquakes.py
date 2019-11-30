import numpy as np
from poseidon.disasters.disaster import Disaster
from poseidon.utils.spatial_utils import haversine_distance


# Just uses a gaussian distribution to model the impact of an earthquake. Epicenter is the heaviest, and then the
# magnitude drops off with increasing distance. The goal is to calculate measures for every coordinate that give us
# some knowledge of how heavily the earthquake was felt in that coordinate.
class GaussianEarthquake(Disaster):

    def __init__(self, params: dict):
        self.epicenter_coords = (params['center']['lat'], params['center']['long'])
        self.magnitude = params['intensity']
        self.sigma_radius = params['radius']

    def get_disaster_magnitudes_for_coordinates(self, coordinates):
        distances = haversine_distance(self.epicenter_coords, coordinates)
        region_magnitudes = self.magnitude * (1/(np.sqrt(2 * np.pi) * self.sigma_radius)) * np.exp(-distances/(self.sigma_radius ** 2))
        return region_magnitudes


    #  Returns an estimate of the total work done by the earthquake in Joules
    @staticmethod
    def get_energy_from_magnitude(magnitude):
        return np.power(10, 1.5 * (magnitude + 10.7) - 7)
