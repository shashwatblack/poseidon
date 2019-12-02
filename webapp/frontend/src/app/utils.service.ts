import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {
  percentageToColor(percentage, lightness = 50,  maxHue = 0, minHue = 120) {
    percentage = this.toFloat(percentage);
    percentage /= 100;
    const hue = percentage * (maxHue - minHue) + minHue;
    return `hsl(${hue}, 100%, ${lightness}%)`;
  }

  toFloat(value) {
    return parseFloat(String(value));
  }

  toPrintableFloat(value) {
    return this.toFloat(value).toFixed(2);
  }

  toPrintableInt(value) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  constructor() {
  }
}
