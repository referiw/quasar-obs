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

      <q-card-section class="q-pa-0" v-if="connected">
        <div class="q-ma-sm row">
          <div class="col-12 col-sm-4" style="min-width:100px ;">
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
          <!-- <div class="col-1"></div> -->
          <div class="col-12 col-sm-8">
            <q-card class="q-ma-sm" v-for="element in sceneElements" :key="element.inputName">
              <q-card-section>
                <div class="row justify-between" >
                  <div class="col-8" v-if="element.inputType === 'text'"> <q-input standout="bg-teal text-white"
                    v-model="element.inputValue" :label='element.inputName' />

                  </div>
                  <!-- 如果是文本，则渲染到input框 -->
                  <div class="col-8" v-if="element.inputType==='other'">  <div class="text-subtitle1">{{ element.inputName }}</div>
                  <!-- 如果是其他，则渲染为文字 -->

                  </div>



                </div>
                <div class="row flex-center"  v-if="element.inputType === 'score'">
                  <div class="col-3 flex justify-center">
                    <q-btn outline  color="primary" label="-1" @click="element.inputValue-=1;updateTextInput(element)"/>
                  </div>

                  <div class="col-6 items-center q-sm-a-md q-my-sm">
                    <!-- <q-pagination
                      v-if="element.inputType === 'score'"
                      v-model="element.inputValue"
                      :max="5"
                      input
                      input-class="text-orange-10"
                       @click="updateTextInput(element)"
                      /> -->
                      <q-input
                          v-model="element.inputValue"
                          :label="element.inputName"
                          filled
                          class=""
                          @update:model-value="updateTextInput(element)"
                        />
                    <q-btn class="" v-if="element.inputType === 'text'"
                    color="primary" icon="check"  @click="updateTextInput(element)"/>
                  </div>
                  <div class="col-3 flex justify-center">
                    <q-btn outline  color="primary" label="+1" @click="element.inputValue+=1;updateTextInput(element)" />

                  </div>

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
          console.log(inputKind);

          if (inputKind === 'text_gdiplus_v2' | inputKind === 'text_gdiplus_v3' |inputKind === 'text_ft2_source_v2') {

            const { inputSettings } = await obs.call('GetInputSettings', { inputName: sourceName });
            // console.log(inputSettings);
            //如果内容为纯数字，则判断为比分；否则为玩家id
            if(/^\d+$/.test(inputSettings.text)){
              return {
              inputName: sourceName,
              inputType: 'score',
              inputValue: Number(inputSettings.text),
              };
            }
            else{
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
          'inputName': element.inputName,
          'inputSettings': { 'text': String(element.inputValue) },
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
.centered-input .q-field__native {
  text-align: center; /* 将文本居中对齐 */
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
