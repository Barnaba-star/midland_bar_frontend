import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserRoleDialogComponent } from './user-role-dialog-component';

describe('UserRoleDialogComponent', () => {
  let component: UserRoleDialogComponent;
  let fixture: ComponentFixture<UserRoleDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserRoleDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserRoleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
