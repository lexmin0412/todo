<script setup lang="ts">
import {ref, reactive} from "vue";
import {StyleProvider, Themes} from "@varlet/ui";
import {onMounted} from "vue";
import OSSClient from "../../utils/oss";
import {Dialog, Snackbar} from "@varlet/ui";
import { DataItem } from '../../types'

let currentTheme: any = null;

function toggleTheme() {
  currentTheme = currentTheme ? null : Themes.dark;
  StyleProvider(currentTheme);
  console.log("currentTheme", currentTheme);
}

const loading = ref(false);
const finished = ref(false);
const list = ref<Array<DataItem>([]);

const popoverShow = ref(false);
let ossClient = ref(null);

const fetchList = async (ossClient: OSSClient) => {
  const result = await ossClient?.getList();
  console.log("result", result.content.toString());
  list.value = JSON.parse(result.content.toString()).list;
  finished.value = true;
  loading.value = false;
};

onMounted(async () => {
  console.log(`the component is now mounted.`);
  const ossConfig = JSON.parse(localStorage.getItem("oss-config") as string);
  ossClient.value = new OSSClient(ossConfig);
  fetchList(ossClient.value);
});

const handleSubmit = async () => {
  await ossClient.value?.add({
    id: Math.random(),
    content: formData.inputValue,
  });
  fetchList(ossClient.value);
  popoverShow.value = false;
};

const formData = reactive({
  inputValue: "",
});
const form = ref(null);

const toggleCheck = async (item) => {
  console.log("toggleCheck", item.id, item.done);
  await ossClient.value?.update(item.id, {
    done: !item.done,
  });
  fetchList(ossClient.value);
};

const handleDelete = async (item) => {
  console.log("handleDelete", item);
  const action = await Dialog({
    title: "删除待办",
    message: "操作后数据将无法恢复！",
  });
  if (action === "confirm") {
    await ossClient.value?.delete(item.id);
    fetchList(ossClient.value);
    Snackbar.success("删除成功");
  }
};
</script>

<template>
  <div class="h-screen overflow-hidden flex flex-col">
    <var-app-bar title="待办清单">
      <template #left>
        <div class="flex mr-2">
          <img
            class="block w-8 h-8 rounded-2xl"
            src="https://lexmin.oss-cn-hangzhou.aliyuncs.com/statics/common/24385370.jpeg"
          />
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
            <var-icon
              v-if="currentTheme === null"
              name="white-balance-sunny"
              @click="toggleTheme"
            />
            <var-icon v-else name="weather-night" @click="toggleTheme" />
          </var-button>
        </var-menu>
      </template>
    </var-app-bar>

    <div class="flex-1 overflow-auto">
      <var-list :finished="finished" v-model:loading="loading">
        <var-cell :key="item" v-for="item in list">
          <div class="flex items-center">
            <var-checkbox
              v-model="item.done"
              @change="toggleCheck(item)"
            ></var-checkbox>
            <div class="flex-1 ellipsis-single">
              {{ item.content }}
            </div>
            <var-icon name="delete" @click="handleDelete(item)" />
          </div>
        </var-cell>
      </var-list>
    </div>

    <var-popup position="bottom" v-model:show="popoverShow">
      <div
        class="flex items-center bg-white px-4 py-4 border-0 border-t border-solid border-t-[#eff0f5]"
      >
        <var-form
          @submit="handleSubmit"
          class="w-full"
          ref="form"
          scroll-to-error="start"
        >
          <var-input
            autoFocus
            class="w-full"
            variant="outlined"
            placeholder="输入待办内容"
            clearable
            v-model="formData.inputValue"
            textarea
            :rules="[(v) => v.length > 0 || '文本不能为空']"
          />

          <var-button class="mt-4" block type="primary" native-type="submit">
            提交
          </var-button>
        </var-form>
      </div>
    </var-popup>

    <!-- 浮动操作按钮 -->
    <var-fab type="primary" @click="popoverShow = true" />
  </div>
</template>
