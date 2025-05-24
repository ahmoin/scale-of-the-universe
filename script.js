import * as THREE from "three";

import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const NEAR = 1e-9,
  FAR = 1e28;
let SCREEN_WIDTH = window.innerWidth;
let SCREEN_HEIGHT = window.innerHeight;
const mouse = [0.5, 0.5];
let zoompos = -100,
  minzoomspeed = 0.015;
let zoomspeed = minzoomspeed;

const objects = {};
let composer;

const LY = 9.4607304725808e15;
const siUnits = [
  {
    unit: "pm",
    factor: 1e-12,
    fullName: "picometer",
    plural: "picometers",
  },
  {
    unit: "nm",
    factor: 1e-9,
    fullName: "nanometer",
    plural: "nanometers",
  },
  {
    unit: "µm",
    factor: 1e-6,
    fullName: "micrometer",
    plural: "micrometers",
  },
  {
    unit: "mm",
    factor: 1e-3,
    fullName: "millimeter",
    plural: "millimeters",
  },
  {
    unit: "cm",
    factor: 1e-2,
    fullName: "centimeter",
    plural: "centimeters",
  },
  { unit: "m", factor: 1, fullName: "meter", plural: "meters" },
  {
    unit: "km",
    factor: 1e3,
    fullName: "kilometer",
    plural: "kilometers",
  },
  {
    unit: "km",
    factor: 1e9,
    fullName: "million kilometers",
    plural: "million kilometers",
  },
  {
    unit: "km",
    factor: 1e12,
    fullName: "billion kilometers",
    plural: "billion kilometers",
  },
];

const units = [
  {
    factor: 1,
    fullName: "light year",
    plural: "light years",
  },
  {
    factor: 1e3,
    fullName: "thousand light years",
    plural: "thousand light years",
  },
  {
    factor: 1e6,
    fullName: "million light years",
    plural: "million light years",
  },
  {
    factor: 1e9,
    fullName: "billion light years",
    plural: "billion light years",
  },
  {
    factor: 1e12,
    fullName: "trillion light years",
    plural: "trillion light years",
  },
];

function formatDistanceMeters(meters) {
  const abs = Math.abs(meters);
  const best = siUnits.findLast((u) => abs >= u.factor) || siUnits[0];
  const value = meters / best.factor;

  function formatTinyDecimal(num) {
    if (Math.abs(num) < 1e-3) {
      let [mantissa, exponent] = num.toExponential().split("e");
      let decPlaces = Math.max(
        0,
        parseInt(exponent.replace("+", "")) * -1 +
          (mantissa.split(".")[1]?.length || 0)
      );
      return parseFloat(num.toFixed(decPlaces + 5));
    } else {
      return parseFloat(num.toFixed(2));
    }
  }

  const formattedValue = formatTinyDecimal(value);
  const numericValue = parseFloat(formattedValue);

  const unitName =
    numericValue === 1 || numericValue === -1 ? best.fullName : best.plural;

  return `${formattedValue.toLocaleString()} ${unitName}`;
}

function formatDistanceLightYears(lightYears) {
  const abs = Math.abs(lightYears);
  const best = units.findLast((u) => abs >= u.factor) || units[0];
  const value = lightYears / best.factor;

  function formatDecimal(num) {
    if (Math.abs(num) < 1e-3) {
      let [mantissa, exponent] = num.toExponential().split("e");
      let decPlaces = Math.max(
        0,
        parseInt(exponent.replace("+", "")) * -1 +
          (mantissa.split(".")[1]?.length || 0)
      );
      return parseFloat(num.toFixed(decPlaces + 5));
    } else {
      return parseFloat(num.toFixed(2));
    }
  }

  const formattedValue = formatDecimal(value);
  const numericValue = parseFloat(formattedValue);

  const unitName =
    numericValue === 1 || numericValue === -1 ? best.fullName : best.plural;

  return `${formattedValue.toLocaleString()} ${unitName}`;
}

