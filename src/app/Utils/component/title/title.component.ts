import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { CommonModule } from '@angular/common';
import { IconRegistryService } from '../../services/icon-registry.service';
import { MatIcon } from '@angular/material/icon';
import { Authentication } from '../../services/authentication';
import { Location } from '@angular/common';
import { PreviousRouteService } from '../../services/previous-route-service';
import { StorageService } from '../../services/storage';
import { MatDialog } from '@angular/material/dialog';
import { AlertService } from '../../services/alert';
import { MatSelectModule } from "@angular/material/select";


export interface TitleAction {
  icon: string;
  title: string;
  disabled?: boolean;
  roles?:string[];
}

@Component({
  selector: 'app-title',
  standalone:true,
  imports: [MatToolbarModule, CommonModule, MatIcon,  MatSelectModule],
  templateUrl: './title.component.html',
  styleUrl: './title.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TitleComponent implements OnInit {
  @Input() titleHeader: string = '';


  name: string = '';
  username: string = '';
  role: string = '';
  show: boolean = false;


  @Output() backClick = new EventEmitter<void>();
  @Output() logoutClick = new EventEmitter<void>();
  @Output() profileClick = new EventEmitter<void>();



  constructor(
    private router: Router,
    private iconRegistry: IconRegistryService,
    private authService: Authentication,
    private location: Location,
    private priv: PreviousRouteService,
    private auth: Authentication,
    private storage: StorageService,
    private dialog: MatDialog,
    private alertService:AlertService
  ) { }

  onBack(): void {
    const prev = this.priv.getPreviousUrl();

    if (prev.includes('/login')) {
      this.auth.removeToken();
    } else {
      this.location.back();
    }
  }

  onLogout(): void {
    this.router.navigate(['/login']);
    this.auth.removeToken();
  }
  showCard: boolean = false;

  onShow() {
    this.show = !this.show;
  }
  goToPersonnel() {
    this.router.navigate(['/personnel']);
  }
  ngOnInit(): void {
    this.username = this.authService.getUsername();
    this.role = this.authService.getRoles();
  }
  changePassword() {
   this.router.navigate(['/changePassword'])
  }


@Input() actions: TitleAction[] = [];
@Output() customButtonClick = new EventEmitter<string>();
activeAction: string | null = null;
onActionClick(action: TitleAction): void {
  if (action.disabled) {
    return;
  }
 this.customButtonClick.emit(action.title);
 this.activeAction = action.title;
}


}
