<script>
  import { onMount } from 'svelte'
  import { settings, contents, images, fans, comments, analytics, tags } from '../lib/store'
  import { PLATFORMS, DEFAULT_REPLY_IDENTITIES, DEFAULT_TAGS } from '../constants'
  import { downloadFile, readFileAsText } from '../lib/utils'
  import { importContents } from '../lib/contentService'
  import { importFansData, importCommentsData } from '../lib/dataService'
  import { bulkAdd, clearStore, getAllRecords } from '../lib/db'
  import Modal from '../components/Modal.svelte'

  let activeTab = 'identity'
  let showConfirmModal = false
  let confirmAction = ''
  let importFile = null
  let importResult = null
  let showImportResult = false

  const tabs = [
    { id: 'identity', name: '回复身份' },
    { id: 'tags', name: '标签管理' },
    { id: 'import', name: '数据导入' },
    { id: 'export', name: '数据导出' },
    { id: 'backup', name: '备份提醒' }
  ]

  let newTagName = ''
  let newTagColor = '#8B5CF6'

  function updateReplyIdentity(platform, key, value) {
    settings.update(s => ({
      ...s,
      replyIdentities: {
        ...s.replyIdentities,
        [platform]: {
          ...s.replyIdentities[platform],
          [key]: value
        }
      }
    }))
  }

  function addTag() {
    if (!newTagName.trim()) return
    
    const newTag = {
      id: 't' + Date.now(),
      name: newTagName.trim(),
      color: newTagColor
    }
    
    tags.update(t => [...t, newTag])
    newTagName = ''
    newTagColor = '#8B5CF6'
  }

  function removeTag(tagId) {
    if (!confirm('确定要删除这个标签吗？')) return
    tags.update(t => t.filter(tag => tag.id !== tagId))
  }

  function resetReplyIdentities() {
    if (!confirm('确定要重置为默认回复身份配置吗？')) return
    settings.update(s => ({
      ...s,
      replyIdentities: { ...DEFAULT_REPLY_IDENTITIES }
    }))
  }

  function handleFileSelect(e) {
    importFile = e.target.files[0]
  }

  async function handleImport() {
    if (!importFile) {
      alert('请选择要导入的 JSON 文件')
      return
    }

    try {
      const text = await readFileAsText(importFile)
      const data = JSON.parse(text)
      
      let count = 0
      
      if (data.contents && Array.isArray(data.contents)) {
        count += await importContents(data.contents)
      }
      if (data.fans && Array.isArray(data.fans)) {
        count += await importFansData(data.fans)
      }
      if (data.comments && Array.isArray(data.comments)) {
        count += await importCommentsData(data.comments)
      }
      if (data.images && Array.isArray(data.images)) {
        for (const img of data.images) {
          try {
            await bulkAdd('images', [img])
          } catch (e) {}
        }
        count += data.images.length
      }
      if (data.analytics && Array.isArray(data.analytics)) {
        for (const a of data.analytics) {
          try {
            await bulkAdd('analytics', [a])
          } catch (e) {}
        }
        count += data.analytics.length
        analytics.set([...$analytics, ...data.analytics.filter(a => !$analytics.find(x => x.id === a.id))])
      }

      if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
        const existing = $tags.map(t => t.id)
        const newTags = data.tags.filter(t => !existing.includes(t.id))
        if (newTags.length > 0) {
          tags.set([...$tags, ...newTags])
          count += newTags.length
        }
      }

      if (data.settings && typeof data.settings === 'object') {
        const merged = {
          ...$settings,
          ...data.settings
        }
        if (data.settings.replyIdentities) {
          merged.replyIdentities = {
            ...$settings.replyIdentities,
            ...data.settings.replyIdentities
          }
        }
        settings.set(merged)
      }
      
      importResult = { success: true, count, message: `成功导入 ${count} 条数据` }
      showImportResult = true
      importFile = null
    } catch (e) {
      importResult = { success: false, message: '导入失败：' + e.message }
      showImportResult = true
    }
  }

  function exportAllData() {
    const exportData = {
      version: '1.0',
      exportTime: new Date().toISOString(),
      contents: $contents,
      images: $images,
      fans: $fans,
      comments: $comments,
      analytics: $analytics,
      tags: $tags,
      settings: $settings
    }
    
    const json = JSON.stringify(exportData, null, 2)
    const filename = `social-scheduler-backup-${new Date().toISOString().split('T')[0]}.json`
    downloadFile(json, filename, 'application/json')
  }

  function exportScheduleCSV() {
    const headers = ['日期', '平台', '标题', '状态', '发布人', '发布时间', '标签']
    
    const rows = $contents
      .filter(c => c.status !== 'withdrawn' || $settings.showWithdrawn)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(c => {
        const platform = PLATFORMS.find(p => p.id === c.platform)
        const statusMap = {
          draft: '草稿',
          pending: '待审',
          approved: '已审',
          published: '已发',
          withdrawn: '已撤'
        }
        const tagNames = c.tags?.map(tid => {
          const tag = $tags.find(t => t.id === tid)
          return tag?.name || ''
        }).filter(Boolean).join('、') || ''
        
        return [
          c.date,
          platform?.name || c.platform,
          c.title || '',
          statusMap[c.status] || c.status,
          '',
          c.scheduledTime || '',
          tagNames
        ]
      })
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    
    const filename = `content-schedule-${new Date().toISOString().split('T')[0]}.csv`
    downloadFile('\uFEFF' + csv, filename, 'text/csv')
  }

  function exportContentsJSON() {
    const json = JSON.stringify($contents, null, 2)
    const filename = `contents-${new Date().toISOString().split('T')[0]}.json`
    downloadFile(json, filename, 'application/json')
  }

  function testBackupReminder() {
    confirmAction = 'backup'
    showConfirmModal = true
  }

  function handleConfirm() {
    showConfirmModal = false
    if (confirmAction === 'backup') {
      exportAllData()
    }
  }

  function handleCancel() {
    showConfirmModal = false
    confirmAction = ''
  }

  function closeImportResult() {
    showImportResult = false
    importResult = null
  }
