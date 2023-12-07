<script setup lang="ts">
import { ref, reactive } from "vue";
import dayjs from 'dayjs'
import { StyleProvider, Themes } from "@varlet/ui";
import { onMounted } from "vue";
import OSSClient from "../../utils/oss";
import { Dialog, Snackbar } from "@varlet/ui";
import { LexminFooter } from "@lexmin0412/wc-vue";
import { DataItem } from "../../types";

let currentTheme: any = null;

function toggleTheme() {
  currentTheme = currentTheme ? null : Themes.dark;
  StyleProvider(currentTheme);
}

const TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

const loading = ref(false);
const finished = ref(false);
const list = ref<{
	unDone: Array<DataItem>
	done: Array<DataItem>
}>({
	unDone: [],
	done: []
});

const popoverShow = ref(false);
let ossClient = ref<OSSClient>();

const fetchList = async (ossClient: OSSClient, type?: DataItem['type']) => {
  const result = await ossClient?.getList();
  const fullList = JSON.parse(result.content.toString()).list
  const compareType = type || active.value
	const displayList = (fullList as DataItem[])?.filter((item: DataItem) => {
    return item.type === compareType
  }).sort((prev, cur)=>{
    return dayjs(prev.lastUpdatedTime).isBefore(dayjs(cur.lastUpdatedTime)) ? 1 : -1
  })
  list.value.done = displayList.filter((item)=>item.done)
	list.value.unDone = displayList.filter((item)=>!item.done)
  finished.value = true;
  loading.value = false;
};

const initOSSClient = () => {
  const ossConfig = JSON.parse(localStorage.getItem("oss-config") as string);
  if (!ossConfig) {
    configPopupVisible.value = true
  }
  ossClient.value = new OSSClient(ossConfig);
  fetchList(ossClient.value);
}

onMounted(async () => {
  initOSSClient()
});

const handleSubmit = async (success: boolean) => {
  if (!success) {
    return
  }
  if (formData.id) {
    await ossClient.value?.update(formData.id, {
      content: formData.inputValue,
      type: formData.type as DataItem['type'],
      done: formData.done || false,
      createdTime: formData.createdTime,
      lastUpdatedTime: dayjs().format(TIME_FORMAT)
    });
  } else {
    await ossClient.value?.add({
      id: `${Math.random()}`,
      content: formData.inputValue,
      type: formData.type as DataItem['type'],
      done: formData.done || false,
      createdTime: dayjs().format(TIME_FORMAT),
      lastUpdatedTime: dayjs().format(TIME_FORMAT)
    });
  }
  fetchList(ossClient.value as OSSClient);
  closeEditPopup()
};

const formData = reactive<{
  id: string | undefined
  inputValue: string
  type: DataItem['type'] | undefined
  done: boolean,
  createdTime: string
  lastUpdatedTime: string
}>({
  id: undefined,
  inputValue: "",
  type: undefined,
  done: false,
  createdTime: '',
  lastUpdatedTime: ''
});
const form = ref(null);

const closeEditPopup = () => {
  popoverShow.value = false;
  formData.id = undefined
  formData.inputValue = ''
  formData.type = undefined
  formData.done = false
  formData.createdTime = ''
  formData.lastUpdatedTime = ''
}

const toggleCheck = async (item: DataItem) => {

  await ossClient.value?.update(item.id, {
    content: item.content,
    done: !item.done,
    type: item.type,
    createdTime: item.createdTime,
    lastUpdatedTime: item.lastUpdatedTime,
  });
  fetchList(ossClient.value as OSSClient);
};

const handleDelete = async (item: DataItem) => {
  const action = await Dialog({
    title: "删除待办",
    message: "操作后数据将无法恢复！",
  });
  if (action === "confirm") {
    await ossClient.value?.delete(item.id);
    fetchList(ossClient.value as OSSClient);
    Snackbar.success("删除成功");
  }
};

// 配置弹出框 start
const configPopupVisible = ref(false)
const configForm = ref(null)
const configFormData = reactive({
  region: "",
  bucket: "",
  accessKeyId: "",
  accessKeySecret: ""
});
const handleConfigSubmit = async (isValid: boolean) => {
  if (!isValid) {
    return
  }
  localStorage.setItem('oss-config', JSON.stringify({
    ...configFormData
  }))
  initOSSClient()
  configPopupVisible.value = false;
}
// 配置弹出框 end

// 下拉刷新 start
const isRefresh = ref(false)
const refresh = async () => {
  await fetchList(ossClient.value as OSSClient)
  isRefresh.value = false
}
// 下拉刷新 end

// tab 切换 start
const active = ref('work')

const handleTabChange = (newTab: string | number) => {
  fetchList(ossClient.value as OSSClient, newTab as DataItem['type'])
}
// tab 切换 end

const value = ref('work')

const handleItemClick = (item: DataItem) => {
  popoverShow.value = true
  formData.id = item.id
  formData.inputValue = item.content
  formData.type = item.type
  formData.done = item.done
}
</script>

