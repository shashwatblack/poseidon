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

  private state: {
    wizardStep: WizardSteps,
    chosenDisaster?: DisasterTaxonomies,
  } = {
    wizardStep: WizardSteps.DisasterChoice,
  };

  private magnitudeResponse: any;
  private magnitude: string;
  private earthquakeParameters: object;

  chooseDisaster(chosenDisaster: DisasterTaxonomies) {
    this.state.chosenDisaster = chosenDisaster;

    if (this.state.chosenDisaster === DisasterTaxonomies.Earthquake) {
      this.disasterService.startEarthquake();
    } else if (this.state.chosenDisaster === DisasterTaxonomies.Hurricane) {
      console.log('Method not implemented.');
    }

    this.state.wizardStep = WizardSteps.InputParameters;
  }

  goBack() {
    this.state.wizardStep = Math.max(0, this.state.wizardStep - 1);
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

  constructor(private http: HttpClient, private disasterService: DisasterService) {
    this.earthquakeParameters = disasterService.earthquakeParameters;
  }

  ngOnInit() {
  }
}
