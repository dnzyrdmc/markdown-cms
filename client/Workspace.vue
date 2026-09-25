<script setup>
import { ref, onMounted } from "vue";
import { api, act } from "./api";
const posts = ref([]),
  selected = ref(null),
  title = ref("İlk teknik yazım"),
  markdown = ref("# Merhaba\n\nVue ve Node.js ile bir blog geliştiriyorum."),
  html = ref("");
async function load() {
  posts.value = await api("/posts");
}
async function preview() {
  html.value = (
    await api("/preview", "POST", { markdown: markdown.value })
  ).html;
}
function edit(p) {
  selected.value = p;
  title.value = p.title;
  markdown.value = p.markdown;
  act(preview, "");
}
async function save() {
  if (selected.value) {
    await api("/posts/" + selected.value.id, "PATCH", {
      title: title.value,
      markdown: markdown.value,
      version: selected.value.version,
    });
  } else
    await api("/posts", "POST", {
      title: title.value,
      markdown: markdown.value,
    });
  selected.value = null;
  await load();
  await preview();
}
onMounted(() =>
  act(async () => {
    await load();
    await preview();
  }, ""),
);
</script>
<template>
  <div class="grid">
    <form class="panel" @submit.prevent="act(save)">
      <h2>{{ selected ? "Yazıyı düzenle" : "Yeni taslak" }}</h2>
      <label>Başlık<input v-model="title" required /></label
      ><label
        >Markdown<textarea v-model="markdown" rows="14" required></textarea>
      </label>
      <div class="actions">
        <button>Kaydet</button
        ><button type="button" class="ghost" @click="act(preview, '')">
          Önizle</button
        ><button
          type="button"
          class="ghost"
          @click="
            selected = null;
            title = '';
            markdown = '';
          "
        >
          Yeni yazı
        </button>
      </div>
    </form>
    <section class="panel">
      <h2>Güvenli önizleme</h2>
      <article class="markdown" v-html="html"></article>
    </section>
  </div>
  <section class="panel">
    <h2>Yazılarım</h2>
    <div v-for="p in posts" :key="p.id" class="card">
      <h3>{{ p.title }}</h3>
      <p class="muted">{{ p.status }} · sürüm {{ p.version }} · {{ p.slug }}</p>
      <div class="actions">
        <button @click="edit(p)">Düzenle</button
        ><button
          class="ghost"
          @click="
            act(async () => {
              await api('/posts/' + p.id + '/publish', 'POST', {});
              await load();
            })
          "
        >
          Yayımla</button
        ><a
          v-if="p.status === 'published'"
          :href="'/public/posts/' + p.slug"
          target="_blank"
          >Public JSON</a
        ><button
          class="danger"
          @click="
            act(async () => {
              await api('/posts/' + p.id, 'DELETE');
              await load();
            })
          "
        >
          Sil
        </button>
      </div>
    </div>
    <p v-if="!posts.length" class="empty">Henüz yazı yok.</p>
  </section>
</template>
