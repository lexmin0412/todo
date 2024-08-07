<script setup lang="ts">
import {ref, reactive} from "vue";
import dayjs from "dayjs";
import {StyleProvider, Themes, Dialog, Snackbar, ActionSheet} from "@varlet/ui";
import {onMounted} from "vue";
import OSSClient from "../../utils/oss";
import {LexminFooter} from "@lexmin0412/wc-vue";
import Schedule from "./../../components/schedule/index.vue";
import DatepickerPopup from "./../../components/datepicker-popup/index.vue";
import {DataItem, UserCode, UserItem, ListWithUserItems} from "../../types";

const currentTheme = ref();

function toggleTheme() {
  currentTheme.value = currentTheme.value ? null : Themes.dark;
  StyleProvider(currentTheme.value);
}

function toggleViewMode() {
  if (viewMode.value === "list") {
    viewMode.value = "calender";
  } else {
    viewMode.value = "list";
  }
}

const TIME_FORMAT = "YYYY-MM-DD HH:mm:ss";

const viewMode = ref<"list" | "calender">("list");

const loading = ref(false);
const finished = ref(false);
const list = ref<{
  unDone: ListWithUserItems;
  done: ListWithUserItems;
}>({
  unDone: [],
  done: [],
});

const popoverShow = ref(false);
let ossClient = ref<OSSClient>();

const fetchList = async (ossClient: OSSClient, type?: DataItem["type"]) => {
	let result
	try {
		result = await ossClient?.getList();
	} catch (error) {
		console.error('获取待办列表失败', error)
		return
	}
  const fullList = JSON.parse(result.content.toString()).list;
  const compareType = type || activeTab.value;
  const displayList: ListWithUserItems = (fullList as DataItem[])
    ?.filter((item: DataItem) => {
      return item.type === compareType;
    })
    .sort((prev, cur) => {
      return dayjs(prev[currentSort.value]).isBefore(
        dayjs(cur[currentSort.value])
      )
        ? 1
        : -1;
    })
    .map((item) => {
      return {
        ...item,
        userItems: item.users?.map((userCode) => {
          return userList.value.find((ele) => ele.code === userCode);
        }) as UserItem[],
      };
    });
  list.value.done = displayList.filter((item) => item.done);
  list.value.unDone = displayList.filter((item) => !item.done);
  finished.value = true;
  loading.value = false;
};

const userList = ref<UserItem[]>([]);
const fetchUsers = async (ossClient: OSSClient) => {
	let result
	try {
		result = await ossClient?.getUsers();
	} catch (error) {
		console.error('获取用户列表失败', error)
		return
	}
  const parsedList = JSON.parse(result.content.toString()).list;
  userList.value = parsedList;
};

const initOSSClient = async () => {
  const ossConfig = JSON.parse(localStorage.getItem("oss-config") as string);
  if (!ossConfig) {
    configPopupVisible.value = true;
  }
  ossClient.value = new OSSClient(ossConfig);
  await fetchUsers(ossClient.value);
  fetchList(ossClient.value);
};

onMounted(async () => {
  initOSSClient();
});

const handleSubmit = async (success: boolean) => {
  if (!success) {
    return;
  }
  if (formData.id) {
    await ossClient.value?.update(formData.id, {
      content: formData.inputValue,
      type: formData.type as DataItem["type"],
      done: formData.done || false,
      startTime: formData.startTime,
      endTime: formData.endTime,
      createdTime: formData.createdTime,
      lastUpdatedTime: dayjs().format(TIME_FORMAT),
      users: formData.users,
    });
  } else {
    await ossClient.value?.add({
      id: `${Math.random()}`,
      content: formData.inputValue,
      type: formData.type as DataItem["type"],
      done: formData.done || false,
      createdTime: dayjs().format(TIME_FORMAT),
      lastUpdatedTime: dayjs().format(TIME_FORMAT),
      users: formData.users,
      startTime: formData.startTime,
      endTime: formData.endTime,
    });
  }
  fetchList(ossClient.value as OSSClient);
  closeEditPopup();
};

const formData = reactive<{
  id: string | undefined;
  inputValue: string;
  type: DataItem["type"] | undefined;
  done: boolean;
  createdTime: string;
  lastUpdatedTime: string;
  users: UserCode[];
  startTime: string;
  endTime: string;
}>({
  id: undefined,
  inputValue: "",
  type: undefined,
  done: false,
  createdTime: "",
  lastUpdatedTime: "",
  users: [],
  startTime: "",
  endTime: "",
});
const form = ref(null);

