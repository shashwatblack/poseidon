import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {
  percentageToColor(percentage, alpha = 1, maxHue = 0, minHue = 120) {
    percentage = this.toFloat(percentage);
    percentage /= 100;
    const hue = percentage * (maxHue - minHue) + minHue;
    return `hsla(${hue}, 100%, 50%, ${alpha})`;
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
