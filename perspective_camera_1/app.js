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
  const view1Elem = document.querySelector('#view1');
  const view2Elem = document.querySelector('#view2'); // 각각 OrbitControls에 넘겨주어 각각의 분할된 div 태그에서 이벤트를 받도록 해주는 것.
  const renderer = new THREE.WebGLRenderer({
    canvas
  });

  // camera
  const fov = 45;
  const aspect = 2;
  const near = 0.1;
  const far = 100;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 10, 20);

  // light와 마찬가지로 카메라를 line segments로 시각화하도록 돕는 헬퍼 객체가 존재함.
  // 구조를 어떻게 할거냐면, THREE.js의 가위함수(scissor function)을 이용해서 씬을 2개로 분할하고, 
  // 카메라도 각각의 씬에 2개씩 할당해준 뒤, 왼쪽 씬의 카메라를 시각화하는 헬퍼 객체를 오른쪽 씬에서만 보이게 하여
  // 왼쪽 씬에서는 왼쪽 씬 카메라를 볼 수 없지만, 오른쪽 씬에서 왼쪽 씬 카메라가 어떻게 움직이는지 볼 수 있도록 할거임.
  const cameraHelper = new THREE.CameraHelper(camera);

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

  // 카메라가 둘로 나눠져서 animate 함수에서 각각의 카메라에 대해 값에 변화가 생기면 알아서 업데이트가 되기 때문에
  // updateCamera 함수를 따로 만들 필요가 없는 상태이므로, dat.GUI를 이용해서 카메라값을 바꾸더라도 카메라를 따로 업데이트해줄 필요가 없음.
  const gui = new GUI();
  gui.add(camera, 'fov', 1, 180);
  const minMaxGUIHelper = new MinMaxGUIHelper(camera, 'near', 'far', 0.1);
  gui.add(minMaxGUIHelper, 'min', 0.1, 50, 0.1).name('near');
  gui.add(minMaxGUIHelper, 'max', 0.1, 50, 0.1).name('far');

  // orbit controls
  const controls = new OrbitControls(camera, view1Elem); // 왼쪽 div 요소에 대해서만 이벤트를 받도록 기존의 OrbitControls를 수정함.
  controls.target.set(0, 5, 0); // camera나 object의 .lookAt()처럼 OrbitControls의 타겟? 시점?의 위치를 바꿔주는 것.
  controls.update(); // OrbitControls에서 카메라 이동에 관하여 어떤 값이던 수정해줬으면 .update()를 호출해줘야 그 값이 적용됨.

  // 두 번째 perspective camera를 생성함.
  const camera2 = new THREE.PerspectiveCamera(
    60, // fov
    2, // aspect
    0.1, // near
    500 // far
  )
  camera2.position.set(40, 10, 30);
  camera2.lookAt(0, 5, 0);

  // 두 번째 OrbitControls를 만들 때 camera2와 오른쪽 div 요소를 전달하여 camera2가 오른쪽 div 요소의 이벤트에만 반응하여 움직이도록 함.
  const controls2 = new OrbitControls(camera2, view2Elem);
  controls2.target.set(0, 5, 0);
  controls2.update();

  // scene을 생성하고 배경색을 black으로 할당함.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('black');
  scene.add(cameraHelper); // 씬에 추가해주되, 오른쪽 씬에서만 cameraHelper.visible = true로 해서 왼쪽 씬의 카메라를 오른쪽 씬에서만 시각화할거임. 

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

  // create cube
  {
    const cubeSize = 4;
    const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const cubeMat = new THREE.MeshPhongMaterial({
      color: '#8AC'
    });
    const mesh = new THREE.Mesh(cubeGeo, cubeMat);
    mesh.position.set(cubeSize + 1, cubeSize / 2, 0);
    scene.add(mesh);
  }

  // create sphere
  {
    const sphereRadius = 3;
    const sphereWidthDivision = 32;
    const sphereHeightDivision = 16;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, sphereWidthDivision, sphereHeightDivision);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: '#CA8'
    });
    const mesh = new THREE.Mesh(sphereGeo, sphereMat);
    mesh.position.set(-sphereRadius - 1, sphereRadius + 2, 0);
    scene.add(mesh);
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

  // 가위 함수를 사용해 카메라 각각의 시점에 따라 장면을 canvas의 양쪽에 나눠 렌더링할거임.
  function setScissorForElement(elem) {
    // 캔버스 요소, 왼쪽 div, 오른쪽 div 각각의 top, left, bottom, right, width, height값이 담긴 DOMRect객체를 리턴받음.
    const canvasRect = canvas.getBoundingClientRect();
    const elemRect = elem.getBoundingClientRect();

    // 여기서부터는 view1과 view2 각각의 top, left, bottom, right값과 width, height값을 구하는건데
    // 아래의 공식에 따라 계산해보면 그냥 elemRect에 리턴받게 될 DOMRect랑 동일한 값이 나오는데 왜이렇게 어려운 공식을 사용했는지 이해가 안감...
    const right = Math.min(elemRect.right, canvasRect.right) - canvasRect.left;
    const left = Math.max(0, elemRect.left - canvasRect.left);
    const bottom = Math.min(elemRect.bottom, canvasRect.bottom) - canvasRect.top;
    const top = Math.max(0, elemRect.top - canvasRect.top);

    const width = Math.min(canvasRect.width, right - left);
    const height = Math.min(canvasRect.height, bottom - top);

    // 지금 positiveYUpBottom 값도 결국 각 elemRect의 top값과 동일한 값(0)이 나오는데 왜 굳이 이렇게...
    const positiveYUpBottom = canvasRect.height - bottom;
    renderer.setScissor(left, positiveYUpBottom, width, height); // 얘는 전달받은 x, y, width, height값으로 scissor region을 설정한다고 함.
    renderer.setViewport(left, positiveYUpBottom, width, height); // 얘는 전달받은 x, y, width, height값으로 렌더할 viewport를 설정한다고 함.

    // 현재 각 scissor region의 width / height 비율값을 각 region의 카메라의 aspect에 할당하기 위해 리턴해 줌.
    return width / height;
  }

  function animate() {
    // 리사이징이 일어나면 캔버스의 픽셀 사이즈만 조정해주고, 카메라의 aspect는 각각의 scissor region에서 따로 지정해줄 것이므로
    // resizeRendererToDisplaySize()만 호출함.
    resizeRendererToDisplaySize(renderer);

    // 현재 renderer의 scissor 활성화. 이렇게 하면 현재 renderer에서 scissor area안에 있는 pixel들만 renderer에서 발생하는 계산들의 영향을 받음.
    renderer.setScissorTest(true);

    // 첫 번째 화면(기존 화면) 렌더링
    {
      const aspect = setScissorForElement(view1Elem);

      camera.aspect = aspect; // 첫번째 화면의 비율만큼 첫번째 카메라 비율 조정
      camera.updateProjectionMatrix(); // 카메라 업데이트는 각각의 scissor area의 카메라에서 따로 해주기 때문에 앞서 정의한 updateCamera 함수는 필요없음.
      cameraHelper.update(); // 지금 이 헬퍼객체는 첫번째 카메라의 헬퍼객체이므로, 첫번째 카메라의 속성값이 바뀌어서 업데이트되면 헬퍼객체도 따라서 업데이트 헤줘야 씬에 반영됨.

      cameraHelper.visible = false; // 기존 화면에서는 카메라 헬퍼를 안보이게 하고, 오른쪽 화면에서만 보여줄거임.

      scene.background.set(0x000000);

      renderer.render(scene, camera); // 각 scissor area에 렌더해주는 카메라가 나눠진 상태이므로, 카메라 별로 render를 각각 해줘야 함.
    }

    // 두 번째 화면 렌더링
    {
      const aspect = setScissorForElement(view2Elem);

      camera2.aspect = aspect;
      camera2.updateProjectionMatrix(); // 두 번째 카메라는 헬퍼 객체가 따로 없기 때문에 카메라 자체의 바뀐 속성값이 대해서만 업데이트 해주면 됨.

      cameraHelper.visible = true // 이 헬퍼 객체는 첫번째 화면을 찍는 카메라의 헬퍼객체이고, 그거를 두 번째 화면에서만 보여주겠다는 거.

      scene.background.set(0x000040); // scissor area가 구분될 수 있게 배경색을 바꿔줌.

      renderer.render(scene, camera2);
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

main();