const rawLabelData = [
  {
    name: "DNA",
    size_m: 2e-9,
    color: new THREE.Color().setHSL(0.3, 0.5, 0.8),
    luminosity: 0,
  },
  {
    name: "Red Blood Cell",
    size_m: 8e-6,
    color: new THREE.Color().setHSL(0.0, 1.0, 0.6),
    luminosity: 0,
  },
  {
    name: "Skin Cell",
    size_m: 3e-5,
    color: new THREE.Color().setHSL(0.1, 0.6, 0.6),
    luminosity: 0,
  },
  {
    name: "Salt Grain",
    size_m: 3e-4,
    color: new THREE.Color().setHSL(0.0, 0.0, 0.95),
    luminosity: 0,
  },
  {
    name: "Grain of Sand",
    size_m: 1e-3,
    color: new THREE.Color().setHSL(0.1, 0.4, 0.7),
    luminosity: 0,
  },
  {
    name: "US Penny",
    size_m: 1.9e-2,
    color: new THREE.Color().setHSL(0.07, 0.8, 0.5),
    luminosity: 0,
  },
  {
    name: "Basketball",
    size_m: 2.4e-1,
    color: new THREE.Color().setHSL(0.06, 1, 0.6),
    luminosity: 0,
  },
  {
    name: "Human",
    size_m: 1.7,
    color: new THREE.Color().setHSL(0.1, 0.2, 0.05),
    luminosity: 0,
  },
  {
    name: "Blue Whale Length",
    size_m: 30.0,
    color: new THREE.Color().setHSL(0.6, 0.4, 0.25),
    luminosity: 0,
  },
  {
    name: "Saturn V Rocket Height",
    size_m: 111.0,
    color: new THREE.Color().setHSL(0.6, 0.05, 0.7),
    luminosity: 0,
  },
  {
    name: "Eiffel Tower Height",
    size_m: 330.0,
    color: new THREE.Color().setHSL(0.1, 0.1, 0.4),
    luminosity: 0,
  },
  {
    name: "Central Park Width",
    size_m: 800.0,
    color: new THREE.Color().setHSL(0.3, 0.5, 0.3),
    luminosity: 0,
  },
  {
    name: "Mount Everest Height",
    size_m: 8.8e3,
    color: new THREE.Color().setHSL(0.6, 0.05, 0.6),
    luminosity: 0,
  },
  {
    name: "Neutron Star",
    size_m: 2e4,
    color: new THREE.Color().setHSL(0.5, 0.5, 0.5),
    luminosity: 0.7,
  },
  {
    name: "Switzerland Width",
    size_m: 2.2e5,
    color: new THREE.Color().setHSL(0.35, 0.4, 0.4),
    luminosity: 0,
  },
  {
    name: "Italy Length",
    size_m: 1.3e6,
    color: new THREE.Color().setHSL(0.4, 0.3, 0.5),
    luminosity: 0,
  },
  {
    name: "Earth",
    size_m: 1.27e7,
    color: new THREE.Color().setHSL(0.6, 0.8, 0.5),
    luminosity: 0,
  },
  {
    name: "Jupiter",
    size_m: 1.4e8,
    color: new THREE.Color().setHSL(0.5, 0.8, 0.8),
    luminosity: 0,
  },
  {
    name: "Sun",
    size_m: 1.39e9,
    color: new THREE.Color().setHSL(0.1, 1.0, 0.7),
    luminosity: 0.5,
  },
  {
    name: "Spica",
    size_m: 10e9,
    color: new THREE.Color().setHSL(0.6, 0.7, 0.7),
    luminosity: 0.7,
  },
  {
    name: "Betelgeuse",
    size_m: 1e12,
    color: new THREE.Color().setHSL(0.0, 0.7, 0.7),
    luminosity: 0.7,
  },
  {
    name: "Biggest Black Hole",
    size_m: 390e12,
    color: new THREE.Color().setHSL(0.0, 0.0, 0.0),
    luminosity: 1,
  },
  {
    name: "Ant Nebula",
    size_m: 1.892e16,
    color: new THREE.Color().setHSL(0.6, 0.2, 0.3),
    luminosity: 0.5,
  },
  {
    name: "Orion Nebula ",
    size_m: 2.270575e17,
    color: new THREE.Color().setHSL(0.9, 0.8, 0.4),
    luminosity: 0.6,
  },
  {
    name: "Milky Way Galaxy",
    size_m: 9.46073e20,
    color: new THREE.Color().setHSL(0.0, 0.0, 1.0),
    luminosity: 0.6,
    texture: "milky-way.png",
  },
  {
    name: "Virgo Cluster",
    size_m: 1.41911e23,
    color: new THREE.Color().setHSL(0.0, 0.0, 0.2),
    luminosity: 0,
  },
  {
    name: "Laniakea Supercluster",
    size_m: 4.91958e24,
    color: new THREE.Color().setHSL(0.1, 0.5, 0.2),
    luminosity: 0.5,
  },
  {
    name: "Observable Universe",
    size_m: 8.79848e26,
    color: new THREE.Color().setHSL(0.0, 1.0, 1.0),
    luminosity: 0.5,
    texture: "universe.png",
  },
];

