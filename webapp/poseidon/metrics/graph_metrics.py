"""
Contains definitions of graph metrics that do consider the graph structure of the road network. An example is
to find out the mean number of hops to a city with population greater than a threshold. Another is just a boolean
value on whether or not the city has been disconnected from the rest of the graph. This might end up being surprisingly
good.
"""
import networkx
from poseidon.utils.spatial_utils import haversine_distance


# For every node set a boolean variable to True if the node is connected to at least one other node with population
# greater than a threshold and haversine distance less than another threshold
def is_node_connected_to_hub(revised_settlement_graph: networkx.Graph(), city_damaged: list) -> list:
    node_indices = list(revised_settlement_graph.nodes())
    nodes = revised_settlement_graph.nodes(data=True)
    hub_nodes = []
    hub_node_indices = []
    for i in range(len(city_damaged)):
        if (not city_damaged[i]) and (nodes[node_indices[i]]['population'] >= 250000):
            hub_node_indices.append(node_indices[i])
            hub_nodes.append(nodes[node_indices[i]])

    result = [False] * len(nodes)

    components = [comp for comp in networkx.connected_components(revised_settlement_graph)]
    for i, node in enumerate(node_indices):
        for component in components:
            if node not in component:
                continue
            for j, hub_index in enumerate(hub_node_indices):
                if hub_index == node:
                    continue
                if hub_index in component and hub_nodes[j]['pos'].distance_to(nodes[node]['pos']) <= 700:
                    result[i] = True
                    break
            break

    return result


# For every node, return the number of neighbors it is connected to
def node_degrees(revised_settlement_graph: networkx.Graph()) -> list:
    return [item[1] for item in list(networkx.degree(revised_settlement_graph))]
