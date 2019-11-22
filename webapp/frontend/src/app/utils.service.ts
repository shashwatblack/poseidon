import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {
  intensityToColor(perc) {
    let r = 0;
    let g = 0;
    let b = 0;
    if (perc < 50) {
      r = 255;
      g = Math.round(5.1 * perc);
    } else {
      g = 255;
      r = Math.round(510 - 5.10 * perc);
    }
    const h = r * 0x10000 + g * 0x100 + b * 0x1;
    return '#' + ('000000' + h.toString(16)).slice(-6);
  }

  percentageToColor(percentage, maxHue = 0, minHue = 120) {
    percentage /= 100;
    const hue = percentage * (maxHue - minHue) + minHue;
    return `hsl(${hue}, 100%, 50%)`;
  }

  constructor() {
  }
}
