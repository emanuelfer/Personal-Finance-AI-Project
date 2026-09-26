import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map, catchError, of } from 'rxjs';

export interface UserProfile {
  id: string; // sub (User ID)
  username: string; // preferred_username
  email: string;
  name: string;
  roles: string[];
  tenantId: string;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  id_token?: string;
  session_state?: string;
  scope?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Keycloak OIDC Configuration (Dynamic for Localhost and Network Devices)
  private get keycloakIssuer(): string {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
    return `${protocol}//${host}:8088/realms/personal-finance-realm`;
  }
  private clientId = 'personal-finance-frontend';

  // Reactive State Signals
  accessToken = signal<string | null>(null);
  refreshToken = signal<string | null>(null);
  currentUser = signal<UserProfile | null>(null);

  isAuthenticated = computed(() => !!this.accessToken());
  userRoles = computed(() => this.currentUser()?.roles || []);
  isAdmin = computed(() => this.userRoles().includes('admin'));

  constructor() {
    this.restoreSession();
  }

  // =========================================================================
  // AUTHORIZATION CODE FLOW WITH PKCE (RFC 7636)
  // =========================================================================

  /**
   * Initiate PKCE Login by generating code_verifier, code_challenge and redirecting to Keycloak /auth
   */
  async login() {
    const codeVerifier = this.generateRandomString(64);
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const state = this.generateRandomString(32);

    sessionStorage.setItem('pkce_code_verifier', codeVerifier);
    sessionStorage.setItem('pkce_auth_state', state);

    const redirectUri = window.location.origin + '/spreadsheet';
    sessionStorage.setItem('pkce_redirect_uri', redirectUri);

    const authUrl = `${this.keycloakIssuer}/protocol/openid-connect/auth?` +
      `client_id=${encodeURIComponent(this.clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=openid profile email` +
      `&code_challenge=${encodeURIComponent(codeChallenge)}` +
      `&code_challenge_method=S256` +
      `&state=${encodeURIComponent(state)}`;

    window.location.href = authUrl;
  }

  /**
   * Complete PKCE Exchange when redirected back with ?code=...&state=...
   */
  handleAuthCallback(): Observable<boolean> {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (!code || !state) {
      return of(false);
    }

    const savedState = sessionStorage.getItem('pkce_auth_state');
    const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
    const redirectUri = sessionStorage.getItem('pkce_redirect_uri') || window.location.origin + '/spreadsheet';

    if (state !== savedState || !codeVerifier) {
      console.error('[Auth] State mismatch or missing code_verifier during PKCE callback');
      this.clearSession();
      return of(false);
    }

    // Clean up query parameters from browser URL bar cleanly
    window.history.replaceState({}, document.title, window.location.pathname);

    const body = new HttpParams()
      .set('grant_type', 'authorization_code')
      .set('client_id', this.clientId)
      .set('code', code)
      .set('code_verifier', codeVerifier)
      .set('redirect_uri', redirectUri);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post<TokenResponse>(
      `${this.keycloakIssuer}/protocol/openid-connect/token`,
      body.toString(),
      { headers }
    ).pipe(
      tap((res) => {
        this.setSession(res);
        sessionStorage.removeItem('pkce_code_verifier');
        sessionStorage.removeItem('pkce_auth_state');
        sessionStorage.removeItem('pkce_redirect_uri');
        this.router.navigate(['/spreadsheet']);
      }),
      map(() => true),
      catchError((err) => {
        console.error('[Auth] Token exchange failed:', err);
        this.clearSession();
        return of(false);
      })
    );
  }



  /**
   * Refresh Token Flow
   */
  refreshAccessToken(): Observable<boolean> {
    const refresh = this.refreshToken();
    if (!refresh) {
      this.logout();
      return of(false);
    }

    const body = new HttpParams()
      .set('grant_type', 'refresh_token')
      .set('client_id', this.clientId)
      .set('refresh_token', refresh);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post<TokenResponse>(
      `${this.keycloakIssuer}/protocol/openid-connect/token`,
      body.toString(),
      { headers }
    ).pipe(
      tap((res) => this.setSession(res)),
      map(() => true),
      catchError(() => {
        this.logout();
        return of(false);
      })
    );
  }

  /**
   * Logout user, invalidate Keycloak SSO session and redirect to /login
   */
  logout() {
    const refresh = this.refreshToken();
    this.clearSession();

    if (refresh) {
      const body = new HttpParams()
        .set('client_id', this.clientId)
        .set('refresh_token', refresh);

      const headers = new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded'
      });

