import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite';
import autoImport from 'unplugin-auto-import/vite'
import { AntDesignVueResolver, VarletUIResolver } from 'unplugin-vue-components/resolvers';

// https://vitejs.dev/config/
export default defineConfig({
	base: '/todo/',
	plugins: [
		vue({
			template: {
				compilerOptions: {
					// CustomElement 的判断函数，这里我们处理 lexmin 开头的标签
					isCustomElement: (tag) => tag.startsWith('lexmin'),
				},
			},
		}),
		Components({
			resolvers: [
				AntDesignVueResolver({
					importStyle: false,
				}),
				VarletUIResolver()
			],
		}),
		autoImport({
			resolvers: [VarletUIResolver({ autoImport: true })]
		})
	],
})
