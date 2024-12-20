type ArControllerOrientation = 'landscape' | 'portrait';

interface ArControllerOptions {
  orientation: ArControllerOrientation;
}

interface ArToolkit {
  AR_TEMPLATE_MATCHING_COLOR: number;
  AR_TEMPLATE_MATCHING_MONO: number;
  AR_MATRIX_CODE_DETECTION: number;
  AR_TEMPLATE_MATCHING_COLOR_AND_MATRIX: number;
  AR_TEMPLATE_MATCHING_MONO_AND_MATRIX: number;
  AR_MATRIX_CODE_3x3: number;
  AR_MATRIX_CODE_3x3_PARITY65: number;
  AR_MATRIX_CODE_3x3_HAMMING63: number;
  AR_MATRIX_CODE_4x4: number;
  AR_MATRIX_CODE_4x4_BCH_13_9_3: number;
  AR_MATRIX_CODE_4x4_BCH_13_5_5: number;
  AR_MATRIX_CODE_5x5_BCH_22_12_5: number;
  AR_MATRIX_CODE_5x5_BCH_22_7_7: number;
  AR_MATRIX_CODE_5x5: number;
  AR_MATRIX_CODE_6x6: number;
  AR_MATRIX_CODE_GLOBAL_ID: number;
  AR_LABELING_WHITE_REGION: number;
  AR_LABELING_BLACK_REGION: number;
}

export interface ArController {
  options: ArControllerOptions;
  cameraParam: Uint8Array | string;
  orientation: ArControllerOrientation;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  artoolkit: ArToolkit;
  debugSetup: () => void;
  setPatternDetectionMode: (mode: number) => void;
  setMatrixCodeType: (type: number) => void;
  setPattRatio: (pattRatio: number) => void;
  setLabelingMode: (mode: number) => void;
  getCameraMatrix: () => Float64Array;
  process: (image: HTMLImageElement | HTMLVideoElement) => void;
  dispose: () => void;
}
