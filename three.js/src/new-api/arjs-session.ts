import * as THREE from "three";
import Source, { ArToolkitSourceParameters } from "../threex/arjs-source";
import Context, { ArToolkitContextParameters } from "../threex/arjs-context"; // TODO context build-dependent

export interface ArJsSessionParameters {
  renderer: THREE.WebGLRenderer | null;
  camera: THREE.Camera | null;
  scene: THREE.Scene | null;
  sourceParameters?: ArToolkitSourceParameters;
  contextParameters?: ArToolkitContextParameters;
}

type ArJsSessionParameterKeys = keyof ArJsSessionParameters;

function isArJsSessionParameterKeys(
  arg: unknown,
): arg is ArJsSessionParameterKeys {
  const event = arg as ArJsSessionParameterKeys;
  const keys = [
    'renderer',
    'camera',
    'scene',
    'sourceParameters',
    'contextParameters',
  ];

  return keys.includes(event);
}
/**
 *  * define a Session
 *
 * @param {Object} parameters - parameters for this session
 */
class Session {
  arSource: Source;
  arContext: Context;

  // handle default parameters
  parameters: ArJsSessionParameters = {
    renderer: null,
    camera: null,
    scene: null,
    sourceParameters: undefined,
    contextParameters: undefined,
  };

  constructor(parameters: ArJsSessionParameters) {
    //////////////////////////////////////////////////////////////////////////////
    //		setParameters
    //////////////////////////////////////////////////////////////////////////////
    const setProperty = <K extends keyof ArJsSessionParameters>(
      key: K,
      value: ArJsSessionParameters[K],
    ) => {
      this.parameters[key] = value;
    };

    const setParameters = (parameters?: ArJsSessionParameters) => {
      if (parameters === undefined) return;
      for (const key in parameters) {
        if (!isArJsSessionParameterKeys(key)) continue;

        const newValue = parameters[key];

        if (newValue === undefined) {
          console.warn(`THREEx.Session: '${key}' parameter is undefined.`);
          continue;
        }

        const currentValue = this.parameters[key];

        if (currentValue === undefined) {
          console.warn(
            `THREEx.Session: '${key}' is not a property of this material.`
          );
          continue;
        }

        setProperty(key, newValue);
      }
    };

    setParameters(parameters);

    // sanity check
    console.assert(this.parameters.renderer instanceof THREE.WebGLRenderer);
    console.assert(this.parameters.camera instanceof THREE.Camera);
    console.assert(this.parameters.scene instanceof THREE.Scene);

    // log the version
    console.log(
      "AR.js",
      Context.REVISION,
      "- trackingBackend:",
      parameters.contextParameters?.trackingBackend
    );

    //////////////////////////////////////////////////////////////////////////////
    //		init arSource
    //////////////////////////////////////////////////////////////////////////////
    this.arSource = new Source(parameters.sourceParameters);

    this.arSource.init(() => {
      if (this.parameters.renderer == null || this.parameters.camera == null) {
        return;
      }

      this.arSource.onResize(
        this.arContext,
        this.parameters.renderer,
        this.parameters.camera
      );
    });

    // handle resize
    window.addEventListener("resize", () => {
      if (this.parameters.renderer == null || this.parameters.camera == null) {
        return;
      }

      this.arSource.onResize(
        this.arContext,
        this.parameters.renderer,
        this.parameters.camera
      );
    });

    //////////////////////////////////////////////////////////////////////////////
    //		init arContext
    //////////////////////////////////////////////////////////////////////////////

    // create atToolkitContext
    this.arContext = new Context(parameters.contextParameters);

    const getSourceOrientation = () => {
      if (this.arSource.domElement == null) {
        return;
      }

      console.log(
        "actual source dimensions",
        this.arSource.domElement.clientWidth,
        this.arSource.domElement.clientHeight
      );

      if (
        this.arSource.domElement.clientWidth >
        this.arSource.domElement.clientHeight
      ) {
        console.log("source orientation", "landscape");
        return "landscape";
      } else {
        console.log("source orientation", "portrait");
        return "portrait";
      }
    };

    // initialize it
    window.addEventListener("arjs-video-loaded", () => {
      const arContext = this.arContext;

      this.arContext.init(() => {
        if (arContext.arController == null) return;

        const orientation = getSourceOrientation();
        if (orientation == null) return;

        arContext.arController.orientation = orientation;
        arContext.arController.options.orientation = orientation;
      });
    });

    this.arContext.addEventListener("initialized", (event) => {
      if (this.parameters.renderer == null || this.parameters.camera == null) {
        return;
      }

      this.arSource.onResize(
        this.arContext,
        this.parameters.renderer,
        this.parameters.camera
      );
    });
  }

  // backward emulation
  get renderer() {
    console.warn("use .parameters.renderer renderer");

    return this.parameters.renderer;
  }

  get camera() {
    console.warn("use .parameters.camera instead");

    return this.parameters.camera;
  }
  get scene() {
    console.warn("use .parameters.scene instead");

    return this.parameters.scene;
  }

  //////////////////////////////////////////////////////////////////////////////
  //		update function
  //////////////////////////////////////////////////////////////////////////////
  // update artoolkit on every frame
  update() {
    if (this.arSource?.ready === false || this.arSource?.domElement == null) {
      return;
    }

    this.arContext.update(this.arSource.domElement);
  }

  onResize() {
    if (this.parameters.renderer == null || this.parameters.camera == null) {
      return;
    }

    this.arSource.onResize(
      this.arContext,
      this.parameters.renderer,
      this.parameters.camera
    );
  }
}

export default Session;
