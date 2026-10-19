import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';

import { UserRoleDialogComponent } from './user-role-dialog-component';

describe('UserRoleDialogComponent', () => {
  let component: UserRoleDialogComponent;
  let fixture: ComponentFixture<UserRoleDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserRoleDialogComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService(),
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            user: { uid: 'u1' },
            roles: [{ uid: 'r1', name: 'CEO' }, { uid: 'r2', name: 'MANAGER' }],
            selectedRoleUIDs: ['r2'],
          },
        },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserRoleDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('lists the roles the user holds, and drops one when removed', () => {
    expect(component.assignedRoles.map((r) => r.uid)).toEqual(['r2']);
    component.remove('r2');
    expect(component.assignedRoles).toEqual([]);
  });
});
