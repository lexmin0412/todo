<script setup lang="ts">
import { createCalendar, viewDay, viewMonthAgenda, viewMonthGrid, viewWeek } from '@schedule-x/calendar'
import { createDragAndDropPlugin } from '@schedule-x/drag-and-drop'
import { createEventModalPlugin } from '@schedule-x/event-modal'
import '@schedule-x/theme-default/dist/index.css'
import dayjs from 'dayjs'
import { onMounted, ref, watch } from 'vue'
import { ScheduleXCalendar } from '@schedule-x/vue'
import { DataItem } from './../../types'

const props = defineProps(['data'])

const today = dayjs().format('YYYY-MM-DD')
const calendarApp = ref<any>(null)

const loadData = async () => {
    console.log('loadData', props.data)
    calendarApp.value = createCalendar({
        views: [viewMonthGrid, viewMonthAgenda, viewWeek, viewDay],
        datePicker: {
            selectedDate: today,
        },
        defaultView: viewWeek.name,
        events: props.data.map((item: DataItem) => {
            return {
                ...item,
                title: item.content,
                description: item.content,
                start: dayjs(item.lastUpdatedTime).format('YYYY-MM-DD HH:mm'),
                end: dayjs(item.lastUpdatedTime).format('YYYY-MM-DD HH:mm'),
                people: item.users,
                location: "China",
            }
        }),
        calendars: {
            leisure: {
                colorName: 'leisure',
                lightColors: {
                    main: '#1c7df9',
                    container: '#d2e7ff',
                    onContainer: '#002859',
                },
                darkColors: {
                    main: '#c0dfff',
                    onContainer: '#dee6ff',
                    container: '#426aa2',
                },
            },
        },
        plugins: [createDragAndDropPlugin(), createEventModalPlugin()]
    })
}

watch(()=>props.data, async (newData, oldData) => {
    loadData()
})

onMounted(() => {
    loadData()
})
</script>

<template>
    <div v-if="calendarApp">
        <ScheduleXCalendar :calendar-app="calendarApp" />
    </div>
    <div v-else></div>
</template>