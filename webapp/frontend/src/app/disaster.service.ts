import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
import {DisasterTaxonomies, WizardSteps} from './enums';
import {HttpClient} from '@angular/common/http';
import {ApiService} from "./api.service";

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
      lat: 0.0,
      lng: 0.0
    },
    radius: 300000,
    intensity: 8
  };

  hurricaneParameters = {
    start: {
      center: {
        lat: 0.0,
        lng: 0.0
      },
      radius: 100000,
      intensity: 90
    },
    end: {
      center: {
        lat: 0.0,
        lng: 0.0
      },
      radius: 30000,
      intensity: 30
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
      disaster_params = this.earthquakeParameters;
    } else if (this.state.chosenDisaster === DisasterTaxonomies.Hurricane) {
      disaster_type = "hurricane";
      disaster_params = this.hurricaneParameters;
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
      err => console.error(err)
    );
  }

  constructor(private http: HttpClient, private api: ApiService) { }
}
