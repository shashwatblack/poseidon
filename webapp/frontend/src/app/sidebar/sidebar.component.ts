import {Component, OnInit} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  private magnitudeResponse: any;
  private magnitude: string;

  constructor(private http: HttpClient) {
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
