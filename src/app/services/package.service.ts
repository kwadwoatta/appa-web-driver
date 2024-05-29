import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Package } from 'src/common';

@Injectable({
  providedIn: 'root',
})
export class PackageService {
  http = inject(HttpClient);

  packageById = (packageId: number) =>
    this.http.get<Package>(`http://localhost:3000/api/package/${packageId}`);

  allPackages = () =>
    this.http.get<Array<Package>>('http://localhost:3000/api/package');

  createPackage = (dto: CreatePackageDto) =>
    this.http.post<Package>(`http://localhost:3000/api/package`, dto);
}

export type CreatePackageDto = Omit<
  Package,
  'from_user' | 'to_user' | '_id' | 'createdAt' | 'updatedAt'
> & {
  from_user: string;
  to_user: string;
};
