"""
Treats coordinates as being independently susceptible to damage. The fact that a given segment has been damaged
does not affect the probability distribution for any other section of road, conditioned upon the disaster itself.
In other words, the disaster model gives us all the information that we need to decide whether a segment of road has been
damaged. We don't even care about neighboring segments to decide whether a segment has been damaged.

The probability that a section of road is damaged is given by
p = logit(b_0 + b_1 * I) where I is the moment magnitude of the disaster and b_0 and b_1 are constants.

We only have two possibilities for the output - damaged or not. We can extend the framework to consider degrees
of damage if necessary.
"""

import numpy as np
from poseidon.infrastructure.road_damage_model import RoadDamageModel


class BernoulliRoadDamageModel(RoadDamageModel):

    def __init__(self, quality_bias, susceptibility_factor):
        self.quality_bias = quality_bias
        self.susceptibility_factor = susceptibility_factor

    def get_damage_for_coordinates(self, coordinates, magnitudes):
        assert len(coordinates) == len(magnitudes)
        val = self.quality_bias + self.susceptibility_factor * magnitudes
        probabilities = np.exp(val)/(1 + np.exp(val))
        random_samples = np.random.rand(len(coordinates))
        return random_samples > probabilities
