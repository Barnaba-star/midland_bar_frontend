import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { TitleAction, Title2 } from "../../Utils/component/title2/title2";
import { Authentication } from '../../Utils/services/authentication';
import { MatIconModule } from "@angular/material/icon";
import { MatTooltipModule } from '@angular/material/tooltip';
import { ServiceBarMethod } from '../service-bar-method';
import { PageableParam } from '../../Utils/models/responces';
import { TranslatePipe } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { ServiceDetailsDialogComponent } from '../../Utils/component/dialogs/service-details-dialog-component/service-details-dialog-component';
import { DecimalPipe } from '@angular/common';
import { EmptyStateComponent } from '../../Utils/component/empty-state/empty-state';


@Component({
  selector: 'app-bar-service',
  imports: [
    EmptyStateComponent,Title2, MatIconModule, TranslatePipe, MatTooltipModule, DecimalPipe],
  templateUrl: './bar-service.html',
  styleUrl: './bar-service.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarService implements OnInit{
  constructor(
    private visibility: Authentication, private barService: ServiceBarMethod, private cdr:ChangeDetectorRef, private dialog: MatDialog
  ) { }
 ngOnInit(): void {
  console.log('BarService INIT');
  this.selectedService = 'SERVICE.MANAGE'
  this.findBarServicePage();
}



  selectedService = '';


  titleActions: TitleAction[] = [

    {
      icon: 'more',
      title: 'SERVICE.MANAGE',
      roles: ['ROOT', 'STAFF', 'DIRECTOR', 'CEO', 'MANAGER', 'CASHIER']
    },


  ];

  getTitled(title: TitleAction[]): TitleAction[] {
    return this.visibility.filteredTitleActions(title);
  }
onAction(action: string) {
  this.selectedService = action;

  if (this.selectedService === 'SERVICE.MANAGE') {
    this.findBarServicePage();
   
  }
}


page = 0;
size = 5;

barServiceDataSource: any[] = [];
totalElements = 0;
totalPages = 0;

findBarServicePage() {
  console.log('findBarServicePage CALLED');

  const params: PageableParam = {
    page: this.page,
    size: this.size
  };

  this.barService.findBarServicePage(params).subscribe({
    next: (res) => {

      console.log('API RESPONSE:', res);
      console.log('API DATA:', res.data);

      this.barServiceDataSource = res.data ?? [];

      console.log(
        'DATA SOURCE LENGTH:',
        this.barServiceDataSource.length
      );

      this.totalElements = res.totalElements ?? 0;
      this.totalPages = res.totalPages ?? 0;
      this.page = res.currentPage ?? 0;
      this.size = res.size ?? 10;

      this.cdr.detectChanges();
    },

    error: (err) => {
      console.error('Error fetching bar services:', err);
    }
  });
}



changePage(page: number) {
  if (page < 0 || page >= this.totalPages) {
    return;
  }

  this.page = page;
  this.findBarServicePage();
}

changePageSize(event: Event) {
  const value = (event.target as HTMLSelectElement).value;

  this.size = Number(value);
  this.page = 0;

  this.findBarServicePage();
}

onMoreService(service: any): void {

  this.dialog.open(ServiceDetailsDialogComponent, {
    width: '480px',
    maxWidth: '95vw',
    data: service,
  });
}

}
