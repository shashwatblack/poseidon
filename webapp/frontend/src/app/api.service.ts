import {enableProdMode, Injectable} from '@angular/core';
import {environment} from "../environments/environment";

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  endPoints = {
    map: '/api/map/',
    simulation: '/api/simulation/',
    earthquake: '/api/earthquake/',
  };

  getUrl(endPoint) {
    if (environment.production) {
      return this.endPoints[endPoint];
    }
    return 'http://localhost:8000' + this.endPoints[endPoint];
  }

  constructor() {}
}
