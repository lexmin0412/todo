export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
	'postcss-px-to-viewport': {
		viewportWidth: 375,
		unitPrecision: 6,
		unitToConvert: 'px',
		propList: ['*'],
	}
}