const closeEditPopup = () => {
  popoverShow.value = false;
  formData.id = undefined;
  formData.inputValue = "";
  formData.type = undefined;
  formData.done = false;
  formData.createdTime = "";
  formData.lastUpdatedTime = "";
  formData.users = [];
  formData.startTime = "";
  formData.endTime = "";
};

const toggleCheck = async (item: DataItem) => {
  await ossClient.value?.update(item.id, {
    content: item.content,
    done: !item.done,
    type: item.type,
    createdTime: item.createdTime,
    lastUpdatedTime: item.lastUpdatedTime,
    users: item.users,
    startTime: item.startTime,
    endTime: item.endTime,
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
const configPopupVisible = ref(false);
const configForm = ref(null);
const configFormData = reactive({
  region: "",
  bucket: "",
  accessKeyId: "",
  accessKeySecret: "",
});
const handleConfigSubmit = async (isValid: boolean) => {
  console.log("restParams", isValid, configFormData);
  const res = await fetch("https://auth.cellerchan.top/guard/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(configFormData),
  }).then((res) => res.json());
  if (res?.code === 0) {
    localStorage.setItem(
      "oss-config",
      JSON.stringify({
        ...res.data,
      })
    );
    initOSSClient();
    configPopupVisible.value = false;
  } else {
    console.error(res?.message);
  }
};
// 配置弹出框 end

// 下拉刷新 start
const isRefresh = ref(false);
const refresh = async () => {
  await fetchList(ossClient.value as OSSClient);
  isRefresh.value = false;
};
// 下拉刷新 end

// tab 切换 start
const activeTab = ref<DataItem["type"]>("work");

const handleTabChange = (newTab: string | number) => {
  fetchList(ossClient.value as OSSClient, newTab as DataItem["type"]);
};
// tab 切换 end

const handleItemClick = (item: DataItem) => {
  popoverShow.value = true;
  formData.id = item.id;
  formData.inputValue = item.content;
  formData.type = item.type;
  formData.done = item.done;
  formData.users = item.users || [];
  formData.startTime = item.startTime;
  formData.endTime = item.endTime;
};

const showDoneData = ref(true); //  已办数据是否展示

const handleAdd = () => {
  popoverShow.value = true;
  formData.type = activeTab.value;
};

const go2Github = () => {
  window.open("https://github.com/lexmin0412/todo");
};

const handleUserIconClick = async() => {
	const action = await ActionSheet({
    actions: [
      {
        name: '重新登录',
        icon: 'account-circle',
      },
    ]
  })
	console.log('action', action)
	// @ts-ignore
	if (action.name === '重新登录') {
		localStorage.removeItem('oss-config')
		initOSSClient()
	}
}

const currentSort = ref<"createdTime" | "lastUpdatedTime">("createdTime");
</script>

<template>
  <var-pull-refresh v-model="isRefresh" @refresh="refresh">
    <div class="h-screen overflow-hidden flex flex-col">
      <!-- 头部 start -->
      <var-app-bar title="待办清单">
        <template #left>
          <div class="flex mr-2">
            <img
              class="block w-8 h-8 rounded-2xl"
              src="https://lexmin.oss-cn-hangzhou.aliyuncs.com/statics/common/24385370.jpeg"
            />
          </div>
        </template>

        <template #right>
          <var-menu>
						<!-- 用户 -->
						<var-button color="transparent" text-color="#fff" round text>
							<var-icon name="account-circle" @click="handleUserIconClick" />
						</var-button>
            <!-- 模式选择 -->
            <var-button color="transparent" text-color="#fff" round text>
              <var-icon
                v-if="viewMode === 'list'"
                name="check-circle-outline"
                @click="toggleViewMode"
              />
              <var-icon
                v-else
                name="format-list-checkbox"
                @click="toggleViewMode"
              />
            </var-button>
            <!-- 主题切换 -->
            <var-button color="transparent" text-color="#fff" round text>
              <var-icon
                v-if="currentTheme === null"
                name="white-balance-sunny"
                @click="toggleTheme"
              />
              <var-icon v-else name="weather-night" @click="toggleTheme" />
            </var-button>
            <var-menu-select
              v-model="currentSort"
              @update:model-value="() => fetchList(ossClient as OSSClient)"
            >
              <var-button color="transparent" text-color="#fff" round text>
                <var-icon name="cog-outline" />
              </var-button>

              <template #options>
                <var-menu-option value="createdTime" label="创建时间" />
                <var-menu-option value="lastUpdatedTime" label="更新时间" />
              </template>
            </var-menu-select>
            <var-button color="transparent" text-color="#fff" round text>
              <var-icon name="github" @click="go2Github" />
            </var-button>
          </var-menu>
        </template>
      </var-app-bar>
      <!-- 头部 end -->

      <!-- Tab 切换 start -->
      <var-tabs v-model:active="activeTab" @change="handleTabChange">
        <var-tab name="work">工作</var-tab>
        <var-tab name="study">学习</var-tab>
        <var-tab name="life">生活</var-tab>
      </var-tabs>
      <!-- Tab 切换 end -->

      <!-- 列表 start -->
      <template v-if="viewMode === 'list'">
        <div class="flex-1 overflow-auto">
          <div class="px-3 pt-3 font-semibold">待办</div>
          <var-list :finished="finished" v-model:loading="loading">
            <var-cell :key="item" v-for="item in list.unDone">
              <div class="flex items-center">
                <var-checkbox
                  v-model="item.done"
                  @change="toggleCheck(item)"
                ></var-checkbox>
                <div
                  class="flex-1 ellipsis-single flex items-center"
                  @click="() => handleItemClick(item)"
                >
                  <div class="mr-2 flex-1 overflow-hidden ellipsis-single">
                    {{ item.content }}
                  </div>
                  <template v-for="ele in item.userItems || []">
                    <var-avatar class="mr-2" size="mini" :src="ele.avatar" />
                  </template>
                </div>

                <var-icon name="delete" @click="handleDelete(item)" />
              </div>
            </var-cell>
          </var-list>

          <div class="px-3 pt-3 font-semibold flex items-center">
            已办 <var-switch v-model="showDoneData" class="ml-2" />
          </div>
          <var-list
            :hidden="!showDoneData"
            :finished="finished"
            v-model:loading="loading"
          >
            <var-cell :key="item" v-for="item in list.done">
              <div class="flex items-center">
                <var-checkbox
                  v-model="item.done"
                  @change="toggleCheck(item)"
                ></var-checkbox>
                <div
                  class="flex-1 ellipsis-single flex items-center"
                  @click="() => handleItemClick(item)"
                >
                  <div class="mr-2 flex-1 overflow-hidden ellipsis-single">
                    {{ item.content }}
                  </div>
                  <template v-for="ele in item.userItems || []">
                    <var-avatar size="mini" class="mr-2" :src="ele.avatar" />
                  </template>
                </div>
              </div>
            </var-cell>
          </var-list>
        </div>
        <!-- 列表 end -->
      </template>
      <template v-else>
        <div class="flex-1 overflow-auto">
          <Schedule :data="list.unDone.concat(list.done)" />
        </div>
      </template>
      <!-- 主内容区 end -->

      <!-- 新建事项 Popup start -->
      <var-popup
        position="bottom"
        v-model:show="popoverShow"
        @close="closeEditPopup"
      >
        <div class="flex items-center px-4 py-4">
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

            <var-select
              v-if="!activeTab"
              placeholder="请选择类型"
              v-model="formData.type"
              clearable
              :rules="[(v) => !!v || '类型不能为空']"
            >
              <var-option value="work" label="工作" />
              <var-option value="study" label="学习" />
              <var-option value="life" label="生活" />
            </var-select>

            <DatepickerPopup text="开始时间" v-model="formData.startTime" />
            <DatepickerPopup text="结束时间" v-model="formData.endTime" />

            <var-select
              multiple
              placeholder="请选择用户"
              v-model="formData.users"
              clearable
              :rules="[(v) => !!v.length || '用户不能为空']"
            >
              <var-option value="viola" label="小黄" />
              <var-option value="lexmin" label="小张" />
            </var-select>

            <var-button class="mt-4" block type="primary" native-type="submit">
              提交
            </var-button>
          </var-form>
        </div>
      </var-popup>
      <!-- 新建事项 Popup end -->

      <!-- OSS 配置 Popup start -->
      <var-popup
        position="bottom"
        :close-on-click-overlay="false"
        v-model:show="configPopupVisible"
      >
        <div class="flex items-center px-4 py-4">
          <var-form
            @submit="handleConfigSubmit"
            class="w-full"
            ref="configForm"
            scroll-to-error="start"
          >
            <var-input
              placeholder="请输入用户名"
              clearable
              v-model="configFormData.userName"
              :rules="[(v) => !!v || '']"
            />
            <var-input
              placeholder="请输入密码"
              clearable
              v-model="configFormData.password"
              :rules="[(v) => !!v || 'password不能为空']"
            />
            <var-button class="mt-4" block type="primary" native-type="submit">
              提交
            </var-button>
          </var-form>
        </div>
      </var-popup>
      <!-- OSS 配置 Popup end -->

      <!-- 浮动操作按钮 -->
      <var-fab type="primary" @click="handleAdd" />

      <!-- 固定底部 -->
      <LexminFooter />
    </div>
  </var-pull-refresh>
</template>
