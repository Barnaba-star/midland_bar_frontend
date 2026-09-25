import { CommonModule } from '@angular/common';
import { Component, Inject, Input, TemplateRef, EventEmitter, Output, ViewChildren, QueryList, AfterViewInit, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormComponent } from '../form/form';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { ButtonComponent } from '../button/button';

import { MatFormFieldModule } from '@angular/material/form-field';
import { FormField } from '../../models/form-field';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';


@Component({
    selector: 'app-dialog',
    imports: [
    MatDialogModule,
    CommonModule,
    FormComponent,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    FormComponent,
    TranslatePipe,
],
    templateUrl: './dialog.html',
    styleUrls: ['./dialog.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DialogComponent implements AfterViewInit {
  @ViewChildren(FormComponent) forms!: QueryList<FormComponent>;
  @Input() template!: TemplateRef<any>;
  @Output() addFormEvent = new EventEmitter<void>();
  @Output() deleteFormEvent = new EventEmitter<number>();

  fields: FormField[] = [];
  formTitle = '';
  // Normalized initial values, regardless of whether the caller passed
  // formData as a plain object (e.g. `formData: item`) or array-wrapped
  // (e.g. `formData: [item]`). Both conventions are used across the app,
  // and indexing blindly into one shape silently dropped the other.
  initialFormData: any = {};

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<DialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {
    this.fields = this.data.fields || [];
    this.formTitle = this.data.formTitle || '';

    const rawFormData = this.data.formData;
    this.initialFormData = Array.isArray(rawFormData)
      ? (rawFormData[0] || {})
      : (rawFormData || {});
  }

 ngAfterViewInit() {
  this.forms.changes.subscribe(() => {
    if (this.forms.length > 0) {
      this.forms.first.patchForm(this.initialFormData);
    }
  });

  if (this.forms.length > 0) {
    this.forms.first.patchForm(this.initialFormData);
  }
}


  onSubmit() {
    if (!this.forms || this.forms.length === 0) {
      this.dialogRef.close(null);
      return;
    }

    const formData = this.forms.first.getFormValue();
    this.dialogRef.close(formData);
  }

  saveAllForms() {
    if (!this.forms || this.forms.length === 0) {
      return;
    }

    const allData = this.forms.map(formComp => formComp.getFormValue());
    this.dialogRef.close(allData);
  }

  addForm() {
    this.addFormEvent.emit();
  }

  deleteForm() {
    if (this.data.formData && this.data.formData.length > 0) {
      this.data.formData.pop();
    }
  }

  onClose() {
    this.dialogRef.close();
  }

onSubmitFromChild(formData: any) {
  this.dialogRef.close(formData);
}

}
