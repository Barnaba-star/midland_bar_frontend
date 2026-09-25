import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Form3 } from './form3';

describe('Form3', () => {
  let component: Form3;
  let fixture: ComponentFixture<Form3>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Form3]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Form3);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
