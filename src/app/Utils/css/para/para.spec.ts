import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Para } from './para';

describe('Para', () => {
  let component: Para;
  let fixture: ComponentFixture<Para>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Para]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Para);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
