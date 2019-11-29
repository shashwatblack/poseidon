"""
Class to store all global constants.
"""


class Constants:
    # This number captures our global intuition about general road quality. Subtract from all
    # probabilistic estimates before sampling.
    EARTH_RADIUS = 6371
    TILE_VIEW = 'TILE_VIEW'
    SETTLEMENT_VIEW = 'SETTLEMENT_VIEW'
