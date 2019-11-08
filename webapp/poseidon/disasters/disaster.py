"""
Abstract class for all disasters. Classes that derive from this are expected to offer a method that
produces a distribution of a disaster, i.e. how strongly the disaster was felt at each coordinate. Everything is
deterministic here as we don't attempt to sample or produce a realization.
"""

from abc import ABC, abstractmethod


class Disaster(ABC):

    #  Take a bunch of coordinates as interest, possibly as a numpy array, then return an array of magnitudes
    #  of that disaster at each coordinate. This magnitude need not be related to the outcome of the disaster in
    #  the same way for all disasters. E.g., roads may be more susceptible to earthquake damage than hurricane damage.
    @abstractmethod
    def get_disaster_magnitudes_for_coordinates(self, coordinates):
        pass

