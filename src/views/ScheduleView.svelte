<script>
  import { writable, derived } from 'svelte/store'
  import { onMount } from 'svelte'
  import { filteredContents, currentUser, isAdmin, settings, tags } from '../lib/store'
  import { PLATFORMS, CONTENT_STATUS } from '../constants'
  import { getWeekDates, getMonthDates, formatDate, isToday, getDayOfWeek } from '../lib/utils'
  import { createContent, updateContent, deleteContent, moveContent, copyContent } from '../lib/contentService'
  import ContentCard from '../components/ContentCard.svelte'
  import ContentEditor from '../components/ContentEditor.svelte'
  import Modal from '../components/Modal.svelte'

  let viewMode = 'week'
  let currentDate = new Date()
  let showEditor = false
  let editingContent = null
  let defaultDate = null
  let defaultPlatform = null
  let showConflictModal = false
  let conflictData = null
  let selectedTags = []
  let selectedStatus = 'all'
  let showWithdrawn = false

  $: weekDates = getWeekDates(currentDate)
  $: monthDates = getMonthDates(currentDate)
  $: displayDates = viewMode === 'week' ? weekDates : monthDates.map(d => d.date)
  $: isMonthView = viewMode === 'month'

  $: filtered = $filteredContents.filter(c => {
    if (selectedTags.length > 0 && !c.tags?.some(t => selectedTags.includes(t))) {
      return false
    }
    if (selectedStatus !== 'all' && c.status !== selectedStatus) {
      return false
    }
    return true
  })

  function getContentsForCell(date, platform) {
    return filtered.filter(c => c.date === date && c.platform === platform)
  }

  function prevPeriod() {
    const d = new Date(currentDate)
    if (viewMode === 'week') {
      d.setDate(d.getDate() - 7)
    } else {
      d.setMonth(d.getMonth() - 1)
    }
    currentDate = d
  }

  function nextPeriod() {
    const d = new Date(currentDate)
    if (viewMode === 'week') {
      d.setDate(d.getDate() + 7)
    } else {
      d.setMonth(d.getMonth() + 1)
    }
    currentDate = d
  }

  function goToday() {
    currentDate = new Date()
  }

  function handleCellClick(date, platform) {
    editingContent = null
    defaultDate = date
    defaultPlatform = platform
    showEditor = true
  }

  function handleContentClick(content) {
    if (!$isAdmin && content.authorId !== $currentUser.id) {
      alert('您没有权限编辑他人的内容')
      return
    }
    editingContent = content
    defaultDate = null
    defaultPlatform = null
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

  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = e.ctrlKey || e.metaKey ? 'copy' : 'move'
  }

  async function handleDrop(e, date, platform) {
    e.preventDefault()
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'))
      const contentId = data.id
      const isCopy = data.isCopy || e.ctrlKey || e.metaKey

      const existingContents = getContentsForCell(date, platform)
      const otherContents = existingContents.filter(c => c.id !== contentId)
      
      if (otherContents.length > 0) {
        conflictData = {
          contentId,
          targetDate: date,
          targetPlatform: platform,
          existingContent: otherContents[0],
          isCopy
        }
        showConflictModal = true
        return
      }

      if (isCopy) {
        await copyContent(contentId, date, platform)
      } else {
        await moveContent(contentId, date, platform)
      }
    } catch (err) {
      console.error('拖拽失败:', err)
    }
  }

  async function handleConflictOverwrite() {
    if (!conflictData) return
    
    if (conflictData.isCopy) {
      await copyContent(conflictData.contentId, conflictData.targetDate, conflictData.targetPlatform)
    } else {
      await moveContent(conflictData.contentId, conflictData.targetDate, conflictData.targetPlatform)
    }
    
    if (conflictData.existingContent) {
      await deleteContent(conflictData.existingContent.id)
    }
    
    showConflictModal = false
    conflictData = null
  }

  async function handleConflictMerge() {
    if (!conflictData) return
    
    if (conflictData.isCopy) {
      await copyContent(conflictData.contentId, conflictData.targetDate, conflictData.targetPlatform)
    } else {
      await moveContent(conflictData.contentId, conflictData.targetDate, conflictData.targetPlatform)
    }
    
    showConflictModal = false
    conflictData = null
  }

  function handleConflictCancel() {
    showConflictModal = false
    conflictData = null
  }

  function toggleTag(tagId) {
    if (selectedTags.includes(tagId)) {
      selectedTags = selectedTags.filter(t => t !== tagId)
    } else {
      selectedTags = [...selectedTags, tagId]
    }
  }

  function toggleShowWithdrawn() {
    settings.update(s => ({ ...s, showWithdrawn: !s.showWithdrawn }))
  }

  function getPeriodLabel() {
    const d = new Date(currentDate)
    if (viewMode === 'week') {
      const dates = getWeekDates(d)
      const start = new Date(dates[0])
      const end = new Date(dates[6])
      if (start.getMonth() === end.getMonth()) {
        return `${start.getFullYear()}年${start.getMonth() + 1}月 ${start.getDate()}-${end.getDate()}日`
      }
      return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 - ${end.getMonth() + 1}月${end.getDate()}日`
    } else {
      return `${d.getFullYear()}年${d.getMonth() + 1}月`
    }
  }

  $: periodLabel = getPeriodLabel()
</script>

<div class="schedule-view">
  <div class="view-header">
    <div class="view-title-section">
      <h2 class="view-title">排期看板</h2>
      <div class="view-controls">
        <button class="btn btn-outline" on:click={prevPeriod}>◀</button>
        <span class="period-label">{periodLabel}</span>
        <button class="btn btn-outline" on:click={nextPeriod}>▶</button>
        <button class="btn btn-outline" on:click={goToday}>今天</button>
      </div>
    </div>

    <div class="view-tools">
      <div class="view-mode-switch">
        <button class="mode-btn {viewMode === 'week' ? 'active' : ''}" on:click={() => viewMode = 'week'}>周视图</button>
        <button class="mode-btn {viewMode === 'month' ? 'active' : ''}" on:click={() => viewMode = 'month'}>月视图</button>
      </div>
      
      <div class="filter-section">
        <div class="filter-tags">
          <span class="filter-label">标签筛选:</span>
          {#each $tags as tag}
            <button 
              class="filter-tag {selectedTags.includes(tag.id) ? 'active' : ''}"
              style="border-color: {tag.color}; color: {selectedTags.includes(tag.id) ? 'white' : tag.color};
                     background: {selectedTags.includes(tag.id) ? tag.color : 'transparent'}"
              on:click={() => toggleTag(tag.id)}
            >
              {tag.name}
            </button>
          {/each}
        </div>
        
        <select class="filter-select" bind:value={selectedStatus}>
          <option value="all">全部状态</option>
          {#each Object.values(CONTENT_STATUS) as status}
            <option value={status.id}>{status.name}</option>
          {/each}
        </select>

        <label class="filter-checkbox">
          <input type="checkbox" bind:checked={$settings.showWithdrawn} on:change={toggleShowWithdrawn} />
          <span>显示已撤</span>
        </label>
      </div>
    </div>
  </div>

  <div class="schedule-board">
    <div class="board-header">
      <div class="corner-cell"></div>
      {#each displayDates as date}
        <div class="date-header {isToday(date) ? 'today' : ''} {isMonthView && !monthDates.find(d => d.date === date)?.inMonth ? 'other-month' : ''}">
          <span class="date-day">周{getDayOfWeek(date)}</span>
          <span class="date-num">{new Date(date).getDate()}</span>
          {#if isToday(date)}
            <span class="today-badge">今</span>
          {/if}
        </div>
      {/each}
    </div>

    {#each PLATFORMS as platform}
      <div class="board-row">
        <div class="platform-cell" style="border-left: 3px solid {platform.color}">
          <span class="platform-icon">{platform.icon}</span>
          <span class="platform-name">{platform.name}</span>
        </div>
        {#each displayDates as date}
          <div 
            class="content-cell {isToday(date) ? 'today' : ''} {isMonthView && !monthDates.find(d => d.date === date)?.inMonth ? 'other-month' : ''}"
            on:click={() => handleCellClick(date, platform.id)}
            on:dragover={handleDragOver}
            on:drop={(e) => handleDrop(e, date, platform.id)}
          >
            {#each getContentsForCell(date, platform.id) as content}
              <ContentCard 
                content={content} 
                compact={isMonthView}
                on:click={(e) => { e.stopPropagation(); handleContentClick(content); }}
              />
            {/each}
          </div>
        {/each}
      </div>
    {/each}
  </div>

  <div class="board-footer">
    <p class="tips">
      💡 提示：按住 <kbd>Ctrl</kbd> 拖拽 = 复制内容到新格子，不按 = 移动内容
    </p>
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
      defaultDate={defaultDate}
      defaultPlatform={defaultPlatform}
      on:submit={handleEditorSubmit}
      on:cancel={handleEditorCancel}
      on:delete={handleEditorDelete}
    />
  </Modal>
{/if}

{#if showConflictModal && conflictData}
  <Modal title="排期冲突" width="400px" on:close={handleConflictCancel}>
    <div class="conflict-content">
      <p class="conflict-icon">⚠️</p>
      <p><strong>{PLATFORMS.find(p => p.id === conflictData.targetPlatform)?.name}</strong> 在 <strong>{conflictData.targetDate}</strong> 已排有内容</p>
      <p class="conflict-desc">该位置已有「{conflictData.existingContent.title}」，如何处理？</p>
      
      <div class="conflict-options">
        <button class="conflict-btn danger" on:click={handleConflictOverwrite}>
          <span class="conflict-btn-title">覆盖原有内容</span>
          <span class="conflict-btn-desc">删除原有内容，放这条新的</span>
        </button>
        <button class="conflict-btn primary" on:click={handleConflictMerge}>
          <span class="conflict-btn-title">同日多发</span>
          <span class="conflict-btn-desc">两条内容都保留，同天发布</span>
        </button>
        <button class="conflict-btn secondary" on:click={handleConflictCancel}>
          <span class="conflict-btn-title">取消操作</span>
        </button>
      </div>
    </div>
  </Modal>
{/if}

<style>
  .schedule-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 16px;
  }

  .view-header {
    background: white;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .view-title-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  .view-title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
  }

  .view-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .period-label {
    min-width: 200px;
    text-align: center;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
  }

  .btn {
    padding: 8px 14px;
    border-radius: 6px;
    border: 1px solid #d1d5db;
    background: white;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
  }

  .btn:hover {
    background: #f9fafb;
  }

  .btn-outline {
    border: 1px solid #d1d5db;
  }

  .view-tools {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .view-mode-switch {
    display: flex;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    overflow: hidden;
  }

  .mode-btn {
    padding: 6px 16px;
    border: none;
    background: white;
    cursor: pointer;
    font-size: 13px;
    color: #6b7280;
  }

  .mode-btn.active {
    background: #3b82f6;
    color: white;
  }

  .filter-section {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .filter-label {
    font-size: 13px;
    color: #6b7280;
  }

  .filter-tags {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .filter-tag {
    padding: 4px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    background: none;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
  }

  .filter-select {
    padding: 6px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
  }

  .filter-checkbox {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #4b5563;
    cursor: pointer;
  }

  .schedule-board {
    flex: 1;
    background: white;
    border-radius: 12px;
    overflow: auto;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .board-header {
    display: grid;
    grid-template-columns: 120px repeat(var(--cols), 1fr);
    position: sticky;
    top: 0;
    z-index: 10;
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }

  .board-row {
    display: grid;
    grid-template-columns: 120px repeat(var(--cols), 1fr);
    border-bottom: 1px solid #f3f4f6;
  }

  .board-row:last-child {
    border-bottom: none;
  }

  .corner-cell {
    padding: 10px;
    border-right: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .date-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 8px;
    border-right: 1px solid #e5e7eb;
    position: relative;
  }

  .date-header.today {
    background: #eff6ff;
  }

  .date-header.other-month {
    opacity: 0.4;
  }

  .date-day {
    font-size: 11px;
    color: #9ca3af;
    margin-bottom: 4px;
  }

  .date-num {
    font-size: 16px;
    font-weight: 600;
    color: #111827;
  }

  .today-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 18px;
    height: 18px;
    background: #3b82f6;
    color: white;
    font-size: 10px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .platform-cell {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 12px;
    border-right: 1px solid #e5e7eb;
    background: #fafafa;
    font-size: 13px;
    font-weight: 500;
    color: #374151;
  }

  .platform-icon {
    font-size: 18px;
  }

  .content-cell {
    min-height: 100px;
    padding: 6px;
    border-right: 1px solid #f3f4f6;
    display: flex;
    flex-direction: column;
    gap: 6px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .content-cell:hover {
    background: #f9fafb;
  }

  .content-cell.today {
    background: #f0f9ff;
  }

  .content-cell.today:hover {
    background: #e0f2fe;
  }

  .content-cell.other-month {
    background: #fafafa;
    opacity: 0.6;
  }

  .board-footer {
    text-align: center;
  }

  .tips {
    font-size: 13px;
    color: #9ca3af;
    margin: 0;
  }

  kbd {
    padding: 2px 6px;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 12px;
    font-family: monospace;
  }

  .conflict-content {
    text-align: center;
  }

  .conflict-icon {
    font-size: 48px;
    margin: 0 0 16px;
  }

  .conflict-content p {
    margin: 8px 0;
    color: #374151;
  }

  .conflict-desc {
    font-size: 14px;
    color: #6b7280 !important;
  }

  .conflict-options {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 20px;
  }

  .conflict-btn {
    padding: 14px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
  }

  .conflict-btn:hover {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .conflict-btn.secondary:hover {
    border-color: #d1d5db;
    background: #f9fafb;
  }

  .conflict-btn.primary {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .conflict-btn.primary:hover {
    border-color: #2563eb;
    background: #dbeafe;
  }

  .conflict-btn.danger {
    border-color: #fecaca;
    background: #fef2f2;
  }

  .conflict-btn.danger:hover {
    border-color: #f87171;
    background: #fee2e2;
  }

  .conflict-btn.danger .conflict-btn-title {
    color: #dc2626;
  }

  .conflict-btn.primary .conflict-btn-title {
    color: #2563eb;
  }

  .conflict-btn-title {
    display: block;
    font-weight: 600;
    color: #111827;
    margin-bottom: 4px;
  }

  .conflict-btn-desc {
    font-size: 12px;
    color: #6b7280;
  }

  :global(.schedule-board) {
    --cols: 7;
  }
</style>
