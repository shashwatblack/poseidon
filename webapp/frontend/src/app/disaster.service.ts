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
  private updateCenterSource = new Subject<number>();
  private updateRadiusSource = new Subject<number>();
  private updateIntensitySource = new Subject<number>();

  // Observables
  stateUpdated$ = this.updateStateSource.asObservable();
  earthquakeStarted$ = this.startEarthquakeSource.asObservable();
  earthquakeCenterUpdated$ = this.updateCenterSource.asObservable();
  earthquakeRadiusUpdated$ = this.updateRadiusSource.asObservable();
  earthquakeIntensityUpdated$ = this.updateIntensitySource.asObservable();

  // Service message commands
  invokeStateUpdate() {
    this.updateStateSource.next();
  }

  startEarthquake() {
    this.startEarthquakeSource.next();
  }

  updateEarthquakeIntensity(newIntensity) {
    this.earthquakeParameters.intensity = newIntensity;
    this.updateIntensitySource.next(newIntensity);
  }

  updateEarthquakeCenter(newCenter) {
    this.earthquakeParameters.center = newCenter;
    this.updateCenterSource.next(newCenter);
  }

  updateEarthquakeRadius(newRadius) {
    this.earthquakeParameters.radius = newRadius;
    this.updateRadiusSource.next(newRadius);
  }

  constructor() { }
}
