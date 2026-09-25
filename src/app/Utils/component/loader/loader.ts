import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderService } from '../../services/loader-service';


@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './loader.html',
  styleUrls: ['./loader.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoaderComponent implements OnInit {

  loading = false;


  constructor(
    private loaderService: LoaderService,
    private cdr: ChangeDetectorRef
  ){}


  ngOnInit(){

    this.loaderService.loaderState$
    .subscribe(state => {

      this.loading = state;
      this.cdr.markForCheck();

    });

  }

}
