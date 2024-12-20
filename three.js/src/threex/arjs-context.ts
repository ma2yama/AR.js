import jsartoolkit from '@ar-js-org/artoolkit5-js'; // TODO comment explanation
import * as THREE from 'three';
import ArMarkerControls from './arjs-markercontrols';
import { type ArController } from "./artoolkit-types";
const { ARController } = jsartoolkit;

type ArToolkitContextDetectionMode =
  | 'color'
  | 'color_and_matrix'
  | 'mono'
  | 'mono_and_matrix';

type ArToolkitContextMatrixCodeType =
  | '3x3'
  | '3x3_HAMMING63'
  | '3x3_PARITY65'
  | '4x4'
  | '4x4_BCH_13_9_3'
  | '4x4_BCH_13_5_5';

type ArToolkitContextLabelingMode = 'black_region' | 'white_region';

export interface ArToolkitContextParameters {
  trackingBackend: 'artoolkit';
  debug: boolean;
  detectionMode: ArToolkitContextDetectionMode;
  matrixCodeType: ArToolkitContextMatrixCodeType;
  cameraParametersUrl: string;
  maxDetectionRate: number;
  canvasWidth: number;
  canvasHeight: number;
  patternRatio: number;
  labelingMode: ArToolkitContextLabelingMode;
  imageSmoothingEnabled: boolean;
}

type ArToolkitContextParameterKeys = keyof ArToolkitContextParameters;

function isArToolkitContextParameterKeys(
  arg: unknown,
): arg is ArToolkitContextParameterKeys {
  const event = arg as ArToolkitContextParameterKeys;
  const keys = [
    'trackingBackend',
    'debug',
    'detectionMode',
    'matrixCodeType',
    'cameraParametersUrl',
    'maxDetectionRate',
    'canvasWidth',
    'canvasHeight',
    'patternRatio',
    'labelingMode',
    'imageSmoothingEnabled',
  ];

  return keys.includes(event);
}

class Context {
  // default to github page
  static baseURL = 'https://ar-js-org.github.io/AR.js/three.js/';
  static REVISION = '3.4.5';

  arController: ArController | null = null;

  initialized = false;

  // handle default parameters
  parameters: ArToolkitContextParameters = {
    // AR backend - ['artoolkit']
    trackingBackend: 'artoolkit',
    // debug - true if one should display artoolkit debug canvas, false otherwise
    debug: false,
    // the mode of detection - ['color', 'color_and_matrix', 'mono', 'mono_and_matrix']
    detectionMode: 'mono',
    // type of matrix code - valid iif detectionMode end with 'matrix' - [3x3, 3x3_HAMMING63, 3x3_PARITY65, 4x4, 4x4_BCH_13_9_3, 4x4_BCH_13_5_5]
    matrixCodeType: '3x3',

    // url of the camera parameters
    cameraParametersUrl: Context.baseURL + '../data/data/camera_para.dat',

    // tune the maximum rate of pose detection in the source image
    maxDetectionRate: 60,
    // resolution of at which we detect pose in the source image
    canvasWidth: 640,
    canvasHeight: 480,

    // the patternRatio inside the artoolkit marker - artoolkit only
    patternRatio: 0.5,

    // Labeling mode for markers - ['black_region', 'white_region']
    // black_region: Black bordered markers on a white background, white_region: White bordered markers on a black background
    labelingMode: 'black_region',

    // enable image smoothing or not for canvas copy - default to true
    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled
    imageSmoothingEnabled: false,
  };

  _updatedAt: number | null = null;

  _arMarkersControls: ArMarkerControls[] = [];

  _artoolkitProjectionAxisTransformMatrix: THREE.Matrix4 | null = null;

