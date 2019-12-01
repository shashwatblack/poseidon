"""
This orchestrator class provides an API that allows you to simulate the impact of a disaster upon a road network and
returns city-wise risks for that disaster. The inputs are just the raw parameters of the disaster
"""
from poseidon.infrastructure.road_network_revised import RoadNetwork
from poseidon.infrastructure.bernoulli import BernoulliRoadDamageModel
from poseidon.disasters.earthquakes import GaussianEarthquake
from poseidon.disasters.hurricanes import LinearHurricane
from poseidon.metrics.graph_metrics import is_node_connected_to_hub
from poseidon.simulators.monte_carlo import MonteCarloSimulator


class SingleDisasterRoadRiskOrchestrator:
    def __init__(self):
        self.road_network = RoadNetwork()
        self.road_damage_model = BernoulliRoadDamageModel(quality_bias=-16.30, susceptibility_factor=1.8)
        self.metrics = [is_node_connected_to_hub]

        # base metrics tell us the metrics without any disaster. used to normalize the final output
        non_disaster = GaussianEarthquake({
            "center": {
                "lat": 34.04924594,
                "lng": -118.22387695
            },
            "radius": 10,
            "intensity": 0
        })
        self.base_metrics = MonteCarloSimulator(non_disaster, self.road_network, self.road_damage_model, self.metrics).run(1)

    def get_risk_metric_for_cities(self, inputs):
        if inputs['type'] == 'hurricane':
            disaster = LinearHurricane(inputs['params'])
        elif inputs['type'] == 'earthquake':
            disaster = GaussianEarthquake(inputs['params'])
        else:
            raise(ValueError("Disaster not supported"))

        simulator = MonteCarloSimulator(disaster, self.road_network, self.road_damage_model, self.metrics)
        metrics = simulator.run(10)
        risks = 100 * (1 - metrics)
        cities = []
        i = 0

        for node, attr in self.road_network.graph_settlement_view.nodes(data=True):
            pos = attr['pos']
            cities.append({
                "city": attr['name'],
                "population": int(attr['population']),
                "lat": pos.deg_lat,
                "lng": pos.deg_lon,
                "vulnerability": risks[0][i]
            })
            i += 1
        return cities


if __name__ == '__main__':
    orc = SingleDisasterRoadRiskOrchestrator()
    params = {
      "type": "earthquake",
      "params": {
        "center": {
          "lat": 34.04924594,
          "lng": -118.22387695
        },
        "radius": 500,
        "intensity": 9
      }
    }
    params = {
        "type": "hurricane",
        "params": {
            "start": {
                "center": {
                    "lat": 32.94414889,
                    "lng": -116.63085938
                },
                "radius": 300,
                "intensity": 8
            },
            "end": {
                "center": {
                    "lat": 38.82259098,
                    "lng": -123.35449219
                },
                "radius": 5000,
                "intensity": 8
            }
        }
    }
    risks = orc.get_risk_metric_for_cities(params)



