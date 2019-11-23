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


class RoadNetwork:
    def __init__(self, should_load_from_files=False):
        self.tileView = None
        self.segmentView = None
        self.settlementView = None

    # This function should return the pertinent settlementView for a given segmentView. Useful to apply damages.
    # Should follow a different methodology from what we use to create the settlement view since all we have to
    # do here is edge deletion. To be completed by: Harish
    def get_recalculated_settlement_view_from_segment_view(self, revised_segment_view):
        pass

    # This function takes a given set of tiles (damaged) and deletes the corresponding edges from the segmentView.
    # Useful for applying damages. To be completed by: Harish
    def get_recalculated_segment_view(self, damaged_road_tiles):
        pass
