import {Component, OnInit, ViewEncapsulation} from '@angular/core';
import {
  circle,
  LatLng,
  latLng,
  Layer,
  Map,
  Point,
  tileLayer,
  FeatureGroup, polyline
} from 'leaflet';
import {LeafletLayersModel} from './leaflet-layers.model';
import {LeafletDrawDirective} from '@asymmetrik/ngx-leaflet-draw';
import {DisasterService} from '../disaster.service';
import {UtilsService} from '../utils.service';
import {DisasterTaxonomies, WizardSteps} from '../enums';
import * as L from 'leaflet';
import {MapService} from '../map.service';
import {NgxSpinnerService} from 'ngx-spinner';

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
  hurricaneShadow: Element;
  simulationResultsFeatureGroup: FeatureGroup;

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
    this.spinner.hide();
    switch (this.disasterService.state.wizardStep) {
      case WizardSteps.DisasterChoice:
        this.clearMap();
        this.clearSimulationResults();
        break;
      case WizardSteps.InputParameters:
        this.clearSimulationResults();
        break;
      case WizardSteps.Simulation:
        this.spinner.show();
        break;
      case WizardSteps.Results:
        this.clearMap();
        this.showSimulationResults();
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

    if (this.hurricaneShadow) {
      this.hurricaneShadow.remove();
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

    // create new svg group to display the hurricane shadow
    if (this.hurricaneShadow) {
      this.hurricaneShadow.remove();
    }
    this.hurricaneShadow = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const parentElement = this.map.getPanes().overlayPane.firstChild.firstChild;
    parentElement.insertBefore(this.hurricaneShadow, parentElement.firstChild);

    // make sure disaster service is updated with new coords. Doing this will also update the hurricane shadow.
    this.hurricaneUpdatedOnMap();

    // also register for map zoom events, so shadow is updated
    this.map.on('zoomend', () => { this.updateHurricaneShadow(); });
  }

  hurricaneUpdated() {
    let color = this.utils.percentageToColor(this.disasterService.hurricaneParameters.start.intensity);
    this.hurricaneBaseLayers.start.setStyle({
      color: color,
      fillColor: color,
      fillOpacity: 0.0,
    });
    color = this.utils.percentageToColor(this.disasterService.hurricaneParameters.end.intensity);
    this.hurricaneBaseLayers.end.setStyle({
      color: color,
      fillColor: color,
      fillOpacity: 0.0,
    });
    this.updateHurricaneShadow();
  }

  hurricaneUpdatedOnMap() {
    this.disasterService.hurricaneParameters.start.center = this.hurricaneBaseLayers.start._latlng;
    this.disasterService.hurricaneParameters.start.radius = this.hurricaneBaseLayers.start._mRadius;
    this.disasterService.hurricaneParameters.end.center = this.hurricaneBaseLayers.end._latlng;
    this.disasterService.hurricaneParameters.end.radius = this.hurricaneBaseLayers.end._mRadius;
    this.updateHurricaneShadow();
  }

  updateHurricaneShadow() {
    if (this.disasterService.state.chosenDisaster !== DisasterTaxonomies.Hurricane || !this.hurricaneShadow) {
      return;
    }

    const center1 = this.hurricaneBaseLayers.start._point;
    const radius1 = this.hurricaneBaseLayers.start._radius;

    const center2 = this.hurricaneBaseLayers.end._point;
    const radius2 = this.hurricaneBaseLayers.end._radius;

    const ang = Math.atan2(center2.y - center1.y, center2.x - center1.x);

    const start1 = new Point(center1.x + Math.cos(ang + Math.PI / 2) * radius1,
                             center1.y + Math.sin(ang + Math.PI / 2) * radius1);
    const end1   = new Point(center2.x + Math.cos(ang + Math.PI / 2) * radius2,
                             center2.y + Math.sin(ang + Math.PI / 2) * radius2);

    const start2 = new Point(center1.x + Math.cos(ang - Math.PI / 2) * radius1,
                             center1.y + Math.sin(ang - Math.PI / 2) * radius1);
    const end2   = new Point(center2.x + Math.cos(ang - Math.PI / 2) * radius2,
                             center2.y + Math.sin(ang - Math.PI / 2) * radius2);

    const startColor = this.utils.percentageToColor(this.disasterService.hurricaneParameters.start.intensity);
    const endColor = this.utils.percentageToColor(this.disasterService.hurricaneParameters.end.intensity);

    this.hurricaneShadow.innerHTML = `
      <defs>
        <clipPath id="shape">
          <circle cx="${center1.x}" cy="${center1.y}" r="${radius1}""/>
          <circle cx="${center2.x}" cy="${center2.y}" r="${radius2}"/>
          <path d="M${start1.x},${start1.y} L${end1.x},${end1.y} L${end2.x},${end2.y} L${start2.x},${start2.y} Z" />
        </clipPath>
        <linearGradient id="gradient" x1="${center1.x}" y1="${center1.y}" x2="${center2.x}" y2="${center2.y}"
                        gradientUnits="userSpaceOnUse">
          <stop offset="0%" style="stop-color:${startColor}; stop-opacity:1" />
          <stop offset="100%" style="stop-color:${endColor}; stop-opacity:1" />
        </linearGradient>
      </defs>
      <g><rect x="-500%" y="-500%" width="1000%" height="1000%" fill="url(#gradient)" fill-opacity="0.3" clip-path="url(#shape)"/></g>
    `;
  }

  /*** PLOTTING BASE **************************************************************************************************/
  showSimulationResults() {
    this.plotCities(this.disasterService.simulationResponse);
  }

  clearSimulationResults() {
    this.simulationResultsFeatureGroup.clearLayers();
  }

  plotCities(data) {
    this.clearSimulationResults();
    for (let city of data.cities) {
      this.plotCity(this.simulationResultsFeatureGroup, city);
    }
    for (let edge of data.edges) {
      this.plotEdge(this.simulationResultsFeatureGroup, edge);
    }
    this.map.fitBounds(this.simulationResultsFeatureGroup.getBounds());
  }

  plotCity(featureGroup, city) {
    let radius = Math.sqrt(city.population);
    let color = this.utils.intensityToColor(city.damage);
    let cityCircle = circle([city.lat, city.lng], { radius, color });
    cityCircle.bindTooltip(`<b>${city.city}</b><br/> Population: <b>${city.population}</b>`);
    featureGroup.addLayer(cityCircle);
  }

  plotEdge(featureGroup, edge) {
    let color = this.utils.intensityToColor(edge.damage);
    featureGroup.addLayer(polyline([edge.start, edge.end], { color }));
  }

  /*** CLASS METHODS **************************************************************************************************/
  constructor(private mapService: MapService, private disasterService: DisasterService,
              private utils: UtilsService, private spinner: NgxSpinnerService) {
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
    L.drawLocal.edit.handlers.edit.tooltip.subtext = "Drag middle point handler to change epicenter.";
    L.drawLocal.edit.handlers.edit.tooltip.text = "Drag edge point handler to change radius.";

    this.simulationResultsFeatureGroup = new FeatureGroup();
    this.simulationResultsFeatureGroup.addTo(this.map);
  }

  onLeafletDrawReady(leafletDrawDirective: LeafletDrawDirective) {
    this.leafletDrawDirective = leafletDrawDirective;
  }
}
