import { createApp } from 'vue'
import App from './App.vue'
import router from '@/framework/index'
import '@/styles/index.css'

createApp(App).use(router).mount('#app')
