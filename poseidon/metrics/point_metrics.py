"""
Contains definitions of point-wise metrics that do not consider the graph structure of the road network. An example is
just to find out the fraction of tiles with a damaged road.
"""
import numpy as np


def n_damaged_tiles(coordinates, is_damaged):
    return np.sum(is_damaged)
