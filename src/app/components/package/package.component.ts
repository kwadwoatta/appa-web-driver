import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TanStackField, injectForm, injectStore } from '@tanstack/angular-form';
import {
  injectMutation,
  injectQuery,
  injectQueryClient,
} from '@tanstack/angular-query-experimental';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { Observable, fromEvent, lastValueFrom, of, takeUntil } from 'rxjs';
import {
  CreatePackageDto,
  PackageService,
} from 'src/app/services/package.service';
import { UserService } from 'src/app/services/user.service';
import { User } from 'src/common';
import { z } from 'zod';

@Component({
  selector: 'app-package',
  standalone: true,
  imports: [
    InputTextModule,
    ButtonModule,
    DropdownModule,
    TanStackField,
    CommonModule,
  ],
  templateUrl: './package.component.html',
  styleUrl: './package.component.css',
})
export class PackageComponent {
  constructor(private router: Router) {}

  packageService = inject(PackageService);
  packageMutation = injectMutation(() => ({
    mutationFn: (dto: CreatePackageDto) =>
      lastValueFrom(this.packageService.createPackage(dto)).then((response) => {
        this.router.navigate(['/dashboard']);
      }),
  }));

  userService = inject(UserService);
  userQuery = injectQuery(() => ({
    enabled: true,
    queryKey: ['user'],
    queryFn: async (context) => {
      const abort = fromEvent(context.signal, 'abort');
      return lastValueFrom(this.userService.allUsers().pipe(takeUntil(abort)));
    },
  }));

  queryClient = injectQueryClient();

  getUsers(): Observable<User[]> {
    return of(this.userQuery.data() ?? []);
  }

  form = injectForm({
    defaultValues: {
      weight: '',
      width: '',
      height: '',
      depth: '',
      from_address: '',
      from_location: '',
      to_address: '',
      to_location: '',
      from_user: '',
      to_user: '',
    },
    onSubmit: ({ value }) => {
      const sender = this.userQuery
        .data()
        ?.find((user) => user._id === value.from_user);
      const recipient = this.userQuery
        .data()
        ?.find((user) => user._id === value.to_user);

      const date = new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Australia/Sydney',
      }).format(new Date());

      const description = `Package: ${sender?.firstName} ${sender?.lastName} -> ${recipient?.firstName} ${recipient?.lastName} (${date})`;

      const dto: CreatePackageDto = {
        description,
        weight: Number(value.weight),
        width: Number(value.width),
        height: Number(value.height),
        depth: Number(value.depth),
        from_address: value.from_address,
        from_location: {
          type: 'Point',
          coordinates: value.from_location.split(',').map(parseFloat),
        },
        to_address: value.to_address,
        to_location: {
          type: 'Point',
          coordinates: value.to_location.split(',').map(parseFloat),
        },
        deliveries: [],
        from_user: value.from_user,
        to_user: value.to_user,
      };

      this.packageMutation.mutate(dto, {
        onSuccess: () => {
          this.router.navigate(['/dashboard']);
        },
        onError: (e) => {
          alert(JSON.stringify((e as any).error.message));
        },
      });
    },
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
