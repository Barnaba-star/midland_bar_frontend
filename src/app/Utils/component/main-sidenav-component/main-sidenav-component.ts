import { ChangeDetectorRef, Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatDivider } from '@angular/material/divider';
import { Authentication } from '../../services/authentication';
import { SidenavItem } from './model';
import { UserService } from '../../../settings/users-setting/user-service';
import { error } from 'console';
import { UploadedImageService } from '../../services/uploaded-image';


@Component({
  selector: 'app-main-sidenav',
  templateUrl: './main-sidenav-component.html',
  styleUrls: ['./main-sidenav-component.css'],
  imports: [MatIcon, CommonModule, MatDivider],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class MainSidenavComponent implements OnInit {

  username: string = '';
  role:string = '';
  tenantID:string = '';
  personnelUID:string = '';
  userProfilePath:string='';
  userUID:string='';
  profilePic='';
  branchUID='';
  branchName='';
  branchCategory='';
  fullName='';
  email = '';

  constructor(
    private router: Router,
    private authDetails: Authentication,
    private userService:UserService, private cdr:ChangeDetectorRef, private auth:Authentication,
    private uploadedImage:UploadedImageService
  ) {}

  ngOnInit(): void {
    this.username = this.authDetails.getFullName();
    this.fullName = this.authDetails.getFullName();
    this.email = this.authDetails.getEmail();
    console.log('Username in Sidenav:', this.username);
    this.role = this.authDetails.getRoles();
    console.log('Role in Sidenav:', this.role);
    this.tenantID = this.authDetails.getTenantId();
    console.log('Tenant ID in Sidenav:', this.tenantID);
    this.findUserProfilePic(this.authDetails.getUserUID());
    this.findBranchByUID(this.authDetails.getBranchUID());
    this.branchUID = this.authDetails.getBranchUID();
    console.log('BranchUID', this.branchUID);
  }

 findUserProfilePic(userUID:string){
  this.userService.findUserProfilePic(userUID).subscribe({
    next:(res)=>{
      this.uploadedImage.load(res.data?.imageName).subscribe((url) => {
        this.profilePic = url ?? this.profilePic;
        this.cdr.detectChanges();
      });

      console.log('Profile Path:', this.profilePic);

    },
    error:(error)=>{
      console.error('Error occured during Fetching Image', error);
    }
  });
}

findBranchByUID(branchUID:string){
  this.userService.findBranchByUID(branchUID).subscribe({
    next:(res)=>{
      console.log('Branch Found', res.data);
      this.branchName = res.data.branchName;
      this.branchCategory = res.data.branchCategory;
      this.cdr.detectChanges();
    },
    error:(error)=>{
      console.error('Error occurred during Fetching Branch', error);
    }
  })
}

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

goToDashboard() {
    this.router.navigate(['dashboard']);
}


goToLogin() {
    this.router.navigate(['login']);
    this.auth.removeToken();
    this.username = '';
    this.tenantID = '';
}


@Input() menuItems: SidenavItem[] = [];
@Input() logoUrl: string = 'assets/images/baronix-logo.png';

isOpen = true;
openIndex: number | null = null;




toggleSidenav() {
this.isOpen = !this.isOpen;
}

toggleMenu(index: number) {
this.openIndex = this.openIndex === index ? null : index;
}

onItemClick(item: SidenavItem, index: number) {
if (item.children?.length) {
this.toggleMenu(index);
return;
}
if (item.route) {
this.router.navigate([item.route]);
}

if (item.action) {
item.action();
}
}

onSubItemClick(sub: SidenavItem) {
this.openIndex = null;
if (sub.route) {
this.router.navigate([sub.route]);
}


if (sub.action) {
sub.action();
}
}


isFullscreen = false;
toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    this.isFullscreen = true;
  } else {
    document.exitFullscreen();
    this.isFullscreen = false;
  }
}
isOpenRightNav=false;
openRightNav(){
this.isOpenRightNav = ! this.isOpenRightNav
}

currentYear: number = new Date().getFullYear();

}
