import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogActions, MatDialogContent } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatError, MatFormField, MatSelectModule } from '@angular/material/select';
import { DecimalPipe } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-spend-dialog-component',
  imports: [MatDialogActions,  MatFormField, MatSelectModule, MatDialogContent, DecimalPipe, ReactiveFormsModule,
    MatFormFieldModule, MatIcon],
  templateUrl: './spend-dialog-component.html',
  styleUrl: './spend-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpendDialogComponent {

  spendForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SpendDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.spendForm = this.fb.group({
      amount: [
        null,
        [
          Validators.required,
          Validators.min(1),
          Validators.max(data.income - data.expenses)
        ]
      ],
      description: [
        '',
        [
          Validators.required,
          Validators.minLength(3)
        ]
      ]
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.spendForm.invalid) {
      this.spendForm.markAllAsTouched();
      return;
    }

    this.dialogRef.close({
      ...this.spendForm.value,
      uid: this.data.uid
    });
  }
}
