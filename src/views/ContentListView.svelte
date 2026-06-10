<script>
  import { onMount } from 'svelte'
  import { filteredContents, currentUser, isAdmin, tags, settings } from '../lib/store'
  import { PLATFORMS, CONTENT_STATUS } from '../constants'
  import { createContent, updateContent, deleteContent, batchUpdateStatus } from '../lib/contentService'
  import ContentCard from '../components/ContentCard.svelte'
  import ContentEditor from '../components/ContentEditor.svelte'
  import Modal from '../components/Modal.svelte'

  let showEditor = false
  let editingContent = null
  let selectedIds = []
  let filterPlatform = 'all'
  let filterStatus = 'all'
  let filterTag = 'all'
  let sortBy = 'date'
  let searchText = ''

  $: filtered = $filteredContents.filter(c => {
    if (filterPlatform !== 'all' && c.platform !== filterPlatform) return false
    if (filterStatus !== 'all' && c.status !== filterStatus) return false
    if (filterTag !== 'all' && !c.tags?.includes(filterTag)) return false
    if (searchText && !c.title?.includes(searchText) && !c.content?.includes(searchText)) return false
    if (!$isAdmin && c.authorId !== $currentUser.id) return false
    return true
  })

  $: sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'date') {
      return b.date.localeCompare(a.date)
    } else if (sortBy === 'created') {
      return b.createdAt.localeCompare(a.createdAt)
    } else if (sortBy === 'status') {
      const order = ['draft', 'pending', 'approved', 'published', 'withdrawn']
      return order.indexOf(a.status) - order.indexOf(b.status)
    }
    return 0
  })

  function toggleSelect(id) {
    if (selectedIds.includes(id)) {
      selectedIds = selectedIds.filter(i => i !== id)
    } else {
      selectedIds = [...selectedIds, id]
    }
  }

  function selectAll() {
    if (selectedIds.length === sorted.length) {
      selectedIds = []
    } else {
      selectedIds = sorted.map(c => c.id)
    }
  }

  function handleContentClick(content) {
    if (!$isAdmin && content.authorId !== $currentUser.id) {
      alert('您没有权限编辑他人的内容')
      return
    }
    editingContent = content
    showEditor = true
  }

  function handleNewContent() {
    editingContent = null
    showEditor = true
  }

  async function handleEditorSubmit(e) {
    const data = e.detail
    if (editingContent) {
      await updateContent(editingContent.id, data)
    } else {
      await createContent(data)
    }
    showEditor = false
    editingContent = null
  }

  async function handleEditorDelete() {
    if (editingContent) {
      await deleteContent(editingContent.id)
      showEditor = false
      editingContent = null
    }
  }

  function handleEditorCancel() {
    showEditor = false
    editingContent = null
  }

  async function handleBatchStatus(status) {
    if (selectedIds.length === 0) return
    if (!confirm(`确定要将选中的 ${selectedIds.length} 条内容状态改为「${CONTENT_STATUS[status.toUpperCase()].name}」吗？`)) return
    
    await batchUpdateStatus(selectedIds, status)
    selectedIds = []
  }

  function toggleShowWithdrawn() {
    settings.update(s => ({ ...s, showWithdrawn: !s.showWithdrawn }))
  }
</script>

