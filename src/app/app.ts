import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AlertComponent } from "./Utils/component/alert/alert";
import { LoaderComponent } from "./Utils/component/loader/loader";
import { IconRegistryService } from './Utils/services/icon-registry.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AlertComponent, LoaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  protected readonly title = signal('angular-routes');
  constructor(
    private iconRegistryService: IconRegistryService
  ) {}
}
