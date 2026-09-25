import { TemplateRef } from "@angular/core";
import { Observable, Subject } from "rxjs";

export interface FieldOption {
  label: string;
  value: any;
  checked?: boolean;
}

export interface FormField {
  [x: string]: any;
  searchControl?: any;
  filteredOptions$?: any;
  name: string;
  label?: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'checkbox-group' | 'file' | 'autocomplete' |
        'date' | 'autocomplete-async'| 'email' | 'password' | 'time' | 'color' | 'datetime' | 'month' | 'week'| 'range'| 'chips'| 'toggle'| 'rich-text' | 'rating'
        | 'signature'| 'map-location' | 'fab'
  required?: boolean;
  options?: FieldOption[];
  placeholder?: string;
  viewer?: boolean;
  accept?: string;
  enumMap?: any;
  asyncSearch?: boolean;
  endpoint?: string;
  search$?: Subject<string>;
  loading?: boolean;
   value?: any;
   colSpan?: number;

rowSpan?: number;

  // ---- Added improvements ----

  // Validation
  validators?: any[];
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string | RegExp;
requiredMessage?: string;
patternMessage?: string;
minLengthMessage?: string;
maxLengthMessage?: string;

  // Display / Layout
  class?: string;
  hint?: string;
  icon?: string;
  prefix?: string;
  suffix?: string;

  // Behavior control
  disabled?: boolean;
  hidden?: boolean;
  multiple?: boolean;
  readonly?: boolean;

  // Dynamic logic
  dependsOn?: string;
  conditionalOptions?: (value: any) => FieldOption[];
  visibleWhen?: (formValue: any) => boolean;


  // Advanced
  customTemplate?: TemplateRef<any>;

  // ================================
  // 🔹 Enterprise-level extras
  // ================================

  tooltip?: string;
  ariaLabel?: string;
  mask?: string;
  debounceTime?: number;
  apiParams?: any;
  group?: string;
  tabIndex?: number;
  errorMessages?: { [key: string]: string };
  sortable?: boolean;
  draggable?: boolean;

  step?: number;
  autoFocus?: boolean;
  clearable?: boolean;
  loadingText?: string;
  emptyText?: string;
  maxFiles?: number;
  maxFileSize?: number;
  previewType?: 'image' | 'pdf' | 'video';
  sortableGroup?: string;
  stepperIndex?: number;
  inline?: boolean;
  resizable?: boolean;
  spellCheck?: boolean;
  autoComplete?: 'on' | 'off';
  rows?: number;
  cols?: number;
  wrap?: 'soft' | 'hard';


  onChange?: (value: any) => void;
  searchFn?: (input: string) => Observable<FieldOption[]>;
  mapFn?: (item: any) => FieldOption;

  validateFn?: (value: any) => boolean | string;
  beforeChange?: (oldValue: any, newValue: any) => boolean;
  afterChange?: (value: any) => void;

  onFocus?: () => void;
  onBlur?: () => void;

  formatFn?: (value: any) => any;
  parseFn?: (input: any) => any;
  onClick?: () => void;
}

