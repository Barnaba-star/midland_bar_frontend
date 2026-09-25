import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit, Optional } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Region, RegionService } from '../../../../settings/region-setting/region-service';

export interface BranchDialogData {
  /** The branch being edited, or nothing when registering a new one. */
  branch?: any;
}

/**
 * Registering a branch, and editing one.
 *
 * It replaces a generic form whose choices had drifted from what the product
 * actually is. Category offered four businesses - Real Estate, Restaurant,
 * Bar - for a salon system, so it is now stated rather than asked. Region
 * offered three of the country's regions from a list typed into the
 * component, while Settings > Regions held all twenty-six; the branch code
 * is built from the region, and the backend throws for a region it does not
 * know, so registering a branch in Mwanza could not work at all. The regions
 * now come from that page, and nowhere else.
 */
@Component({
  selector: 'app-branch-dialog-component',
  imports: [MatIconModule, FormsModule, TranslatePipe],
  templateUrl: './branch-dialog-component.html',
  styleUrl: './branch-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BranchDialogComponent implements OnInit {

  /**
   * The only kind of branch this system runs. Stated, not chosen - a
   * required dropdown with one entry is a click that can only go one way.
   */
  readonly category = 'Bar';

  isEdit = false;

  uid = '';
  branchCode = '';
  branchName = '';
  region = '';
  address = '';
  phone = '';
  status = 'ACTIVE';
  description = '';

  regions: Region[] = [];
  filteredRegions: Region[] = [];
  regionSearch = '';
  regionOpen = false;
  loadingRegions = true;
  regionsFailed = false;

  saving = false;
  errorMessage: string | null = null;

  constructor(
    private dialogRef: MatDialogRef<BranchDialogComponent>,
    private regionService: RegionService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    @Optional() @Inject(MAT_DIALOG_DATA) data: BranchDialogData | null,
  ) {
    const branch = data?.branch;
    if (branch) {
      this.isEdit = true;
      this.uid = branch.uid ?? '';
      this.branchCode = branch.branchCode ?? '';
      this.branchName = branch.branchName ?? '';
      this.region = branch.region ?? '';
      this.regionSearch = branch.region ?? '';
      this.address = branch.address ?? '';
      this.phone = branch.phone ?? '';
      // Existing rows hold both "Active" and "ACTIVE", so read loosely and
      // write one way.
      this.status = (branch.status ?? '').toUpperCase().startsWith('ACTIVE') ? 'ACTIVE' : 'INACTIVE';
      this.description = branch.description ?? '';
    }
  }

  ngOnInit(): void {
    this.loadRegions();
  }

  private loadRegions(): void {

    this.regionService.findRegions().subscribe({

      next: (res) => {
        this.loadingRegions = false;
        this.regions = res.data || [];
        this.filteredRegions = this.regions;
        this.cdr.markForCheck();
      },

      error: () => {
        // Without the list there is nothing valid to pick, and the backend
        // rejects an unknown region - so say so rather than let them type
        // something that will be refused on save.
        this.loadingRegions = false;
        this.regionsFailed = true;
        this.cdr.markForCheck();
      },
    });
  }

  /** Twenty-six regions are already in memory, so this filters in place. */
  onRegionSearch(): void {
    const term = this.regionSearch.trim().toLowerCase();
    this.filteredRegions = !term
      ? this.regions
      : this.regions.filter(r =>
          (r.name || '').toLowerCase().includes(term) ||
          (r.code || '').toLowerCase().includes(term));
    this.regionOpen = true;
    // Typing past a chosen region un-chooses it, so a half-typed name can
    // never be saved as if it had been picked.
    this.region = '';
    this.errorMessage = null;
  }

  openRegions(): void {
    this.filteredRegions = this.regions;
    this.regionOpen = true;
  }

  pickRegion(picked: Region): void {
    this.region = picked.name || '';
    this.regionSearch = picked.name || '';
    this.regionOpen = false;
    this.errorMessage = null;
  }

  closeRegions(): void {
    // A click on an option fires after the blur, so the list has to outlive
    // the blur by a tick or picking would never register.
    setTimeout(() => {
      this.regionOpen = false;
      // Whatever was half-typed is not a region; show what is actually held.
      this.regionSearch = this.region;
      this.cdr.markForCheck();
    }, 150);
  }

  get canSave(): boolean {
    return !this.saving && !!this.branchName.trim() && !!this.region;
  }

  save(): void {

    if (!this.branchName.trim()) {
      this.errorMessage = this.translate.instant('BRANCH_DIALOG.NAME_REQUIRED');
      return;
    }

    if (!this.region) {
      this.errorMessage = this.translate.instant('BRANCH_DIALOG.REGION_REQUIRED');
      return;
    }

    this.dialogRef.close({
      uid: this.uid || undefined,
      branchCode: this.branchCode || undefined,
      branchName: this.branchName.trim(),
      branchCategory: this.category,
      region: this.region,
      address: this.address.trim(),
      phone: this.phone.trim(),
      status: this.status,
      description: this.description.trim(),
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
