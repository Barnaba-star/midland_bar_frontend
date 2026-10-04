import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoaderService } from '../../services/loader-service';

/**
 * A thin bar along the top of the screen while the app waits on the server.
 * It does not cover the page: a cashier can keep tapping while it runs.
 */
@Component({
  selector: 'app-loader',
  standalone: true,
  templateUrl: './loader.html',
  styleUrls: ['./loader.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoaderComponent {
  protected loading = inject(LoaderService).loading;
}
