import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { JwtHelperService } from '@auth0/angular-jwt';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MainSidenavComponent } from '../component/main-sidenav-component/main-sidenav-component';
import { SidenavItem } from '../component/main-sidenav-component/model';
import { TitleAction } from '../component/title/title.component';
import { environment } from '../enviroments/environment';
import { Observable } from 'rxjs';
import { Response, ResponseList, ResponsePage } from '../models/responces';



@Injectable({
  providedIn: 'root'
})
export class Authentication {
constructor(private cookieService:CookieService, private http:HttpClient){}
private jwtHelper = new JwtHelperService();
private baseURL = environment.baseApiUrl
private profilePicURL = `${this.baseURL}/attachment`

 createHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    const token = this.cookieService.get('bar_jwt_token');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

setToken(token: string): void {
    this.cookieService.set('bar_jwt_token', token, 7, '/');
    // A different user means different roles, so anything filtered against
    // the old token has to go.
    this.clearRoleCaches();
  }
 getToken(): string {
  const rawToken = this.cookieService.get('bar_jwt_token');
  return rawToken?.replace(/^"(.*)"$/, '$1');
}


removeToken(): void {
  // Signed out (or thrown out): the 30-second heartbeat would otherwise go on
  // without a token and come back "session expired" over the login screen.
  this.stopHeartbeat();
  this.cookieService.delete('bar_jwt_token', '/');
  this.clearRoleCaches();
}

private clearRoleCaches(): void {
  this.filteredMenuCache = new WeakMap<SidenavItem[], SidenavItem[]>();
  this.filteredTitleCache = new WeakMap<TitleAction[], TitleAction[]>();
}

getUsername(): string {
  const token = this.getToken();
  if (!token) {
    console.log('No Token Found');
    return '';
  }
  const decodedToken = this.jwtHelper.decodeToken(token);
  const username = decodedToken.sub;
  console.log('Username:', username);
  return username;
}

/** Main office (STAFF) helping in a customer's branch: they may look, not change anything. */
isViewOnly(): boolean {
  const token = this.getToken();
  if (!token) {
    return false;
  }
  try {
    return this.jwtHelper.decodeToken(token)?.viewOnly === true;
  } catch {
    return false;
  }
}

getFullName(): string {
  const token = this.getToken();
  if (!token) {
    console.log('No Token Found');
    return '';
  }
  const decodedToken = this.jwtHelper.decodeToken(token);
  const fullName = decodedToken.fullName;
  console.log('Full Name:', fullName);
  return fullName;
}

getEmail(): string {
  const token = this.getToken();
  if (!token) {
    console.log('No Token Found');
    return '';
  }
  const decodedToken = this.jwtHelper.decodeToken(token);
  const email = decodedToken.email;
  console.log('Email:', email);
  return email;
}



getRoles(): string {
  const token = this.getToken();
  if (!token) {
    return '';
  }
  const decodedToken = this.jwtHelper.decodeToken(token);
  const roles = decodedToken.roles;
  //console.log('Decoded roles:', roles);
  if (Array.isArray(roles)) {
    return roles.join(', ');
  } else if (typeof roles === 'string') {
    return roles;
  } else if (roles && typeof roles === 'object') {
    return roles.name || roles.role || '';
  } else {
    return '';
  }
}

hasRole(role: string): boolean {
  const roles = this.getRoles();
  if (Array.isArray(roles)) {
    return roles.includes(role);
  }
  return roles.split(', ').includes(role);
}

/**
 * True while the account is still on the password that was texted to it.
 * The backend reads the same claim and refuses everything but the change
 * itself, so this only decides where to send them - it is not the lock.
 */
mustChangePassword(): boolean {
  const token = this.getToken();
  if (!token) {
    return false;
  }
  const decodedToken = this.jwtHelper.decodeToken(token);
  return decodedToken?.mustChangePassword === true;
}

getUserUID():string{
 const token = this.getToken();
  if (!token) {
    console.log('No Token Found');
    return '';
  }
  const decodedToken = this.jwtHelper.decodeToken(token);
  const userUID = decodedToken.userUID;
  console.log('User UID:', userUID);
  return userUID;
}

getBranchUID():string{
 const token = this.getToken();
  if (!token) {
    console.log('No Token Found');
    return '';
  }
  const decodedToken = this.jwtHelper.decodeToken(token);
  const branchUID = decodedToken.branchUID;
  console.log('User UID:', branchUID);
  return branchUID;
}

getPermissions():string{
  const token = this.getToken();
  if(!token){
    return '';
  }
  const decodedToken = this.jwtHelper.decodeToken(token);
  const permissions:string[] =  decodedToken.permissions;
  const permissionsAsString = permissions.join();
  console.log('Permissions', permissions);
  return permissionsAsString;
}

getTenantId(): string {
  const token = this.getToken();
  if (!token) {
    console.log('No Token Found');
    return '';
  }
  const decodedToken = this.jwtHelper.decodeToken(token);
  const tenantId = decodedToken.tenantId;
  console.log('Username:', tenantId);
  return tenantId;
}

getActions():string{
  const token = this.getToken();
  if(!token){
    return '';
  }
  const decodedToken = this.jwtHelper.decodeToken(token);
  const actions:string[] =  decodedToken.actions;
  const actionsAsString = actions.join();
  console.log('Actions', actions);
  return actionsAsString;
}

getPersonnelName():string{
  const token = this.getToken();
  if(!token){
    return '';
  }
  const decodedToken = this.jwtHelper.decodeToken(token);
  const personnelUID:string =  decodedToken.personnelUID;
  console.log('Personnel Uid', personnelUID);
  return personnelUID;
}



// Both of these are called straight from templates, so they run on every
// change detection pass. Returning a fresh array each time made every pass
// look like a changed @Input to the component being fed - which is what sent
// app-title2 into an endless ngOnChanges loop (NG0103). The result only
// depends on the caller's own (fixed) array and the roles in the token, so
// it is cached against that array.
private filteredMenuCache = new WeakMap<SidenavItem[], SidenavItem[]>();
private filteredTitleCache = new WeakMap<TitleAction[], TitleAction[]>();

filteredMenuItems(menuItems:SidenavItem[]): SidenavItem[] {
  const cached = this.filteredMenuCache.get(menuItems);
  if (cached) {
    return cached;
  }

  const filtered = menuItems
    .filter(item =>
      !item.roles || item.roles.some(role => this.hasRole(role))
    )
    .map(item => ({
      ...item,
      children: item.children?.filter(child =>
        !child.roles || child.roles.some(role => this.hasRole(role))
      )
    }))
    .filter(item =>
      !item.children || item.children.length > 0 || item.route
    );

  this.filteredMenuCache.set(menuItems, filtered);
  return filtered;
}

filteredTitleActions(titles: TitleAction[]): TitleAction[] {
  const cached = this.filteredTitleCache.get(titles);
  if (cached) {
    return cached;
  }

  const filtered = titles.filter(title =>
    !title.roles || title.roles.some(role => this.hasRole(role))
  );

  this.filteredTitleCache.set(titles, filtered);
  return filtered;
}

loadProfilePic(uid: string):Observable<Response<any>>{
 return this.http.get<Response<any>>(`${this.profilePicURL}/loadProfilePic/${uid}`)
}
private heartbeatInterval: any;

heartbeat(): Observable<any> {
  return this.http.post(
    `${this.baseURL}/setting/heartbeat`,
    {},
    {
      headers: this.createHeaders()
    }
  );
}

startHeartbeat(): void {
  this.stopHeartbeat();

  this.heartbeatInterval = setInterval(() => {
    this.heartbeat().subscribe({
      next: () => {
        console.log('Heartbeat updated');
      },
      error: (error) => {
        console.error('Heartbeat failed:', error);
      }
    });
  }, 30000);
}

stopHeartbeat(): void {
  if (this.heartbeatInterval) {
    clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = null;
  }
}



}
