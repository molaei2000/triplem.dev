<template>
  <footer class="relative z-20 bg-black text-white" v-bind="getSceneAttributes({ position: 'top' })">
    <div class="flex justify-between">
      <div class="w-2/3 flex items-center">
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. A voluptate est sapiente ratione impedit itaque
          necessitatibus, esse officiis expedita possimus et rem iure minima aliquam quibusdam exercitationem sint,
          fuga, nisi quam maxime cumque repudiandae voluptatem explicabo. Doloremque eligendi vero doloribus, qui nam
          labore similique error maiores deserunt aliquam repellendus dignissimos sunt quod quos quis fuga ea deleniti
          placeat numquam rem ut tempore reiciendis. Labore fuga possimus veniam quam iusto ut tempora nostrum deleniti
          doloribus vitae asperiores ad aliquam temporibus, ea natus! Voluptas eaque est, ad animi, ducimus numquam
          molestiae fugit odio tempora maiores pariatur sequi ex magni, repudiandae dolor consectetur.
        </p>
      </div>
      <SlideIn class="bounded rich-text min-h-svh flex flex-col mix-blend-difference">
        <h2>
          <BrandSignature />
        </h2>
        <p>Lorem, ipsum dolor sit amet consectetur adipisicing elit. Dicta, corrupti!</p>
        <hr class="flex-1 border-none">
        <p>Lorem, ipsum dolor sit amet consectetur adipisicing elit. Dicta, corrupti!</p>
      </SlideIn>
    </div>
  </footer>
</template>
