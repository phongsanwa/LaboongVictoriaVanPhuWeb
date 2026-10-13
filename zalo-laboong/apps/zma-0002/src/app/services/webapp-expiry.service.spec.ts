import {HttpClientTestingModule, HttpTestingController} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ENVIRONMENT} from '@core/tokens/environment.token';
import {WebAppExpiryService} from './webapp-expiry.service';

describe('WebAppExpiryService', () => {
  let service: WebAppExpiryService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        WebAppExpiryService,
        {
          provide: ENVIRONMENT,
          useValue: {
            apiUrl: 'https://api.example.com/',
            apiConfig: {webAppId: '2925298306504468674'},
          },
        },
      ],
    });

    service = TestBed.inject(WebAppExpiryService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('allows bootstrap when the WebApp is active', () => {
    let actual: unknown;
    service.check$().subscribe(result => actual = result);

    const request = http.expectOne('https://api.example.com/webapptpl/setting/expiry');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({webAppId: '2925298306504468674'});
    request.flush({code: 1, errorCode: null, messages: [], data: {expiredAt: null}});

    expect(actual).toEqual({status: 'active'});
  });

  it('blocks bootstrap based on ERR_EXPIRED', () => {
    let actual: unknown;
    service.check$().subscribe(result => actual = result);

    const request = http.expectOne('https://api.example.com/webapptpl/setting/expiry');
    request.flush({
      code: 0,
      errorCode: 'ERR_EXPIRED',
      messages: [],
      data: {expiredAt: 1782839999},
    });

    expect(actual).toEqual({status: 'expired', expiredAt: 1782839999});
  });

  it('also recognizes ERR_EXPIRED from an HTTP error body', () => {
    let actual: unknown;
    service.check$().subscribe(result => actual = result);

    const request = http.expectOne('https://api.example.com/webapptpl/setting/expiry');
    request.flush(
      {code: 0, errorCode: 'ERR_EXPIRED', data: {expiredAt: 1782839999}},
      {status: 410, statusText: 'Gone'},
    );

    expect(actual).toEqual({status: 'expired', expiredAt: 1782839999});
  });

  it('returns a retryable error for other failures', () => {
    let actualError: Error | undefined;
    service.check$().subscribe({error: error => actualError = error});

    const request = http.expectOne('https://api.example.com/webapptpl/setting/expiry');
    request.error(new ProgressEvent('network error'));

    expect(actualError?.message).toBe('Không thể kiểm tra hạn sử dụng. Vui lòng thử lại.');
  });
});
