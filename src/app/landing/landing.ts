import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from "@angular/material/icon";
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { provideHttpClient } from '@angular/common/http';
import { IconRegistryService } from '../Utils/services/icon-registry.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';


@Component({
  selector: 'app-landing',
  imports: [MatIconModule, MatButtonModule, TranslatePipe],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Landing {
  currentYear = new Date().getFullYear();

  constructor(private router: Router, private route: ActivatedRoute){}
  goToLogin() {
    this.router.navigate(['login']);
  }

}
