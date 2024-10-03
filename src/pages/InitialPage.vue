<template>
  <q-page class="flex flex-center">
    <q-card>
      <q-card-section>
        <div class="row flex flex-center">
          <div class="text-h6">OBS WebSocket 控制</div>
        </div>
      </q-card-section>
      <q-separator />

      <q-card-section v-if="!connected">
        <q-input v-model="ip" label="IP 地址" />
        <q-input v-model="password" label="密码" type="password" />
        <div class="row flex-center q-mt-md">
          <q-btn @click="connectToOBS" label="连接" color="primary" />
        </div>
      </q-card-section>

      <q-card-section class="q-pa-0" v-if="connected">
        <div class="row q-ma-sm flex flex-center">
          <q-btn
            :loading="loading"
            :color="recording ? 'negative' : 'positive'"
            @click="toggleRecording"
            class="q-mt-0"
          >
            {{ recording ? '停止录制' : '开始录制' }}
          </q-btn>
        </div>
          <q-tabs

            v-model="selectedScene"
            active-color="primary"
            class="col-12 col-sm-4"
            style="min-width: 100px;"
            @update:model-value="switchScene"
          >
            <q-tab
              v-for="scene in scenes"
              :key="scene.value"
              :name="scene.value"
              :label="scene.label"
            />
          </q-tabs>
          <!-- <div class="col-12 col-sm-8"> -->
            <q-tab-panels
                v-model="selectedScene"
                animated
                swipeable
                transition-prev="jump-up"
                transition-next="jump-up"
              >
              <q-tab-panel v-for="scene in scenes"
              :key="scene.value"
              :name="scene.value"

              >
              <div class=""  v-if="sceneElements!=[]"
              >

            </div>
                <q-card
                class="q-ma-sm"
                v-for="element in sceneElements"
                :key="element.inputName"
                  >
              <q-card-section>
                <div class="row justify-between">
                  <div class="col-8" v-if="element.inputType === 'text'">
                    <q-input
                      standout="bg-teal text-white"
                      v-model="element.inputValue"
                      :label="element.inputName"
                    />
                  </div>

                  <div class="col-8" v-if="element.inputType === 'other'">
                    <div class="text-subtitle1">{{ element.inputName }}</div>
                  </div>

                  <div class="col-4 flex flex-center q-pl-md q-pr-0" v-if="element.inputType === 'text'">
                    <q-btn color="primary" icon="check" @click="updateTextInput(element)" />
                  </div>
                  <div class="row flex-center" v-if="element.inputType === 'score'">
                    <div class="col-3 flex justify-center">
                      <q-btn outline color="primary" label="-1" @click="element.inputValue-=1;updateTextInput(element)" />
                    </div>

                    <div class="col-6 items-center q-sm-a-md q-my-sm">
                      <q-input
                        v-model="element.inputValue"
                        :label="element.inputName"
                        filled
                        @update:model-value="updateTextInput(element)"
                      />
                    </div>

                    <div class="col-3 flex justify-center">
                      <q-btn outline color="primary" label="+1" @click="element.inputValue+=1;updateTextInput(element)" />
                    </div>
                  </div>
                  </div>
                  </q-card-section>
                </q-card>
              </q-tab-panel>


            </q-tab-panels>


        <!-- </div> -->
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { ref } from 'vue';
import { defineComponent } from 'vue';
import OBSWebSocket from 'obs-websocket-js';
import { QPage, QCard, QCardSection, QInput, QBtn, QTabs, QTab } from 'quasar';

export default defineComponent({
  name: 'IndexPage',
  components: {
    QPage,
    QCard,
    QCardSection,
    QInput,
    QBtn,
    QTabs,
    QTab
  },
  setup() {
    const ip = ref('');
    const password = ref('');
    const connected = ref(false);
    const scenes = ref([]);
    const selectedScene = ref(null);
    const sceneElements = ref([]);
    const obs = new OBSWebSocket();
    const recording = ref(false);
    const loading = ref(false);

    const connectToOBS = async () => {
      try {
        console.log(`Attempting to connect to ws://${ip.value}:4455 with password: ${password.value}`);
        await obs.connect(`ws://${ip.value}:4455`, password.value);

        connected.value = true;
        const { scenes: sceneList } = await obs.call('GetSceneList');
        scenes.value = sceneList.map(scene => ({ label: scene.sceneName, value: scene.sceneName }));
        console.log('Connected and scenes fetched:', scenes.value);
        checkRecordingStatus();
      } catch (error) {
        console.error('连接失败:', error);
        alert('连接失败，请检查IP地址和密码');
      }
    };

    const checkRecordingStatus = async () => {
      try {
        const { outputActive } = await obs.call('GetRecordStatus');
        recording.value = outputActive;
      } catch (error) {
        console.error('获取录制状态失败:', error);
      }
    };

    const toggleRecording = async () => {
      loading.value = true;
      try {
        if (recording.value) {
          await obs.call('StopRecord');
        } else {
          await obs.call('StartRecord');
        }
        recording.value = !recording.value;
      } catch (error) {
        console.error('切换录制状态失败:', error);
      }
      loading.value = false;
    };

    const switchScene = async (sceneName) => {
      try {
        console.log(`Switching to scene: ${sceneName}`);
        await obs.call('SetCurrentProgramScene', { sceneName });
        selectedScene.value = sceneName;
        await fetchSceneElements(sceneName);
      } catch (error) {
        console.error('切换场景失败:', error);
        alert('切换场景失败');
      }
    };

    const fetchSceneElements = async (sceneName) => {
      try {
        const { sceneItems } = await obs.call('GetSceneItemList', { sceneName });

        sceneElements.value = await Promise.all(sceneItems.map(async (item) => {
          const { sourceName, inputKind } = item;
          if (inputKind === 'text_gdiplus_v2' || inputKind === 'text_gdiplus_v3' || inputKind === 'text_ft2_source_v2') {
            const { inputSettings } = await obs.call('GetInputSettings', { inputName: sourceName });
            if (/^\d+$/.test(inputSettings.text)) {
              return {
                inputName: sourceName,
                inputType: 'score',
                inputValue: Number(inputSettings.text),
              };
            } else {
              return {
                inputName: sourceName,
                inputType: 'text',
                inputValue: inputSettings.text,
              };
            }
          }
          return { inputName: sourceName, inputType: 'other' };
        }));
      } catch (error) {
        console.error('获取场景元素失败:', error);
        alert('获取场景元素失败');
      }
    };

    const updateTextInput = async (element) => {
      try {
        await obs.call('SetInputSettings', {
          inputName: element.inputName,
          inputSettings: { text: String(element.inputValue) },
        });
        console.log(`Updated text for ${element.inputName}`);
      } catch (error) {
        console.error('更新文本元素失败:', error);
        alert('更新文本元素失败');
      }
    };

    return {
      ip,
      password,
      connected,
      scenes,
      selectedScene,
      sceneElements,
      connectToOBS,
      switchScene,
      updateTextInput,
      recording,
      loading,
      toggleRecording,
    };
  },
});
</script>

<style scoped>
.centered-input .q-field__native {
  text-align: center;
}
.q-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}
.cursor-pointer {
  cursor: pointer;
}
.bg-primary {
  background-color: var(--q-primary);
}
.text-white {
  color: white;
}
</style>
