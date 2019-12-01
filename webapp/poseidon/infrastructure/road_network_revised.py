"""
This class implements the top-level functions that maintain road networks in memory. The road network should be
represented in three different ways called Views:

1. tileView: A tile -> set of blue_edge_id mapping. The tile is a 1km x 1km region that is represented by the latitude, longitude of
its center. In python, we store this as a dictionary of lists. {(latitude, longitude): [edge_id_1, edge_id_2...], ...}
2. SegmentView: A networkx Graph object where the nodes are the blue nodes (points along a road) and the edges are the blue edges.
A blue edge is a fundamental unit of the road that is assumed to be a straight line segment.
3. SettlementView: A networkx Graph object where the nodes are settlements and edges are roads that connect these settlements.
The "red" edges each have two sets as attributes: The set of blue nodes along the inter-settlement road, and the set of
blue edges that form up that road.
"""
import csv
import math
from itertools import combinations
from copy import deepcopy

import networkx as nx
from networkx import NetworkXNoPath
import pandas as pd
from poseidon.infrastructure.geo_location import GeoLocation


class RoadNetwork:
    DATA_DIR = "dat"
    CITY_PERIMETER = 2  # 2 km bounding box distance for cities
    graph_segment_view = None
    graph_settlement_view = None
    graph_tile_view = None

    def __init__(self, recreate_files=False):
        if recreate_files:
            self.construct_segment_view()
            self.construct_settlement_view_from_parts()
            self.construct_tile_view()
        self.graph_segment_view = nx.read_gpickle(f"{self.DATA_DIR}/graph_segment_view.gpickle")
        self.graph_settlement_view = nx.read_gpickle(f"{self.DATA_DIR}/graph_settlement_view.gpickle")
        try:
            self.graph_tile_view = nx.read_gpickle(f"{self.DATA_DIR}/graph_tile_view.gpickle")
        except FileNotFoundError:
            print("Couldn't find tile view file. If your segment view file exists, I will create the tile view now")
            self.construct_tile_view()

        self.make_helper_maps()

    # creates a couple of precomputed helper maps to speed up computation
    # A map from blue nodes to a list of red edges it supports

    def make_helper_maps(self):
        self.blue_node_to_red_edges = {}
        for edge_u, edge_v, attr in self.graph_settlement_view.edges(data=True):
            for blue_node in attr['blue_nodes']:
                if blue_node in self.blue_node_to_red_edges:
                    self.blue_node_to_red_edges[blue_node].add((edge_u, edge_v))
                else:
                    self.blue_node_to_red_edges[blue_node] = {(edge_u, edge_v)}
        self.initial_shortest_path_lengths = {}


        for red_edge_u, red_edge_v, attr in self.graph_settlement_view.edges(data=True):
            blue_u = attr['blue_nodes'][1]
            blue_v = attr['blue_nodes'][-2]
            if len(attr['blue_nodes']) == 2:
                self.initial_shortest_path_lengths[(red_edge_u, red_edge_v)] = 0
                continue
            try:
                self.initial_shortest_path_lengths[(red_edge_u, red_edge_v)] = nx.shortest_path_length(
                    self.graph_segment_view, blue_u, blue_v)
            except NetworkXNoPath:
                self.initial_shortest_path_lengths[(red_edge_u, red_edge_v)] = len(self.graph_segment_view)


    # constructs the segment_view and saved it into graph_segment_view.gpickle
    def construct_segment_view(self):
        print("Building segment view...")
        graph_segment_view = nx.Graph()
        with open(f"{self.DATA_DIR}/cal.cnode.csv") as f:
            for row in csv.reader(f):
                lat = float(row[2])
                lng = float(row[1])
                node_id = row[0]
                graph_segment_view.add_node(
                    node_id,
                    pos=GeoLocation.from_degrees(lat, lng),
                    mappedToCity=False
                )

        with open(f"{self.DATA_DIR}/cal.cedge.csv") as f:
            for row in csv.reader(f):
                graph_segment_view.add_edge(row[1], row[2], d=row[3])

        nx.write_gpickle(graph_segment_view, f"{self.DATA_DIR}/graph_segment_view.gpickle")
        self.graph_segment_view = graph_segment_view
        print("Done")
        print(graph_segment_view.number_of_nodes(), "blue segments.")
        print(graph_segment_view.number_of_edges(), "blue edges.")

    # constructs 'representative_nodes' for each city (red node)
    # then combines all blue nodes within the cities perimeter into the representative node.
    # cities with bigger population will get the veto in case more than one city claims the blue node.
    def get_combined_nodes_within_city_perimeter(self, read_from_file=False):
        if read_from_file:
            return nx.read_gpickle(f"{self.DATA_DIR}/graph_segment_view_nodes_combined.gpickle")

        settlement_df = pd.read_csv(f"{self.DATA_DIR}/cal.csv")

        # sort by population -> larger cities will get to pick the blue nodes first.
        settlement_df.sort_values(by='population', ascending=False, inplace=True)

        graph_segment_view = nx.read_gpickle(f"{self.DATA_DIR}/graph_segment_view.gpickle")
        graph_segment_view_nodes_combined = graph_segment_view.copy()

        # let's start
        print("Merging blue nodes...")
        print(f"Started with {graph_segment_view_nodes_combined.number_of_nodes()} blue segments.")
        counter, num_cities = 0, len(settlement_df)  # just so we can keep tabs in the console
        for index, city in settlement_df.iterrows():
            counter += 1
            print(f"\r{counter}/{num_cities} :: {city['city']}                    ", end="")

            city_location = GeoLocation.from_degrees(float(city['lat']), float(city['lng']))
            sw_bound, ne_bound = city_location.bounding_locations(self.CITY_PERIMETER)

            # first we'll add a blue node that will represent the entire city
            graph_segment_view_nodes_combined.add_node(
                city['id'],
                pos=GeoLocation.from_degrees(float(city['lat']), float(city['lng'])),
                mappedToCity=True
            )
            representative_node = city['id']

            # now we will combine all blue nodes that fall within the city perimeters
            for node_id, blue_node in graph_segment_view_nodes_combined.nodes(data=True):
                try:
                    if blue_node['mappedToCity']:
                        continue
                except KeyError:
                    pass
                # try:
                if blue_node['pos'].within_bounds(sw_bound, ne_bound):
                    graph_segment_view_nodes_combined = nx.contracted_nodes(
                        graph_segment_view_nodes_combined,
                        representative_node,
                        str(node_id),
                        self_loops=False
                    )

                    # when we merge nodes, it stores all the properties of the previous node too.
                    # this can get very long. and we don't need it anyway. therefore we clear this field.
                    graph_segment_view_nodes_combined.nodes[representative_node]['contraction'] = {}
                # except:
                #     print(blue_node)

        # we're done! let's finally write the graph into a file
        nx.write_gpickle(
            graph_segment_view_nodes_combined, f"{self.DATA_DIR}/graph_segment_view_nodes_combined.gpickle"
        )

        print(f"\nAfter merging we have {graph_segment_view_nodes_combined.number_of_nodes()} blue segments.")

        return graph_segment_view_nodes_combined

    # combines blue node 1 to blue node 2, if 1 has less than 2 out-degree
    # we're just simplifying the paths so building settlement doesn't take 60 hours.
    def get_two_neighbor_combined_nodes(self, read_from_file=False):
        if read_from_file:
            return nx.read_gpickle(f"{self.DATA_DIR}/graph_segment_two_neighbor_combined_nodes.gpickle")

        graph_segment_two_neighbor_combined_nodes = self.get_combined_nodes_within_city_perimeter(True)

        print(f"Started with {graph_segment_two_neighbor_combined_nodes.number_of_nodes()} blue segments.")
        counter, num_nodes = 0, graph_segment_two_neighbor_combined_nodes.number_of_nodes()
        for node_id, blue_node in graph_segment_two_neighbor_combined_nodes.nodes(data=True):
            counter += 1
            print(f"\r{counter} / {num_nodes}", end="")
            try:
                if blue_node['mappedToCity']:
                    continue
            except KeyError:
                pass
            degree = graph_segment_two_neighbor_combined_nodes.degree(node_id)
            if degree == 0:
                graph_segment_two_neighbor_combined_nodes.remove_node(node_id)
            elif degree <= 2:
                neighbor_node = next(graph_segment_two_neighbor_combined_nodes.neighbors(node_id))
                graph_segment_two_neighbor_combined_nodes = nx.contracted_nodes(
                    graph_segment_two_neighbor_combined_nodes,
                    neighbor_node,
                    str(node_id),
                    self_loops=False
                )

                graph_segment_two_neighbor_combined_nodes.nodes[neighbor_node]['contraction'] = {}

        print(f"\nAfter merging we have {graph_segment_two_neighbor_combined_nodes.number_of_nodes()} blue segments.")
        # we're done! let's finally write the graph into a file
        nx.write_gpickle(
            graph_segment_two_neighbor_combined_nodes, f"{self.DATA_DIR}/graph_segment_two_neighbor_combined_nodes.gpickle"
        )
        return graph_segment_two_neighbor_combined_nodes

    # Does the same thing as get_two_neighbor_combined_nodes once more.
    # this only reduces the number of nodes by ~5%. So, we stop here.
    def get_four_neighbor_combined_nodes(self, read_from_file=False):
        if read_from_file:
            return nx.read_gpickle(f"{self.DATA_DIR}/graph_segment_four_neighbor_combined_nodes.gpickle")

        graph_segment_four_neighbor_combined_nodes = self.get_two_neighbor_combined_nodes(True)

        print(f"Started with {graph_segment_four_neighbor_combined_nodes.number_of_nodes()} blue segments.")
        counter, num_nodes = 0, graph_segment_four_neighbor_combined_nodes.number_of_nodes()
        for node_id, blue_node in graph_segment_four_neighbor_combined_nodes.nodes(data=True):
            counter += 1
            print(f"\r{counter} / {num_nodes}", end="")
            try:
                if blue_node['mappedToCity']:
                    continue
            except KeyError:
                pass
            degree = graph_segment_four_neighbor_combined_nodes.degree(node_id)
            if degree == 0:
                graph_segment_four_neighbor_combined_nodes.remove_node(node_id)
            elif degree <= 2:
                neighbor_node = next(graph_segment_four_neighbor_combined_nodes.neighbors(node_id))
                graph_segment_four_neighbor_combined_nodes = nx.contracted_nodes(
                    graph_segment_four_neighbor_combined_nodes,
                    neighbor_node,
                    str(node_id),
                    self_loops=False
                )

                graph_segment_four_neighbor_combined_nodes.nodes[neighbor_node]['contraction'] = {}

        print(f"\nAfter merging we have {graph_segment_four_neighbor_combined_nodes.number_of_nodes()} blue segments.")
        # we're done! let's finally write the graph into a file
        nx.write_gpickle(
            graph_segment_four_neighbor_combined_nodes,
            f"{self.DATA_DIR}/graph_segment_four_neighbor_combined_nodes.gpickle"
        )
        return graph_segment_four_neighbor_combined_nodes

    # this method is redundant, and got replaced by construct_settlement_view_using_combined_nodes
    def construct_settlement_view_using_shortest_path(self):
        print("Building settlement view...")
        graph_settlement_view = nx.Graph()

        # first we'll read all the cities -- our RED nodes, and store them as nodes into the settlement_view
        settlement_df = pd.read_csv(f"{self.DATA_DIR}/cal.csv")
        settlement_df.sort_values(by='population', ascending=False, inplace=True)

        for index, city in settlement_df.iterrows():
            graph_settlement_view.add_node(
                city['id'],
                pos=GeoLocation.from_degrees(float(city['lat']), float(city['lng'])),
                name=city['city'],
                population=city['population']
            )
        print(f"Read {graph_settlement_view.number_of_nodes()} red nodes.")

        # now, we'll combine all blue nodes within city perimeters into a single node
        graph_segment_view_nodes_combined = self.get_combined_nodes_within_city_perimeter(True)
        print(f"Read {graph_segment_view_nodes_combined.number_of_nodes()} merged blue nodes.")

        # for every red node u,
        #     for every red node v:
        #         remove all red nodes other than u and v
        #         find shortest blue path between u and v
        #         add red edge between u and v
        all_red_nodes = list(graph_settlement_view.nodes())

        import time
        start = time.time()
        print(f"Start: {start}")

        red_node_degrees = dict()
        red_nodes_with_edges = list()
        for red_node in all_red_nodes:
            red_node_degrees[red_node] = graph_segment_view_nodes_combined.degree(red_node)
            if red_node_degrees[red_node]:
                red_nodes_with_edges.append(red_node)

        # for u, v in combinations(all_red_nodes, 2):
        for i, u in enumerate(red_nodes_with_edges):
            for j, v in enumerate(red_nodes_with_edges[i+1:]):
                print(f"\r{i}x{j} / {len(red_nodes_with_edges)}", end="")
                graph_segment_view_other_nodes_removed = graph_segment_view_nodes_combined.copy()
                for red_node in red_nodes_with_edges:
                    if red_node not in [u, v]:
                        graph_segment_view_other_nodes_removed.remove_node(red_node)
                if nx.has_path(graph_segment_view_other_nodes_removed, u, v):
                    path = nx.shortest_path(graph_segment_view_other_nodes_removed, u, v)
                    graph_settlement_view.add_edge(u, v, blue_nodes=path)
            print(f"\tDuration: {time.time() - start}", end="")

        nx.write_gpickle(graph_settlement_view, f"{self.DATA_DIR}/graph_settlement_view.gpickle")
        self.graph_settlement_view = graph_settlement_view

    # uses the four_neighbor_combined_nodes to construct the settlemet view using shortest path algorithm
    # even this takes ~ 3 hours.
    # therefore I split it into 5 google colabs and ran it to produce parts
    # the ratio of nodes for parts were - 0-113, 113-242, 242-395, 395-595, 595-1073
    def construct_settlement_view_using_combined_nodes(self):
            print("Building settlement view...")
            graph_settlement_view = nx.Graph()

            # first we'll read all the cities -- our RED nodes, and store them as nodes into the settlement_view
            settlement_df = pd.read_csv(f"{self.DATA_DIR}/cal.csv")
            settlement_df.sort_values(by='population', ascending=False, inplace=True)

            for index, city in settlement_df.iterrows():
                graph_settlement_view.add_node(
                    city['id'],
                    pos=GeoLocation.from_degrees(float(city['lat']), float(city['lng'])),
                    name=city['city'],
                    population=city['population']
                )
            print(f"Read {graph_settlement_view.number_of_nodes()} red nodes.")

            # now, we'll combine all blue nodes within city perimeters into a single node
            graph_segment_view_nodes_combined = self.get_combined_nodes_within_city_perimeter(True)
            print(f"Read {graph_segment_view_nodes_combined.number_of_nodes()} merged blue nodes.")

            # we'll also combine all blue nodes which have just two neighbors
            graph_segment_two_neighbor_combined_nodes = self.get_two_neighbor_combined_nodes(True)
            print(f"Read {graph_segment_two_neighbor_combined_nodes.number_of_nodes()} merged blue nodes.")

            # we'll do the same again
            graph_segment_four_neighbor_combined_nodes = self.get_four_neighbor_combined_nodes(True)
            print(f"Read {graph_segment_four_neighbor_combined_nodes.number_of_nodes()} merged blue nodes.")

            # for every red node u,
            #     for every red node v:
            #         remove all red nodes other than u and v
            #         find shortest blue path between u and v
            #         add red edge between u and v
            all_red_nodes = list(graph_settlement_view.nodes())

            import time
            start = time.time()
            print(f"Start: {start}")

            red_node_degrees = dict()
            red_nodes_with_edges = list()
            for red_node in all_red_nodes:
                red_node_degrees[red_node] = graph_segment_four_neighbor_combined_nodes.degree(red_node)
                if red_node_degrees[red_node]:
                    red_nodes_with_edges.append(red_node)

            # for u, v in combinations(all_red_nodes, 2):
            for i, u in enumerate(red_nodes_with_edges):
                for j, v in enumerate(red_nodes_with_edges[i + 1:]):
                    print(f"\r{i}x{j} / {len(red_nodes_with_edges)}", end="")
                    graph_segment_view_other_nodes_removed = graph_segment_four_neighbor_combined_nodes.copy()
                    for red_node in red_nodes_with_edges:
                        if red_node not in [u, v]:
                            graph_segment_view_other_nodes_removed.remove_node(red_node)
                    if nx.has_path(graph_segment_view_other_nodes_removed, u, v):
                        path = nx.shortest_path(graph_segment_view_other_nodes_removed, u, v)
                        graph_settlement_view.add_edge(u, v, blue_nodes=path)
                print(f"\tDuration: {time.time() - start}", end="")

            nx.write_gpickle(graph_settlement_view, f"{self.DATA_DIR}/graph_settlement_view.gpickle")
            self.graph_settlement_view = graph_settlement_view

    # finally, we can combine the parts into a single settlement view.
    def construct_settlement_view_from_parts(self):
        print("Building settlement view from parts...")
        graph_settlement_view = nx.Graph()

        # first we'll read all the cities -- our RED nodes, and store them as nodes into the settlement_view
        settlement_df = pd.read_csv(f"{self.DATA_DIR}/cal.csv")
        settlement_df.sort_values(by='population', ascending=False, inplace=True)

        for index, city in settlement_df.iterrows():
            graph_settlement_view.add_node(
                city['id'],
                pos=GeoLocation.from_degrees(float(city['lat']), float(city['lng'])),
                name=city['city'],
                population=city['population']
            )
        print(f"Read {graph_settlement_view.number_of_nodes()} red nodes.")

        # now let's read the parts
        parts = [
            nx.read_gpickle(f"{self.DATA_DIR}/settlement_parts/graph_settlement_view_0.gpickle"),
            nx.read_gpickle(f"{self.DATA_DIR}/settlement_parts/graph_settlement_view_1.gpickle"),
            nx.read_gpickle(f"{self.DATA_DIR}/settlement_parts/graph_settlement_view_2.gpickle"),
            nx.read_gpickle(f"{self.DATA_DIR}/settlement_parts/graph_settlement_view_3.gpickle"),
            nx.read_gpickle(f"{self.DATA_DIR}/settlement_parts/graph_settlement_view_4.gpickle")
        ]

        for part in parts:
            for u, v, a in part.edges(data=True):
                # print(u, v, a)
                # import sys; sys.exit();
                graph_settlement_view.add_edge(u, v, blue_nodes=a['blue_nodes'])
            print(f"{graph_settlement_view.number_of_nodes()} nodes and "
                  f"{graph_settlement_view.number_of_edges()} edges.")

        nx.write_gpickle(graph_settlement_view, f"{self.DATA_DIR}/graph_settlement_view.gpickle")
        self.graph_settlement_view = graph_settlement_view

    def construct_tile_view(self):
        print("Building tile view...")
        graph_segment_view = nx.read_gpickle(f"{self.DATA_DIR}/graph_segment_view.gpickle")
        graph_tile_view = nx.Graph()

        min_lat = 400
        max_lat = -400
        min_lng = 400
        max_lng = -400
        with open(f"{self.DATA_DIR}/cal.cnode.csv") as f:
            for row in csv.reader(f):
                lat = float(row[2])
                lng = float(row[1])
                min_lat = min(lat, min_lat)
                max_lat = max(lat, max_lat)
                min_lng = min(lng, min_lng)
                max_lng = max(lng, max_lng)
        print(f"min_lat: {min_lat} \tmax_lat: {max_lat} \tmin_lng: {min_lng} \tmax_lng: {max_lng} \t")

        delta = 0.01

        # just some small utility functions
        def get_tile_id(_lat, _lng):
            return (
                math.floor((_lat - min_lat) / delta),
                math.floor((_lng - min_lng) / delta)
            )

        max_tile_i, max_tile_j = get_tile_id(max_lat, max_lng)
        for i in range(max_tile_i + 1):
            for j in range(max_tile_j + 1):
                sw_loc = GeoLocation.from_degrees(min_lat + i * delta, min_lng + j * delta)
                ne_loc = GeoLocation.from_degrees(min_lat + (i + 1) * delta, min_lng + (j + 1) * delta)
                center_loc = GeoLocation.from_degrees(min_lat + i * delta/2, min_lng + j * delta/2)
                graph_tile_view.add_node(
                    (i, j), sw_loc=sw_loc, ne_loc=ne_loc, center_loc=center_loc, segment_nodes=set(), segment_edges=set()
                )

        # now we assign blue nodes to tiles they belong to
        blue_nodes = graph_segment_view.nodes(data=True)
        for node, attr in blue_nodes:
            location = attr['pos']
            tile_id = get_tile_id(location.deg_lat, location.deg_lon)
            graph_tile_view.nodes[tile_id]['segment_nodes'].append(node)

        # now we assign blue edges to tiles
        # we should ideally take all the tiles along the line joining u to v, then add a segment edge to all those
        # tiles. But no big deal
        for u, v in graph_segment_view.edges():
            location = blue_nodes[u]['pos']
            tile1 = get_tile_id(location.deg_lat, location.deg_lon)

            location = blue_nodes[v]['pos']
            tile2 = get_tile_id(location.deg_lat, location.deg_lon)

            graph_tile_view.nodes[tile1]['segment_edges'].append((u, v))

            if tile1 != tile2:
                graph_tile_view.nodes[tile2]['segment_edges'].append((u, v))

        # we need to delete those tiles that don't contain any roads at all. Would greatly speed up computation

        node_indices = []
        segment_lengths = []
        for node, attr in graph_tile_view.nodes(data=True):
            node_indices.append(node)
            segment_lengths.append(len(attr['segment_nodes']))
        for node, length in zip(node_indices, segment_lengths):
            if length == 0:
                graph_tile_view.remove_node(node)

        nx.write_gpickle(graph_tile_view, f"{self.DATA_DIR}/graph_tile_view.gpickle")
        self.graph_tile_view = graph_tile_view
        print(f"Done! Created {graph_tile_view.number_of_nodes()} tiles.")

    # if a blue node is gone, then the corresponding red edge must disappear
    def get_recalculated_settlement_view_from_segment_view(self, new_segment_view):
        new_settlement_view = self.graph_settlement_view.copy()
        removed_edges = set()

        for red_edge_u, red_edge_v, attr in self.graph_settlement_view.edges(data=True):
            blue_u = attr['blue_nodes'][1]
            blue_v = attr['blue_nodes'][-2]
            if len(attr['blue_nodes']) == 2:
                continue
            if not (blue_u in new_segment_view and blue_v in new_segment_view):
                removed_edges.add((red_edge_u, red_edge_v))
                continue
            try:
                if nx.shortest_path_length(new_segment_view, blue_u, blue_v) > self.initial_shortest_path_lengths[(red_edge_u, red_edge_v)]:
                    removed_edges.add((red_edge_u, red_edge_v))
            except NetworkXNoPath:
                removed_edges.add((red_edge_u, red_edge_v))
        new_settlement_view.remove_edges_from(removed_edges)
        return new_settlement_view

    # This function takes a given set of tiles (damaged) and deletes the corresponding edges from the segmentView.
    # Useful for applying damages.
    def get_recalculated_segment_view(self, damaged_road_tiles):
        removed_blue_nodes = set()
        for tile in damaged_road_tiles:
            removed_blue_nodes = removed_blue_nodes.union(self.graph_tile_view.node[tile]['segment_nodes'])
        new_segment_view = self.graph_segment_view.copy()

        new_segment_view.remove_nodes_from(removed_blue_nodes)
        return new_segment_view


if __name__ == '__main__':
    RoadNetwork(recreate_files=False)
