<!-- A project's page (block winx-project): ← Projects, the header card (cover, name, the status
     pill: a menu of the statuses, description, progress) over two columns: the stages (+ stage
     adds one) | Result and Notes, each with Edit (a Form). One column on the phone -->
<script setup>
import { computed, inject, ref } from "vue";
import { Menu } from "obsidian";
import WinxAddForm from "#/components/uikit/WinxAddForm/index.vue";
import WinxProgress from "#/components/uikit/WinxProgress/index.vue";
import WinxButton from "#/components/uikit/WinxButton/index.vue";
import WinxCard from "#/components/uikit/WinxCard/index.vue";
import { Form } from "#/components/uikit/Form/index.ts";
import { app } from "#/helpers/app.js";
import { addStage, saveProject } from "#/controllers/projects.js";
import { stageTasks, taskStore } from "#/store/tasks.js";
import { FILTERS } from "#/store/projects.js";
import { coverUrl } from "../cover.js";
import ProjectStatus from "../ProjectStatus/index.vue";
import ProjectStage from "./ProjectStage.vue";

const view = inject("projects");
const state = view.state;
const label = s => `${s[0].toUpperCase()}${s.slice(1)}`;
const SIDE = [{ key: "result", name: "Result" }, { key: "notes", name: "Notes" }];

// the project and its stages' tasks (read again when the tasks or projects change)
const page = computed(() => {
  void view.version.value;
  const p = taskStore.projects.get(state.open);
  const stages = (p.stages ?? []).map(s => ({ name: s.name, entries: stageTasks(s) }));
  const entries = stages.flatMap(s => s.entries);

  return {
    key: state.open, p, cover: coverUrl(p, app), stages,
    done: entries.filter(e => e.done).length, total: entries.length,
  };
});
const stageName = ref("");

function statusMenu(e) {
  const menu = new Menu();

  for (const s of FILTERS.slice(1)) {
    menu.addItem(i => i.setTitle(label(s)).setChecked(page.value.p.status === s)
      .onClick(() => saveProject(page.value.key, { status: s })));
  }

  menu.showAtMouseEvent(e);
}

async function edit({ key: field, name }) {
  const project = state.open;  // kept before the Form: the page may be gone when it answers
  const values = { [field]: page.value.p[field] ?? "" };
  const got = await Form.ask(
    app, `✦ ${name}`, [{ name, key: field, text: "", lines: true }], { values, submit: "Save" },
  );

  if (got) await saveProject(project, { [field]: got[field] });
}

async function newStage(name) {
  if (!name.trim()) return;
  await addStage(page.value.key, name.trim());
  stageName.value = "";
}
</script>

<template>
  <div class="winx-project">
    <WinxButton kind="chip" class="winx-project__back" @click="state.open = null">
      ← Projects
    </WinxButton>
    <WinxCard
      :wings="false"
      class="winx-project__header"
      :title="page.p.name"
      :cover="page.cover"
    >
      <template #button>
        <WinxButton
          kind="text"
          class="winx-project__status"
          title="Status"
          @click="statusMenu"
        >
          <ProjectStatus :status="page.p.status" />
        </WinxButton>
      </template>
      <div v-if="page.p.description" class="winx-project__description">{{
        page.p.description }}</div>
      <WinxProgress v-if="page.total" :value="page.done" :max="page.total" />
    </WinxCard>
    <div class="winx-project__body">
      <div class="winx-col winx-gap-l">
        <ProjectStage
          v-for="(s, i) in page.stages"
          :key="`${i} ${s.name}`"
          :project="page.key"
          :index="i"
          :stage="s"
        />
        <WinxAddForm
          v-model="stageName"
          :input="{ placeholder: 'New stage' }"
          submit="+ stage"
          @submit="newStage"
        />
      </div>
      <div class="winx-col winx-gap-l">
        <WinxCard
          v-for="f in SIDE"
          :key="f.key"
          :wings="false"
          :class="`winx-project__${f.key}`"
          :title="f.name"
        >
          <div class="winx-project__text">{{ page.p[f.key] }}</div>
          <div class="winx-row winx-gap-s">
            <WinxButton kind="chip" class="winx-project__edit" @click="edit(f)">Edit</WinxButton>
          </div>
        </WinxCard>
      </div>
    </div>
  </div>
</template>
