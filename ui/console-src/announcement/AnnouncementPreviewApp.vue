<script lang="ts" setup>
import AnnouncementLayout from "./AnnouncementLayout.vue";
import AnnouncementManagement from "./AnnouncementManagement.vue";
</script>

<template>
  <AnnouncementLayout active="announcement">
    <AnnouncementManagement persistent />
  </AnnouncementLayout>
</template>
