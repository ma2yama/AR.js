import * as THREE from "three";
import Source from "../threex/arjs-source";
import Context from "../threex/arjs-context"; // TODO context build-dependent

/**
 *  * define a Session
 *
 * @param {Object} parameters - parameters for this session
 */
class Session {
  // handle default parameters
  parameters = {
    renderer: null,
    camera: null,
    scene: null,
    sourceParameters: {},
    contextParameters: {},
  };

  constructor(parameters) {
    //////////////////////////////////////////////////////////////////////////////
    //		setParameters
    //////////////////////////////////////////////////////////////////////////////
    const setParameters = (parameters) => {
      if (parameters === undefined) return;
      for (const key in parameters) {
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

        this.parameters[key] = newValue;
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
      parameters.contextParameters.trackingBackend
    );

    //////////////////////////////////////////////////////////////////////////////
    //		init arSource
    //////////////////////////////////////////////////////////////////////////////
    this.arSource = new Source(parameters.sourceParameters);

    this.arSource.init(() => {
      this.arSource.onResize(
        this.arContext,
        this.parameters.renderer,
        this.parameters.camera
      );
    });

    // handle resize
    window.addEventListener("resize", () => {
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
      this.arContext.init(() => {
        this.arContext.arController.orientation = getSourceOrientation();
        this.arContext.arController.options.orientation =
          getSourceOrientation();
      });
    });

    this.arContext.addEventListener("initialized", (event) => {
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
    if (this.arSource?.ready === false) return;

    this.arContext.update(arSource.domElement);
  }

  onResize() {
    this.arSource.onResize(
      this.arContext,
      this.parameters.renderer,
      this.parameters.camera
    );
  }
}

export default Session;
