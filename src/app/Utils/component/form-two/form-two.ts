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

@Component({
  selector: 'app-form-two',
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
    ],
  templateUrl: './form-two.html',
  styleUrl: './form-two.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormTWO implements OnInit, OnDestroy {
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
  @Output() formReady = new EventEmitter<FormGroup>();
  @Output() clearFormRequested = new EventEmitter<void>();
  previewUrls: { [key: string]: string } = {};

  form!: FormGroup;
  picker: any;

  constructor(private fb: FormBuilder, private dialog: MatDialog, private cdRef: ChangeDetectorRef) {}

  ngOnInit() {

    const group: any = {};
    this.fields.forEach((field) => {
      const validators = [];

    if (field.required) {
    validators.push(Validators.required);
    }

    if (field.minLength) {
    validators.push(Validators.minLength(field.minLength));
    }

if (field.maxLength) {
  validators.push(Validators.maxLength(field.maxLength));
}

if (field.pattern) {
  validators.push(Validators.pattern(field.pattern));
}
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
    this.formReady.emit(this.form)
  }


getFormValue() {

  if (this.form.valid) {

    const formValue = { ...this.form.value };

    this.fields.forEach((field) => {

      if (field.type === 'date' && formValue[field.name] instanceof Date) {
        formValue[field.name] = formValue[field.name]
          .toISOString()
          .split('T')[0];
      }

      if (field.prefix || field.suffix) {
        formValue[field.name] =
          `${field.prefix ?? ''}${formValue[field.name]}${field.suffix ?? ''}`.trim();
      }

    });

    return formValue;

  } else {

    this.form.markAllAsTouched();
    return null;

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

getErrorMessage(field: FormField): string {

  const control = this.form.get(field.name);

  if (!control || !control.errors) {
    return '';
  }

  if (control.hasError('required')) {
    return field.requiredMessage || `Enter ${field.label}`;
  }

  if (control.hasError('email')) {
    return 'Enter a valid email address';
  }

  if (control.hasError('minlength')) {
    return (
      field.minLengthMessage ||
      `Minimum ${field.minLength} characters required`
    );
  }

  if (control.hasError('maxlength')) {
    return (
      field.maxLengthMessage ||
      `Maximum ${field.maxLength} characters allowed`
    );
  }

  if (control.hasError('pattern')) {
    return field.patternMessage || 'Invalid value';
  }

  return 'Invalid value';
}

hasError(field: FormField): boolean {
  const control = this.form.get(field.name);

  return !!(
    control &&
    control.invalid &&
    (control.touched || control.dirty)
  );
}

clearForm() {

  this.form.reset();

  // kwa checkbox-group ambazo zinatumia array
  this.fields.forEach(field => {

    if (field.type === 'checkbox-group') {
      this.form.get(field.name)?.setValue([]);
    }

    // kuondoa preview ya files
    if (field.type === 'file') {
      if (this.previewUrls[field.name]) {
        URL.revokeObjectURL(this.previewUrls[field.name]);
        delete this.previewUrls[field.name];
      }
    }

  });

}


  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
