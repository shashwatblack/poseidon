import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import {DisasterTaxonomies, WizardSteps} from './enums';

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
    radius: 5000,
    intensity: 5
  };

  hurricaneParameters = {
    start: {
      center: {
        lat: 0.0,
        lng: 0.0
      },
      radius: 5000,
      intensity: 5
    },
    end: {
      center: {
        lat: 0.0,
        lng: 0.0
      },
      radius: 5000,
      intensity: 5
    }
  };

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

  constructor() { }
}
