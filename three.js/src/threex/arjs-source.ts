import { Camera, WebGLRenderer, Matrix4 } from 'three';
import Context from "./arjs-context";

type ArToolkitSourceType = 'webcam' | 'image' | 'video';

export interface ArToolkitSourceParameters {
  sourceType: ArToolkitSourceType;
  sourceUrl: string | undefined | null;
  deviceId: string | undefined | null;
  sourceWidth: number;
  sourceHeight: number;
  displayWidth: number;
  displayHeight: number;
}

interface ArToolkitError {
  name?: string;
  message: string;
}

type ArToolkitSourceParameterKeys = keyof ArToolkitSourceParameters;

type MediaTrackCapabilitiesWithTorch = {
  torch: boolean;
} & MediaTrackCapabilities;

type MediaTrackConstraintsWithTorch = {
  torch: boolean;
} & MediaTrackConstraints;

function isArToolkitSourceParameterKeys(
  arg: unknown,
): arg is ArToolkitSourceParameterKeys {
  const event = arg as ArToolkitSourceParameterKeys;
  const keys = [
    'sourceType',
    'sourceUrl',
    'deviceId',
    'sourceWidth',
    'sourceHeight',
    'displayWidth',
    'displayHeight',
  ];

  return keys.includes(event);
}

function isMediaTrackCapabilitiesWithTorch(
  arg: unknown,
): arg is MediaTrackCapabilitiesWithTorch {
  const event = arg as MediaTrackCapabilitiesWithTorch;

  return typeof event.torch === 'boolean';
}

class Source {
  ready = false;
  domElement: HTMLImageElement | HTMLVideoElement | null = null;

  // handle default parameters
  parameters: ArToolkitSourceParameters = {
    // type of source - ['webcam', 'image', 'video']
    sourceType: 'webcam',
    // url of the source - valid if sourceType = image|video
    sourceUrl: null,

    // Device id of the camera to use (optional)
    deviceId: null,

    // resolution of at which we initialize in the source image
    sourceWidth: 640,
    sourceHeight: 480,
    // resolution displayed for the source
    displayWidth: 640,
    displayHeight: 480,
  };

  _currentTorchStatus: boolean | undefined;

  constructor(parameters?: ArToolkitSourceParameters) {
    //////////////////////////////////////////////////////////////////////////////
    //		setParameters
    //////////////////////////////////////////////////////////////////////////////

    const setProperty = <K extends keyof ArToolkitSourceParameters>(
      key: K,
      value: ArToolkitSourceParameters[K],
    ) => {
      this.parameters[key] = value;
    };

    const setParameters = (parameters?: ArToolkitSourceParameters) => {
      if (parameters === undefined) return;

      for (const key in parameters) {
        if (!isArToolkitSourceParameterKeys(key)) continue;

        const newValue = parameters[key];

        if (newValue === undefined) {
          console.warn(`ArToolkitSource: '${key}' parameter is undefined.`);
          continue;
        }

        const currentValue = this.parameters[key];

        if (currentValue === undefined) {
          console.warn(
            `ArToolkitSource: '${key}' is not a property of this material.`,
          );
          continue;
        }

        setProperty(key, newValue);
      }
    };

    setParameters(parameters);
  }

