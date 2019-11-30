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
def is_node_connected_to_hub(revised_settlement_graph: networkx.Graph()) -> list:
    nodes = revised_settlement_graph.nodes(data=True)
    hub_nodes = set([node for node in nodes if node[1]['population'] >= 100000])
    result = [0] * len(nodes)
    for i, node in enumerate(nodes):
        descendants = networkx.descendants(revised_settlement_graph, node[0])
        intersection = hub_nodes.intersection(descendants)
        result[i] = False
        for hub_node in intersection:
            if hub_node[1]['pos'].distance_to(node[1]['pos']) <= 100:  # km
                result[i] = True
    return result


# For every node, return the number of neighbors it is connected to
def node_degrees(revised_settlement_graph: networkx.Graph()) -> list:
    return [item[1] for item in list(networkx.degree(revised_settlement_graph))]
