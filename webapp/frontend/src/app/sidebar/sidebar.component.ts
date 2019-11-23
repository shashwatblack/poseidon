import {Component, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {DisasterService} from '../disaster.service';
import {DisasterTaxonomies, WizardSteps} from '../enums';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  WizardSteps = WizardSteps;
  DisasterTaxonomies = DisasterTaxonomies;

  private magnitudeResponse: any;
  private magnitude: string;

  chooseDisaster(chosenDisaster: DisasterTaxonomies) {
    this.disasterService.state.chosenDisaster = chosenDisaster;

    if (this.disasterService.state.chosenDisaster === DisasterTaxonomies.Earthquake) {
      this.disasterService.startEarthquake();
    } else if (this.disasterService.state.chosenDisaster === DisasterTaxonomies.Hurricane) {
      this.disasterService.startHurricane();
    }

    this.disasterService.state.wizardStep = WizardSteps.InputParameters;
  }

  goBack() {
    this.disasterService.state.wizardStep = Math.max(0, this.disasterService.state.wizardStep - 1);
    this.disasterService.invokeStateUpdate();
  }

  fetchMagnitude(event: Event) {
    event.preventDefault();
    this.http.post('http://localhost:8000/api/earthquake/', {
      magnitude: this.magnitude
    })
      .subscribe(
        data => {
          this.magnitudeResponse = data;
        },
        err => console.error(err)
      );
  }

  constructor(private http: HttpClient, private disasterService: DisasterService) {}

  ngOnInit() {
  }
}
