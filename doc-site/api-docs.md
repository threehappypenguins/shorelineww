---
layout: page
title: API Documentation
---

<script setup>
import { ref, onMounted } from 'vue'

const iframeHeight = ref('800px')
const iframeRef = ref(null)

onMounted(() => {
  // Adjust iframe height based on viewport
  iframeHeight.value = `${window.innerHeight - 150}px`
  window.addEventListener('resize', () => {
    iframeHeight.value = `${window.innerHeight - 150}px`
  })
})
</script>

# API Documentation

<div class="api-frame-container">
  <iframe 
    src="./api/index.html" 
    :style="{ height: iframeHeight }"
    class="api-frame"
    frameborder="0"
  ></iframe>
</div>

<style>
.api-frame-container {
  width: 100%;
  margin-top: 1rem;
}

.api-frame {
  width: 100%;
  min-height: 600px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
}
</style>
