<script lang="ts" setup>
/* eslint-disable vue/attribute-hyphenation */
import type { Group } from 'three'
import { useWindowSize } from '@vueuse/core'
import { gsap } from 'gsap'

const route = useRoute()
const { width } = useWindowSize()

const $number = useTemplateRef<Group | null>('number')
const $letterM = useTemplateRef<Group | null>('letterM')

const { isDark } = useDark()

const options = computed(() => {
  if (width.value >= 1280) {
    return {
      x: 0.33,
      numberPosition: [1.5, 2.5, 0],
      letterPosition: [-1.5, -2, 0],
      scale: 0.04
    } as const
  }

  return {
    x: 0.5,
    numberPosition: [-1, 6, 0],
    letterPosition: [-3, 3, 0],
    scale: 0.02
  } as const
})

// useLoop().onBeforeRender(({ elapsed }) => {
//   if ($canisterInternal.value) {
//     $canisterInternal.value.rotation.y = Math.PI / 4 - Math.sin(elapsed * 0.25) * Math.PI / 2
//   }
// })

useGSAP((isReducedMotion) => {
  if (!$number.value || !$letterM.value) {
    return
  }

  console.log(isReducedMotion)
  console.log('test')

  const $numberPosition = $number.value.position
  const $letterPosition = $letterM.value.position

  const $numberRotation = $number.value.rotation
  const $letterRotation = $letterM.value.rotation

  function animateScroll() {
    const $sections = document.querySelectorAll<HTMLElement>('[data-scene-position]')
    console.log($sections)

    $sections.forEach(($section) => {
      const position = $section.dataset.scenePosition
      const shouldRotate = !isReducedMotion && Boolean($section.dataset.sceneRotate)

      console.log(position)
      if (position === 'center' || position === 'top') {
        gsap.to([$numberPosition, $letterPosition], {
          y: position === 'center' ? 0 : 24,
          stagger: 0.05,
          ease: 'power2.inOut',
          repeatRefresh: true,
          scrollTrigger: {
            trigger: $section,
            start: position === 'center' ? 'top+=40% bottom' : 'top bottom',
            end: position === 'center' ? 'top+=90% bottom' : 'top+=50% bottom',
            scrub: true,
            invalidateOnRefresh: true
          }
        })
      }

      if (shouldRotate) {
        gsap.to([$numberRotation, $letterRotation], {
          y: `+=${Math.PI * 2}`,
          stagger: 0.05,
          ease: 'linear',
          repeatRefresh: true,
          scrollTrigger: {
            trigger: $section,
            start: 'top center',
            end: 'bottom center',
            scrub: 0.6,
            invalidateOnRefresh: true
          }
        })
      }
    })
  }

  // Intro animation
  if (!isReducedMotion && window.scrollY < 20) {
    gsap.fromTo([$numberPosition, $letterPosition], {
      y: -12
    }, {
      y: 0,
      delay: 0.3,
      duration: 1,
      stagger: 0.2,
      ease: 'power2.out',
      onComplete: animateScroll
    })
  } else {
    animateScroll()
  }
}, () => route.path)

// const fullRotation = () => {
//   const $numberRotation = $number.value.rotation
//   const $letterRotation = $letterM.value.rotation
//   gsap.to([$numberRotation, $letterRotation], {
//     y: `+=${Math.PI * 2}`,
//     stagger: 0.05,
//     duration: 0.8,
//     ease: 'power2.inOut'
//   })
// }
</script>

<template>
  <PageIndexTAbsoluteGroup :x="options.x" :distance="20">
    <TresGroup :position="options.numberPosition" :scale="options.scale/3">
      <Levioso>
        <TresGroup ref="$number">
          <PageIndexTLetterM :rotation="[0, 0, -Math.PI / 2]" />
        </TresGroup>
      </Levioso>
    </TresGroup>
    <TresGroup :position="options.letterPosition" :scale="options.scale">
      <Levioso>
        <TresGroup ref="$letterM">
          <PageIndexTLetterM :rotation="[0, 0, 0]" />
        </TresGroup>
      </Levioso>
    </TresGroup>
  </PageIndexTAbsoluteGroup>

  <TresMesh receive-shadow :position="[0, 0, -4]" :rotation="[0, 0, 0]">
    <TresPlaneGeometry :args="[400, 400, 10, 10]" />
    <TresMeshStandardMaterial :color="isDark ? '#000' : '#fff'" :roughness="0.45" :metalness="0.6" />
  </TresMesh>

  <TresDirectionalLight
    cast-shadow
    :position="[-8, 4, 20]"
    :intensity=".5"
    :shadow-mapSize-width="512"
    :shadow-mapSize-height="512"
    :shadow-camera-left="-16"
    :shadow-camera-right="16"
    :shadow-camera-top="16"
    :shadow-camera-bottom="-16"
    :color="0xFFFFFF"
  />

  <SoftShadows :size="50" :samples="10" />

  <Suspense>
    <Environment files="/textures/lobby.hdr" :environment-intensity="0.25" />
  </Suspense>
</template>
