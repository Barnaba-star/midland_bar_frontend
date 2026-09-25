import {
  Component,
  OnInit,
  ChangeDetectorRef,
  OnDestroy,
  ChangeDetectionStrategy
} from '@angular/core';
import { AlertService } from '../../services/alert';
import { AlertType } from '../../services/alert';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-alert',
  templateUrl: './alert.html',
  imports: [CommonModule],
  standalone: true,
  styleUrls: ['./alert.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlertComponent implements OnInit, OnDestroy {

  show = false;
  type: AlertType = 'info';
  message = '';

  private destroy$ = new Subject<void>();

  constructor(
    private alertService: AlertService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {

    this.alertService.alertState$
    .pipe(takeUntil(this.destroy$))
    .subscribe(alert => {

      this.type = alert.type;
      this.message = alert.message;

      setTimeout(() => {

        this.show = true;
        this.cd.detectChanges();

      });


      setTimeout(() => {

        this.show = false;
        this.cd.detectChanges();

      }, 2000);

    });

  }


  get icon(): string {

    switch (this.type) {

      case 'success':
        return '✓';

      case 'error':
        return '✕';

      case 'info':
        return 'ℹ';

      case 'warning':
        return '⚠';

      default:
        return '';

    }

  }


  get cssClass(): string {

    return `alert-box alert-${this.type}`;

  }


  close() {

    this.show = false;
    this.cd.detectChanges();

  }


  ngOnDestroy() {

    this.destroy$.next();
    this.destroy$.complete();

  }



}
