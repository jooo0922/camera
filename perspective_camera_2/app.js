'use strict'

import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';

import {
  OrbitControls
} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/controls/OrbitControls.js';

import {
  GUI
} from 'https://threejsfundamentals.org/threejs/../3rdparty/dat.gui.module.js';

function main() {
  const canvas = document.querySelector('#canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    logarithmicDepthBuffer: true
  });
  /**
   * z-파이팅(z-fighting, stitching) 현상의 원인과 해결방법
   * 
   * z-파이팅은 뭐냐면, 만약 앞뒤로 여러 개 렌더가 되어있는 객체가 존재하고,
   * 객체들이 너무 길다랗게 줄지어서 렌더되다 보면 카메라 절두체 안에 잘 안들어오게 되는데
   * 이걸 해결하려고 카메라의 near값을 엄청 가깝게(밑에 처럼 0.00001 이런식으로), far값은 엄청 멀게 설정하면
   * 컴퓨터 GPU가 어떤 픽셀이 앞이고 어떤 픽셀이 뒤인지 결정할 정밀도가 부족해지는 현상 발생.
   * 그래서 서로 앞뒤로 겹쳐져서 렌더되는 물체들끼리 깨져보이는 현상이 발생함.
   * 
   * 그럼 이거를 어떻게 해결할까?
   * 일단 Three.js의 renderer에 픽셀의 앞뒤를 결정하는 다른 방법을 사용하도록 설정하는 것인데,
   * WebGLRenderer를 설정할 때 logarithmicDepthBuffer: true 로 해주면 됨.
   * 그러나, 이거는 데스크탑 GPU는 지원하지만 모바일 기기는 대부분 이 기능을 지원하지 않고,
   * 이 기능을 활성화하면 성능이 훨씬 떨어지면서, 이 기능을 활성화 해봤자 near를 더 작게, far를 더 멀게 설정하면
   * 결국 z-파이팅이 또 발생하게 되는거임.
   * 
   * 그래서 가장 좋은 방법은 저 기능을 활성화하는 대신,
   * 'near는 대상이 보이는 한 가장 멀게, far도 대상이 보이는 한 카메라와 가장 가깝게 설정' 해주는 게 제일 나음.
   * 그만큼 camera의 near와 far를 적절하게 설정해주는 게 중요하다는 의미임.
   */

  // camera
  const fov = 45;
  const aspect = 2;
  const near = 0.00001; // 카메라의 near 속성을 0.00001로 아주 가깝게 설정한다면?
  const far = 100;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 10, 20);

  // camera의 near, far 값을 dat.GUI로 받은 뒤 일정 조건에 부합하는 값에 한하여 camera.near, far에 할당해주는 헬퍼 클래스
  class MinMaxGUIHelper {
    constructor(obj, minProp, maxProp, minDif) {
      this.obj = obj;
      this.minProp = minProp;
      this.maxProp = maxProp;
      this.minDif = minDif; // far과 near의 값 사이에 존재해야 하는 최소한의 격차값
    }

    get min() {
      return this.obj[this.minProp];
    }

    set min(v) {
      this.obj[this.minProp] = v;
      this.obj[this.maxProp] = Math.max(this.obj[this.maxProp], v + this.minDif);
      // 즉, camera.far의 값이 near + this.minDif 보다 작다면 차라리 camera.far에는 near + this.minDif 값을 넣으라는 뜻.
      // 그니까 far은 최소한 near보다 0.1보다 큰 값이 항상 들어가도록 setter를 설정해놓은 것.
    }

    get max() {
      return this.obj[this.maxProp];
    }

    set max(v) {
      this.obj[this.maxProp] = v;
      this.min = this.min; // 이거는 set min(v) 를 호출함.
      // 즉, min setter를 max setter에서도 호출함으로써, dat.GUI에서 
    }
  }

  function updateCamera() {
    camera.updateProjectionMatrix();
  }

  const gui = new GUI();
  gui.add(camera, 'fov', 1, 180).onChange(updateCamera);
  const minMaxGUIHelper = new MinMaxGUIHelper(camera, 'near', 'far', 0.1);
  gui.add(minMaxGUIHelper, 'min', 0.00001, 50, 0.00001).name('near').onChange(updateCamera); // 카메라의 near값을 0.00001의 작은 단위로 설정할 수 있다면?
  gui.add(minMaxGUIHelper, 'max', 0.1, 50, 0.1).name('far').onChange(updateCamera);

  // orbit controls
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 5, 0); // camera나 object의 .lookAt()처럼 OrbitControls의 타겟? 시점?의 위치를 바꿔주는 것.
  controls.update(); // OrbitControls에서 카메라 이동에 관하여 어떤 값이던 수정해줬으면 .update()를 호출해줘야 그 값이 적용됨.

  // scene을 생성하고 배경색을 black으로 할당함.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('black');

  // 텍스쳐를 로드한 뒤, 땅의 역할을 할 PlaneGeometry를 만들어서 material에 할당함.
  {
    const planeSize = 40;

    const loader = new THREE.TextureLoader();
    const texture = loader.load('./image/checker.png');
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    const repeats = planeSize / 2;
    texture.repeat.set(repeats, repeats);

    const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
    const planeMat = new THREE.MeshPhongMaterial({
      map: texture,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    mesh.rotation.x = Math.PI * -0.5;
    scene.add(mesh);
  }

  // create 20 spheres in a row. 구체를 20개 만들어서 한 줄로 세우는 것
  {
    const sphereRadius = 3;
    const sphereWidthDivision = 32;
    const sphereHeightDivision = 16;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, sphereWidthDivision, sphereHeightDivision);
    const numSphere = 20;
    for (let i = 0; i < numSphere; i++) {
      const sphereMat = new THREE.MeshPhongMaterial();
      sphereMat.color.setHSL(i * 0.73, 1, 0.5) // for loop의 i값에 따라서 Hue값이 결정되고, 그 결과 i값에 따라 달라지는 컬러값을 가지는 퐁-머티리얼이 각 구체에 적용됨.
      const mesh = new THREE.Mesh(sphereGeo, sphereMat);
      mesh.position.set(-sphereRadius - 1, sphereRadius + 2, i * sphereRadius * -2.2);
      // 각 구체들의 x, y값은 (-4, 5)로 고정되고, z값만 i값에 따라 달라지므로 z축 방향으로 한 줄로 세워지겠지
      scene.add(mesh);
    }
  }

  // directional light
  {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(0, 10, 0);
    light.target.position.set(-5, 0, 0);
    scene.add(light);
    scene.add(light.target);
  }

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  function animate() {
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    renderer.render(scene, camera);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

main();