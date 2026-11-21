<script lang="ts" setup>
import AnnouncementLayout from "./AnnouncementLayout.vue";
import AnnouncementManagement from "./AnnouncementManagement.vue";
</script>

<template>
  <!--
    原型默认使用内存数据：平台预览常见于 srcdoc / origin=null，
    此时 localStorage 不可用或与真实站点数据混用，刷新后应回到初始 mock 数据。
  -->
  <AnnouncementLayout active="announcement">
    <AnnouncementManagement />
  </AnnouncementLayout>
</template>
