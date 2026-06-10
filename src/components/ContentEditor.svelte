<script>
  import { createEventDispatcher, onMount } from 'svelte'
  import { currentUser, tags, images } from '../lib/store'
  import { PLATFORMS, CONTENT_STATUS } from '../constants'
  import { generateId } from '../lib/utils'
  import { saveImage } from '../lib/contentService'

  export let content = null
  export let defaultDate = null
  export let defaultPlatform = null

  const dispatch = createEventDispatcher()

  let form = {
    title: '',
    content: '',
    platform: '',
    date: '',
    scheduledTime: '09:00',
    status: 'draft',
    tags: [],
    mediaType: 'image',
    coverImageId: null,
    notes: ''
  }

  let coverPreview = null
  let isSubmitting = false

  $: if (content) {
    form = {
      title: content.title || '',
      content: content.content || '',
      platform: content.platform || '',
      date: content.date || '',
      scheduledTime: content.scheduledTime || '09:00',
      status: content.status || 'draft',
      tags: content.tags || [],
      mediaType: content.mediaType || 'image',
      coverImageId: content.coverImageId || null,
      notes: content.notes || ''
    }
  } else {
    if (defaultDate) form.date = defaultDate
    if (defaultPlatform) form.platform = defaultPlatform
  }

  $: {
    if (form.coverImageId) {
      const img = $images.find(i => i.id === form.coverImageId)
      coverPreview = img ? img.data : null
    } else {
      coverPreview = null
    }
  }

  function toggleTag(tagId) {
    if (form.tags.includes(tagId)) {
      form.tags = form.tags.filter(t => t !== tagId)
    } else {
      form.tags = [...form.tags, tagId]
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result
      const imageId = generateId()
      await saveImage(imageId, base64)
      form.coverImageId = imageId
    }
    reader.readAsDataURL(file)
  }

  function removeCover() {
    form.coverImageId = null
  }

  function handleSubmit() {
    if (!form.title.trim()) {
      alert('请输入标题')
      return
    }
    if (!form.platform) {
      alert('请选择平台')
      return
    }
    if (!form.date) {
      alert('请选择日期')
      return
    }

    isSubmitting = true
    dispatch('submit', {
      ...form,
      authorId: content ? content.authorId : $currentUser.id
    })
    isSubmitting = false
  }

  function handleCancel() {
    dispatch('cancel')
  }

  function handleDelete() {
    if (confirm('确定要删除这条内容吗？')) {
      dispatch('delete')
    }
  }
</script>