</script>

<div class="settings-view">
  <div class="view-header">
    <h2 class="view-title">系统设置</h2>
    
    <div class="tabs">
      {#each tabs as tab}
        <button 
          class="tab-btn {activeTab === tab.id ? 'active' : ''}"
          on:click={() => activeTab = tab.id}
        >
          {tab.name}
        </button>
      {/each}
    </div>
  </div>

  {#if activeTab === 'identity'}
    <div class="settings-section">
      <div class="section-header">
        <h3 class="section-title">各平台回复身份配置</h3>
        <button class="btn btn-outline btn-sm" on:click={resetReplyIdentities}>恢复默认</button>
      </div>
      
      <div class="identity-list">
        {#each PLATFORMS as platform}
          <div class="identity-item">
            <div class="identity-platform">
              <span class="ip-icon" style="color: {platform.color}">{platform.icon}</span>
              <span class="ip-name">{platform.name}</span>
            </div>
            
            <div class="identity-config">
              <div class="config-item">
                <label>账号类型</label>
                <select 
                  value={$settings.replyIdentities[platform.id]?.type || 'official'}
                  on:change={(e) => updateReplyIdentity(platform.id, 'type', e.target.value)}
                >
                  <option value="official">官方账号</option>
                  <option value="personal">个人账号</option>
                </select>
              </div>
              
              <div class="config-item">
                <label>回复前缀</label>
                <input 
                  type="text"
                  value={$settings.replyIdentities[platform.id]?.prefix || ''}
                  on:input={(e) => updateReplyIdentity(platform.id, 'prefix', e.target.value)}
                  placeholder="如：官方、小编 等"
                />
              </div>
              
              <div class="config-item preview">
                <label>预览效果</label>
                <span class="identity-preview">
                  {$settings.replyIdentities[platform.id]?.prefix || ''}
                  {$settings.replyIdentities[platform.id]?.type === 'official' ? '官方回复' : ''}
                </span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if activeTab === 'tags'}
    <div class="settings-section">
      <div class="section-header">
        <h3 class="section-title">内容标签管理</h3>
      </div>
      
      <div class="tag-add-form">
        <input 
          type="text" 
          bind:value={newTagName}
          placeholder="输入新标签名称..."
          class="tag-input"
        />
        <input type="color" bind:value={newTagColor} class="color-input" />
        <button class="btn btn-primary btn-sm" on:click={addTag}>添加</button>
      </div>
      
      <div class="tag-list">
        {#each $tags as tag}
          <div class="tag-item" style="border-color: {tag.color}">
            <span class="tag-color" style="background: {tag.color}"></span>
            <span class="tag-name">{tag.name}</span>
            <button class="tag-remove" on:click={() => removeTag(tag.id)}>✕</button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if activeTab === 'import'}
    <div class="settings-section">
      <h3 class="section-title">导入历史数据</h3>
      <p class="section-desc">
        支持从老系统导出的 JSON 文件导入数据。文件需包含 contents、images、fans、comments 等字段。
      </p>
      
      <div class="import-form">
        <div class="file-input-wrapper">
          <input 
            type="file" 
            accept=".json"
            on:change={handleFileSelect}
            id="importFile"
            class="file-input"
          />
          <label for="importFile" class="file-label">
            <span class="file-icon">📁</span>
            <span>{importFile ? importFile.name : '点击选择 JSON 文件'}</span>
          </label>
        </div>
        
        <button class="btn btn-primary" on:click={handleImport} disabled={!importFile}>
          开始导入
        </button>
      </div>
      
      <div class="import-tips">
        <h4>导入说明</h4>
        <ul>
          <li>支持导入内容、图片、粉丝数据、评论等</li>
          <li>图片数据以 base64 格式存储在 IndexedDB 中</li>
          <li>已有相同 ID 的数据会被跳过</li>
          <li>建议导入前先备份现有数据</li>
        </ul>
      </div>
    </div>
  {/if}

  {#if activeTab === 'export'}
    <div class="settings-section">
      <h3 class="section-title">数据导出</h3>
      
      <div class="export-options">
        <div class="export-card">
          <div class="export-icon">📅</div>
          <div class="export-info">
            <h4>排期表 CSV</h4>
            <p>导出所有内容排期为 CSV 表格，用于每周例会汇报</p>
          </div>
          <button class="btn btn-outline" on:click={exportScheduleCSV}>导出 CSV</button>
        </div>
        
        <div class="export-card">
          <div class="export-icon">📝</div>
          <div class="export-info">
            <h4>内容数据 JSON</h4>
            <p>仅导出内容数据，不含图片等大文件</p>
          </div>
          <button class="btn btn-outline" on:click={exportContentsJSON}>导出 JSON</button>
        </div>
        
        <div class="export-card highlight">
          <div class="export-icon">💾</div>
          <div class="export-info">
            <h4>完整数据备份</h4>
            <p>导出所有数据（内容、图片、粉丝、评论等），建议定期备份</p>
          </div>
          <button class="btn btn-primary" on:click={exportAllData}>导出完整备份</button>
        </div>
      </div>
      
      <div class="export-stats">
        <h4>当前数据统计</h4>
        <div class="stats-grid">
          <div class="stat-box">
            <span class="stat-num">{$contents.length}</span>
            <span class="stat-label">内容数</span>
          </div>
          <div class="stat-box">
            <span class="stat-num">{$images.length}</span>
            <span class="stat-label">图片数</span>
          </div>
          <div class="stat-box">
            <span class="stat-num">{$fans.length}</span>
            <span class="stat-label">粉丝记录</span>
          </div>
          <div class="stat-box">
            <span class="stat-num">{$comments.length}</span>
            <span class="stat-label">评论数</span>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if activeTab === 'backup'}
    <div class="settings-section">
      <h3 class="section-title">备份提醒设置</h3>
      <p class="section-desc">
        系统会在每周五下午弹窗提醒备份数据到 U 盘，防止 IndexedDB 数据丢失。
      </p>
      
      <div class="backup-settings">
        <div class="setting-item">
          <div class="setting-info">
            <h4>备份提醒</h4>
            <p>每周五下午提醒导出数据备份</p>
          </div>
          <label class="switch">
            <input type="checkbox" checked={true} disabled />
            <span class="slider"></span>
          </label>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <h4>上次提醒</h4>
            <p>{$settings.lastBackupReminder || '还没有提醒过'}</p>
          </div>
        </div>
      </div>
      
      <div class="backup-actions">
        <button class="btn btn-outline" on:click={testBackupReminder}>
          测试备份提醒
        </button>
        <button class="btn btn-primary" on:click={exportAllData}>
          立即备份
        </button>
      </div>
      
      <div class="warning-box">
        <p class="warning-icon">⚠️</p>
        <div class="warning-text">
          <p><strong>重要提示</strong></p>
          <p>所有数据都存储在浏览器的 IndexedDB 中，如果浏览器被卸载、缓存被清除或更换设备，数据将会丢失。</p>
          <p>建议定期将数据导出备份到 U 盘或云盘。</p>
        </div>
      </div>
    </div>
  {/if}
</div>

{#if showConfirmModal}
  <Modal title="确认备份" width="360px" on:close={handleCancel}>
    <div class="confirm-content">
      <p>是否现在导出完整数据备份？</p>
      <p class="confirm-tip">建议将备份文件保存到 U 盘。</p>
    </div>
    <span slot="footer">
      <button class="btn btn-secondary" on:click={handleCancel}>稍后再说</button>
      <button class="btn btn-primary" on:click={handleConfirm}>立即备份</button>
    </span>
  </Modal>
{/if}

{#if showImportResult && importResult}
  <Modal 
    title={importResult.success ? '导入成功' : '导入失败'} 
    width="360px" 
    on:close={closeImportResult}
  >
    <div class="import-result">
      <p class="result-icon">{importResult.success ? '✅' : '❌'}</p>
      <p>{importResult.message}</p>
    </div>
    <span slot="footer">
      <button class="btn btn-primary" on:click={closeImportResult}>确定</button>
    </span>
  </Modal>
{/if}

<style>
  .settings-view {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .view-header {
    background: white;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .view-title {
    margin: 0 0 14px;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
  }

  .tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid #e5e7eb;
  }

  .tab-btn {
    padding: 10px 18px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 14px;
    color: #6b7280;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
  }

  .tab-btn.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
    font-weight: 500;
  }

  .settings-section {
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .section-title {
    margin: 0 0 16px;
    font-size: 15px;
    font-weight: 600;
    color: #111827;
  }

  .section-header .section-title {
    margin-bottom: 0;
  }

  .section-desc {
    font-size: 13px;
    color: #6b7280;
    margin: 0 0 20px;
    line-height: 1.6;
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

  .btn-sm {
    padding: 6px 14px;
    font-size: 12px;
  }

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .btn-outline {
    background: white;
    border: 1px solid #d1d5db;
    color: #4b5563;
  }

  .btn-outline:hover {
    background: #f9fafb;
  }

  .btn-secondary {
    background: #e5e7eb;
    color: #374151;
  }

  .btn-secondary:hover {
    background: #d1d5db;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .identity-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .identity-item {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 14px;
    background: #f9fafb;
    border-radius: 8px;
  }

  .identity-platform {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 120px;
    padding-top: 4px;
  }

  .ip-icon {
    font-size: 20px;
  }

  .ip-name {
    font-weight: 500;
    font-size: 14px;
    color: #374151;
  }

  .identity-config {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }

  .config-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .config-item label {
    font-size: 12px;
    color: #6b7280;
  }

  .config-item input,
  .config-item select {
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
  }

  .config-item.preview {
    justify-content: flex-end;
  }

  .identity-preview {
    display: inline-block;
    padding: 6px 12px;
    background: #dcfce7;
    color: #16a34a;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }

  .tag-add-form {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }

  .tag-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
  }

  .color-input {
    width: 40px;
    height: 38px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    cursor: pointer;
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .tag-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 20px;
    background: white;
  }

  .tag-color {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .tag-name {
    font-size: 14px;
    color: #374151;
  }

  .tag-remove {
    border: none;
    background: none;
    color: #9ca3af;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 50%;
  }

  .tag-remove:hover {
    background: #f3f4f6;
    color: #ef4444;
  }

  .import-form {
    display: flex;
    gap: 16px;
    align-items: flex-end;
    margin-bottom: 24px;
  }

  .file-input-wrapper {
    flex: 1;
  }

  .file-input {
    display: none;
  }

  .file-label {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    cursor: pointer;
    color: #6b7280;
    transition: all 0.2s;
  }

  .file-label:hover {
    border-color: #3b82f6;
    color: #3b82f6;
    background: #eff6ff;
  }

  .file-icon {
    font-size: 20px;
  }

  .import-tips {
    padding: 14px 18px;
    background: #fefce8;
    border-radius: 8px;
  }

  .import-tips h4 {
    margin: 0 0 8px;
    font-size: 13px;
    color: #854d0e;
  }

  .import-tips ul {
    margin: 0;
    padding-left: 20px;
    font-size: 12px;
    color: #854d0e;
    line-height: 1.8;
  }

  .export-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }

  .export-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: white;
  }

  .export-card.highlight {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .export-icon {
    font-size: 32px;
  }

  .export-info {
    flex: 1;
  }

  .export-info h4 {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 600;
    color: #111827;
  }

  .export-info p {
    margin: 0;
    font-size: 12px;
    color: #6b7280;
  }

  .export-stats h4 {
    margin: 0 0 12px;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .stat-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 14px;
    background: #f9fafb;
    border-radius: 8px;
  }

  .stat-num {
    font-size: 24px;
    font-weight: 700;
    color: #111827;
  }

  .stat-label {
    font-size: 12px;
    color: #6b7280;
    margin-top: 4px;
  }

  .backup-settings {
    margin-bottom: 24px;
  }

  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 0;
    border-bottom: 1px solid #f3f4f6;
  }

  .setting-item:last-child {
    border-bottom: none;
  }

  .setting-info h4 {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 500;
    color: #111827;
  }

  .setting-info p {
    margin: 0;
    font-size: 12px;
    color: #6b7280;
  }

  .switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
  }

  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #d1d5db;
    transition: .4s;
    border-radius: 24px;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: .4s;
    border-radius: 50%;
  }

  input:checked + .slider {
    background-color: #3b82f6;
  }

  input:checked + .slider:before {
    transform: translateX(20px);
  }

  .backup-actions {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
  }

  .warning-box {
    display: flex;
    gap: 14px;
    padding: 16px;
    background: #fef2f2;
    border-radius: 8px;
    border-left: 4px solid #ef4444;
  }

  .warning-icon {
    font-size: 28px;
    margin: 0;
  }

  .warning-text p {
    margin: 4px 0;
    font-size: 13px;
    color: #991b1b;
    line-height: 1.6;
  }

  .warning-text p:first-child {
    font-weight: 600;
  }

  .confirm-content,
  .import-result {
    text-align: center;
    padding: 10px 0;
  }

  .confirm-content p {
    margin: 8px 0;
    color: #374151;
  }

  .confirm-tip {
    font-size: 13px;
    color: #6b7280 !important;
  }

  .result-icon {
    font-size: 48px;
    margin: 0 0 16px;
  }

  .import-result p {
    margin: 0;
    color: #374151;
  }
</style>
