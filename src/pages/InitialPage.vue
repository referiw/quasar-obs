<template>
  <q-page class="flex flex-center">
    <q-card>
      <q-card-section>
        <div class="text-h6">OBS WebSocket 控制</div>
      </q-card-section>

      <q-card-section v-if="!connected">
        <q-input v-model="ip" label="IP 地址" />
        <q-input v-model="password" label="密码" type="password" />
        <div class="row flex-center q-mt-md">        <q-btn @click="connectToOBS" label="连接" color="primary" />
        </div>
      </q-card-section>

      <q-card-section v-if="connected">
        <div class="q-ma-sm row">
          <div class="col-lg-4 ">
            <q-card
              v-for="scene in scenes"
              :key="scene.value"
              @click="switchScene(scene.value)"
              class="cursor-pointer q-ma-sm"
              :class="{ 'bg-primary text-white': scene.value === selectedScene }"
            >
              <q-card-section>
                <div class="text-h6">{{ scene.label }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-lg-7 ">
            <q-card class="q-ma-sm" v-for="element in sceneElements" :key="element.inputName">
              <q-card-section>
                <div class="row justify-between " >
                  <div class=""> <q-input standout="bg-teal text-white"                   v-if="element.inputType === 'text'"
                    v-model="element.inputValue" :label='element.inputName' /></div>
                  <div class="" v-if="element.inputType != 'text'">                <div class="text-subtitle1">{{ element.inputName }}</div>
                </div>
                  <div class=" items-center q-ml-md q-my-sm"><q-btn                   v-if="element.inputType === 'text'"
                   color="primary" icon="check"  @click="updateTextInput(element)"
                   /></div>


                </div>

              </q-card-section>

            </q-card>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script>
import { ref } from 'vue';
import { defineComponent } from 'vue';
import OBSWebSocket from 'obs-websocket-js';
import { QPage, QCard, QCardSection, QInput, QBtn } from 'quasar';

export default defineComponent({
  name: 'IndexPage',
  components: {
    QPage,
    QCard,
    QCardSection,
    QInput,
    QBtn
  },
  setup() {
    const ip = ref('');
    const password = ref('');
    const connected = ref(false);
    const scenes = ref([]);
    const selectedScene = ref(null);
    const sceneElements = ref([]);
    const obs = new OBSWebSocket();

    const connectToOBS = async () => {
      try {
        console.log(`Attempting to connect to ws://${ip.value}:4455 with password: ${password.value}`);
        await obs.connect(`ws://${ip.value}:4455`, password.value);
        connected.value = true;
        const { scenes: sceneList } = await obs.call('GetSceneList');
        scenes.value = sceneList.map(scene => ({ label: scene.sceneName, value: scene.sceneName }));
        console.log('Connected and scenes fetched:', scenes.value);
      } catch (error) {
        console.error('连接失败:', error);
        alert('连接失败，请检查IP地址和密码');
      }
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

          if (inputKind === 'text_gdiplus_v2' ) {

            const { inputSettings } = await obs.call('GetInputSettings', { inputName: sourceName });
            // console.log(inputSettings);

            return {
              inputName: sourceName,
              inputType: 'text',
              inputValue: inputSettings.text,
            };
          }
          return { inputName: sourceName, inputType: null };
        }));
      } catch (error) {
        console.error('获取场景元素失败:', error);
        alert('获取场景元素失败');
      }
    };

    const updateTextInput = async (element) => {
      try {
        await obs.call('SetInputSettings', {
          'inputName': element.inputName,
          'inputSettings': { text: element.inputValue },
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
    };
  },
});
</script>

<style scoped>
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