      this.http.post(
        `${this.keycloakIssuer}/protocol/openid-connect/logout`,
        body.toString(),
        { headers }
      ).subscribe({
        next: () => console.log('[Auth] Keycloak SSO session terminated successfully'),
        error: (err) => console.warn('[Auth] Keycloak logout notification warning:', err)
      });
    }

    this.router.navigate(['/login']);
  }

  // =========================================================================
  // CRYPTOGRAPHIC PKCE HELPERS (Web Crypto API + Pure JS Fallback for HTTP LAN)
  // =========================================================================
  private generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    try {
      if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
        const randomValues = new Uint8Array(length);
        window.crypto.getRandomValues(randomValues);
        return Array.from(randomValues).map(v => charset[v % charset.length]).join('');
      }
    } catch {
      // Ignore and fallback
    }
    let res = '';
    for (let i = 0; i < length; i++) {
      res += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return res;
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    if (typeof window !== 'undefined' && window.crypto?.subtle?.digest) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await window.crypto.subtle.digest('SHA-256', data);
        return this.base64UrlEncode(new Uint8Array(digest));
      } catch (err) {
        console.warn('[Auth] window.crypto.subtle failed, falling back to pure JS SHA-256:', err);
      }
    }
    // Fallback: Pure JS SHA-256 for non-secure HTTP LAN IP contexts
    const hash = this.sha256Js(verifier);
    return this.base64UrlEncode(hash);
  }

  private base64UrlEncode(array: Uint8Array): string {
    let str = '';
    for (let i = 0; i < array.byteLength; i++) {
      str += String.fromCharCode(array[i]);
    }
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private sha256Js(ascii: string): Uint8Array {
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    let i = 0;
    const words: number[] = [];
    const asciiBitLength = ascii.length * 8;
    const hash: number[] = [];
    const k: number[] = [];
    let primeCounter = 0;

    const isPrime = (candidate: number) => {
      for (let factor = 2; factor <= Math.sqrt(candidate); factor++) {
        if (candidate % factor === 0) return false;
      }
      return true;
    };

    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (isPrime(candidate)) {
        if (primeCounter < 8) {
          hash[primeCounter] = (mathPow(candidate, 1 / 2) * maxWord) | 0;
        }
        k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        primeCounter++;
      }
    }

    words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
    words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

    for (i = 0; i < ascii.length; i++) {
      words[i >> 2] |= ascii.charCodeAt(i) << ((3 - (i % 4)) * 8);
    }

    for (i = 0; i < words.length; i += 16) {
      const w = words.slice(i, i + 16);
      const oldHash = [...hash];

      for (let j = 0; j < 64; j++) {
        const w15 = w[j - 15] || 0, w2 = w[j - 2] || 0;
        const s0 = (this.rotr(w15, 7) ^ this.rotr(w15, 18) ^ (w15 >>> 3));
        const s1 = (this.rotr(w2, 17) ^ this.rotr(w2, 19) ^ (w2 >>> 10));
        w[j] = j < 16 ? (w[j] || 0) : ((w[j - 16] + s0 + (w[j - 7] || 0) + s1) | 0);

        const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
        const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
        const s0h = this.rotr(hash[0], 2) ^ this.rotr(hash[0], 13) ^ this.rotr(hash[0], 22);
        const s1h = this.rotr(hash[4], 6) ^ this.rotr(hash[4], 11) ^ this.rotr(hash[4], 25);

        const t1 = (hash[7] + s1h + ch + k[j] + w[j]) | 0;
        const t2 = (s0h + maj) | 0;

        hash[7] = hash[6];
        hash[6] = hash[5];
        hash[5] = hash[4];
        hash[4] = (hash[3] + t1) | 0;
        hash[3] = hash[2];
        hash[2] = hash[1];
        hash[1] = hash[0];
        hash[0] = (t1 + t2) | 0;
      }

      for (let j = 0; j < 8; j++) {
        hash[j] = (hash[j] + oldHash[j]) | 0;
      }
    }

    const output = new Uint8Array(32);
    for (let j = 0; j < 8; j++) {
      output[j * 4] = (hash[j] >>> 24) & 0xff;
      output[j * 4 + 1] = (hash[j] >>> 16) & 0xff;
      output[j * 4 + 2] = (hash[j] >>> 8) & 0xff;
      output[j * 4 + 3] = hash[j] & 0xff;
    }
    return output;
  }

  private rotr(n: number, b: number): number {
    return (n >>> b) | (n << (32 - b));
  }

  // =========================================================================
  // SESSION & JWT PARSING
  // =========================================================================
  private setSession(res: TokenResponse) {
    this.accessToken.set(res.access_token);
    this.refreshToken.set(res.refresh_token);

    sessionStorage.setItem('pf_access_token', res.access_token);
    sessionStorage.setItem('pf_refresh_token', res.refresh_token);

    const profile = this.parseJwt(res.access_token);
    this.currentUser.set(profile);
  }

  private restoreSession() {
    const token = sessionStorage.getItem('pf_access_token');
    const refresh = sessionStorage.getItem('pf_refresh_token');

    if (token) {
      const profile = this.parseJwt(token);
      // Check expiration
      if (profile && !this.isTokenExpired(token)) {
        this.accessToken.set(token);
        this.refreshToken.set(refresh);
        this.currentUser.set(profile);
      } else {
        this.clearSession();
      }
    }
  }

  private clearSession() {
    this.accessToken.set(null);
    this.refreshToken.set(null);
    this.currentUser.set(null);
    sessionStorage.removeItem('pf_access_token');
    sessionStorage.removeItem('pf_refresh_token');
  }

  private parseJwt(token: string): UserProfile | null {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decoded = JSON.parse(jsonPayload);

      return {
        id: decoded.sub || decoded.user_id || 'usr-default',
        username: decoded.preferred_username || decoded.name || 'User',
        email: decoded.email || '',
        name: decoded.name || decoded.preferred_username || 'User',
        roles: decoded.realm_access?.roles || [],
        tenantId: decoded.tenant_id || 'default-user'
      };
    } catch {
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const base64Url = token.split('.')[1];
      const decoded = JSON.parse(atob(base64Url.replace(/-/g, '+').replace(/_/g, '/')));
      if (!decoded.exp) return false;
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp < now;
    } catch {
      return true;
    }
  }
}
