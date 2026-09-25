import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../Utils/enviroments/environment';
import { PageableParam, Response, ResponseList, ResponsePage } from '../Utils/models/responces';

/** One turn in a conversation with a branch. */
export interface BranchMessageReply {
  uid: string;
  body: string;
  authorName: string;
  /** Whether the branch said it, or we did. */
  fromBranch: boolean;
  sentAt: string;
}

export interface BranchMessage {
  uid: string;
  branchUid: string;
  branchName: string;
  branchCode: string;
  /** COMMENT, QUESTION or COMPLAINT. */
  category: string;
  subject: string | null;
  body: string;
  /** NEW, IN_PROGRESS or CLOSED. */
  status: string;
  raisedByName: string;
  createdAt: string;
  lastActivityAt: string;
  /** True when the branch spoke last, so it is waiting on us. */
  awaitingReply: boolean;
  replyCount: number;
  /** Only present when one thread is opened. */
  replies?: BranchMessageReply[];
}

export interface Guidance {
  uid: string;
  title: string;
  body: string | null;
  videoUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  published: boolean;
  position: number;
  createdAt: string;
}

/**
 * Both halves of the conversation with branches, in one service: the same
 * endpoints serve POS and Admin, with the backend deciding what each caller
 * is allowed to see.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {

  constructor(private http: HttpClient) {}

  private readonly messageUrl = `${environment.baseApiUrl}/branchMessage`;
  private readonly guidanceUrl = `${environment.baseApiUrl}/guidance`;

  // ---- the branch side ----

  raise(category: string, subject: string, body: string): Observable<Response<BranchMessage>> {
    return this.http.post<Response<BranchMessage>>(`${this.messageUrl}/raise`, { category, subject, body });
  }

  findMyMessages(): Observable<ResponseList<BranchMessage>> {
    return this.http.get<ResponseList<BranchMessage>>(`${this.messageUrl}/findMyMessages`);
  }

  // ---- both sides ----

  findMessage(uid: string): Observable<Response<BranchMessage>> {
    return this.http.get<Response<BranchMessage>>(`${this.messageUrl}/findMessage/${uid}`);
  }

  reply(uid: string, body: string): Observable<Response<BranchMessageReply>> {
    return this.http.post<Response<BranchMessageReply>>(`${this.messageUrl}/reply/${uid}`, { body });
  }

  // ---- the admin side ----

  findMessages(params: PageableParam, status?: string, branchUid?: string): Observable<ResponsePage<BranchMessage>> {
    let query = new HttpParams();
    if (status) {
      query = query.set('status', status);
    }
    if (branchUid) {
      query = query.set('branchUid', branchUid);
    }
    return this.http.post<ResponsePage<BranchMessage>>(`${this.messageUrl}/findMessages`, params, { params: query });
  }

  countAwaitingReply(): Observable<Response<number>> {
    return this.http.get<Response<number>>(`${this.messageUrl}/countAwaitingReply`);
  }

  setStatus(uid: string, status: string): Observable<Response<string>> {
    return this.http.post<Response<string>>(`${this.messageUrl}/setStatus/${uid}/${status}`, {});
  }

  // ---- guidance ----

  /** What a branch reads. */
  findPublishedGuidance(): Observable<ResponseList<Guidance>> {
    return this.http.get<ResponseList<Guidance>>(`${this.guidanceUrl}/findPublished`);
  }

  /** What an admin manages - drafts included. */
  findAllGuidance(): Observable<ResponseList<Guidance>> {
    return this.http.get<ResponseList<Guidance>>(`${this.guidanceUrl}/findAll`);
  }

  saveGuidance(guidance: Partial<Guidance>): Observable<Response<Guidance>> {
    return this.http.post<Response<Guidance>>(`${this.guidanceUrl}/saveGuidance`, guidance);
  }

  attachFile(uid: string, file: File): Observable<Response<Guidance>> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Response<Guidance>>(`${this.guidanceUrl}/attachFile/${uid}`, form);
  }

  deleteGuidance(uid: string): Observable<Response<string>> {
    return this.http.post<Response<string>>(`${this.guidanceUrl}/deleteGuidance/${uid}`, {});
  }

  /** Where the attached file is served from, for a link or an <img>. */
  fileUrl(uid: string): string {
    return `${this.guidanceUrl}/file/${uid}`;
  }
}
