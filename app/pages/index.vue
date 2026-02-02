<script setup lang="ts">
definePageMeta({
  layout: 'blank'
})

const totalItems = useState('totalItems', () => 0)
</script>

<template>
  <div>
    <AppHeader class="fixed top-0 left-0 right-0 z-10" />
    <main>
      <SlideIn
        v-bind="getSceneAttributes({
          position: 'center',
          model: '800'
        })"
        class="bounded rich-text flex flex-col justify-center h-screen"
      >
        <h1 class="">
          Welcome to Our Website
        </h1>
        <p class="mt-4">
          Discover amazing content and connect with our community.
        </p>
        <UButton class="mt-8" @click="totalItems++">
          Get Started
        </UButton>
      </SlideIn>
      <div
        v-bind="getSceneAttributes({
          position: 'right',
          model: '800'
        })"
        class="h-screen"
      >
        <!-- Your content -->
      </div>
      <div
        v-bind="getSceneAttributes({
          position: 'right',
          model: '800'
        })"
        class="h-screen"
      >
        <!-- Your content -->
      </div>

      <div
        v-bind="getSceneAttributes({
          position: 'top-right'
        })"
        class="rich-text flex flex-col bg-black justify-center h-screen"
      />

      <div
        v-bind="getSceneAttributes({
          position: 'center-left',
          model: '200'
        })"
        class="h-screen"
      >
        <!-- Your content -->
      </div>
      <div
        v-bind="getSceneAttributes({
          position: 'left',
          model: '200'
        })"
        class="h-screen"
      >
        <!-- Your content -->
      </div>
    </main>
    <AppFooter />
    <PageIndexTCanvas class="fixed top-0 left-0 right-0 h-lvh -z-1">
      <PageIndexTScene />
    </PageIndexTCanvas>
  </div>
</template>
