from poseidon.infrastructure.road_network import RoadNetwork
from poseidon.disasters.disaster import Disaster
from poseidon.infrastructure.road_damage_model import RoadDamageModel
from networkx import Graph
import numpy as np


class MonteCarloSimulator:

    def __init__(self, disaster: Disaster, road_network: RoadNetwork, damage_model: RoadDamageModel, metrics: list):
        self.disaster = disaster
        self.metrics = metrics
        self.road_network = road_network
        self.damage_model = damage_model

    def run(self, n_iterations):
        metrics = []
        for i in range(n_iterations):
            metrics.append(self.stochastic_iteration()[2])
        return np.mean(metrics, axis=0)

    def stochastic_iteration(self) -> (Graph, Graph, list):
        damage_realization = self.get_coordinatewise_realization()
        damaged_tiles = [coordinate for coordinate in damage_realization.keys() if damage_realization[coordinate]]
        revised_segment_view = self.road_network.get_recalculated_segment_view(damaged_tiles)
        revised_settlement_view = self.road_network.get_recalculated_settlement_view_from_segment_view(revised_segment_view)
        metrics = self.calculate_metrics(revised_settlement_view)
        return revised_segment_view, revised_settlement_view, metrics

    def get_coordinatewise_realization(self) -> dict:
        coordinates = list(self.road_network.tileView.keys())
        magnitudes = self.disaster.get_disaster_magnitudes_for_coordinates(coordinates)
        damages = self.damage_model.get_damage_for_coordinates(coordinates, magnitudes)
        damage_realization = {coordinates[i]: damages[i] for i in range(len(coordinates))}
        return damage_realization

    def calculate_metrics(self, settlement_view) -> list:
        return [metric(settlement_view) for metric in self.metrics]

