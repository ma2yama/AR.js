import * as THREE from 'three';

class WebcamRenderer {
  renderer: THREE.WebGLRenderer;
  sceneWebcam: THREE.Scene;
  geom: THREE.PlaneGeometry;
  texture: THREE.VideoTexture;
  material: THREE.MeshBasicMaterial;
  cameraWebcam: THREE.OrthographicCamera;

  constructor(renderer: THREE.WebGLRenderer, videoElement?: HTMLVideoElement) {
    this.renderer = renderer;
    this.renderer.autoClear = false;
    this.sceneWebcam = new THREE.Scene();
    let video: HTMLVideoElement;
    if (videoElement === undefined) {
      video = document.createElement('video');
      video.setAttribute('autoplay', 'true');
      video.setAttribute('playsinline', 'true');
      video.style.display = 'none';
      document.body.appendChild(video);
    } else {
      video = videoElement;
    }
    this.geom = new THREE.PlaneGeometry();
    this.texture = new THREE.VideoTexture(video);
    this.material = new THREE.MeshBasicMaterial({ map: this.texture });
    const mesh = new THREE.Mesh(this.geom, this.material);
    this.sceneWebcam.add(mesh);
    this.cameraWebcam = new THREE.OrthographicCamera(
      -0.5,
      0.5,
      0.5,
      -0.5,
      0,
      10,
    );
    const constraints = {
      video: {
        width: 1280,
        height: 720,
        facingMode: 'environment',
      },
    };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        console.log(`using the webcam successfully...`);
        video.srcObject = stream;
        video.play();
      })
      .catch((e) => {
        setTimeout(() => {
          this.createErrorPopup(
            'Webcam Error\nName: ' + e.name + '\nMessage: ' + e.message,
          );
        }, 1000);
      });
  }

  update(): void {
    this.renderer.clear();
    this.renderer.render(this.sceneWebcam, this.cameraWebcam);
    this.renderer.clearDepth();
  }

  dispose(): void {
    this.material.dispose();
    this.texture.dispose();
    this.geom.dispose();
  }

  createErrorPopup(msg: string): void {
    if (!document.getElementById('error-popup')) {
      const errorPopup = document.createElement('div');
      errorPopup.innerHTML = msg;
      errorPopup.setAttribute('id', 'error-popup');
      document.body.appendChild(errorPopup);
    }
  }
}

export { WebcamRenderer };
