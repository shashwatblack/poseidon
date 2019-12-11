import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
import {DisasterTaxonomies, WizardSteps} from './enums';
import {HttpClient} from '@angular/common/http';
import {ApiService} from "./api.service";
import {UtilsService} from "./utils.service";

@Injectable({
  providedIn: 'root'
})
export class DisasterService {
  state: {
    wizardStep: WizardSteps,
    chosenDisaster?: DisasterTaxonomies,
  } = {
    wizardStep: WizardSteps.DisasterChoice,
  };

  earthquakeParameters = {
    center: {
      lat: 34.04924594,
      lng: -118.22387695
    },
    radius: 300000,
    intensity: 70
  };

  hurricaneParameters = {
    start: {
      center: {
        lat: 32.94414889,
        lng: -116.63085938
      },
      radius: 300000,
      intensity: 90
    },
    end: {
      center: {
        lat: 38.82259098,
        lng: -123.35449219
      },
      radius: 100000,
      intensity: 40
    }
  };

  simulationResponse = null;

  // Observable sources
  private updateStateSource = new Subject<object>();
  private startEarthquakeSource = new Subject<string>();
  private updateEarthquakeSource = new Subject<number>();
  private updateIntensitySource = new Subject<number>();
  private startHurricaneSource = new Subject<string>();
  private updateHurricaneSource = new Subject<string>();

  // Observables
  stateUpdated$ = this.updateStateSource.asObservable();
  earthquakeStarted$ = this.startEarthquakeSource.asObservable();
  earthquakeUpdated$ = this.updateEarthquakeSource.asObservable();
  earthquakeIntensityUpdated$ = this.updateIntensitySource.asObservable();
  hurricaneStarted$ = this.startHurricaneSource.asObservable();
  hurricaneUpdated$ = this.updateHurricaneSource.asObservable();

  // Service message commands
  invokeStateUpdate() {
    this.updateStateSource.next();
  }

  /*** EARTHQUAKE *****************************************************************************************************/
  startEarthquake() {
    this.startEarthquakeSource.next();
  }

  updateEarthquakeIntensity(newIntensity) {
    this.earthquakeParameters.intensity = newIntensity;
    this.updateIntensitySource.next(newIntensity);
  }

  /*** HURRICANE ******************************************************************************************************/
  startHurricane() {
    this.startHurricaneSource.next();
  }

  updateHurricaneStartIntensity(newIntensity) {
    this.hurricaneParameters.start.intensity = newIntensity;
    this.updateHurricane();
  }

  updateHurricaneEndIntensity(newIntensity) {
    this.hurricaneParameters.end.intensity = newIntensity;
    this.updateHurricane();
  }

  updateHurricane() {
    this.updateHurricaneSource.next();
  }

  /*** SIMULATION *****************************************************************************************************/
  simulateDisaster() {
    let disaster_type;
    let disaster_params;
    if (this.state.chosenDisaster === DisasterTaxonomies.Earthquake) {
      disaster_type = "earthquake";
      // make copies, make sure it's float values, radius should be in KM
      disaster_params = {
        center: {
          lat: this.utils.toFloat(this.earthquakeParameters.center.lat),
          lng: this.utils.toFloat(this.earthquakeParameters.center.lng)
        },
        radius: this.utils.toFloat(this.earthquakeParameters.radius) / 1000,
        intensity: this.utils.toFloat(this.earthquakeParameters.intensity) / 10
      };
    } else if (this.state.chosenDisaster === DisasterTaxonomies.Hurricane) {
      disaster_type = "hurricane";
      // make copies, make sure it's float values, radius should be in KM
      disaster_params = {
        start: {
          center: {
            lat: this.utils.toFloat(this.hurricaneParameters.start.center.lat),
            lng: this.utils.toFloat(this.hurricaneParameters.start.center.lng)
          },
          radius: this.utils.toFloat(this.hurricaneParameters.start.radius) / 1000,
          intensity: this.utils.toFloat(this.hurricaneParameters.start.intensity) / 10
        },
        end: {
          center: {
            lat: this.utils.toFloat(this.hurricaneParameters.end.center.lat),
            lng: this.utils.toFloat(this.hurricaneParameters.end.center.lng)
          },
          radius: this.utils.toFloat(this.hurricaneParameters.end.radius) / 1000,
          intensity: this.utils.toFloat(this.hurricaneParameters.end.intensity) / 10
        },
      };
    } else {
      return;
    }
    this.http.post(this.api.getUrl('simulation'), {
      simulation_params: {
        type: disaster_type,
        params: disaster_params
      }
    }).subscribe(
      data => {
        // @ts-ignore
        this.simulationResponse = data.simulation_response;
        this.state.wizardStep = WizardSteps.Results;
        this.invokeStateUpdate();
      },
      err => {
        console.error(err);
        alert("Server error.");
        if (this.state.chosenDisaster === DisasterTaxonomies.Earthquake) {
          this.startEarthquake();
        } else if (this.state.chosenDisaster === DisasterTaxonomies.Hurricane) {
          this.startHurricane();
        }
        this.state.wizardStep = WizardSteps.InputParameters;
        this.invokeStateUpdate();
      }
    );
  }

  constructor(private http: HttpClient, private api: ApiService, private utils: UtilsService) { }
}
