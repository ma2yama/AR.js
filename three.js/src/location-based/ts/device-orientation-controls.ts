// Modified version of THREE.DeviceOrientationControls from three.js
// will use the deviceorientationabsolute event if available

import {
  Camera,
  Euler,
  EventDispatcher,
  MathUtils,
  Quaternion,
  Vector3,
} from 'three';

interface Orientation {
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
}

type SafariDeviceOrientationEvent = {
  requestPermission: () => Promise<string>;
} & DeviceOrientationEvent;

const _zee = new Vector3(0, 0, 1);
const _euler = new Euler();
const _q0 = new Quaternion();
const _q1 = new Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // - PI/2 around the x-axis

const _changeEvent = { type: 'change' } as const;

const EPS = 0.000001;
const TWO_PI = 2 * Math.PI;
const HALF_PI = 0.5 * Math.PI;

function isSafariDeviceOrientationEvent(
  arg: unknown,
): arg is SafariDeviceOrientationEvent {
  const event = arg as SafariDeviceOrientationEvent;

  return typeof event.requestPermission === 'function';
}

class DeviceOrientationControls extends EventDispatcher<{
  change: { type: 'change' };
}> {
  object: Camera;
  enabled: boolean;
  screenOrientation: number;
  alphaOffset: number;

  deviceOrientation?: Orientation;
  lastOrientation?: Orientation;

  orientationChangeEventName: 'deviceorientationabsolute' | 'deviceorientation';
  smoothingFactor: number;

  connect: () => void;
  disconnect: () => void;
  update: () => void;
  dispose: () => void;

  _orderAngle: (
    a: number,
    b: number,
    range?: number,
  ) => {
    left: number;
    right: number;
  };

  _getSmoothedAngle: (
    a: number,
    b: number,
    k: number,
    range?: number,
  ) => number;

  constructor(object: Camera) {
    super();

    if (!window.isSecureContext) {
      console.error(
        'THREE.DeviceOrientationControls: DeviceOrientationEvent is only available in secure contexts (https)',
      );
    }

    const lastQuaternion = new Quaternion();

    this.object = object;
    this.object.rotation.reorder('YXZ');

    this.enabled = true;

    this.screenOrientation = 0;

    this.alphaOffset = 0; // radians

    this.orientationChangeEventName =
      'ondeviceorientationabsolute' in window
        ? 'deviceorientationabsolute'
        : 'deviceorientation';

    this.smoothingFactor = 1;

    const onDeviceOrientationChangeEvent = (event: DeviceOrientationEvent) => {
      this.deviceOrientation = {
        alpha: event.alpha,
        beta: event.beta,
        gamma: event.gamma,
      };
    };

    const onScreenOrientationChangeEvent = () => {
      this.screenOrientation = window.screen.orientation.angle || 0;
      console.log(this.screenOrientation);
    };

    // The angles alpha, beta and gamma form a set of intrinsic Tait-Bryan angles of type Z-X'-Y''

    const setObjectQuaternion = (
      quaternion: Quaternion,
      alpha: number,
      beta: number,
      gamma: number,
      orient: number,
    ) => {
      _euler.set(beta, alpha, -gamma, 'YXZ'); // 'ZXY' for the device, but 'YXZ' for us

      quaternion.setFromEuler(_euler); // orient the device

      quaternion.multiply(_q1); // camera looks out the back of the device, not the top

      quaternion.multiply(_q0.setFromAxisAngle(_zee, -orient)); // adjust for screen orientation
    };

    this.connect = () => {
      onScreenOrientationChangeEvent(); // run once on load

      // iOS 13+

      if (isSafariDeviceOrientationEvent(window.DeviceOrientationEvent)) {
        window.DeviceOrientationEvent.requestPermission()
          .then((response: string) => {
            if (response === 'granted') {
              window.screen.orientation.addEventListener(
                'change',
                onScreenOrientationChangeEvent,
              );
              window.addEventListener<
                'deviceorientationabsolute' | 'deviceorientation'
              >(
                this.orientationChangeEventName,
                onDeviceOrientationChangeEvent,
              );
            }
          })
          .catch((error) => {
            console.error(
              'THREE.DeviceOrientationControls: Unable to use DeviceOrientation API:',
              error,
            );
          });
      } else {
        window.screen.orientation.addEventListener(
          'change',
          onScreenOrientationChangeEvent,
        );
        window.addEventListener<
          'deviceorientationabsolute' | 'deviceorientation'
        >(this.orientationChangeEventName, onDeviceOrientationChangeEvent);
      }

      this.enabled = true;
    };

    this.disconnect = () => {
      window.screen.orientation.removeEventListener(
        'change',
        onScreenOrientationChangeEvent,
      );
      window.removeEventListener<
        'deviceorientationabsolute' | 'deviceorientation'
      >(this.orientationChangeEventName, onDeviceOrientationChangeEvent);

      this.enabled = false;
    };

    this.update = () => {
      if (!this.enabled) return;

      const device = this.deviceOrientation;

      if (device != null) {
        let alpha =
          device.alpha != null
            ? MathUtils.degToRad(device.alpha) + this.alphaOffset
            : 0; // Z

        let beta = device.beta != null ? MathUtils.degToRad(device.beta) : 0; // X'

        let gamma = device.gamma != null ? MathUtils.degToRad(device.gamma) : 0; // Y''

        const orient = this.screenOrientation
          ? MathUtils.degToRad(this.screenOrientation)
          : 0; // O

        if (this.smoothingFactor < 1) {
          if (
            this.lastOrientation?.alpha != null &&
            this.lastOrientation?.beta != null &&
            this.lastOrientation?.gamma != null
          ) {
            const k = this.smoothingFactor;
            alpha = this._getSmoothedAngle(
              alpha,
              this.lastOrientation.alpha,
              k,
            );
            beta = this._getSmoothedAngle(
              beta + Math.PI,
              this.lastOrientation.beta,
              k,
            );
            gamma = this._getSmoothedAngle(
              gamma + HALF_PI,
              this.lastOrientation.gamma,
              k,
              Math.PI,
            );
          } else {
            beta += Math.PI;
            gamma += HALF_PI;
          }

          this.lastOrientation = {
            alpha,
            beta,
            gamma,
          };
        }

        setObjectQuaternion(
          this.object.quaternion,
          alpha,
          this.smoothingFactor < 1 ? beta - Math.PI : beta,
          this.smoothingFactor < 1 ? gamma - HALF_PI : gamma,
          orient,
        );

        if (8 * (1 - lastQuaternion.dot(this.object.quaternion)) > EPS) {
          lastQuaternion.copy(this.object.quaternion);
          this.dispatchEvent(_changeEvent);
        }
      }
    };

    // NW Added
    this._orderAngle = (a: number, b: number, range = TWO_PI) => {
      if (
        (b > a && Math.abs(b - a) < range / 2) ||
        (a > b && Math.abs(b - a) > range / 2)
      ) {
        return { left: a, right: b };
      } else {
        return { left: b, right: a };
      }
    };

    // NW Added
    this._getSmoothedAngle = (
      a: number,
      b: number,
      k: number,
      range = TWO_PI,
    ) => {
      const angles = this._orderAngle(a, b, range);
      const angleshift = angles.left;
      const origAnglesRight = angles.right;
      angles.left = 0;
      angles.right -= angleshift;
      if (angles.right < 0) angles.right += range;
      let newangle =
        origAnglesRight == b
          ? (1 - k) * angles.right + k * angles.left
          : k * angles.right + (1 - k) * angles.left;
      newangle += angleshift;
      if (newangle >= range) newangle -= range;

      return newangle;
    };

    this.dispose = () => {
      this.disconnect();
    };

    this.connect();
  }
}

export { DeviceOrientationControls };
