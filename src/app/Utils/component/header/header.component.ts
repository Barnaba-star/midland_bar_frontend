import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatDivider } from "@angular/material/divider";
import { MatSidenavModule } from '@angular/material/sidenav';
import { ActivatedRoute, Route, Router, RouterModule } from "@angular/router";



@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  standalone: true,
  imports: [CommonModule, MatIconModule, MatFormFieldModule, MatSidenavModule, RouterModule, MatDivider],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {

constructor(private router:Router, private route: ActivatedRoute){}
  isOpen = false;
  openMenu1 = false;
  openMenu2 = false;
  profile = false;
toggleProfile(){
  this.profile = ! this.profile;
}
  toggleSidebar() {
    this.isOpen = !this.isOpen;
  }

  toggleMenu1() {
    this.openMenu1 = !this.openMenu1;
  }

  toggleMenu2() {
    this.openMenu2 = !this.openMenu2;
  }



goToFirstComponent(){
 this.toggleMenu2();
 this.router.navigate(['/mainpage/first']);
 console.log('First Component')


}


}
