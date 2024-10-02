
<template>
  <q-layout view="hHh lpR fFf">

    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title>
          <q-avatar>
            <img src="https://cdn.quasar.dev/logo-v2/svg/logo-mono-white.svg">
          </q-avatar>
       Quasar-OBS
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <div class="row">
        <div class="col-lg-3"></div>
        <div class="col-lg-6 col-12">
          <router-view />

        </div>
        <div class="col-lg-3"></div>

      </div>



    </q-page-container>

  </q-layout>
</template>



<script>

</script>
