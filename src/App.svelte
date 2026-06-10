<script>
  import { onMount } from 'svelte'
  import { currentUser, loadAllData, settings } from './lib/store'
  import Sidebar from './components/Sidebar.svelte'
  import ScheduleView from './views/ScheduleView.svelte'
  import ContentListView from './views/ContentListView.svelte'
  import AnalyticsView from './views/AnalyticsView.svelte'
  import CommentsView from './views/CommentsView.svelte'
  import SettingsView from './views/SettingsView.svelte'
  import Modal from './components/Modal.svelte'
  import { isFridayAfternoon, isEveningEight, formatDate } from './lib/utils'
  import { getByIndex } from './lib/db'

  let currentView = 'schedule'
  let showBackupReminder = false
  let showPublishReminder = false
  let pendingPublishCount = 0

  function handleNavChange(e) {
    currentView = e.detail
  }

  async function checkReminders() {
    const settingsValue = {}
    settings.subscribe(v => Object.assign(settingsValue, v))()

    if (isFridayAfternoon()) {
      const lastReminder = settingsValue.lastBackupReminder
      const today = formatDate(new Date())
      if (lastReminder !== today) {
        showBackupReminder = true
        settings.update(s => ({ ...s, lastBackupReminder: today }))
      }
    }

    if (isEveningEight()) {
      const allContents = await getByIndex('contents', 'status', 'approved')
      const today = formatDate(new Date())
      const todaysApproved = allContents.filter(c => c.date === today)
      if (todaysApproved.length > 0) {
        pendingPublishCount = todaysApproved.length
        showPublishReminder = true
      }
    }
  }

  function dismissBackupReminder() {
    showBackupReminder = false
  }

  function dismissPublishReminder() {
    showPublishReminder = false
  }

  async function confirmAllPublished() {
    showPublishReminder = false
  }

  onMount(async () => {
    await loadAllData()
    checkReminders()
    
    setInterval(checkReminders, 60000)
  })
</script>

<div class="app">
  <Sidebar {currentView} on:navChange={handleNavChange} />
  
  <main class="main-content">
    {#if currentView === 'schedule'}
      <ScheduleView />
    {:else if currentView === 'contents'}
      <ContentListView />
    {:else if currentView === 'analytics'}
      <AnalyticsView />
    {:else if currentView === 'comments'}
      <CommentsView />
    {:else if currentView === 'settings'}
      <SettingsView />
    {/if}
  </main>
</div>

{#if showBackupReminder}
  <Modal title="数据备份提醒" onClose={dismissBackupReminder}>
    <div class="reminder-content">
      <p class="reminder-icon">💾</p>
      <p>周五下午了，建议导出数据备份到 U 盘！</p>
      <p class="reminder-desc">IndexedDB 数据在浏览器清缓存后会丢失，定期备份很重要。</p>
      <div class="reminder-actions">
        <button class="btn btn-primary" on:click={dismissBackupReminder}>知道了</button>
      </div>
    </div>
  </Modal>
{/if}

{#if showPublishReminder}
  <Modal title="发布提醒" onClose={dismissPublishReminder}>
    <div class="reminder-content">
      <p class="reminder-icon">📢</p>
      <p>今天还有 <strong>{pendingPublishCount}</strong> 条已审内容未标记已发</p>
      <p class="reminder-desc">是否确认都已经在各平台发布完成了吗？</p>
      <div class="reminder-actions">
        <button class="btn btn-secondary" on:click={dismissPublishReminder}>稍后再说</button>
        <button class="btn btn-primary" on:click={confirmAllPublished}>去查看</button>
      </div>
    </div>
  </Modal>
{/if}

<style>
  .app {
    display: flex;
    height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: #f5f7fa;
  }

  .main-content {
    flex: 1;
    overflow: auto;
    padding: 24px;
  }

  .reminder-content {
    text-align: center;
    padding: 20px 0;
  }

  .reminder-icon {
    font-size: 48px;
    margin: 0 0 16px;
  }

  .reminder-content p {
    margin: 8px 0;
    color: #374151;
  }

  .reminder-desc {
    font-size: 14px;
    color: #6b7280 !important;
  }

  .reminder-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 24px;
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

  .btn-primary {
    background: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background: #2563eb;
  }

  .btn-secondary {
    background: #e5e7eb;
    color: #374151;
  }

  .btn-secondary:hover {
    background: #d1d5db;
  }

  :global(body) {
    margin: 0;
    padding: 0;
  }

  :global(*) {
    box-sizing: border-box;
  }
</style>
