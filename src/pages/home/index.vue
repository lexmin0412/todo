<script setup lang="ts">
import { ref, reactive } from "vue";
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
  console.log("currentTheme", currentTheme);
}

const loading = ref(false);
const finished = ref(false);
const list = ref<Array<DataItem>>([]);

const popoverShow = ref(false);
let ossClient = ref<OSSClient>();

const fetchList = async (ossClient: OSSClient) => {
  const result = await ossClient?.getList();
  list.value = JSON.parse(result.content.toString()).list;
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
  console.log(`the component is now mounted.`);
  initOSSClient()
});

const handleSubmit = async () => {
  await ossClient.value?.add({
    id: `${Math.random()}`,
    content: formData.inputValue,
    done: false
  });
  fetchList(ossClient.value as OSSClient);
  popoverShow.value = false;
};

const formData = reactive({
  inputValue: "",
});
const form = ref(null);

const toggleCheck = async (item: DataItem) => {

  await ossClient.value?.update(item.id, {
    content: item.content,
    done: !item.done,
  });
  fetchList(ossClient.value as OSSClient);
};

const handleDelete = async (item: DataItem) => {
  console.log("handleDelete", item);
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
const refresh = async() => {
  await fetchList(ossClient.value as OSSClient)
  isRefresh.value = false
}
// 下拉刷新 end
</script>

<template>
  <var-pull-refresh v-model="isRefresh" @refresh="refresh">
    <div class="h-screen overflow-hidden flex flex-col">
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

      <div class="flex-1 overflow-auto">
        <var-list :finished="finished" v-model:loading="loading">
          <var-cell :key="item" v-for="item in list">
            <div class="flex items-center">
              <var-checkbox v-model="item.done" @change="toggleCheck(item)"></var-checkbox>
              <div class="flex-1 ellipsis-single">
                {{ item.content }}
              </div>
              <var-icon name="delete" @click="handleDelete(item)" />
            </div>
          </var-cell>
        </var-list>
      </div>

      <var-popup position="bottom" v-model:show="popoverShow">
        <div class="flex items-center px-4 py-4">
          <var-form @submit="handleSubmit" class="w-full" ref="form" scroll-to-error="start">
            <var-input autoFocus class="w-full" variant="outlined" placeholder="输入待办内容" clearable
              v-model="formData.inputValue" textarea :rules="[(v) => v.length > 0 || '文本不能为空']" />

            <var-button class="mt-4" block type="primary" native-type="submit">
              提交
            </var-button>
          </var-form>
        </div>
      </var-popup>

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

      <!-- 浮动操作按钮 -->
      <var-fab type="primary" @click="popoverShow = true" />

			<LexminFooter />
    </div>
  </var-pull-refresh></template>