  constructor(parameters?: ArToolkitContextParameters) {
    // parameters sanity check
    console.assert(
      ['artoolkit'].indexOf(this.parameters.trackingBackend) !== -1,
      'invalid parameter trackingBackend',
      this.parameters.trackingBackend,
    );
    console.assert(
      ['color', 'color_and_matrix', 'mono', 'mono_and_matrix'].indexOf(
        this.parameters.detectionMode,
      ) !== -1,
      'invalid parameter detectionMode',
      this.parameters.detectionMode,
    );
    console.assert(
      ['black_region', 'white_region'].indexOf(this.parameters.labelingMode) !==
        -1,
      'invalid parameter labelingMode',
      this.parameters.labelingMode,
    );

    //////////////////////////////////////////////////////////////////////////////
    //		setParameters
    //////////////////////////////////////////////////////////////////////////////
    const setProperty = <K extends keyof ArToolkitContextParameters>(
      key: K,
      value: ArToolkitContextParameters[K],
    ) => {
      this.parameters[key] = value;
    };

    const setParameters = (parameters?: ArToolkitContextParameters) => {
      if (parameters === undefined) return;
      for (const key in parameters) {
        if (!isArToolkitContextParameterKeys(key)) continue;

        const newValue = parameters[key];

        if (newValue === undefined) {
          console.warn(`Context: '${key}' parameter is undefined.`);
          continue;
        }

        const currentValue = this.parameters[key];

        if (currentValue === undefined) {
          console.warn(`Context: '${key}' is not a property of this material.`);
          continue;
        }

        setProperty(key, newValue);
      }
    };

    setParameters(parameters);
  }

  dispatchEvent = THREE.EventDispatcher.prototype.dispatchEvent;
  addEventListener = THREE.EventDispatcher.prototype.addEventListener;
  hasEventListener = THREE.EventDispatcher.prototype.hasEventListener;
  removeEventListener = THREE.EventDispatcher.prototype.removeEventListener;

