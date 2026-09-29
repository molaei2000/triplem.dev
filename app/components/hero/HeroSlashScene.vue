<script setup lang="ts">
/**
 * The /// mark, loaded from the Blender export (public/models/triplem-slash.glb).
 * Lives inside <TresCanvas>. All per-frame work happens in onBeforeRender:
 * no Vue reactivity in the hot path, only plain-object reads.
 */
import { useGLTF } from "@tresjs/cientos";
import { useLoop, useTres } from "@tresjs/core";
import {
    Color,
    Group,
    type Mesh,
    type MeshStandardMaterial,
    PMREMGenerator,
    Raycaster,
    Vector2,
    Vector3,
    type WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { SlashInput } from "~/lib/slash-input";

const props = defineProps<{ input: SlashInput; dark: boolean; reduced: boolean; active: boolean }>();
const emit = defineEmits<{ hover: [index: number, tap: boolean] }>();

// Warm key, gold rim, cool fill.
const cameraPosition = new Vector3(0, 0, props.input.distance);
const lights = [
    { position: new Vector3(-4, 4, 6), intensity: 2.4, color: "#FFF7EB" },
    { position: new Vector3(5, 1.5, -3), intensity: 1.4, color: "#FFD79A" },
    { position: new Vector3(3, -2.5, 6), intensity: 0.45, color: "#D9E4FF" },
];

const { state } = useGLTF("/models/triplem-slash.glb");
const { renderer, scene, camera } = useTres();
const { onBeforeRender, start, stop } = useLoop();

const root = new Group();
const meshes: Mesh[] = [];
const mats: MeshStandardMaterial[] = [];
const base: { y: number; z: number }[] = [];
const lift = [0, 0, 0];
const dim = [0, 0, 0];

// Ivory / charcoal outer slashes, gold middle — per theme.
const PALETTE = {
    dark: { outer: new Color("#F2EFE8"), outerRough: 0.45, gold: new Color("#C8A45C"), goldRough: 0.3, env: 1 },
    light: { outer: new Color("#1B1A17"), outerRough: 0.38, gold: new Color("#8F6F2E"), goldRough: 0.28, env: 1.35 },
};
const tmp = new Color();

function applyTheme() {
    const p = props.dark ? PALETTE.dark : PALETTE.light;
    mats.forEach((m, i) => {
        const isGold = i === 1;
        m.userData.base = (isGold ? p.gold : p.outer).clone();
        m.roughness = isGold ? p.goldRough : p.outerRough;
        m.metalness = isGold ? 1 : 0;
        m.envMapIntensity = p.env;
    });
}

// Offline studio reflections — no HDR download.
let envReady = false;
function setupEnvironment() {
    if (envReady || !scene.value) return;
    const pmrem = new PMREMGenerator(renderer as unknown as WebGLRenderer);
    scene.value.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    envReady = true;
}

watch(state, (gltf) => {
    if (!gltf?.scene || meshes.length) return;
    // glTF root "TripleSlash" carries the Blender stand-up rotation; children are Slash_L/M/R.
    const found = ["Slash_L", "Slash_M", "Slash_R"]
        .map(n => gltf.scene.getObjectByName(n) as Mesh | undefined)
        .filter((m): m is Mesh => !!m);
    found.forEach((mesh) => {
        const mat = (mesh.material as MeshStandardMaterial).clone();
        mesh.material = mat;
        meshes.push(mesh);
        mats.push(mat);
        base.push({ y: mesh.position.y, z: mesh.position.z });
    });
    root.add(gltf.scene);
    applyTheme();
    setupEnvironment();
}, { immediate: true });

watch(() => props.dark, applyTheme);
watch(() => props.active, v => (v ? start() : stop()));

const ray = new Raycaster();
const ndc = new Vector2();
let t0 = -1;
let hovered = -1;
let yaw = 0;
let pitch = 0;
let split = 0;

onBeforeRender(({ delta, elapsed }) => {
    if (!meshes.length) return;
    if (t0 < 0) t0 = elapsed;
    const inp = props.input;
    const k = Math.min(1, delta * 60); // frame-rate independent easing factor
    const ease = (a: number, b: number, f: number) => a + (b - a) * (props.reduced ? 1 : Math.min(1, f * k));

    // Drag momentum, then a slow spring back home.
    if (!inp.dragging) {
        inp.dragYaw += inp.velocity;
        inp.velocity *= 0.94;
        inp.dragYaw *= 0.985;
        inp.dragPitch *= 0.97;
    }
    split = ease(split, inp.split ? 1 : 0, 0.07);
    const sway = props.reduced || !inp.touch ? 0 : Math.sin(elapsed * 0.35) * 0.22;
    yaw = ease(yaw, sway + inp.px * 0.3 + inp.dragYaw + split * 0.7, 0.08);
    pitch = ease(pitch, -inp.py * 0.18 + inp.dragPitch + split * 0.14, 0.08);
    root.rotation.set(pitch, yaw, 0);

    // Hover picking (fine pointers only; touch picks on tap in the stage).
    if (inp.pick) {
        inp.pick = false;
        let hit = -1;
        const cam = camera.value;
        if (cam && inp.inside) {
            ndc.set(inp.px, -inp.py);
            ray.setFromCamera(ndc, cam);
            const first = ray.intersectObjects(meshes, false)[0];
            hit = first ? meshes.indexOf(first.object as Mesh) : -1;
        }
        if (hit !== hovered || inp.tap) {
            hovered = hit;
            emit("hover", hit, inp.tap);
            inp.tap = false;
        }
    }
    const active = inp.selected >= 0 ? inp.selected : hovered;

    meshes.forEach((mesh, i) => {
        const intro = props.reduced ? 1 : Math.min(1, Math.max(0, (elapsed - t0 - 0.35 - i * 0.14) / 0.9));
        const k3 = 1 - (1 - intro) ** 3;
        lift[i] = ease(lift[i]!, active === i ? 1 : 0, 0.12);
        dim[i] = ease(dim[i]!, active >= 0 && active !== i ? 1 : 0, 0.1);
        const float = props.reduced ? 0 : Math.sin(elapsed * 0.9 + i * 1.7) * 0.045;
        // Parent is rotated +90° on X: world +z (toward camera) = local +y, world +y = local -z.
        const towardCamera = (i - 1) * 1.35 * split + lift[i]! * 0.4;
        const up = float - (1 - k3) * 1.4;
        mesh.position.y = base[i]!.y + towardCamera;
        mesh.position.z = base[i]!.z - up;
        const m = mats[i]!;
        tmp.copy(m.userData.base as Color).multiplyScalar(1 - 0.45 * dim[i]! - 0.4 * (1 - k3));
        m.color.copy(tmp);
        m.emissive.copy(m.userData.base as Color).multiplyScalar(0.06 * lift[i]!);
    });
});

onBeforeUnmount(() => {
    mats.forEach(m => m.dispose());
    scene.value?.environment?.dispose();
});
</script>

<template>
    <TresPerspectiveCamera :position="cameraPosition" :fov="30" />
    <TresAmbientLight :intensity="0.15" />
    <TresDirectionalLight v-for="(l, i) in lights" :key="i" :position="l.position" :intensity="l.intensity" :color="l.color" />
    <primitive :object="root" />
</template>
