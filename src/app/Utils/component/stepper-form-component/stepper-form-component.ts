import { Component, EventEmitter, Inject, Input, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormField } from '../../models/form-field';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormComponent } from "../form/form";


@Component({
  selector: 'app-stepper-form-component',
  imports: [MatDialogModule, CommonModule, MatStepperModule, ReactiveFormsModule, MatNativeDateModule,
            MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSelectModule, MatDatepickerModule, FormsModule, FormComponent],
  templateUrl: './stepper-form-component.html',
  styleUrl: './stepper-form-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StepperDialogComponent implements OnInit {
  formGroups: FormGroup[] = [];
  steps: FormField[][] = [];
  formTitle = '';
  initialData: any = {};

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<StepperDialogComponent>
  ) {}

  ngOnInit(): void {
    this.steps = this.data.steps;
    this.formTitle = this.data.formTitle;
    this.initialData = this.data.initialData;

    this.steps.forEach((step) => {
      const group = this.fb.group({});
      step.forEach((field) => {
        const validators = field.required ? [Validators.required] : [];
        group.addControl(field.name, this.fb.control(this.initialData[field.name] || '', validators));
      });
      this.formGroups.push(group);
    });
  }

  submit(): void {
    const result = this.formGroups.reduce((acc, group) => ({ ...acc, ...group.value }), {});
    this.dialogRef.close(result);
  }
}
