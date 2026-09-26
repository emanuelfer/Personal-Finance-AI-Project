import { Routes } from '@angular/router';
import { SpreadsheetComponent } from './features/spreadsheet/spreadsheet.component';
import { AnalyticsComponent } from './features/analytics/analytics.component';
import { AdvisorComponent } from './features/advisor/advisor.component';
import { AuditComponent } from './features/audit/audit.component';
import { LoginComponent } from './features/login/login.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: 'spreadsheet', pathMatch: 'full' },
  { path: 'spreadsheet', component: SpreadsheetComponent, canActivate: [authGuard] },
  { path: 'analytics', component: AnalyticsComponent, canActivate: [authGuard] },
  { path: 'advisor', component: AdvisorComponent, canActivate: [authGuard] },
  { path: 'audit', component: AuditComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'spreadsheet' }
];