<div class="content-editor">
  <div class="form-group">
    <label class="form-label">标题 *</label>
    <input 
      type="text" 
      class="form-input"
      bind:value={form.title}
      placeholder="请输入内容标题"
    />
  </div>

  <div class="form-row">
    <div class="form-group">
      <label class="form-label">平台 *</label>
      <select class="form-select" bind:value={form.platform}>
        <option value="">请选择平台</option>
        {#each PLATFORMS as p}
          <option value={p.id}>{p.icon} {p.name}</option>
        {/each}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">发布日期 *</label>
      <input type="date" class="form-input" bind:value={form.date} />
    </div>
    <div class="form-group">
      <label class="form-label">发布时间</label>
      <input type="time" class="form-input" bind:value={form.scheduledTime} />
    </div>
  </div>

  <div class="form-group">
    <label class="form-label">状态</label>
    <div class="status-options">
      {#each Object.values(CONTENT_STATUS) as status}
        <label class="status-option">
          <input type="radio" bind:group={form.status} value={status.id} />
          <span class="status-badge" style="background: {status.color}20; color: {status.color}">
            {status.name}
          </span>
        </label>
      {/each}
    </div>
  </div>

  <div class="form-group">
    <label class="form-label">文案内容</label>
    <textarea 
      class="form-textarea"
      bind:value={form.content}
      placeholder="请输入文案内容..."
      rows="6"
    ></textarea>
  </div>

  <div class="form-group">
    <label class="form-label">封面图</label>
    <div class="cover-upload">
      {#if coverPreview}
        <div class="cover-preview">
          <img src={coverPreview} alt="封面" />
          <button class="remove-cover" on:click={removeCover}>✕</button>
        </div>
      {:else}
        <label class="upload-placeholder">
          <input type="file" accept="image/*" on:change={handleImageUpload} hidden />
          <span class="upload-icon">🖼️</span>
          <span>点击上传封面图</span>
        </label>
      {/if}
    </div>
  </div>

  <div class="form-group">
    <label class="form-label">媒体类型</label>
    <div class="media-type-options">
      <label class="media-option">
        <input type="radio" bind:group={form.mediaType} value="image" />
        <span>🖼️ 图片</span>
      </label>
      <label class="media-option">
        <input type="radio" bind:group={form.mediaType} value="video" />
        <span>🎬 视频</span>
      </label>
      <label class="media-option">
        <input type="radio" bind:group={form.mediaType} value="text" />
        <span>📝 纯图文</span>
      </label>
    </div>
  </div>

  <div class="form-group">
    <label class="form-label">标签</label>
    <div class="tag-list">
      {#each $tags as tag}
        <button 
          type="button"
          class="tag-item {form.tags.includes(tag.id) ? 'active' : ''}"
          style="border-color: {form.tags.includes(tag.id) ? tag.color : '#e5e7eb'}; 
                 background: {form.tags.includes(tag.id) ? tag.color + '15' : 'transparent'};
                 color: {form.tags.includes(tag.id) ? tag.color : '#6b7280'}"
          on:click={() => toggleTag(tag.id)}
        >
          {tag.name}
        </button>
      {/each}
    </div>
  </div>

  <div class="form-group">
    <label class="form-label">备注</label>
    <textarea 
      class="form-textarea"
      bind:value={form.notes}
      placeholder="内部备注、创作思路等..."
      rows="3"
    ></textarea>
  </div>

  <div class="editor-footer">
    {#if content}
      <button class="btn btn-danger" on:click={handleDelete}>删除</button>
    {/if}
    <div style="flex: 1"></div>
    <button class="btn btn-secondary" on:click={handleCancel} disabled={isSubmitting}>取消</button>
    <button class="btn btn-primary" on:click={handleSubmit} disabled={isSubmitting}>
      {content ? '保存修改' : '创建内容'}
    </button>
  </div>
</div>

<style>
  .content-editor {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .form-label {
    font-size: 14px;
    font-weight: 500;
    color: #374151;
  }

  .form-input,
  .form-select,
  .form-textarea {
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.2s;
    font-family: inherit;
  }

  .form-input:focus,
  .form-select:focus,
  .form-textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-textarea {
    resize: vertical;
    min-height: 80px;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }

  .status-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .status-option {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }

  .status-badge {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }

  .cover-upload {
    width: 100%;
  }

  .cover-preview {
    position: relative;
    width: 160px;
    height: 120px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e5e7eb;
  }

  .cover-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .remove-cover {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 160px;
    height: 120px;
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    cursor: pointer;
    gap: 8px;
    color: #6b7280;
    font-size: 13px;
    transition: all 0.2s;
  }

  .upload-placeholder:hover {
    border-color: #3b82f6;
    color: #3b82f6;
    background: #eff6ff;
  }

  .upload-icon {
    font-size: 32px;
  }

  .media-type-options {
    display: flex;
    gap: 12px;
  }

  .media-option {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-size: 14px;
    color: #4b5563;
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tag-item {
    padding: 6px 14px;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    background: none;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
  }

  .tag-item:hover {
    border-color: #9ca3af;
  }

  .tag-item.active {
    font-weight: 500;
  }

  .editor-footer {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-top: 8px;
    border-top: 1px solid #f3f4f6;
    margin-top: 8px;
  }

  .btn {
    padding: 10px 20px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #2563eb;
  }

  .btn-secondary {
    background: #e5e7eb;
    color: #374151;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #d1d5db;
  }

  .btn-danger {
    background: #fef2f2;
    color: #ef4444;
  }

  .btn-danger:hover {
    background: #fee2e2;
  }
</style>