<div class="content-list-view">
  <div class="view-header">
    <div class="header-top">
      <h2 class="view-title">内容管理</h2>
      <button class="btn btn-primary" on:click={handleNewContent}>
        + 新建内容
      </button>
    </div>

    <div class="filters">
      <div class="filter-group">
        <input 
          type="text" 
          class="search-input"
          placeholder="搜索标题或内容..."
          bind:value={searchText}
        />
      </div>

      <div class="filter-group">
        <select bind:value={filterPlatform}>
          <option value="all">全部平台</option>
          {#each PLATFORMS as p}
            <option value={p.id}>{p.icon} {p.name}</option>
          {/each}
        </select>
      </div>

      <div class="filter-group">
        <select bind:value={filterStatus}>
          <option value="all">全部状态</option>
          {#each Object.values(CONTENT_STATUS) as s}
            <option value={s.id}>{s.name}</option>
          {/each}
        </select>
      </div>

      <div class="filter-group">
        <select bind:value={filterTag}>
          <option value="all">全部标签</option>
          {#each $tags as t}
            <option value={t.id}>{t.name}</option>
          {/each}
        </select>
      </div>

      <div class="filter-group">
        <select bind:value={sortBy}>
          <option value="date">按日期排序</option>
          <option value="created">按创建时间</option>
          <option value="status">按状态排序</option>
        </select>
      </div>

      <label class="filter-checkbox">
        <input type="checkbox" bind:checked={$settings.showWithdrawn} on:change={toggleShowWithdrawn} />
        <span>显示已撤</span>
      </label>
    </div>

    {#if selectedIds.length > 0}
      <div class="batch-actions">
        <span class="batch-count">已选 {selectedIds.length} 项</span>
        <div class="batch-btns">
          <button class="batch-btn" on:click={() => handleBatchStatus('pending')}>提交审核</button>
          <button class="batch-btn" on:click={() => handleBatchStatus('approved')}>审核通过</button>
          <button class="batch-btn" on:click={() => handleBatchStatus('published')}>标记已发</button>
          <button class="batch-btn danger" on:click={() => handleBatchStatus('withdrawn')}>撤回</button>
          <button class="batch-btn secondary" on:click={() => selectedIds = []}>取消选择</button>
        </div>
      </div>
    {/if}
  </div>

  <div class="list-header">
    <label class="select-all">
      <input 
        type="checkbox" 
        checked={selectedIds.length > 0 && selectedIds.length === sorted.length}
        on:change={selectAll}
      />
      <span>全选</span>
    </label>
    <span class="list-count">共 {sorted.length} 条内容</span>
  </div>

  <div class="content-grid">
    {#if sorted.length > 0}
      {#each sorted as content (content.id)}
        <ContentCard 
          content={content}
          selectable={true}
          selected={selectedIds.includes(content.id)}
          on:select={() => toggleSelect(content.id)}
          on:click={() => handleContentClick(content)}
        />
      {/each}
    {:else}
      <div class="empty-state">
        <p class="empty-icon">📭</p>
        <p>暂无内容</p>
        <p class="empty-desc">点击右上角「新建内容」开始创建第一条内容</p>
      </div>
    {/if}
  </div>
</div>

{#if showEditor}
  <Modal 
    title={editingContent ? '编辑内容' : '新建内容'} 
    width="600px"
    on:close={handleEditorCancel}
  >
    <ContentEditor 
      content={editingContent}
      on:submit={handleEditorSubmit}
      on:cancel={handleEditorCancel}
      on:delete={handleEditorDelete}
    />
  </Modal>
{/if}

<style>
  .content-list-view {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .view-header {
    background: white;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .view-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
  }

  .btn {
    padding: 10px 18px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .filters {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }

  .filter-group select,
  .search-input {
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
  }

  .search-input {
    width: 200px;
  }

  .filter-checkbox {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #4b5563;
    cursor: pointer;
  }

  .batch-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #eff6ff;
    border-radius: 8px;
  }

  .batch-count {
    font-size: 14px;
    color: #2563eb;
    font-weight: 500;
  }

  .batch-btns {
    display: flex;
    gap: 8px;
  }

  .batch-btn {
    padding: 6px 12px;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    font-size: 12px;
    color: #2563eb;
    transition: all 0.2s;
  }

  .batch-btn:hover {
    background: #dbeafe;
  }

  .batch-btn.danger {
    color: #ef4444;
    border-color: #fecaca;
  }

  .batch-btn.danger:hover {
    background: #fee2e2;
  }

  .batch-btn.secondary {
    color: #6b7280;
    border-color: #e5e7eb;
  }

  .batch-btn.secondary:hover {
    background: #f3f4f6;
  }

  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;
  }

  .select-all {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #4b5563;
    cursor: pointer;
  }

  .list-count {
    font-size: 13px;
    color: #9ca3af;
  }

  .content-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }

  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 60px 20px;
    color: #9ca3af;
  }

  .empty-icon {
    font-size: 48px;
    margin: 0 0 12px;
  }

  .empty-state p {
    margin: 4px 0;
  }

  .empty-desc {
    font-size: 13px;
    color: #d1d5db;
  }
</style>
