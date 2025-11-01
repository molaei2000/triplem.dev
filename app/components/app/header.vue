<script setup lang="ts">
import logo from '~~/public/mmm.png'
</script>

<template>
  <UHeader>
    <template #right>
      <ColorModeButton />
    </template>
    <template #left>
      MMM
    </template>

    <div class="flex justify-center">
      <PillNav
        :logo="logo"
        logo-alt="Company Logo"
        :items="[
          { label: 'Home', href: '/' },
          { label: 'Articles', href: '/articles' },
          { label: 'Contact', href: '/contact' }
        ]"
        active-href="/"
        class="custom-nav"
        ease="power2.easeOut"
        base-color="#000000"
        pill-color="#ffffff"
        hovered-pill-text-color="#ffffff"
        pill-text-color="#000000"
      />
    </div>
  </UHeader>
</template>
