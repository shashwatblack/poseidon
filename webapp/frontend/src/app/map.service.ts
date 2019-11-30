import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
import {DisasterTaxonomies, WizardSteps} from './enums';
import {HttpClient} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private settlementViewPromise: any;

  fetchSettlementView() {
    this.settlementViewPromise = this.http.get('http://localhost:8000/api/map/', {
      params: {
        map_type: 'SETTLEMENT_VIEW'
      }
    }).toPromise();
  }

  getSettlementViewPromise() {
    return this.settlementViewPromise;
  }

  constructor(private http: HttpClient) {}
}
