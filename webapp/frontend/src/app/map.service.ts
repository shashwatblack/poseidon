import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
import {DisasterTaxonomies, WizardSteps} from './enums';
import {HttpClient} from '@angular/common/http';
import {ApiService} from "./api.service";

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private settlementViewPromise: any;

  fetchSettlementView() {
    this.settlementViewPromise = this.http.get(this.api.getUrl('map'), {
      params: {
        map_type: 'SETTLEMENT_VIEW'
      }
    }).toPromise();
  }

  getSettlementViewPromise() {
    return this.settlementViewPromise;
  }

  constructor(private http: HttpClient, private api: ApiService) {}
}
