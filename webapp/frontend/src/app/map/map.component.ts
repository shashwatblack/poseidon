import {Component, OnInit, ViewEncapsulation} from '@angular/core';
import {
  circle,
  FeatureGroup,
  LatLng,
  latLng,
  Layer,
  Map,
  Point,
  polyline,
  tileLayer
} from 'leaflet';
import {LeafletLayersModel} from './leaflet-layers.model';
import {LeafletDrawDirective} from '@asymmetrik/ngx-leaflet-draw';
import {DisasterService} from '../disaster.service';
import {UtilsService} from '../utils.service';
import {DisasterTaxonomies, WizardSteps} from '../enums';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class MapComponent implements OnInit {
  /*** GLOBALS ********************************************************************************************************/
  map: Map;
  leafletDrawDirective: LeafletDrawDirective;
  earthquakeBaseLayer: any;
  hurricaneBaseLayers: any;
  hurricanePathFeatureGroup: FeatureGroup;

  /*** MAP PARAMETERS *************************************************************************************************/
  LAYER_OSM = {
    id: 'openstreetmap',
    name: 'Open Street Map',
    enabled: false,
    layer: tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: 'Open Street Map'
    })
  };
  model = new LeafletLayersModel([this.LAYER_OSM], this.LAYER_OSM.id, []);
  layers: Layer[];
  options = {
    zoom: 10,
    center: latLng(30.619026, -96.338900)
  };
  drawOptions = {
    position: 'topright',
    draw: {
      marker: false,
      rectangle: false,
      circlemarker: false,
      circle: false,
      polyline: false
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

  /*** COMMON METHODS *************************************************************************************************/
  stateUpdated() {
    switch (this.disasterService.state.wizardStep) {
      case WizardSteps.DisasterChoice:
        this.clearMap();
        break;
      case WizardSteps.InputParameters:
        break;
      case WizardSteps.Simulation:
        break;
      case WizardSteps.Results:
        break;
    }
  }

  enableMapEdit() {
    if (!this.leafletDrawDirective) {
      return;
    }
    // @ts-ignore
    this.leafletDrawDirective._toolbars.edit._modes.edit.handler.enable();
  }

  clearMap() {
    if (this.leafletDrawDirective) {
      // @ts-ignore
      this.leafletDrawDirective.options.edit.featureGroup.clearLayers();
    }

    if (this.hurricanePathFeatureGroup) {
      this.hurricanePathFeatureGroup.clearLayers();
    }
  }

  baseLayerUpdated() {
    if (this.disasterService.state.chosenDisaster === DisasterTaxonomies.Earthquake) {
      this.earthquakeUpdatedOnMap();
    } else if (this.disasterService.state.chosenDisaster === DisasterTaxonomies.Hurricane) {
      this.hurricaneUpdatedOnMap();
    }
  }

  /*** EARTHQUAKE *****************************************************************************************************/
  startEarthquake(params = null) {
    this.clearMap();

    let latlng;
    latlng = params ? params.latlng : this.map.getCenter();

    this.disasterService.earthquakeParameters.center = latlng;

    this.earthquakeBaseLayer = circle(latlng, {radius: 10000});
    // @ts-ignore
    this.leafletDrawDirective.options.edit.featureGroup.addLayer(this.earthquakeBaseLayer);

    this.enableMapEdit();

    // earthquake intensity color
    this.earthquakeIntensityUpdated();
    this.disasterService.earthquakeIntensityUpdated$.subscribe(() => this.earthquakeIntensityUpdated());
  }

  earthquakeIntensityUpdated() {
    const color = this.utils.percentageToColor(this.disasterService.earthquakeParameters.intensity);
    this.earthquakeBaseLayer.setStyle({
      color: color,
      fillColor: color,
      fillOpacity: 0.3,
    });
  }

  earthquakeUpdatedOnMap() {
    this.disasterService.earthquakeParameters.center = this.earthquakeBaseLayer._latlng;
    this.disasterService.earthquakeParameters.radius = this.earthquakeBaseLayer._mRadius;
  }

  /*** HURRICANE ******************************************************************************************************/
  startHurricane() {
    this.clearMap();

    let latlng = this.map.getCenter();

    this.hurricaneBaseLayers = {
      start: circle(latlng, {radius: 10000}),
      end: circle(new LatLng(latlng.lat + 0.4, latlng.lng + 0.4), {radius: 5000}),
    };

    // @ts-ignore
    this.leafletDrawDirective.options.edit.featureGroup.addLayer(this.hurricaneBaseLayers.start);
    // @ts-ignore
    this.leafletDrawDirective.options.edit.featureGroup.addLayer(this.hurricaneBaseLayers.end);

    this.enableMapEdit();

    // intensity colors
    this.hurricaneUpdated();
    this.disasterService.hurricaneUpdated$.subscribe(() => this.hurricaneUpdated());

    // create new feature group to display the hurricane path tube
    if (this.hurricanePathFeatureGroup) {
      this.hurricanePathFeatureGroup.remove();
    }
    this.hurricanePathFeatureGroup = new FeatureGroup();
    this.hurricanePathFeatureGroup.addTo(this.map);

    // finally make sure disaster service is updated. this will also update the tube.
    this.hurricaneUpdatedOnMap();
  }

  hurricaneUpdated() {
    let color = this.utils.percentageToColor(this.disasterService.hurricaneParameters.start.intensity);
    this.hurricaneBaseLayers.start.setStyle({
      color: color,
      fillColor: color,
      fillOpacity: 0.3,
    });
    color = this.utils.percentageToColor(this.disasterService.hurricaneParameters.end.intensity);
    this.hurricaneBaseLayers.end.setStyle({
      color: color,
      fillColor: color,
      fillOpacity: 0.3,
    });
  }

  hurricaneUpdatedOnMap() {
    this.disasterService.hurricaneParameters.start.center = this.hurricaneBaseLayers.start._latlng;
    this.disasterService.hurricaneParameters.start.radius = this.hurricaneBaseLayers.start._mRadius;
    this.disasterService.hurricaneParameters.end.center = this.hurricaneBaseLayers.end._latlng;
    this.disasterService.hurricaneParameters.end.radius = this.hurricaneBaseLayers.end._mRadius;
    this.updateHurricaneTube();
  }

  updateHurricaneTube() {
    if (!this.hurricanePathFeatureGroup) {
      return;
    }
    this.hurricanePathFeatureGroup.clearLayers();

    const lat1 = this.disasterService.hurricaneParameters.start.center.lat;
    const lng1 = this.disasterService.hurricaneParameters.start.center.lng;
    const radius1 = this.disasterService.hurricaneParameters.start.radius;
    const point1 = new Point(lng1, lat1);

    const lat2 = this.disasterService.hurricaneParameters.end.center.lat;
    const lng2 = this.disasterService.hurricaneParameters.end.center.lng;
    const radius2 = this.disasterService.hurricaneParameters.end.radius;
    const point2 = new Point(lng2, lat2);

    const ang = Math.atan2(point2.y - point1.y, point2.x - point1.x);

    const distToLat = (d_lat) => {
      return (180 / Math.PI) * (d_lat / 6378137);
    };

    const distToLng = (d_lng, lat) => {
      return (180 / Math.PI) * (d_lng / 6378137);
    };

    const start1 = new Point(point1.x + distToLng(Math.cos(ang + Math.PI / 2) * radius1, point1.y),
                             point1.y + distToLat(Math.sin(ang + Math.PI / 2) * radius1));
    const end1   = new Point(point2.x + distToLng(Math.cos(ang + Math.PI / 2) * radius2, point2.y),
                             point2.y + distToLat(Math.sin(ang + Math.PI / 2) * radius2));

    const start2 = new Point(point1.x + distToLng(Math.cos(ang - Math.PI / 2) * radius1, point1.y),
                             point1.y + distToLat(Math.sin(ang - Math.PI / 2) * radius1));
    const end2   = new Point(point2.x + distToLng(Math.cos(ang - Math.PI / 2) * radius2, point2.y),
                             point2.y + distToLat(Math.sin(ang - Math.PI / 2) * radius2));

    const line1 = polyline([[start1.y, start1.x], [end1.y, end1.x]]);
    const line2 = polyline([[start2.y, start2.x], [end2.y, end2.x]]);
    line1.setStyle({
      color: "#555555",
      opacity: 0.1,
      weight: 10,
    });
    line2.setStyle({
      color: "#555555",
      opacity: 0.1,
      weight: 10,
    });
    this.hurricanePathFeatureGroup.addLayer(line1);
    this.hurricanePathFeatureGroup.addLayer(line2);
  }

  /*** CLASS METHODS **************************************************************************************************/
  constructor(private disasterService: DisasterService, private utils: UtilsService) {
    this.apply();
    this.disasterService.stateUpdated$.subscribe(() => this.stateUpdated());
    this.disasterService.earthquakeStarted$.subscribe((params) => this.startEarthquake(params));
    this.disasterService.hurricaneStarted$.subscribe(() => this.startHurricane());
  }

  ngOnInit() {
    this.hotPatchLeafletCircleRadiusIssue();
  }

  onMapReady(map: Map) {
    this.map = map;
  }

  onLeafletDrawReady(leafletDrawDirective: LeafletDrawDirective) {
    this.leafletDrawDirective = leafletDrawDirective;
  }
}
