import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  inject,
} from '@angular/core';
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
import { Observable, fromEvent, lastValueFrom, of, takeUntil } from 'rxjs';
import { DeliveryService } from 'src/app/services/delivery.service';
import { Delivery } from 'src/common';
import { z } from 'zod';

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
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  constructor(private router: Router) {}

  deliveryService = inject(DeliveryService);

  @Output() setPostId = new EventEmitter<number>();

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
    onSubmit: ({ value }) => {},
    // Add a validator to support Zod usage in Form and Field
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
