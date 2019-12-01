import numpy as np
from poseidon.disasters.disaster import Disaster
from poseidon.infrastructure.geo_location import GeoLocation


# Just uses a max function over gaussians to model the impact of a hurricane. The earthquake starts at a given position
# with a high strength, then moves in a straight line to a different position with a lower strength. We take several
# points along this line, draw gaussians at each, then take the maximum intensity contribution over all the different
# gaussians.
class LinearHurricane(Disaster):

    def __init__(self, params: dict):
        self.start_coords = GeoLocation.from_degrees(params['start']['center']['lat'], params['start']['center']['lng'])
        self.end_coords = GeoLocation.from_degrees(params['end']['center']['lat'], params['end']['center']['lng'])
        self.start_magnitude = params['start']['intensity']
        self.end_magnitude = params['end']['intensity']
        self.start_radius = params['start']['radius']
        self.end_radius = params['end']['radius']

        self.N_POINTS = 10

    def get_disaster_magnitudes_for_coordinates(self, coordinates):
        multi_magnitudes = []
        lat_increment = (self.end_coords.deg_lat - self.start_coords.deg_lat)/self.N_POINTS
        long_increment = (self.end_coords.deg_lon - self.start_coords.deg_lon)/self.N_POINTS
        magnitude_increment = (self.end_magnitude - self.start_magnitude)/self.N_POINTS
        radius_increment = (self.end_radius - self.start_radius)/self.N_POINTS
        for i in range(self.N_POINTS + 1):
            center = GeoLocation.from_degrees(self.start_coords.deg_lat + i * lat_increment, self.start_coords.deg_lon + i * long_increment)
            magnitude = self.start_magnitude + i * magnitude_increment
            radius = self.start_radius + i * radius_increment

            distances = np.array([center.distance_to(coordinate) for coordinate in coordinates])
            multi_magnitudes.append(magnitude * np.exp(-np.multiply(distances, distances)/(2 * radius * radius)))
        return np.max(np.array(multi_magnitudes), axis=0)


    #  Returns an estimate of the total work done by the earthquake in Joules
    @staticmethod
    def get_energy_from_magnitude(magnitude):
        return np.power(10, 1.5 * (magnitude + 10.7) - 7)
