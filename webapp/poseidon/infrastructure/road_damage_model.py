"""
Abstract class that lays out how to write a road damage model. This model takes a bunch of coordinates (with roads),
disaster magnitudes at those roads, then produces a realization of damage through some kind of probabilistic
sampling.
"""

from abc import ABC, abstractmethod


class RoadDamageModel(ABC):

    @abstractmethod
    def get_damage_for_coordinates(self, coordinates, magnitudes, seed):
        pass
