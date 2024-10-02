import InitialPage from 'pages/InitialPage.vue';
const routes = [
  {
    path: '/', name: 'InitialPage',
    component: InitialPage
  },
   // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
];

export default routes;
