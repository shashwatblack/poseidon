import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DisasterService {
  currentDisaster = 'Earthquake';
  earthquakeParameters = {
    center: {
      lat: 0.0,
      lng: 0.0
    },
    radius: 5000,
    intensity: 5
  };

  // Observable string sources
  private startEarthquakeSource = new Subject<string>();
  private updateIntensitySource = new Subject<number>();

  // Observable string streams
  earthquakeStarted$ = this.startEarthquakeSource.asObservable();
  intensityUpdated$ = this.updateIntensitySource.asObservable();

  // Service message commands
  startEarthquake() {
    this.startEarthquakeSource.next();
  }

  updateEarthquakeIntensity(newIntensity) {
    this.earthquakeParameters.intensity = newIntensity;
    this.updateIntensitySource.next(newIntensity);
  }

  constructor() { }
}
