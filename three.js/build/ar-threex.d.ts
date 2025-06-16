import { Camera, EventDispatcher, Object3D, WebGLRenderer, Matrix4, Mesh, Group, Texture, Intersection } from 'three';

export interface ArToolkitContextParameters {
    trackingBackend?: 'artoolkit';
    debug?: boolean;
    detectionMode?: 'color' | 'color_and_matrix' | 'mono' | 'mono_and_matrix';
    matrixCodeType?: '3x3' | '3x3_HAMMING63' | '3x3_PARITY65' | '4x4' | '4x4_BCH_13_9_3' | '4x4_BCH_13_5_5' | '5x5_BCH_22_12_5' | '5x5_BCH_22_7_7' | '5x5' | '6x6';
    cameraParametersUrl?: string;
    maxDetectionRate?: number;
    canvasWidth?: number;
    canvasHeight?: number;
    patternRatio?: number;
    labelingMode?: 'black_region' | 'white_region';
    imageSmoothingEnabled?: boolean;
}

export interface ArToolkitContextArControllerArtoolkit {
    AR_TEMPLATE_MATCHING_COLOR: number;
    AR_TEMPLATE_MATCHING_COLOR_AND_MATRIX: number;
    AR_TEMPLATE_MATCHING_MONO: number;
    AR_TEMPLATE_MATCHING_MONO_AND_MATRIX: number;
    AR_MATRIX_CODE_3x3: number;
    AR_MATRIX_CODE_3x3_HAMMING63: number;
    AR_MATRIX_CODE_3x3_PARITY65: number;
    AR_MATRIX_CODE_4x4: number;
    AR_MATRIX_CODE_4x4_BCH_13_9_3: number;
    AR_MATRIX_CODE_4x4_BCH_13_5_5: number;
    AR_MATRIX_CODE_5x5_BCH_22_12_5: number;
    AR_MATRIX_CODE_5x5_BCH_22_7_7: number;
    AR_MATRIX_CODE_5x5: number;
    AR_MATRIX_CODE_6x6: number;
}

export interface ArToolkitContextArController {
    ctx: CanvasRenderingContext2D;
    debugSetup(): void;
    canvas: HTMLCanvasElement;
    artoolkit: ArToolkitContextArControllerArtoolkit;
}

export class ArToolkitContext extends EventDispatcher {
    constructor(parameters?: ArToolkitContextParameters);
    static baseURL: string;
    static REVISION: string;
    parameters: ArToolkitContextParameters;
    initialized: boolean;
    arController: ArToolkitContextArController | null;
    _arMarkersControls: ArMarkerControls[];
    _updatedAt: number | null;
    _artoolkitProjectionAxisTransformMatrix: Matrix4;

    init(onCompleted?: () => void): void;
    update(srcElement: HTMLVideoElement | HTMLImageElement): boolean;
    addMarker(arMarkerControls: ArMarkerControls): void;
    removeMarker(arMarkerControls: ArMarkerControls): void;
    getProjectionMatrix(): Matrix4;
    dispose(): void;
}

export interface ArMarkerControlsParameters {
    size?: number;
    type?: 'pattern' | 'barcode' | 'nft' | 'unknown';
    patternUrl?: string | null;
    barcodeValue?: number | null;
    descriptorsUrl?: string | null;
    changeMatrixMode?: 'modelViewMatrix' | 'cameraTransformMatrix';
    minConfidence?: number;
    smooth?: boolean;
    smoothCount?: number;
    smoothTolerance?: number;
    smoothThreshold?: number;
}

export class ArMarkerControls extends ArBaseControls {
    constructor(context: ArToolkitContext, object3d: Object3D, parameters?: ArMarkerControlsParameters);
    context: ArToolkitContext;
    parameters: ArMarkerControlsParameters;
    object3d: Object3D;
    smoothMatrices?: number[][];

    updateWithModelViewMatrix(modelViewMatrix: Matrix4): boolean;
    name(): string;
    dispose(): void;
}

