import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const cookieService = inject(CookieService);
  const access_token = cookieService.get('access_token');

  if (access_token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    return next(authReq).pipe(
      catchError(error => {
        console.error({ error });
        if (error.status === 401) {
          // Handle 401 Unauthorized error here
          console.error('Unauthorized request - 401:', error);
          cookieService.delete('access_token');

          // Optionally, you can perform actions such as logging out the user,
          // redirecting to a login page, or showing a specific error message.
        } else {
          // Handle other types of errors here
          console.error('HTTP Error:', error);
        }

        // Rethrow the error so it can be handled by other interceptors or components
        return throwError(error);
      })
    );
  }

  return next(req);
};

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  cookieService = inject(CookieService);

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const token = this.cookieService.get('access_token');
    console.log({ token });

    if (token) {
      const reqCopy = request.clone();
      reqCopy.headers.set('Authorization', `Bearer ${token}`);

      return next.handle(reqCopy);
    }

    return next.handle(request);
  }
}

@Injectable()
export class HttpResponseInterceptor implements HttpInterceptor {
  cookieService = inject(CookieService);

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      tap({
        next: event => {
          if (event instanceof HttpResponse) {
            if (event.status == 401) {
              alert('Unauthorized access!');
            }
          }
          return event;
        },
        error: error => {
          if (error.status === 401) {
            alert('Unauthorized access!');
          } else if (error.status === 404) {
            alert('Page Not Found!');
          }
        },
      })
    );
  }
}