  onInitialClick(): void {
    if (this.domElement instanceof HTMLVideoElement) {
      if ('play' in this.domElement) {
        this.domElement.play().then(() => {});
      }
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  //		Code Separator
  //////////////////////////////////////////////////////////////////////////////

  init(
    onReady?: (() => void) | null,
    onError?: ((error: ArToolkitError) => void) | null,
  ): Source | undefined {
    const onSourceReady = () => {
      if (!this.domElement) {
        return;
      }

      document.body.appendChild(this.domElement);
      window.dispatchEvent(
        new CustomEvent('arjs-video-loaded', {
          detail: {
            component: document.querySelector('#arjs-video'),
          },
        }),
      );

      this.ready = true;

      if (onReady != null) {
        onReady();
      }
    };

    let domElement: HTMLImageElement | HTMLVideoElement | null;
    if (this.parameters.sourceType === 'image') {
      domElement = this._initSourceImage(onSourceReady);
    } else if (this.parameters.sourceType === 'video') {
      domElement = this._initSourceVideo(onSourceReady);
    } else if (this.parameters.sourceType === 'webcam') {
      domElement = this._initSourceWebcam(onSourceReady, onError);
    } else {
      console.assert(false);

      return;
    }

    if (domElement == null) return;

    // attach
    this.domElement = domElement;
    this.domElement.style.position = 'absolute';
    this.domElement.style.top = '0px';
    this.domElement.style.left = '0px';
    this.domElement.style.zIndex = '-2';
    this.domElement.setAttribute('id', 'arjs-video');

    return this;
  }

  ////////////////////////////////////////////////////////////////////////////////
  //          init image source
  ////////////////////////////////////////////////////////////////////////////////

  _initSourceImage(onReady: () => void): HTMLImageElement {
    if (this.parameters.sourceUrl == null) {
      throw new Error('sourceUrl is not specified');
    }

    // TODO make it static
    const domElement = document.createElement('img');
    domElement.src = this.parameters.sourceUrl;

    domElement.width = this.parameters.sourceWidth;
    domElement.height = this.parameters.sourceHeight;
    domElement.style.width = this.parameters.displayWidth + 'px';
    domElement.style.height = this.parameters.displayHeight + 'px';

    domElement.onload = onReady;

    return domElement;
  }

  ////////////////////////////////////////////////////////////////////////////////
  //          init video source
  ////////////////////////////////////////////////////////////////////////////////

  _initSourceVideo(onReady: () => void): HTMLVideoElement {
    if (this.parameters.sourceUrl == null) {
      throw new Error('sourceUrl is not specified');
    }

    // TODO make it static
    const domElement = document.createElement('video');
    domElement.src = this.parameters.sourceUrl;

    domElement.style.objectFit = 'initial';

    domElement.autoplay = true;
    domElement.playsInline = true;
    domElement.controls = false;
    domElement.loop = true;
    domElement.muted = true;

    // start the video on first click if not started automatically
    document.body.addEventListener('click', this.onInitialClick, {
      once: true,
    });

    domElement.width = this.parameters.sourceWidth;
    domElement.height = this.parameters.sourceHeight;
    domElement.style.width = this.parameters.displayWidth + 'px';
    domElement.style.height = this.parameters.displayHeight + 'px';

    domElement.onloadeddata = onReady;

    return domElement;
  }

  ////////////////////////////////////////////////////////////////////////////////
  //          init webcam source
  ////////////////////////////////////////////////////////////////////////////////

  _initSourceWebcam(
    onReady: () => void,
    onError?: ((error: ArToolkitError) => void) | null,
  ): HTMLVideoElement | null {
    // init default value
    if (onError == null) {
      onError = (error) => {
        const event = new CustomEvent('camera-error', {
          detail: { error: error },
        });
        window.dispatchEvent(event);

        setTimeout(() => {
          if (!document.getElementById('error-popup')) {
            const errorPopup = document.createElement('div');
            errorPopup.innerHTML = `Webcam Error\nName: ${error.name} \nMessage: ${error.message}`;
            errorPopup.setAttribute('id', 'error-popup');
            document.body.appendChild(errorPopup);
          }
        }, 1000);
      };
    }

    const domElement = document.createElement('video');
    domElement.setAttribute('autoplay', '');
    domElement.setAttribute('muted', '');
    domElement.setAttribute('playsinline', '');
    domElement.style.width = this.parameters.displayWidth + 'px';
    domElement.style.height = this.parameters.displayHeight + 'px';

    // check API is available
    if (
      navigator.mediaDevices === undefined ||
      navigator.mediaDevices.enumerateDevices === undefined ||
      navigator.mediaDevices.getUserMedia === undefined
    ) {
      let fctName;
      if (navigator.mediaDevices === undefined) {
        fctName = 'navigator.mediaDevices';
      } else if (navigator.mediaDevices.enumerateDevices === undefined) {
        fctName = 'navigator.mediaDevices.enumerateDevices';
      } else if (navigator.mediaDevices.getUserMedia === undefined) {
        fctName = 'navigator.mediaDevices.getUserMedia';
      } else {
        console.assert(false);

        return null;
      }
      onError({
        name: '',
        message: `WebRTC issue-! ${fctName} not present in your browser`,
      });

      return null;
    }

    // get available devices
    navigator.mediaDevices
      .enumerateDevices()
      .then((_devices) => {
        const userMediaConstraints: MediaStreamConstraints = {
          audio: false,
        };
        userMediaConstraints.video = {
          facingMode: 'environment',
          width: {
            ideal: this.parameters.sourceWidth,
          },
          height: {
            ideal: this.parameters.sourceHeight,
          },
        };

        if (this.parameters.deviceId !== null) {
          userMediaConstraints.video.deviceId = {
            exact: this.parameters.deviceId,
          };
        }

        // get a device which satisfy the constraints
        navigator.mediaDevices
          .getUserMedia(userMediaConstraints)
          .then((stream) => {
            // set the .src of the domElement
            domElement.srcObject = stream;

            const event = new CustomEvent('camera-init', {
              detail: { stream: stream },
            });
            window.dispatchEvent(event);

            // start the video on first click if not started automatically
            document.body.addEventListener('click', this.onInitialClick, {
              once: true,
            });

            onReady();
          })
          .catch((error) => {
            onError({
              name: error.name,
              message: error.message,
            });
          });
      })
      .catch((error) => {
        onError({
          message: error.message,
        });
      });

    return domElement;
  }

  ////////////////////////////////////////////////////////////////////////////////
  //          dispose source
  ////////////////////////////////////////////////////////////////////////////////

  dispose(): void {
    this.ready = false;

    switch (this.parameters.sourceType) {
      case 'image':
        this._disposeSourceImage();
        break;

      case 'video':
        this._disposeSourceVideo();
        break;

      case 'webcam':
        this._disposeSourceWebcam();
        break;
    }

    this.domElement = null;

    document.body.removeEventListener('click', this.onInitialClick);
  }

  ////////////////////////////////////////////////////////////////////////////////
  //          dispose image source
  ////////////////////////////////////////////////////////////////////////////////

  _disposeSourceImage(): void {
    const domElement = document.querySelector('#arjs-video');

    if (!domElement) {
      return;
    }

    domElement.remove();
  }

  ////////////////////////////////////////////////////////////////////////////////
  //          dispose video source
  ////////////////////////////////////////////////////////////////////////////////

  _disposeSourceVideo(): void {
    const domElement = document.querySelector('#arjs-video');

    if (!domElement) {
      return;
    }

    // https://html.spec.whatwg.org/multipage/media.html#best-practices-for-authors-using-media-elements
    if (domElement instanceof HTMLVideoElement) {
      domElement.pause();
      domElement.removeAttribute('src');
      domElement.load();
    }

    domElement.remove();
  }

  ////////////////////////////////////////////////////////////////////////////////
  //          dispose webcam source
  ////////////////////////////////////////////////////////////////////////////////

  _disposeSourceWebcam(): void {
    const domElement = document.querySelector('#arjs-video');

    if (!domElement) {
      return;
    }

    // https://stackoverflow.com/a/12436772
    if (domElement instanceof HTMLVideoElement) {
      const stream = domElement.srcObject;
      if (stream && stream instanceof MediaStream) {
        stream.getTracks().map((track) => track.stop());
      }
    }

    domElement.remove();
  }

  //////////////////////////////////////////////////////////////////////////////
  //		Handle Mobile Torch
  //////////////////////////////////////////////////////////////////////////////

  hasMobileTorch(): boolean | undefined {
    if (!this.domElement || !(this.domElement instanceof HTMLVideoElement)) {
      return;
    }

    const stream = this.domElement.srcObject;
    if (stream instanceof MediaStream === false) return false;

    if (this._currentTorchStatus === undefined) {
      this._currentTorchStatus = false;
    }

    const videoTrack = stream.getVideoTracks()[0];

    // if videoTrack.getCapabilities() doesnt exist, return false now
    if (videoTrack.getCapabilities === undefined) return false;

    const capabilities = videoTrack.getCapabilities();

    return isMediaTrackCapabilitiesWithTorch(capabilities);
  }

  /**
   * toggle the flash/torch of the mobile fun if applicable.
   * Great post about it https://www.oberhofer.co/mediastreamtrack-and-its-capabilities/
   */
  toggleMobileTorch(): void {
    if (!this.domElement || !(this.domElement instanceof HTMLVideoElement)) {
      return;
    }

    // sanity check
    console.assert(this.hasMobileTorch() === true);

    const stream = this.domElement.srcObject;
    if (stream instanceof MediaStream === false) {
      if (!document.getElementById('error-popup')) {
        const errorPopup = document.createElement('div');
        errorPopup.innerHTML =
          'enabling mobile torch is available only on webcam';
        errorPopup.setAttribute('id', 'error-popup');
        document.body.appendChild(errorPopup);
      }

      return;
    }

    if (this._currentTorchStatus === undefined) {
      this._currentTorchStatus = false;
    }

    const videoTrack = stream.getVideoTracks()[0];
    const capabilities = videoTrack.getCapabilities();

    if (
      isMediaTrackCapabilitiesWithTorch(capabilities) &&
      !capabilities.torch
    ) {
      if (!document.getElementById('error-popup')) {
        const errorPopup = document.createElement('div');
        errorPopup.innerHTML = 'no mobile torch is available on your camera';
        errorPopup.setAttribute('id', 'error-popup');
        document.body.appendChild(errorPopup);
      }

      return;
    }

    this._currentTorchStatus =
      this._currentTorchStatus === false ? true : false;
    videoTrack
      .applyConstraints({
        advanced: [
          {
            torch: this._currentTorchStatus,
          } as MediaTrackConstraintsWithTorch,
        ],
      })
      .catch((error) => {
        console.log(error);
      });
  }

  domElementWidth(): number | undefined {
    if (!this.domElement) {
      return;
    }

    return parseInt(this.domElement.style.width);
  }

  domElementHeight(): number | undefined {
    if (!this.domElement) {
      return;
    }

    return parseInt(this.domElement.style.height);
  }

  ////////////////////////////////////////////////////////////////////////////////
  //          handle resize
  ////////////////////////////////////////////////////////////////////////////////

  onResizeElement(): void {
    if (!this.domElement) {
      return;
    }

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // sanity check
    console.assert(arguments.length === 0);

    // compute sourceWidth, sourceHeight
    let sourceWidth;
    let sourceHeight;
    if (this.domElement instanceof HTMLImageElement) {
      sourceWidth = this.domElement.naturalWidth;
      sourceHeight = this.domElement.naturalHeight;
    } else if (this.domElement instanceof HTMLVideoElement) {
      sourceWidth = this.domElement.videoWidth;
      sourceHeight = this.domElement.videoHeight;
    } else {
      console.assert(false);

      return;
    }

    // compute sourceAspect
    const sourceAspect = sourceWidth / sourceHeight;
    // compute screenAspect
    const screenAspect = screenWidth / screenHeight;

    // if screenAspect < sourceAspect, then change the width, else change the height
    if (screenAspect < sourceAspect) {
      // compute newWidth and set .width/.marginLeft
      const newWidth = sourceAspect * screenHeight;
      this.domElement.style.width = newWidth + 'px';
      this.domElement.style.marginLeft = -(newWidth - screenWidth) / 2 + 'px';

      // init style.height/.marginTop to normal value
      this.domElement.style.height = screenHeight + 'px';
      this.domElement.style.marginTop = '0px';
    } else {
      // compute newHeight and set .height/.marginTop
      const newHeight = 1 / (sourceAspect / screenWidth);
      this.domElement.style.height = newHeight + 'px';
      this.domElement.style.marginTop = -(newHeight - screenHeight) / 2 + 'px';

      // init style.width/.marginLeft to normal value
      this.domElement.style.width = screenWidth + 'px';
      this.domElement.style.marginLeft = '0px';
    }
  }

  copyElementSizeTo(otherElement: HTMLElement): void {
    if (!this.domElement) {
      return;
    }

    if (window.innerWidth > window.innerHeight) {
      //landscape
      otherElement.style.width = this.domElement.style.width;
      otherElement.style.height = this.domElement.style.height;
      otherElement.style.marginLeft = this.domElement.style.marginLeft;
      otherElement.style.marginTop = this.domElement.style.marginTop;
    } else {
      //portrait
      otherElement.style.height = this.domElement.style.height;
      otherElement.style.width =
        (parseInt(otherElement.style.height) * 4) / 3 + 'px';
      otherElement.style.marginLeft =
        (window.innerWidth - parseInt(otherElement.style.width)) / 2 + 'px';
      otherElement.style.marginTop = '0px';
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  //		Code Separator
  //////////////////////////////////////////////////////////////////////////////

  onResize(
    arToolkitContext: Context,
    renderer: WebGLRenderer,
    camera: Camera,
  ): void {
    const trackingBackend = arToolkitContext.parameters.trackingBackend;

    // RESIZE DOMELEMENT
    if (trackingBackend === 'artoolkit') {
      this.onResizeElement();

      const isAframe =
        renderer.domElement.dataset.aframeCanvas != null ? true : false;
      if (isAframe === false) {
        this.copyElementSizeTo(renderer.domElement);
      }

      if (arToolkitContext.arController !== null) {
        this.copyElementSizeTo(arToolkitContext.arController.canvas);
      }
    } else {
      console.assert(false, 'unhandled trackingBackend ' + trackingBackend);

      return;
    }

    // UPDATE CAMERA
    if (trackingBackend === 'artoolkit') {
      if (arToolkitContext.arController !== null) {
        camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
      }
    } else {
      console.assert(false, 'unhandled trackingBackend ' + trackingBackend);

      return;
    }
  }
}

export default Source;
