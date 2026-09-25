import { Component, Inject, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { FormField } from '../../models/form-field';
import { MatDatepickerControl, MatDatepickerModule, MatDatepickerPanel } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';



@Component({
  selector: 'app-dialog-stepper',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatStepperModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './dialog-stepper.html',
  styleUrl: './dialog-stepper.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogStepper implements OnInit, OnDestroy {

  // Rebuilt on every dialog open, so the currency formatter below has to be
  // closed with the component.
  private destroy$ = new Subject<void>();

  stepForms: FormGroup[] = [];
  picker!: MatDatepickerPanel<MatDatepickerControl<any>, any, any>;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { fields: FormField[], formTitle: string },
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DialogStepper>,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Create one form group per field
    this.data.fields.forEach(field => {
      const control = this.fb.group({
        [field.name]: ['', field.required ? Validators.required : []]
      });

      // Jika ni currency field (amount), attach valueChanges listener
      if (field.name.toLowerCase() === 'amount') {
        control.get(field.name)?.valueChanges
          .pipe(takeUntil(this.destroy$))
          .subscribe(value => {
          if (!value) return;

          // Ondoa comma zilizopo
          let numericValue = value.toString().replace(/,/g, '');
          if (!numericValue) return;

          const numberValue = Number(numericValue);
          if (isNaN(numberValue)) return;

          // Format kama currency (realtime)
          const formatted = numberValue.toLocaleString('en-US');

          // Update form control bila ku-trigger loop
          control.get(field.name)?.setValue(formatted, { emitEvent: false });
          this.cdr.markForCheck();
        });
      }

      this.stepForms.push(control);
    });
  }

  onSubmit() {
    const result: any = {};
    this.stepForms.forEach(fg => Object.assign(result, fg.value));
    this.dialogRef.close(result);
  }

  onCancel() {
    this.dialogRef.close();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
