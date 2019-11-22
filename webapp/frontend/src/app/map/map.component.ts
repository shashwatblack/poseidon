import {Component, OnInit} from '@angular/core';
import {circle, geoJSON, icon, latLng, Layer, marker, polygon, tileLayer} from 'leaflet';
import {LeafletLayersModel} from './leaflet-layers.model';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {
  LAYER_OCM = {
    id: 'opencyclemap',
    name: 'Open Cycle Map',
    enabled: true,
    layer: tileLayer('http://{s}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: 'Open Cycle Map'
    })
  };
  LAYER_OSM = {
    id: 'openstreetmap',
    name: 'Open Street Map',
    enabled: false,
    layer: tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: 'Open Street Map'
    })
  };
  circle = {
    id: 'circle',
    name: 'Circle',
    enabled: true,
    layer: circle([30.609026, -96.348900], {radius: 5000})
  };
  polygon = {
    id: 'polygon',
    name: 'Polygon',
    enabled: true,
    layer: polygon([[30.8, -96.85], [30.92, -96.92], [30.87, -96.8]])
  };
  square = {
    id: 'square',
    name: 'Square',
    enabled: true,
    layer: polygon([[30.8, -96.55], [30.9, -96.55], [30.9, -96.7], [30.8, -96.7]])
  };
  marker = {
    id: 'marker',
    name: 'Marker',
    enabled: true,
    layer: marker([30.619026, -96.338900], {
      // icon: icon({
      //   iconSize: [25, 41],
      //   iconAnchor: [13, 41],
      //   iconUrl: '2273e3d8ad9264b7daa5bdbf8e6b47f8.png',
      //   shadowUrl: '44a526eed258222515aa21eaffd14a96.png',
      // })
      draggable: true,
    }),
    draggable: true,
    clickable: true
  };
  geoJSON = {
    id: 'geoJSON',
    name: 'Geo JSON Polygon',
    enabled: true,
    layer: geoJSON(
      ({
        type: 'Polygon',
        coordinates: [[
          [-96.6, 30.87],
          [-96.5, 30.87],
          [-96.5, 30.93],
          [-96.6, 30.87]
        ]]
      }) as any,
      {style: () => ({color: '#ff7800'})})
  };

  model = new LeafletLayersModel(
    [this.LAYER_OSM, this.LAYER_OCM],
    this.LAYER_OSM.id,
    [this.circle, this.polygon, this.square, this.marker, this.geoJSON]
  );

  layers: Layer[];

  layersControl = {
    baseLayers: {
      'Open Street Map': this.LAYER_OSM.layer,
      'Open Cycle Map': this.LAYER_OCM.layer
    },
    overlays: {
      Circle: this.circle.layer,
      Square: this.square.layer,
      Polygon: this.polygon.layer,
      Marker: this.marker.layer,
      GeoJSON: this.geoJSON.layer
    }
  };

  options = {
    // layers: [
    //   // tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 18, attribution: 'Poseidon'})
    //   tileLayer('https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png', {
    //     maxZoom: 18,
    //     attribution: 'Poseidon',
    //   })
    // ],
    zoom: 10,
    center: latLng(30.619026, -96.338900)
  };

  drawOptions = {
    position: 'topright',
    draw: {
      marker: {
        // icon: icon({
        //   iconSize: [25, 41],
        //   iconAnchor: [13, 41],
        //   iconUrl: 'assets/marker-icon.png',
        //   shadowUrl: 'assets/marker-shadow.png'
        // })
      },
      rectangle: false,
      circlemarker: false,
      circle: {
        shapeOptions: {
          color: '#aaaaaa'
        },
      },
      polyline: {
        shapeOptions: {
          color: '#f357a1',
          weight: 10
        }
      }
    }
  };

  hotPatchLeafletCircleRadiusIssue() {
    // hot patch issue with leaflet-draw circle resize
    // REF: https://stackoverflow.com/a/48063394/1067005

    /* tslint:disable */
    // @ts-ignore
    declare var L: any;
    L.Edit.Circle = L.Edit.CircleMarker.extend({
      _createResizeMarker: function () {
        var center = this._shape.getLatLng(),
          resizemarkerPoint = this._getResizeMarkerPoint(center);

        this._resizeMarkers = [];
        this._resizeMarkers.push(this._createMarker(resizemarkerPoint, this.options.resizeIcon));
      },
      _getResizeMarkerPoint: function (latlng) {
        let delta = this._shape._radius * Math.cos(Math.PI / 4),
          point = this._map.project(latlng);
        return this._map.unproject([point.x + delta, point.y - delta]);
      },
      _resize: function (latlng) {
        let moveLatLng = this._moveMarker.getLatLng();
        let radius;
        if (L.GeometryUtil.isVersion07x()) {
          radius = moveLatLng.distanceTo(latlng);
        } else {
          radius = this._map.distance(moveLatLng, latlng);
        }

        // **** This fixes the cicle resizing ****
        this._shape.setRadius(radius);

        this._map.fire(L.Draw.Event.EDITRESIZE, {layer: this._shape});
      }
    });
    /* tslint:enable */
  }

  apply() {
    // Get the active base layer
    const baseLayer = this.model.baseLayers.find((l: any) => (l.id === this.model.baseLayer));

    // Get all the active overlay layers
    const newLayers = this.model.overlayLayers
      .filter((l: any) => l.enabled)
      .map((l: any) => l.layer);
    newLayers.unshift(baseLayer.layer);

    this.layers = newLayers;

    return false;
  }

  addMarker(event) {
    // console.log(event);
    return;
    const timestamp = (new Date()).getTime();
    const newMarker = {
      id: 'marker_' + timestamp,
      name: 'Marker_' + timestamp,
      enabled: true,
      layer: marker(event.latlng, {
        draggable: true,
      })
    };

    newMarker.layer.on('dragend', (dragEvent) => {
      console.log('Marker dragged', dragEvent.target._latlng);
    });

    this.model.overlayLayers.push(newMarker);
    this.apply();
  }

  constructor() {
    this.apply();
  }

  ngOnInit() {
    this.hotPatchLeafletCircleRadiusIssue();
  }
}
