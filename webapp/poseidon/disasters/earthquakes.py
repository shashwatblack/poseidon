import numpy as np
from poseidon.disasters.disaster import Disaster
from poseidon.infrastructure.geo_location import GeoLocation


# Just uses a gaussian distribution to model the impact of an earthquake. Epicenter is the heaviest, and then the
# magnitude drops off with increasing distance. The goal is to calculate measures for every coordinate that give us
# some knowledge of how heavily the earthquake was felt in that coordinate.
class GaussianEarthquake(Disaster):

    def __init__(self, params: dict):
        self.epicenter_coords = GeoLocation.from_degrees(params['center']['lat'], params['center']['lng'])
        self.magnitude = params['intensity']
        self.sigma_radius = params['radius']

    def get_disaster_magnitudes_for_coordinates(self, coordinates):
        distances = np.array([self.epicenter_coords.distance_to(coordinate) for coordinate in coordinates])
        region_magnitudes = self.magnitude * np.exp(-np.multiply(distances, distances)/(2 * self.sigma_radius * self.sigma_radius))
        return region_magnitudes


    #  Returns an estimate of the total work done by the earthquake in Joules
    @staticmethod
    def get_energy_from_magnitude(magnitude):
        return np.power(10, 1.5 * (magnitude + 10.7) - 7)
