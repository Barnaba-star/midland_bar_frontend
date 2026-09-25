import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

interface ShortcutRow {
  keys: string;
  labelKey: string;
}

@Component({
  selector: 'app-help-dialog-component',
  imports: [MatIconModule, TranslatePipe],
  templateUrl: './help-dialog-component.html',
  styleUrl: './help-dialog-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpDialogComponent {

  readonly shortcuts: ShortcutRow[] = [
    { keys: 'Ctrl / Cmd + K', labelKey: 'HELP.SHORTCUT_SEARCH' },
    { keys: 'Esc', labelKey: 'HELP.SHORTCUT_CLOSE' },
  ];

  constructor(private dialogRef: MatDialogRef<HelpDialogComponent>) { }

  close(): void {
    this.dialogRef.close();
  }
}
