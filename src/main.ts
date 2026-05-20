import { createApp } from 'vue'
import App from './App.vue'
import router from '@/framework/router'
import '@/styles/index.css'

createApp(App).use(router).mount('#app')
