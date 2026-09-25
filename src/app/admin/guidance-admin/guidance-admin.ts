import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Title2 } from '../../Utils/component/title2/title2';
import { TitleAction } from '../../Utils/component/title/title.component';
import { Authentication } from '../../Utils/services/authentication';
import { AlertService } from '../../Utils/services/alert';
import { ComfirmDialogComponent } from '../../Utils/component/comfirm-dialog/comfirm-dialog';
import { GuidanceDialogComponent } from '../../Utils/component/dialogs/guidance-dialog-component/guidance-dialog-component';
import { AdminService, Guidance } from '../admin-service';

/**
 * What we publish for branches to read in POS.
 *
 * Drafts are listed alongside the published ones, marked as such - keeping
 * them somewhere else would mean two places to look for the same note.
 */
@Component({
  selector: 'app-guidance-admin',
  imports: [Title2, CommonModule, MatIconModule, TranslatePipe],
  templateUrl: './guidance-admin.html',
  styleUrl: './guidance-admin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuidanceAdmin implements OnInit {

  constructor(
    private visibility: Authentication,
    private adminService: AdminService,
    private alertService: AlertService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
  ) {}

  titleActions = [
    { icon: 'guidelines', title: 'GUIDANCE_ADMIN_PAGE.MANAGE_TAB', roles: ['ROOT', 'DIRECTOR'] }
  ];

  tab = '';

  notes: Guidance[] = [];
  loading = true;
  failed = false;

  ngOnInit(): void {
    this.tab = 'GUIDANCE_ADMIN_PAGE.MANAGE_TAB';
    this.load();
  }

  getTitled(title: TitleAction[]): TitleAction[] {
    return this.visibility.filteredTitleActions(title);
  }

  onAction(action: string): void {
    this.tab = action;
  }

  private load(): void {

    this.loading = true;
    this.failed = false;

    this.adminService.findAllGuidance().subscribe({
      next: (res) => {
        this.loading = false;
        this.notes = res?.data ?? [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.failed = true;
        this.cdr.markForCheck();
      },
    });
  }

  add(): void {
    this.open();
  }

  edit(note: Guidance): void {
    this.open(note);
  }

  private open(note?: Guidance): void {
    this.dialog.open(GuidanceDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      autoFocus: false,
      data: { guidance: note },
    }).afterClosed().subscribe(saved => {
      if (saved) {
        this.load();
      }
    });
  }

  /**
   * Publishing from the list, without opening the note. It is the one thing
   * that changes often - a note is written once and shown or hidden many
   * times.
   */
  togglePublished(note: Guidance): void {
    this.adminService.saveGuidance({ ...note, published: !note.published }).subscribe({
      next: (res) => {
        if (res?.data) {
          // Changed in place: reloading would move nothing but the eye.
          note.published = res.data.published;
          this.cdr.markForCheck();
        }
      },
      error: () => {
        this.alertService.show('error', this.translate.instant('GUIDANCE_ADMIN_PAGE.SAVE_FAILED'));
      },
    });
  }

  remove(note: Guidance): void {
    this.dialog.open(ComfirmDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      data: {
        title: this.translate.instant('GUIDANCE_ADMIN_PAGE.DELETE_TITLE'),
        message: this.translate.instant('GUIDANCE_ADMIN_PAGE.DELETE_MESSAGE', { title: note.title }),
      },
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) {
        return;
      }
      this.adminService.deleteGuidance(note.uid).subscribe({
        next: (res) => {
          if (res?.data === 'DELETED') {
            this.notes = this.notes.filter(n => n.uid !== note.uid);
            this.alertService.show('success', this.translate.instant('GUIDANCE_ADMIN_PAGE.DELETED'));
            this.cdr.markForCheck();
          }
        },
        error: () => {
          this.alertService.show('error', this.translate.instant('GUIDANCE_ADMIN_PAGE.DELETE_FAILED'));
        },
      });
    });
  }

  fileUrl(note: Guidance): string {
    return this.adminService.fileUrl(note.uid);
  }
}
