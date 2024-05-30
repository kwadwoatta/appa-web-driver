import { CommonModule, KeyValuePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GoogleMapsModule } from '@angular/google-maps';
import { Router, RouterOutlet } from '@angular/router';
import { TanStackField, injectForm, injectStore } from '@tanstack/angular-form';
import {
  injectQuery,
  injectQueryClient,
} from '@tanstack/angular-query-experimental';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import {
  Observable,
  fromEvent,
  lastValueFrom,
  map,
  of,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { DeliveryService } from 'src/app/services/delivery.service';
import { Delivery } from 'src/common';
import { z } from 'zod';

type Marker = {
  markerOptions: google.maps.marker.AdvancedMarkerElementOptions;
  markerPosition: google.maps.LatLngLiteral;
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    ButtonModule,
    RouterOutlet,
    InputTextModule,
    ButtonModule,
    DropdownModule,
    TanStackField,
    CommonModule,
    GoogleMapsModule,
    KeyValuePipe,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  constructor(private router: Router) {}

  keepOriginalOrder = (a: any, b: any) => a.key;

  zoom = 12;
  center!: google.maps.LatLngLiteral;
  options: google.maps.MapOptions = {
    mapTypeId: 'hybrid',
    zoomControl: true,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    gestureHandling: 'auto',
    maxZoom: 15,
    minZoom: 8,
  };
  markers: Map<string, Marker> = new Map();

  getCurrentPosition(): Observable<GeolocationPosition> {
    return new Observable((observer) => {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          this.center = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          this.options.center = this.center;
          this.addMarker(this.center, '#FF0000');

          console.log({ markers: this.markers });

          observer.next(position);
        },
        (error) => observer.error(error),
        { enableHighAccuracy: true },
      );

      // Cleanup function to stop watching the position when the subscription is cancelled
      return () => navigator.geolocation.clearWatch(watchId);
    });
  }

  subscriptions = this.getCurrentPosition()
    .pipe(
      switchMap((geoLocPos) =>
        this.getDeliveries().pipe(
          tap((deliveries) => {
            console.log({ deliveries });
            const interest = deliveries.find(
              (d) => d._id === this.form.getFieldValue('delivery'),
            );

            if (interest) {
              this.addMarker(
                {
                  lat: interest.package.from_location.coordinates[1],
                  lng: interest.package.from_location.coordinates[0],
                },
                '#0000FF',
              );

              this.addMarker(
                {
                  lat: interest.package.to_location.coordinates[1],
                  lng: interest.package.to_location.coordinates[0],
                },
                '#00FF00',
              );
            }
          }),
          map(() => geoLocPos),
        ),
      ),
    )
    .subscribe();

  async addMarker(position: google.maps.LatLngLiteral, color: string) {
    const existingMarker = this.markers.get(color);

    if (existingMarker) {
      existingMarker.markerPosition = position;
    } else {
      const marker: Marker = {
        markerPosition: position,
        markerOptions: {
          position,
          content: {
            borderColor: color,
            background: color,
            glyphColor: color,
          } as google.maps.marker.PinElementOptions,
        } as google.maps.marker.AdvancedMarkerElementOptions,
      };

      this.markers.set(color, marker);
    }
  }

  deliveryService = inject(DeliveryService);

  deliveryQuery = injectQuery(() => ({
    enabled: true,
    queryKey: ['delivery'],
    queryFn: async (context) => {
      // Cancels the request when component is destroyed before the request finishes
      const abort = fromEvent(context.signal, 'abort');
      return lastValueFrom(
        this.deliveryService.findAllForUser().pipe(takeUntil(abort)),
      );
    },
  }));

  queryClient = injectQueryClient();

  getDeliveries(): Observable<Delivery[]> {
    return of(this.deliveryQuery.data() ?? []);
  }

  form = injectForm({
    defaultValues: {
      delivery: '',
    },
    // onSubmit: ({ value }) => {},
    validatorAdapter: zodValidator,
  });

  z = z;

  canSubmit = injectStore(this.form, (state) => state.canSubmit);
  isSubmitting = injectStore(this.form, (state) => state.isSubmitting);

  handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.form.handleSubmit();
  }
}