  /**
   * Create a default camera for this trackingBackend
   * @param {string} trackingBackend - the tracking to user
   * @return {THREE.Camera} the created camera
   */
  createDefaultCamera(trackingBackend: string): THREE.Camera | undefined {
    console.assert(false, 'use ARjs.Utils.createDefaultCamera instead');
    // Create a camera
    if (trackingBackend === 'artoolkit') {
      const camera = new THREE.Camera();

      return camera;
    } else {
      console.assert(false);

      return;
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  //		init functions
  //////////////////////////////////////////////////////////////////////////////
  init(onCompleted: () => void): void {
    const done = () => {
      // dispatch event
      this.dispatchEvent({
        type: 'initialized',
      });

      this.initialized = true;

      if (onCompleted != null) {
        onCompleted();
      }
    };

    if (this.parameters.trackingBackend === 'artoolkit') {
      this._initArtoolkit(done);
    } else {
      console.assert(false);
    }

    return;
  }

  ////////////////////////////////////////////////////////////////////////////////
  //          update function
  ////////////////////////////////////////////////////////////////////////////////
  update(srcElement: HTMLImageElement | HTMLVideoElement): boolean {
    // be sure arController is fully initialized
    if (
      this.parameters.trackingBackend === 'artoolkit' &&
      this.arController === null
    ) {
      return false;
    }

    // honor this.parameters.maxDetectionRate
    const present = performance.now();
    if (
      this._updatedAt !== null &&
      present - this._updatedAt < 1000 / this.parameters.maxDetectionRate
    ) {
      return false;
    }
    this._updatedAt = present;

    const prevVisibleMarkers: ArMarkerControls[] = [];

    // mark all markers to invisible before processing this frame
    this._arMarkersControls.forEach((markerControls) => {
      if (markerControls.object3d.visible) {
        prevVisibleMarkers.push(markerControls);
      }
      if (!markerControls.context.arController.showObject) {
        markerControls.object3d.visible = false;
      }
    });

    // process this frame
    if (this.parameters.trackingBackend === 'artoolkit') {
      this._updateArtoolkit(srcElement);
    } else {
      console.assert(false);

      return false;
    }

    // dispatch event
    this.dispatchEvent({
      type: 'sourceProcessed',
    });

    // After frame is processed, check visibility of each marker to determine if it was found or lost
    this._arMarkersControls.forEach((markerControls) => {
      const wasVisible = prevVisibleMarkers.includes(markerControls);
      const isVisible = markerControls.object3d.visible;

      if (isVisible === true && wasVisible === false) {
        window.dispatchEvent(
          new CustomEvent('markerFound', {
            detail: markerControls,
          }),
        );
      } else if (isVisible === false && wasVisible === true) {
        window.dispatchEvent(
          new CustomEvent('markerLost', {
            detail: markerControls,
          }),
        );
      }
    });

    // return true as we processed the frame
    return true;
  }

  ////////////////////////////////////////////////////////////////////////////////
  //          Add/Remove markerControls
  ////////////////////////////////////////////////////////////////////////////////
  addMarker(arMarkerControls: ArMarkerControls): void {
    console.assert(arMarkerControls instanceof ArMarkerControls);
    this._arMarkersControls.push(arMarkerControls);
  }

  removeMarker(arMarkerControls: ArMarkerControls): void {
    console.assert(arMarkerControls instanceof ArMarkerControls);
    const index = this._arMarkersControls.indexOf(arMarkerControls);
    if (index < 0) {
      return;
    }
    this._arMarkersControls.splice(index, 1);
  }

  //////////////////////////////////////////////////////////////////////////////
  //		artoolkit specific
  //////////////////////////////////////////////////////////////////////////////
  async _initArtoolkit(onCompleted: () => void): Promise<Context> {
    // set this._artoolkitProjectionAxisTransformMatrix to change artoolkit projection matrix axis to match usual webgl one
    this._artoolkitProjectionAxisTransformMatrix = new THREE.Matrix4();
    this._artoolkitProjectionAxisTransformMatrix.multiply(
      new THREE.Matrix4().makeRotationY(Math.PI),
    );
    this._artoolkitProjectionAxisTransformMatrix.multiply(
      new THREE.Matrix4().makeRotationZ(Math.PI),
    );

    // init controller
    const arController = await ARController.initWithDimensions(
      this.parameters.canvasWidth,
      this.parameters.canvasHeight,
      this.parameters.cameraParametersUrl,
    ) as unknown as ArController;

    this.arController = arController ;

    // honor this.parameters.imageSmoothingEnabled
    arController.ctx.imageSmoothingEnabled =
      this.parameters.imageSmoothingEnabled;

    // honor this.parameters.debug
    if (this.parameters.debug === true) {
      arController.debugSetup();
      arController.canvas.style.position = 'absolute';
      arController.canvas.style.top = '0px';
      arController.canvas.style.opacity = '0.6';
      arController.canvas.style.pointerEvents = 'none';
      arController.canvas.style.zIndex = '-1';
    }

    // setPatternDetectionMode
    const detectionModes = {
      color: arController.artoolkit.AR_TEMPLATE_MATCHING_COLOR,
      color_and_matrix:
        arController.artoolkit.AR_TEMPLATE_MATCHING_COLOR_AND_MATRIX,
      mono: arController.artoolkit.AR_TEMPLATE_MATCHING_MONO,
      mono_and_matrix:
        arController.artoolkit.AR_TEMPLATE_MATCHING_MONO_AND_MATRIX,
    };
    const detectionMode = detectionModes[this.parameters.detectionMode];
    console.assert(detectionMode !== undefined);
    arController.setPatternDetectionMode(detectionMode);

    // setMatrixCodeType
    const matrixCodeTypes = {
      '3x3': arController.artoolkit.AR_MATRIX_CODE_3x3,
      '3x3_HAMMING63': arController.artoolkit.AR_MATRIX_CODE_3x3_HAMMING63,
      '3x3_PARITY65': arController.artoolkit.AR_MATRIX_CODE_3x3_PARITY65,
      '4x4': arController.artoolkit.AR_MATRIX_CODE_4x4,
      '4x4_BCH_13_9_3': arController.artoolkit.AR_MATRIX_CODE_4x4_BCH_13_9_3,
      '4x4_BCH_13_5_5': arController.artoolkit.AR_MATRIX_CODE_4x4_BCH_13_5_5,
      '5x5_BCH_22_12_5':
        arController.artoolkit.AR_MATRIX_CODE_5x5_BCH_22_12_5,
      '5x5_BCH_22_7_7': arController.artoolkit.AR_MATRIX_CODE_5x5_BCH_22_7_7,
      '5x5': arController.artoolkit.AR_MATRIX_CODE_5x5,
      '6x6': arController.artoolkit.AR_MATRIX_CODE_6x6,
    };
    const matrixCodeType = matrixCodeTypes[this.parameters.matrixCodeType];
    console.assert(matrixCodeType !== undefined);
    arController.setMatrixCodeType(matrixCodeType);

    // set the patternRatio for artoolkit
    arController.setPattRatio(this.parameters.patternRatio);

    // set the labelingMode for artoolkit
    const labelingModeTypes = {
      black_region: arController.artoolkit.AR_LABELING_BLACK_REGION,
      white_region: arController.artoolkit.AR_LABELING_WHITE_REGION,
    };
    const labelingModeType = labelingModeTypes[this.parameters.labelingMode];
    console.assert(labelingModeType !== undefined);
    arController.setLabelingMode(labelingModeType);

    // set thresholding in artoolkit
    // this seems to be the default
    // arController.setThresholdMode(artoolkit.AR_LABELING_THRESH_MODE_MANUAL)
    // adatative consume a LOT of cpu...
    // arController.setThresholdMode(artoolkit.AR_LABELING_THRESH_MODE_AUTO_ADAPTIVE)
    // arController.setThresholdMode(artoolkit.AR_LABELING_THRESH_MODE_AUTO_OTSU)

    // notify
    onCompleted();

    return this;
  }

  /**
   * return the projection matrix
   */
  getProjectionMatrix(): THREE.Matrix4 {
    // FIXME rename this function to say it is artoolkit specific - getArtoolkitProjectMatrix
    // keep a backward compatibility with a console.warn

    console.assert(this.parameters.trackingBackend === 'artoolkit');
    console.assert(
      this.arController,
      'arController MUST be initialized to call this function',
    );
    if (this.arController == null) {
      throw new Error(
        'arController MUST be initialized to call this function',
      );
    };

    // get projectionMatrixArr from artoolkit
    const projectionMatrixArr = this.arController.getCameraMatrix();
    const projectionMatrix = new THREE.Matrix4().fromArray(projectionMatrixArr);

    // projectionMatrix.multiply(this._artoolkitProjectionAxisTransformMatrix)
    // return the result
    return projectionMatrix;
  }

  _updateArtoolkit(srcElement: HTMLImageElement | HTMLVideoElement): void {
    if (this.arController == null) return;

    this.arController.process(srcElement);
  }

  //////////////////////////////////////////////////////////////////////////////
  //		dispose function
  //////////////////////////////////////////////////////////////////////////////
  dispose(): void {
    this.initialized = false;

    // markers
    this._arMarkersControls.forEach(function (markerControls) {
      console.assert(markerControls instanceof ArMarkerControls);
      markerControls.dispose();
    });
    this._arMarkersControls = [];

    // ARController
    if (this.arController?.dispose != null) {
      this.arController.dispose();
    }
    this.arController = null;

    // class properties
    this._artoolkitProjectionAxisTransformMatrix = null;

    // artoolkit
    // NOTE: since the instance of ARToolkit is created globally
    // we should probably do not call .teardown() ... ?
  }
}

export default Context;
