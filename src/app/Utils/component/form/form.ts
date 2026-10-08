import { localDate } from '../../services/local-date';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { FormControl } from '@angular/forms';
import { startWith, map } from 'rxjs/operators';
import { MatRadioModule } from '@angular/material/radio';
import { Observable, Subject, takeUntil } from 'rxjs';
import { FormField, FieldOption } from '../../models/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-form',
    imports: [
        ReactiveFormsModule,
        FormsModule,
        CommonModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        MatRadioModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatAutocompleteModule,
        MatIconModule,
        TranslatePipe,
    ],
    templateUrl: './form.html',
    styleUrl: './form.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormComponent implements OnInit, OnDestroy {
  // The onChange listeners below outlive nothing else: these form components are
  // rebuilt every time a dialog opens, so their valueChanges subscriptions have
  // to be closed with the component.
  private destroy$ = new Subject<void>();

[x: string]: any;

  @Input() fields: any[] = [];
  @Input() formTitle: string = '';
  @Output() submitForm = new EventEmitter<any>();
  @Output() deleteForm = new EventEmitter<any>();
  @Output() addFieldRequested = new EventEmitter<void>();
  @Output() addForm = new EventEmitter<any>();
  @Input() showAddButton: boolean = false;
  @Input() showDeleteButton: boolean = false;
  @Input() initialData: any = {};
  previewUrls: { [key: string]: string } = {};

  form!: FormGroup;
  picker: any;

  constructor(private fb: FormBuilder, private dialog: MatDialog, private cdRef: ChangeDetectorRef) {}

  ngOnInit() {
    const group: any = {};
    this.fields.forEach((field) => {
      const validators = field.required ? [Validators.required] : [];
      const initialValue =
        this.initialData?.[field.name] ??
        (field.type === 'checkbox-group' ? [] : '');


      const control = this.fb.control(initialValue, validators);
      

      if (field.onChange) {
        control.valueChanges
          .pipe(takeUntil(this.destroy$))
          .subscribe((value) => {
            field.onChange(value);
            this.cdRef.markForCheck();
          });
      }

      group[field.name] = control;

      if (field.type === 'select' && field.options) {
        field.searchControl = new FormControl('');
        field.filteredOptions = field.searchControl.valueChanges.pipe(
          startWith(''),
          map((value: string) =>
            field.options.filter((opt: any) =>
              opt.label.toLowerCase().includes(value.toLowerCase())
            )
          )
        );
      }
    });
    this.form = this.fb.group(group);
  }


 getFormValue() {
    return this.form.value;
  }

  onSubmit() {
    if (this.form.valid) {
      const formValue = { ...this.form.value };
      this.fields.forEach((field) => {
        if (field.type === 'date' && formValue[field.name] instanceof Date) {
          formValue[field.name] = localDate(formValue[field.name]);
        }
      if (field.prefix || field.suffix) {
        formValue[field.name] = `${field.prefix ?? ''}${formValue}${field.suffix ?? ''}`.trim();
      }
      });
      this.submitForm.emit(formValue);
      this.form.reset();
    } else {
      this.form.markAllAsTouched();
    }
  }

  onCheckboxChange(event: any, fieldName: string) {
    let selected: any[] = this.form.get(fieldName)?.value || [];
    const value = event.target.value;
    if (event.target.checked) {
      if (!selected.includes(value)) {
        selected.push(value);
      }
    } else {
      selected = selected.filter((item) => item !== value);
    }
    this.form.get(fieldName)?.setValue(selected);
  }

  onFileSelected(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.form.get(fieldName)?.setValue(file);
      if (this.previewUrls[fieldName]) {
        URL.revokeObjectURL(this.previewUrls[fieldName]);
      }
      this.previewUrls[fieldName] = URL.createObjectURL(file);
    }
  }

  isImage(url: string): boolean {
    return /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(url);
  }

  onAdd() {
    this.addForm.emit();
  }
  onDelete() {
    this.deleteForm.emit();
  }
  onFieldChange(field: FormField, event: any): void {
    const selectedValue = event.option?.value ?? null;
    this.form.get(field.name)?.setValue(selectedValue);
    const selectedLabel = event.option?.viewValue ?? event.option?.value ?? '';
    field.searchControl.setValue(selectedLabel, { emitEvent: false });
  }

  displayFn(field: FormField): (value: any) => string {
    return (value: any) => {
      if (!value || !field.filteredOptions$) return '';
      const options = field.filteredOptions$.getValue();
      const match = options.find(
        (option: FieldOption) => option.value === value
      );
      return match ? match.label : '';
    };
  }
  addChip(fieldName: string, event: any) {
    const value = (event.value || '').trim();
    if (value) {
      const current = this.form.get(fieldName)?.value || [];
      this.form.get(fieldName)?.setValue([...current, value]);
    }
    event.input.value = '';
  }

  removeChip(fieldName: string, chip: string) {
    const current = this.form.get(fieldName)?.value || [];
    this.form
      .get(fieldName)
      ?.setValue(current.filter((c: string) => c !== chip));
  }

  setRating(fieldName: string, value: number) {
    this.form.get(fieldName)?.setValue(value);
  }

  saveSignature(fieldName: string, event: any) {
    const dataUrl = event.toDataURL();
    this.form.get(fieldName)?.setValue(dataUrl);
  }

  setLocation(fieldName: string, location: any) {
    this.form.get(fieldName)?.setValue(location);
  }




  buildFormControls() {
    const group: any = {};
    this.fields.forEach((field) => {
      if (field.type !== 'fab') {
        group[field.name] = this.fb.control('');
      }
    });
    this.form = this.fb.group(group);
  }
shouldSpanFullWidth(type: string): boolean {
  const fullWidthTypes = ['textarea',  'checkbox-group', 'rich-text', 'map-location', 'radio'];
  return fullWidthTypes.includes(type);
}
patchForm(formData: any) {
  if (this.form && formData) {
    this.form.patchValue(formData);
    this.cdRef.markForCheck();
  }
}

shouldShowField(field: FormField): boolean {
  // 1️⃣ Ikiwa field imefichwa moja kwa moja (hidden:true)
  if (field.hidden) return false;

  // 2️⃣ Ikiwa kuna visibleWhen function, tumia form values
  if (field.visibleWhen) {
    return field.visibleWhen(this.form.value);
  }

  // 3️⃣ Vinginevyo, ionekane kawaida
  return true;
}






  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