<template>
  <var-pull-refresh v-model="isRefresh" @refresh="refresh">
    <div class="h-screen overflow-hidden flex flex-col">
      <!-- 头部 start -->
      <var-app-bar title="待办清单">
        <template #left>
          <div class="flex mr-2">
            <img class="block w-8 h-8 rounded-2xl"
              src="https://lexmin.oss-cn-hangzhou.aliyuncs.com/statics/common/24385370.jpeg" />
            <!-- <var-button
                color="transparent"
                text-color="#fff"
                round
                text
              >
                <var-icon name="chevron-left" :size="24" />
              </var-button> -->
          </div>
        </template>

        <template #right>
          <var-menu>
            <var-button color="transparent" text-color="#fff" round text>
              <var-icon v-if="currentTheme === null" name="white-balance-sunny" @click="toggleTheme" />
              <var-icon v-else name="weather-night" @click="toggleTheme" />
            </var-button>
          </var-menu>
        </template>
      </var-app-bar>
      <!-- 头部 end -->

      <!-- Tab 切换 start -->
      <var-tabs v-model:active="active" @change="handleTabChange">
        <var-tab name='work'>工作</var-tab>
        <var-tab name="life">生活</var-tab>
      </var-tabs>
      <!-- Tab 切换 end -->

      <!-- 列表 start -->
      <div class="flex-1 overflow-auto">
				<div class="px-3 pt-3 font-semibold">待办</div>
        <var-list :finished="finished" v-model:loading="loading">
          <var-cell :key="item" v-for="item in list.unDone">
            <div class="flex items-center">
              <var-checkbox v-model="item.done" @change="toggleCheck(item)"></var-checkbox>
              <div class="flex-1 ellipsis-single" @click="() => handleItemClick(item)">
                {{ item.content }}
              </div>
              <var-icon name="delete" @click="handleDelete(item)" />
            </div>
          </var-cell>
        </var-list>

				<div class="px-3 pt-3 font-semibold">已办</div>
				<var-list :finished="finished" v-model:loading="loading">
					<var-cell :key="item" v-for="item in list.done">
						<div class="flex items-center">
							<var-checkbox v-model="item.done" @change="toggleCheck(item)"></var-checkbox>
							<div class="flex-1 ellipsis-single" @click="() => handleItemClick(item)">
								{{ item.content }}
							</div>
							<var-icon name="delete" @click="handleDelete(item)" />
						</div>
					</var-cell>
				</var-list>
      </div>
      <!-- 列表 end -->

      <!-- 新建事项 Popup start -->
      <var-popup position="bottom" v-model:show="popoverShow" @close="closeEditPopup">
        <div class="flex items-center px-4 py-4">
          <var-form @submit="handleSubmit" class="w-full" ref="form" scroll-to-error="start">
            <var-input autoFocus class="w-full" variant="outlined" placeholder="输入待办内容" clearable
              v-model="formData.inputValue" textarea :rules="[(v) => v.length > 0 || '文本不能为空']" />

            <var-select placeholder="请选择类型" v-model="formData.type" clearable :rules="[(v) => !!v || '类型不能为空']">
              <var-option value="work" label="工作" />
              <var-option value="life" label="生活" />
            </var-select>

            <var-button class="mt-4" block type="primary" native-type="submit">
              提交
            </var-button>
          </var-form>
        </div>
      </var-popup>
      <!-- 新建事项 Popup end -->

      <!-- OSS 配置 Popup start -->
      <var-popup position="bottom" :close-on-click-overlay="false" v-model:show="configPopupVisible">
        <div class="flex items-center px-4 py-4">
          <var-form @submit="handleConfigSubmit" class="w-full" ref="configForm" scroll-to-error="start">
            <var-select placeholder="请选择地域" v-model="configFormData.region" :rules="[(v) => !!v || '地域不能为空']">
              <var-option label="杭州" value="oss-cn-hangzhou" />
              <var-option label="深圳" value="oss-cn-shenzhen" />
              <var-option label="上海" value="oss-cn-shanghai" />
              <var-option label="北京" value="oss-cn-beijing" />
            </var-select>
            <var-input placeholder="请输入 bucket" clearable v-model="configFormData.bucket"
              :rules="[(v) => !!v || 'bucket 不能为空']" />
            <var-input placeholder="请输入 accesskeyId" clearable v-model="configFormData.accessKeyId"
              :rules="[(v) => !!v || 'accessKeyId 不能为空']" />
            <var-input placeholder="请输入 accesskeySecret" clearable v-model="configFormData.accessKeySecret"
              :rules="[(v) => !!v || 'accessKeySecret 不能为空']" />
            <var-button class="mt-4" block type="primary" native-type="submit">
              提交
            </var-button>
          </var-form>
        </div>
      </var-popup>
      <!-- OSS 配置 Popup end -->

      <!-- 浮动操作按钮 -->
      <var-fab type="primary" @click="popoverShow = true" />

      <!-- 固定底部 -->
      <LexminFooter />
    </div>
  </var-pull-refresh>
</template>