export class ArBaseControls extends EventDispatcher {
    constructor(object3d: Object3D);
    id: number;
    object3d: Object3D;
    update(targetObject3d?: Object3D): void;
    name(): string;
}

export class ArMarkerHelper {
    constructor(markerControls: ArMarkerControls);
    object3d: Group;
}

export interface ArSmoothedControlsParameters {
    lerpPosition?: number;
    lerpQuaternion?: number;
    lerpScale?: number;
    lerpStepDelay?: number;
    minVisibleDelay?: number;
    minUnvisibleDelay?: number;
}

export class ArSmoothedControls extends ArBaseControls {
    constructor(object3d: Object3D, parameters?: ArSmoothedControlsParameters);
    parameters: ArSmoothedControlsParameters;
    update(targetObject3d: Object3D): void;
}

export interface ArToolkitSourceParameters {
    sourceType?: 'webcam' | 'image' | 'video';
    sourceUrl?: string | null;
    deviceId?: string | null;
    sourceWidth?: number;
    sourceHeight?: number;
    displayWidth?: number;
    displayHeight?: number;
    parent?: HTMLElement | null;
}

export class ArToolkitSource {
    constructor(parameters?: ArToolkitSourceParameters);
    parameters: ArToolkitSourceParameters;
    ready: boolean;
    domElement: HTMLVideoElement | HTMLImageElement | null;

    init(onReady?: () => void, onError?: (error: any) => void): this;
    dispose(): void;
    hasMobileTorch(): boolean;
    toggleMobileTorch(): void;
    onResizeElement(): void;
    copyElementSizeTo(otherElement: HTMLElement): void;
    onResize(arToolkitContext: ArToolkitContext, renderer: WebGLRenderer, camera: Camera): void;
}

export class ArToolkitProfile {
    constructor();
    sourceParameters: {
        sourceType: string;
        sourceUrl?: string;
    };
    contextParameters: {
        cameraParametersUrl: string;
        detectionMode: string;
        canvasWidth?: number;
        canvasHeight?: number;
        maxDetectionRate?: number;
    };
    defaultMarkerParameters: {
        type: string;
        patternUrl: string;
        changeMatrixMode: string;
    };

    reset(): this;
    performance(label?: 'default' | 'desktop-fast' | 'desktop-normal' | 'phone-normal' | 'phone-slow'): this;
    defaultMarker(trackingBackend?: string): this;
    sourceWebcam(): this;
    sourceVideo(url: string): this;
    sourceImage(url: string): this;
    trackingBackend(trackingBackend: string): this;
    changeMatrixMode(changeMatrixMode: string): this;
    trackingMethod(trackingMethod: string): this;
    checkIfValid(): this;
}

export class ArMarkerCloak {
    constructor(videoTexture: Texture);
    object3d: Mesh;
    orthoMesh: Mesh;
    update(modelViewMatrix: Matrix4, cameraProjectionMatrix: Matrix4): void;
    static vertexShader: string;
    static fragmentShader: string;
    static markerSpaceShaderFunction: string;
}

export class ArVideoInWebgl {
    constructor(videoTexture: Texture);
    update(): void;
}

export class HitTestingPlane {
    constructor(sourceElement: HTMLElement);
    update(modelViewMatrix: Matrix4, cameraProjectionMatrix: Matrix4): void;
}

export interface MarkersAreaControlsParameters {
    markersAreaEnabled?: boolean;
    subMarkersControls?: ArMarkerControls[];
}

export class MarkersAreaControls extends ArBaseControls {
    constructor(arToolkitContext: ArToolkitContext, object3d: Object3D, parameters?: MarkersAreaControlsParameters);
    parameters: MarkersAreaControlsParameters;
    update(): void;
}

export class MarkersAreaLearning {
    constructor(arToolkitContext: ArToolkitContext, subMarkersControls: ArMarkerControls[]);
    start(): void;
    stop(): void;
}

export class ARClickability {
    constructor(sourceElement: HTMLElement);
    onResize(): void;
    computeIntersects(domEvent: MouseEvent, objects: Object3D[]): Intersection[];
    update(): void;
}