const MIN_TEXT_GEOMETRY_SIZE = 0.01;
const labeldata = rawLabelData
  .sort((a, b) => a.size_m - b.size_m)
  .map((item) => {
    const actual_size_m = item.size_m;
    let display_size_param;
    let display_scale_param;

    if (actual_size_m < MIN_TEXT_GEOMETRY_SIZE && actual_size_m > 0) {
      display_size_param = MIN_TEXT_GEOMETRY_SIZE;
      display_scale_param = actual_size_m / MIN_TEXT_GEOMETRY_SIZE;
    } else {
      display_size_param = actual_size_m;
      display_scale_param = 1.0;
    }
    if (display_scale_param === 0 && actual_size_m > 0)
      display_scale_param = Number.MIN_VALUE;

    let formattedDistance = formatDistanceMeters(actual_size_m);
    if (item.size_m > 1e16) {
      const lightYears = item.size_m / LY;
      formattedDistance = formatDistanceLightYears(lightYears);
    }
    return {
      size: display_size_param,
      scale: display_scale_param,
      name: item.name,
      distance: formattedDistance,
      color: item.color,
      luminosity: item.luminosity || 0,
      texture: item.texture,
    };
  });

init();

let lastTouchDistance = 0;

function init() {
  const loader = new FontLoader();
  loader.load(
    "https://cdn.jsdelivr.net/npm/three@0.176.0/examples/fonts/helvetiker_regular.typeface.json",
    function (font) {
      const scene = initScene(font);

      objects.logzbuf = initView(scene, "logzbuf", true);
      initPostProcessing(
        objects.logzbuf.renderer,
        scene,
        objects.logzbuf.camera
      );

      animate();
    }
  );

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("resize", onWindowResize);
  window.addEventListener("wheel", onMouseWheel);
  window.addEventListener("touchstart", onTouchStart);
  window.addEventListener("touchmove", onTouchMove);
  window.addEventListener("touchend", onTouchEnd);
}

function initView(scene, name, logDepthBuf) {
  const framecontainer = document.getElementById("container_" + name);

  const camera = new THREE.PerspectiveCamera(
    50,
    SCREEN_WIDTH / SCREEN_HEIGHT,
    NEAR,
    FAR
  );
  scene.add(camera);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    logarithmicDepthBuffer: logDepthBuf,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  renderer.domElement.style.position = "relative";
  renderer.domElement.id = "renderer_" + name;
  framecontainer.appendChild(renderer.domElement);

  return {
    container: framecontainer,
    renderer: renderer,
    scene: scene,
    camera: camera,
  };
}

function initScene(font) {
  const scene = new THREE.Scene();
  const textureLoader = new THREE.TextureLoader();

  scene.add(new THREE.AmbientLight(0x444444));

  const light = new THREE.DirectionalLight(0xffffff, 1.0);
  light.position.set(100, 100, 100);
  scene.add(light);

  const baseMaterialArgs = {
    specular: 0x111111,
    shininess: 50,
  };

  const geometry = new THREE.SphereGeometry(0.5, 24, 12);

  const baseGlowingMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });

  const baseStandardTextMaterial = new THREE.MeshPhongMaterial({
    specular: 0x111111,
    shininess: 50,
    emissive: 0x000000,
  });

  for (let i = 0; i < labeldata.length; i++) {
    const item = labeldata[i];
    const actual_size_m = item.size * item.scale;

    const nameGeo = new TextGeometry(item.name, {
      font: font,
      size: item.size,
      depth: item.size * 0.1,
      bevelEnabled: false,
    });

    const distanceGeo = new TextGeometry(` (${item.distance})`, {
      font: font,
      size: item.size * 0.7,
      depth: item.size * 0.07,
      bevelEnabled: false,
    });

    nameGeo.computeBoundingSphere();
    distanceGeo.computeBoundingSphere();

    const nameWidth = nameGeo.boundingSphere.radius * 2;

    distanceGeo.translate(nameWidth - nameGeo.boundingSphere.center.x, 0, 0);
    nameGeo.translate(-nameGeo.boundingSphere.center.x, 0, 0);

    const group = new THREE.Group();
    group.position.z = -actual_size_m;
    scene.add(group);

    let dotmeshMaterial;

    if (item.texture) {
      const texture = textureLoader.load(item.texture);
      if (item.luminosity > 0) {
        dotmeshMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          color: item.color.clone().multiplyScalar(item.luminosity),
        });
      } else {
        dotmeshMaterial = new THREE.MeshPhongMaterial({
          map: texture,
          ...baseMaterialArgs,
          color:
            item.color || new THREE.Color().setHSL(Math.random(), 0.6, 0.6),
        });
      }
    } else {
      if (item.luminosity > 0) {
        dotmeshMaterial = baseGlowingMaterial.clone();
        dotmeshMaterial.color.copy(item.color);
        dotmeshMaterial.color.multiplyScalar(item.luminosity);
      } else {
        dotmeshMaterial = new THREE.MeshPhongMaterial(baseMaterialArgs);
        dotmeshMaterial.color.copy(
          item.color || new THREE.Color().setHSL(Math.random(), 0.6, 0.6)
        );
      }
    }

    const dotmesh = new THREE.Mesh(geometry, dotmeshMaterial);

    dotmesh.scale.set(actual_size_m, actual_size_m, actual_size_m);
    dotmesh.position.y = -actual_size_m * 0.25;
    group.add(dotmesh);

    const textMaterial =
      item.luminosity > 0
        ? baseGlowingMaterial.clone()
        : baseStandardTextMaterial.clone();
    if (item.luminosity > 0) {
      textMaterial.color.copy(item.color);
      textMaterial.color.multiplyScalar(item.luminosity);
    } else {
      textMaterial.color.copy(
        item.color || new THREE.Color().setHSL(Math.random(), 0.6, 0.6)
      );
    }

    const nameMesh = new THREE.Mesh(nameGeo, textMaterial);
    nameMesh.scale.set(item.scale, item.scale, item.scale);
    nameMesh.position.z = 0;
    nameMesh.position.y = actual_size_m * (i % 2 == 0 ? 0.15 : -2);
    group.add(nameMesh);

    const distanceMesh = new THREE.Mesh(distanceGeo, textMaterial);
    distanceMesh.scale.set(item.scale, item.scale, item.scale);
    distanceMesh.position.z = 0;
    distanceMesh.position.y = actual_size_m * (i % 2 == 0 ? 0.15 : -2);
    group.add(distanceMesh);
  }
  return scene;
}

