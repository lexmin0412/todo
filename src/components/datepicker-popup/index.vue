<script setup lang="ts">
import {ref, computed} from "vue";
import dayjs from 'dayjs'
// 写一个
const props = defineProps([
	'text',
	'modelValue',
])
const emit = defineEmits(['update:modelValue'])
const open = ref(false);
const date = ref(dayjs(props.modelValue).format('YYYY-MM-DD'))
const time = ref(dayjs(props.modelValue).format('HH:mm') || '09:00')
const handleConfirm = () => {
	console.log('confirm', date.value, time.value)
	emit('update:modelValue', `${date.value} ${time.value}`)
	open.value = false
}
const buttonText = computed(()=>{
	return props.modelValue ? `${props.modelValue}` : `请选择${props.text}`
})
</script>

<template>
  <var-button class="my-3" type="default" block @click="open = true"> {{buttonText}} </var-button>

	<var-popup v-model:show="open" position="bottom">
    <var-date-picker v-model="date" />
		<var-time-picker v-model="time" />

		<div class="flex">
			<var-button type="default" block @click="open = false"> 取 消  </var-button>
			<var-button type="primary" block @click="handleConfirm"> 确 定 </var-button>
		</div>
  </var-popup>
</template>
