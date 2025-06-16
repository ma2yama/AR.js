import { Camera, EventDispatcher, Object3D, Scene, WebGLRenderer} from 'three';

export class WebcamRenderer {
    constructor(renderer: WebGLRenderer, videoElement?: string | HTMLVideoElement);
    update(): void;
    dispose(): void;
    createErrorPopup(msg: string): void;
}

export class DeviceOrientationControls extends EventDispatcher {
    constructor(object: Object3D);
    enabled: boolean;
    deviceOrientation: { alpha: number; beta: number; gamma: number; webkitCompassHeading?: number; webkitCompassAccuracy?: number } | null;
    screenOrientation: number;
    alphaOffset: number;
    initialOffset: boolean | null;
    TWO_PI: number;
    HALF_PI: number;
    orientationChangeEventName: string;
    smoothingFactor: number;
    object: Object3D;
    connect(): void;
    disconnect(): void;
    update(options?: { theta?: number }): void;
    dispose(): void;
    updateAlphaOffset(): void;
    getAlpha(): number;
    getBeta(): number;
}

export interface LocationBasedGpsOptions {
    gpsMinDistance?: number;
    gpsMinAccuracy?: number;
    maximumAge?: number;
}

type LocationBasedOptions = {
    initialPosition?: { longitude: number; latitude: number };
    initialPositionAsOrigin?: boolean;
    useAltitude?: boolean;
    altitudeOffset?: number;
} & LocationBasedGpsOptions;

export class LocationBased {
    constructor(scene: Scene, camera: Camera, options?: LocationBasedOptions);
    initialPosition: number[] | null;
    initialPositionAsOrigin: boolean;
    useAltitude: boolean;
    altitudeOffset: number;
    setProjection(proj: SphMercProjection): void;
    setGpsOptions(options?: LocationBasedGpsOptions): void;
    startGps(maximumAge?: number): boolean;
    stopGps(): boolean;
    fakeGps(lon: number, lat: number, elev?: number | null, acc?: number): void;
    lonLatToWorldCoords(lon: number, lat: number): [number, number];
    add(object: Object3D, lon: number, lat: number, elev?: number): void;
    setWorldPosition(object: Object3D, lon: number, lat: number, elev?: number): void;
    setElevation(elev: number): void;
    on(eventName: string, eventHandler: Function): void;
    setWorldOrigin(lon: number, lat: number): void;
}

export class SphMercProjection {
    EARTH: number;
    HALF_EARTH: number;
    project(lon: number, lat: number): [number, number];
    unproject(projected: [number, number]): [number, number];
    lonToSphMerc(lon: number): number;
    latToSphMerc(lat: number): number;
    sphMercToLon(x: number): number;
    sphMercToLat(y: number): number;
    getID(): string;
}