function initPostProcessing(renderer, scene, camera) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(SCREEN_WIDTH, SCREEN_HEIGHT),
    0.5, // strength
    0, // radius
    0.4 // threshold
  );
  composer.addPass(bloomPass);
}

function updateRendererSizes() {
  SCREEN_WIDTH = window.innerWidth;
  SCREEN_HEIGHT = window.innerHeight;

  objects.logzbuf.renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  objects.logzbuf.camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
  objects.logzbuf.camera.updateProjectionMatrix();

  if (composer) {
    composer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  }
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

function render() {
  const firstItemActualSize = labeldata[0].size * labeldata[0].scale;
  const lastItemActualSize =
    labeldata[labeldata.length - 1].size *
    labeldata[labeldata.length - 1].scale;

  const minzoom = firstItemActualSize * 0.5;
  const maxzoom = lastItemActualSize * 50;
  let damping = Math.abs(zoomspeed) > minzoomspeed ? 0.95 : 1.0;

  const zoom = THREE.MathUtils.clamp(
    Math.pow(Math.E, zoompos),
    minzoom,
    maxzoom
  );
  zoompos = Math.log(zoom);

  if (
    (zoom <= minzoom && zoomspeed < 0) ||
    (zoom >= maxzoom && zoomspeed > 0)
  ) {
    damping = 0.85;
  }

  zoompos += zoomspeed;
  zoomspeed *= damping;

  objects.logzbuf.camera.position.x =
    Math.sin(0.5 * Math.PI * (mouse[0] - 0.5)) * zoom;
  objects.logzbuf.camera.position.y =
    Math.sin(0.25 * Math.PI * (mouse[1] - 0.5)) * zoom;
  objects.logzbuf.camera.position.z =
    Math.cos(0.5 * Math.PI * (mouse[0] - 0.5)) * zoom;
  objects.logzbuf.camera.lookAt(objects.logzbuf.scene.position);

  const currentRendererSize = new THREE.Vector2();
  objects.logzbuf.renderer.getSize(currentRendererSize);
  if (
    currentRendererSize.width !== SCREEN_WIDTH ||
    currentRendererSize.height !== SCREEN_HEIGHT
  ) {
    updateRendererSizes();
  }

  composer.render();
}

function onWindowResize() {
  updateRendererSizes();
}

function onMouseMove(ev) {
  mouse[0] = ev.clientX / window.innerWidth;
  mouse[1] = ev.clientY / window.innerHeight;
}

function onMouseWheel(ev) {
  const amount = ev.deltaY;
  if (amount === 0) return;
  const dir = amount / Math.abs(amount);
  zoomspeed = dir / 10;
  minzoomspeed = 0.001;
}

function onTouchStart(event) {
  if (event.touches.length === 2) {
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    lastTouchDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
  }
}

function onTouchMove(event) {
  if (event.touches.length === 2) {
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    const currentDistance = Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );

    if (lastTouchDistance > 0) {
      const delta = lastTouchDistance - currentDistance;
      zoomspeed = delta * 0.001;
      minzoomspeed = 0.001;
    }

    lastTouchDistance = currentDistance;
    event.preventDefault();
  }
}

function onTouchEnd() {
  lastTouchDistance = 0;
}
