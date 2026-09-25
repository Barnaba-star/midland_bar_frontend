import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { Title2, TitleAction } from '../../Utils/component/title2/title2';
import { EmptyStateComponent } from '../../Utils/component/empty-state/empty-state';
import { Authentication } from '../../Utils/services/authentication';
import { AdminService, Guidance } from '../../admin/admin-service';

/**
 * How the platform says things should be done, as the branch reads it.
 *
 * Read-only by design: the notes are written and published on the Admin
 * side, and a branch that could edit them would be reading its own copy
 * rather than the rules.
 */
@Component({
  selector: 'app-bar-help',
  imports: [Title2, EmptyStateComponent, MatIconModule, TranslatePipe],
  templateUrl: './bar-help.html',
  styleUrl: './bar-help.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarHelp implements OnInit {

  constructor(
    private visibility: Authentication,
    private adminService: AdminService,
    private cdr: ChangeDetectorRef,
  ) {}

  // No roles listed: the guidance is for whoever is standing at the till.
  titleActions: TitleAction[] = [
    { icon: 'guidelines', title: 'HELP_PAGE.MANAGE_TAB' }
  ];

  tab = '';

  notes: Guidance[] = [];
  loading = true;
  failed = false;

  ngOnInit(): void {
    this.tab = 'HELP_PAGE.MANAGE_TAB';
    this.load();
  }

  getTitled(title: TitleAction[]): TitleAction[] {
    return this.visibility.filteredTitleActions(title);
  }

  onAction(action: string): void {
    this.tab = action;
  }

  load(): void {

    this.loading = true;
    this.failed = false;

    this.adminService.findPublishedGuidance().subscribe({

      next: (res) => {
        this.loading = false;
        this.notes = res?.data ?? [];
        this.cdr.markForCheck();
      },

      error: () => {
        this.loading = false;
        this.failed = true;
        this.notes = [];
        this.cdr.markForCheck();
      },
    });
  }

  fileUrl(uid: string): string {
    return this.adminService.fileUrl(uid);
  }
}
