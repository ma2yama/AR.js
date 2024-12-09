import * as THREE from 'three';
import { SphMercProjection } from './sphmerc-projection';

const EARTH_RADIUS = 6371000;

export interface LatLon {
  latitude: number;
  longitude: number;
}

export interface Coords {
  longitude: number;
  latitude: number;
  altitude?: number | null;
  accuracy?: number;
}

interface GpsOptions {
  gpsMinDistance?: number;
  gpsMinAccuracy?: number;
  maximumAge?: number;
}

type LocationBasedOptions = {
  initialPosition?: LatLon;
  initialPositionAsOrigin?: boolean;
} & GpsOptions;

interface GpsEventHandlers {
  gpserror?: (code: number) => void;
  gpsupdate?: (position: { coords: Coords }, moved: number) => void;
}

class LocationBased {
  _scene: THREE.Scene;
  _camera: THREE.Camera;
  _proj: SphMercProjection;
  _eventHandlers: GpsEventHandlers;
  _lastCoords: Coords | null;
  _gpsMinDistance: number;
  _gpsMinAccuracy: number;
  _maximumAge: number;
  _watchPositionId: number | null;
  initialPosition: [number, number] | null;
  initialPositionAsOrigin: boolean;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: LocationBasedOptions = {},
  ) {
    this._scene = scene;
    this._camera = camera;
    this._proj = new SphMercProjection();
    this._eventHandlers = {};
    this._lastCoords = null;
    this._gpsMinDistance = 0;
    this._gpsMinAccuracy = 100;
    this._maximumAge = 0;
    this._watchPositionId = null;
    this.setGpsOptions(options);
    this.initialPosition =
      options.initialPosition != null
        ? this._proj.project(
            options.initialPosition.longitude,
            options.initialPosition.latitude,
          )
        : null;
    this.initialPositionAsOrigin =
      options.initialPosition != null ||
      options.initialPositionAsOrigin === true ||
      false;
  }

  setProjection(proj: SphMercProjection): void {
    this._proj = proj;
  }

  setGpsOptions(options: GpsOptions = {}): void {
    if (options.gpsMinDistance !== undefined) {
      this._gpsMinDistance = options.gpsMinDistance;
    }
    if (options.gpsMinAccuracy !== undefined) {
      this._gpsMinAccuracy = options.gpsMinAccuracy;
    }
    if (options.maximumAge !== undefined) {
      this._maximumAge = options.maximumAge;
    }
  }

  startGps(maximumAge = 0): boolean {
    if (this._watchPositionId === null) {
      this._watchPositionId = navigator.geolocation.watchPosition(
        (position) => {
          this._gpsReceived(position);
        },
        (error) => {
          if (this._eventHandlers.gpserror) {
            this._eventHandlers.gpserror(error.code);
          } else {
            alert(`GPS error: code ${error.code}`);
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: maximumAge != 0 ? maximumAge : this._maximumAge,
        },
      );

      return true;
    }

    return false;
  }

  stopGps(): boolean {
    if (this._watchPositionId !== null) {
      navigator.geolocation.clearWatch(this._watchPositionId);
      this._watchPositionId = null;

      return true;
    }

    return false;
  }

  fakeGps(lon: number, lat: number, elev = null, acc = 0): void {
    if (elev !== null) {
      this.setElevation(elev);
    }

    this._gpsReceived({
      coords: {
        longitude: lon,
        latitude: lat,
        accuracy: acc,
      },
    });
  }

  lonLatToWorldCoords(lon: number, lat: number): [number, number] {
    const projectedPos = this._proj.project(lon, lat);
    if (this.initialPositionAsOrigin) {
      if (this.initialPosition) {
        projectedPos[0] -= this.initialPosition[0];
        projectedPos[1] -= this.initialPosition[1];
      } else {
        throw "Trying to use 'initial position as origin' mode with no initial position determined";
      }
    }

    return [projectedPos[0], -projectedPos[1]];
  }

  add(
    object: THREE.Object3D,
    lon: number,
    lat: number,
    elev?: number | null,
  ): void {
    this.setWorldPosition(object, lon, lat, elev);
    this._scene.add(object);
  }

  setWorldPosition(
    object: THREE.Object3D,
    lon: number,
    lat: number,
    elev?: number | null,
  ): void {
    const worldCoords = this.lonLatToWorldCoords(lon, lat);
    if (elev != null) {
      object.position.y = elev;
    }
    [object.position.x, object.position.z] = worldCoords;
  }

  setElevation(elev: number): void {
    this._camera.position.y = elev;
  }

  onGpsError(eventHandler: (code: number) => void): void {
    this._eventHandlers.gpserror = eventHandler;
  }

  onGpsUpdate(
    eventHandler: (position: { coords: Coords }, moved: number) => void,
  ): void {
    this._eventHandlers.gpsupdate = eventHandler;
  }

  setWorldOrigin(lon: number, lat: number): void {
    this.initialPosition = this._proj.project(lon, lat);
  }

  _gpsReceived(position: { coords: Coords }): void {
    let distMoved = Number.MAX_VALUE;
    if (
      position.coords.accuracy != null &&
      position.coords.accuracy <= this._gpsMinAccuracy
    ) {
      if (this._lastCoords === null) {
        this._lastCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      } else {
        distMoved = this._haversineDist(this._lastCoords, position.coords);
      }
      if (distMoved >= this._gpsMinDistance) {
        this._lastCoords.longitude = position.coords.longitude;
        this._lastCoords.latitude = position.coords.latitude;

        if (this.initialPositionAsOrigin && !this.initialPosition) {
          this.setWorldOrigin(
            position.coords.longitude,
            position.coords.latitude,
          );
        }

        this.setWorldPosition(
          this._camera,
          position.coords.longitude,
          position.coords.latitude,
          position.coords.altitude,
        );

        if (this._eventHandlers.gpsupdate) {
          this._eventHandlers.gpsupdate(position, distMoved);
        }
      }
    }
  }

  /**
   * Calculate haversine distance between two lat/lon pairs.
   *
   * Taken from original A-Frame components
   */
  _haversineDist(src: Coords, dest: Coords): number {
    const dlongitude = THREE.MathUtils.degToRad(dest.longitude - src.longitude);
    const dlatitude = THREE.MathUtils.degToRad(dest.latitude - src.latitude);

    const a =
      Math.sin(dlatitude / 2) * Math.sin(dlatitude / 2) +
      Math.cos(THREE.MathUtils.degToRad(src.latitude)) *
        Math.cos(THREE.MathUtils.degToRad(dest.latitude)) *
        (Math.sin(dlongitude / 2) * Math.sin(dlongitude / 2));
    const angle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return angle * EARTH_RADIUS;
  }
}

export { LocationBased };
