import { CommonModule, KeyValuePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { GoogleMapsModule } from '@angular/google-maps';
import { TanStackField, injectForm, injectStore } from '@tanstack/angular-form';
import {
  injectQuery,
  injectQueryClient,
} from '@tanstack/angular-query-experimental';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { CookieService } from 'ngx-cookie-service';
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
import { Socket, io } from 'socket.io-client';
import { DeliveryService } from 'src/app/services/delivery.service';
import {
  Delivery,
  DeliveryStatus,
  JoinDeliveryRoomDto,
  LeaveDeliveryRoomDto,
  LocationChangedEventDto,
  StatusChangedEventDto,
  WsEvents,
} from 'src/common';
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
export class DashboardComponent implements OnInit {
  private socket: Socket;

  constructor(private cookieService: CookieService) {
    const token = cookieService.get('access_token');
    this.socket = io('http://localhost:3000/events', {
      auth: {
        token,
      },
    });

    this.socket.on(WsEvents.JoinDeliveryRoom, () => {
      console.log({ [WsEvents.JoinDeliveryRoom]: 'data' });
    });

    this.socket.on(WsEvents.LocationChanged, (data) => {
      console.log({ [WsEvents.LocationChanged]: data });
    });

    this.socket.on(WsEvents.StatusChanged, (data) => {
      console.log({ [WsEvents.StatusChanged]: data });
    });
  }

  ngOnInit(): void {
    this.joinRoom();

    setInterval(() => {
      console.log('20 seconds have passed');
      this.joinRoom();
    }, 20000);
  }

  keepOriginalOrder = (a: any, b: any) => a.key;

  zoom = 12;
  center!: google.maps.LatLngLiteral;
  options: google.maps.MapOptions = {
    mapTypeId: 'hybrid',
    zoomControl: true,
    scrollwheel: false,
    disableDoubleClickZoom: true,
    gestureHandling: 'greedy',
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
          this.addMarker(this.center, '#FF0000', 'Driver');

          this.joinRoom();
          observer.next(position);
        },
        (error) => observer.error(error),
        { enableHighAccuracy: true },
      );

      return () => navigator.geolocation.clearWatch(watchId);
    });
  }

  subscriptions = this.getCurrentPosition()
    .pipe(
      switchMap((geoLocPos) =>
        this.getDeliveries().pipe(
          tap((deliveries) => {
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
                'Origin',
              );

              this.addMarker(
                {
                  lat: interest.package.to_location.coordinates[1],
                  lng: interest.package.to_location.coordinates[0],
                },
                '#00FF00',
                'Destination',
              );
            }
          }),
          map(() => geoLocPos),
        ),
      ),
    )
    .subscribe();

  async addMarker(
    position: google.maps.LatLngLiteral,
    color: string,
    title: string,
  ) {
    const existingMarker = this.markers.get(color);

    if (existingMarker) {
      existingMarker.markerPosition = position;
    } else {
      const marker: Marker = {
        markerPosition: position,
        markerOptions: {
          position,
          title,
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

    validatorAdapter: zodValidator,
  });

  z = z;

  handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.form.handleSubmit();
  }

  deliveryId = injectStore(this.form, (state) => state.values.delivery);

  selectedDelivery = computed(() => {
    return (this.deliveryQuery.data() ?? []).find(
      (d) => d._id === this.deliveryId(),
    );
  });

  joinRoom = computed(() => {
    if (this.selectedDelivery()) {
      console.log(this.selectedDelivery());

      if (
        this.selectedDelivery()!.status !== DeliveryStatus.Failed ||
        this.selectedDelivery()!.status !== DeliveryStatus.Delivered
      ) {
        this.addMarker(
          {
            lat: this.selectedDelivery()!.package.from_location.coordinates[1],
            lng: this.selectedDelivery()!.package.from_location.coordinates[0],
          },
          '#0000FF',
          'Origin',
        );

        this.addMarker(
          {
            lat: this.selectedDelivery()!.package.to_location.coordinates[1],
            lng: this.selectedDelivery()!.package.to_location.coordinates[0],
          },
          '#00FF00',
          'Destination',
        );

        this.socket.emit(WsEvents.JoinDeliveryRoom, {
          delivery_id: this.selectedDelivery()!._id,
          event: WsEvents.JoinDeliveryRoom,
        } satisfies JoinDeliveryRoomDto);

        this.sendLocationChangedMessageToRoom({
          delivery_id: this.selectedDelivery()!._id!,
          event: WsEvents.LocationChanged,
          location: {
            type: 'Point',
            coordinates: [this.center.lng, this.center.lat],
          },
        });
      } else {
        this.socket.emit(WsEvents.LeaveDeliveryRoom, {
          delivery_id: this.selectedDelivery()!._id,
          event: WsEvents.LeaveDeliveryRoom,
        } satisfies LeaveDeliveryRoomDto);
      }
    }
  });

  sendLocationChangedMessageToRoom(message: LocationChangedEventDto) {
    this.socket.emit(WsEvents.LocationChanged, {
      ...message,
    } satisfies LocationChangedEventDto);
  }

  pickedUp() {
    this.socket.emit('status_changed', {
      delivery_id: this.deliveryId(),
      event: WsEvents.StatusChanged,
      status: DeliveryStatus.PickedUp,
    } satisfies StatusChangedEventDto);
  }

  inTransit() {
    this.socket.emit(WsEvents.StatusChanged, {
      delivery_id: this.deliveryId(),
      event: WsEvents.StatusChanged,
      status: DeliveryStatus.InTransit,
    } satisfies StatusChangedEventDto);
  }

  delivered() {
    this.socket.emit(WsEvents.StatusChanged, {
      delivery_id: this.deliveryId(),
      event: WsEvents.StatusChanged,
      status: DeliveryStatus.Delivered,
    } satisfies StatusChangedEventDto);
  }

  failed() {
    this.socket.emit(WsEvents.StatusChanged, {
      delivery_id: this.deliveryId(),
      event: WsEvents.StatusChanged,
      status: DeliveryStatus.Failed,
    } satisfies StatusChangedEventDto);
  }
}
