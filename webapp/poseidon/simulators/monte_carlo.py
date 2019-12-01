"""
The simulation infrastructure for the project. Uses a road network, a road damage model (bernoulli) and a disaster
model to produces realizations of that particular disaster, then calculates the list of metrics that were provided
on each instance. Then it calculates the average metric value for each node over all the simulations, giving us a
stochastic approximation of the metric for that city in the aftermath of the given disaster.
"""

from poseidon.infrastructure.road_network_revised import RoadNetwork
from poseidon.disasters.disaster import Disaster
from poseidon.infrastructure.road_damage_model import RoadDamageModel
import networkx
from networkx import Graph
import numpy as np


class MonteCarloSimulator:

    def __init__(self, disaster: Disaster, road_network: RoadNetwork, damage_model: RoadDamageModel, metrics: list):
        self.disaster = disaster
        self.metrics = metrics
        self.road_network = road_network
        self.damage_model = damage_model

    def run(self, n_iterations):
        self.tile_coordinates = list(networkx.get_node_attributes(self.road_network.graph_tile_view, 'center_loc').values())
        self.tile_indices = list(self.road_network.graph_tile_view.nodes(data=False))
        self.tile_magnitudes = self.disaster.get_disaster_magnitudes_for_coordinates(self.tile_coordinates)  # we are
        # assuming that the magnitude of the disaster doesn't change from one iteration to another. Just a way to
        # speed things up
        metrics = []
        for i in range(n_iterations):
            metrics.append(self.stochastic_iteration()[2])
            print('Completed stochastic iteration', i)

        return np.mean(metrics, axis=0)

    def stochastic_iteration(self) -> (Graph, Graph, list):
        damage_realization = self.get_tilewise_realization()
        damaged_tiles = [tile_index for tile_index in damage_realization.keys() if damage_realization[tile_index]]
        revised_segment_view = self.road_network.get_removed_blue_nodes(damaged_tiles)
        revised_settlement_view = self.road_network.get_recalculated_settlement_view_from_segment_view(revised_segment_view)
        metrics = self.calculate_metrics(revised_settlement_view)
        return revised_segment_view, revised_settlement_view, metrics

    def get_tilewise_realization(self) -> dict:
        is_damaged = self.damage_model.get_damage_for_coordinates(self.tile_coordinates, self.tile_magnitudes)
        damage_realization = {self.tile_indices[i]: is_damaged[i] for i in range(len(self.tile_coordinates))}
        return damage_realization

    def calculate_metrics(self, settlement_view) -> list:
        return [metric(settlement_view) for metric in self.metrics]
