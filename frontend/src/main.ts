import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import router from './router'
import vuetify from './plugins/vuetify';
import { firestorePlugin } from "vuefire"

Vue.config.productionTip = false
Vue.use(firestorePlugin)

new Vue({
  router,
// @ts-ignore
  vuetify,
  render: h => h(App)
}).$mount('#app')
