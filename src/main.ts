import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import Varlet from '@varlet/ui'
import '@varlet/ui/es/style'
import { ComponentLibrary } from '@lexmin0412/wc-vue';

createApp(App)
.use(ComponentLibrary as any)
.use(Varlet)
.mount('#app')
