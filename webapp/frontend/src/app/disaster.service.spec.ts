import { TestBed } from '@angular/core/testing';

import { DisasterService } from './disaster.service';

describe('DisasterService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: DisasterService = TestBed.get(DisasterService);
    expect(service).toBeTruthy();
  });
});
