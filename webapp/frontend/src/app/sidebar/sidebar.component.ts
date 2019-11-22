import {Component, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {DisasterService} from '../disaster.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {

  private magnitudeResponse: any;
  private magnitude: string;
  private earthquakeParameters: object;

  constructor(private http: HttpClient, private disasterService: DisasterService) {
    this.earthquakeParameters = disasterService.earthquakeParameters;
  }

  ngOnInit() {
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
}
