import numpy as np
from poseidon.disasters.disaster import Disaster
from poseidon.utils.spatial_utils import haversine_distance


# Just uses a gaussian distribution to model the impact of an earthquake. Epicenter is the heaviest, and then the
# magnitude drops off with increasing distance. The goal is to calculate measures for every coordinate that give us
# some knowledge of how heavily the earthquake was felt in that coordinate.
class GaussianEarthquake(Disaster):

    def __init__(self, epicenter_lat, epicenter_long, magnitude, sigma_radius):
        self.epicenter_coords = (epicenter_lat, epicenter_long)
        self.magnitude = magnitude
        self.sigma_radius = sigma_radius

    def get_disaster_magnitudes_for_coordinates(self, coordinates):
        distances = haversine_distance(self.epicenter_coords, coordinates)
        region_magnitudes = self.magnitude * np.exp(-distances/(self.sigma_radius ** 2))


    #  Returns an estimate of the total work done by the earthquake in Joules
    @staticmethod
    def get_energy_from_magnitude(magnitude):
        return np.power(10, 1.5 * (magnitude + 10.7) - 7)
