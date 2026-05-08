<script lang="ts" setup>

</script>

<template>
  <div class="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-8">
    <!-- about me section -->
    <div class="flex flex-col items-start justify-center gap-4 w-5/6 mx-auto">
      <h1 class="text-2xl font-bold">
        About me
      </h1>
      <p>
        Senior Front-End Developer and Front-End Team Lead with over five years of professional
        experience in designing and developing modern, responsive, and scalable user interfaces.
        My primary expertise lies in the Vue.js ecosystem, particularly Vue.js and Nuxt.js, with
        proven experience in delivering structured, maintainable, and user-focused web
        applications across both local and international projects.
        I have strong proficiency in JavaScript, HTML, and CSS, along with hands-on experience
        using tools and frameworks such as Tailwind, Vuetify, and TypeScript. I am highly detailoriented,
        committed to code quality and best practices, and capable of contributing
        effectively to both technical execution and architectural decision-making within
        development teams.
      </p>
    </div>
    <div class="flex items-center justify-center py-4">
      <ProfileCard
        name="Mohammad.M Molaei"
        title="Front-end developer"
        avatar-url="/assets/me22.png"
        icon-url="/assets/iconpattern.png"
        grain-url="/assets/grain.webp"
        :show-user-info="false"
        :show-behind-gradient="true"
        :enable-tilt="true"
      />
    </div>
  </div>
</template>

<style lang="css" scoped>

</style>
