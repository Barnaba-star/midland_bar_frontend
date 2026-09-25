import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, EventEmitter, Inject, Input, Output, QueryList, TemplateRef, ViewChildren, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '../button/button';
import { DialogComponent } from '../dialog/dialog';
import { FormComponent } from '../form/form';

@Component({
  selector: 'app-workflow-dialog',
  imports: [
 MatDialogModule,
    CommonModule,
    FormComponent,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,

],
  templateUrl: './workflow-dialog.html',
  styleUrl: './workflow-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkflowDialog implements AfterViewInit {
  @ViewChildren(FormComponent) forms!: QueryList<FormComponent>;
  @Input() template!: TemplateRef<any>;
  @Output() addFormEvent = new EventEmitter<void>();
  @Output() deleteFormEvent = new EventEmitter<number>();
  index:number=1;


  constructor(
    public dialogRef: MatDialogRef<DialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      icon?: string,
      formTitle?: string,
      fields?: any[],
      formData?: any[],
      showAddButton?: boolean,
      showSaveALLButton?: boolean,
      showDeleteButton?: boolean,
      onClose?: () => void
    }
  ) {
    if (!this.data.formData) {
      this.data.formData = [{}];
    }
  }

 
onSubmit() {
  if (!this.forms || this.forms.length === 0) {
    this.dialogRef.close(null);
    return;
  }

  if (this.forms.length === 1) {
    const singleData = this.forms.first.getFormValue();
    console.log('Single form data:', singleData);
    this.dialogRef.close(singleData);
  } else {
    const allData = this.forms.map(formComp => formComp.getFormValue());
    console.log('Multiple forms data via onSubmit:', allData);
    this.dialogRef.close(allData);
  }
}



  addForm() {
    this.addFormEvent.emit();
  }

deleteForm() {
  if (this.data.formData && this.data.formData.length > 1) {
    this.data.formData.pop(); 
  }
}



ngAfterViewInit() {
    this.forms.changes.subscribe(() => {
      console.log('Forms detected:', this.forms.length);
    });
  }
 

saveAllForms() {
  if (!this.forms || this.forms.length === 0) {
    console.warn('No forms available yet!');
    return;
  }
  const allData = this.forms.map(formComp => formComp.getFormValue());
  console.log('All forms data:', allData);

  this.dialogRef.close(allData);
}
onClose(){
this.dialogRef.close()
}

}
