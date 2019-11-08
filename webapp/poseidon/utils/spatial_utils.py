import numpy as np

from poseidon.utils.constants import Constants


#  Calculates the Euclidean distance between two arrays of coordinates (lat_array, long_array) accounting for earth's curvature
def haversine_distance(coords_sources, coords_destinations, is_degrees=True):
    source_lat, source_long = coords_sources
    destination_lat, destination_long = coords_destinations

    if is_degrees:
        source_lat = np.radians(source_lat)
        source_long = np.radians(source_long)
        destination_lat = np.radians(destination_lat)
        destination_long = np.radians(destination_long)

    latitude_distance = destination_lat - source_lat
    longitude_distance = destination_long - source_long

    a = np.sin(latitude_distance/2) ** 2 + np.cos(source_lat) * np.cos(source_long) * (np.sin(longitude_distance/2) ** 2)
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
    d = Constants.EARTH_RADIUS * c

    return d
