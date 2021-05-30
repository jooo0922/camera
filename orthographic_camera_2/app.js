'use strict'

import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';

function main() {
  const canvas = document.querySelector('#canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas
  });

  // orthographic camera(정사영 카메라)를 사용하여 2D 요소 표현하기 (가장 주된 용도)
  // orthographic camera로 2D canvas처럼 중점(0, 0)을 왼쪽 상단으로 두고, canvas 1픽셀을 카메라 한 칸과 동일한 크기로 지정하고 싶으면
  // 아래와 같이 orthographic camera의 초기값을 지정해주면 됨. 
  const left = 0;
  const right = 300; // canvas 기본 width
  const top = 0;
  const bottom = 150; // canvas 기본 height
  const near = -1;
  const far = 1;
  const camera = new THREE.OrthographicCamera(left, right, top, bottom, near, far);
  camera.zoom = 1;

  // scene을 생성하고 배경색을 black으로 할당함.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('black');

  // plane mesh 6개를 만들어 로드한 6개의 각각 다른 텍스쳐를 적용해줄것.
  const loader = new THREE.TextureLoader();
  const textures = [
    loader.load('./image/flower-1.jpg'),
    loader.load('./image/flower-2.jpg'),
    loader.load('./image/flower-3.jpg'),
    loader.load('./image/flower-4.jpg'),
    loader.load('./image/flower-5.jpg'),
    loader.load('./image/flower-6.jpg'),
  ];
  const planeSize = 256;
  const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
  const planes = textures.map((texture) => {
    const planePivot = new THREE.Object3D();
    scene.add(planePivot);
    texture.magFilter = THREE.NearestFilter;
    const planeMat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(planeGeo, planeMat);
    planePivot.add(mesh);
    // 이렇게 해주면, planePivot 오브젝트 중점에 plane 메쉬의 상단 좌측이 위치하게 된다.
    // 그러면 animate 메소드에서 planePivot 오브젝트의 중점을 캔버스 left ~ right, top ~ bottom 사이에서 움직이면,
    // plane 메쉬는 상단 좌측 부분이 캔버스의 left ~ right, top, bottom 사이에서 움직이는 것처럼 보이게 되는거임.
    // 그니까, planePivot은 사실상 캔버스 상에서 짤려서 보이는 순간도 있지만, Object3D는 어차피 안보이니까 상관이 없고,
    // plane 메쉬가 캔버스에서 안짤리게 보이면서도 상단 좌측을 중심으로 좌표값을 이동시킬 수 있게 되는거임.
    // 이거는 2d canvas에서 rectangle을 캔버스 상에서 움직일 때랑 사실상 동일하다고 볼 수 있음. 
    mesh.position.set(planeSize / 2, planeSize / 2, 0);
    return planePivot;
  }); // map 메소드는 텍스쳐 배열에서 텍스쳐를 하나씩 꺼내서 그걸로 planePivot을 만든 뒤, 걔내들을 모아 planePivot 배열을 리턴받도록 하는거임.

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

  function animate(time) {
    time *= 0.001 // ms -> s단위로 바꿔줌.

    if (resizeRendererToDisplaySize(renderer)) {
      camera.right = canvas.width;
      camera.bottom = canvas.height;
      // 위에서도 캔버스의 기본 width, height값을 camera.right, bottom으로 지정해줬으니
      // 리사이징에 의해 캔버스의 픽셀 사이즈가 바뀌었다면 그만큼의 값을 카메라의 right, bottom에 지정해줘야겠지
      camera.updateProjectionMatrix(); // 카메라 속성값이 바뀌었으니 업데이트도 해주고
    }

    // 얘내는 뭐냐면, 아무리 캔버스 사이즈가 작아지더라도
    // canvas.width,height - planeSize가 결국 planeSize만큼의 크기를 가지는 plane 메쉬가 각각 x, y방향으로 이동할 수 있는 최대 범위인데,
    // 그 값이 아무리 작더라도 20보다는 커야한다는 뜻임.
    const distAcross = Math.max(20, canvas.width - planeSize);
    const distDown = Math.max(20, canvas.height - planeSize);

    const xRange = distAcross * 2;
    const yRange = distDown * 2;
    const speed = 180;

    planes.forEach((plane, index) => {
      const t = time * speed + index * 300; // planePivot의 index값에 따라 time의 변화에 따른 고유의 t값으로 변환함.

      // 나머지 값을 구하는거니까 각각 0 ~ xRange, 0 ~ yRange 사이의 값을 x, y방향의 이동값으로 할당함.
      // 결국 t값이 암만 커져도 xt, yt는 각각 xRange, yRange보다는 작은 값이 할당될 수밖에 없음.
      const xt = t % xRange;
      const yt = t % yRange;

      // 얘는 xt(x방향으로의 속도값)이 distAcross(xRange의 절반)값보다 작으면 그냥 xt를 x방향으로 이동할 좌표값으로 넣어주고,
      // 그거보다 크면 xRange - xt 한 값을 x방향으로 이동할 좌표값에 넣어주라는 뜻. y도 마찬가지.
      // 결국 x, y는 t값이 암만 커져도 각각 distAcross, distDown보다 작은 값이 할당될 수밖에 없음.
      const x = xt < distAcross ? xt : xRange - xt;
      const y = yt < distDown ? yt : yRange - yt;

      // 이거는 지금 겉보기에는 planePivot의 가운데 점의 좌표값을 이동시키는 것처럼 보이지만, 
      // 달리 보면 planePivot의 자식노드인 plane 메쉬의 좌측 상단 점의 좌표값을 이동시키는거 -> 2D 캔버스에서 rectangle 이동시키는 거랑 똑같지?
      plane.position.set(x, y, 0);
    });

    renderer.render(scene, camera);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

main();