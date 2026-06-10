<script>
  import { currentUser, users, isAdmin } from '../lib/store'
  import { USER_ROLES } from '../constants'

  export let currentView

  const navItems = [
    { id: 'schedule', name: '排期看板', icon: '📅' },
    { id: 'contents', name: '内容管理', icon: '📝' },
    { id: 'analytics', name: '数据分析', icon: '📊' },
    { id: 'comments', name: '评论管理', icon: '💬' },
    { id: 'settings', name: '系统设置', icon: '⚙️' }
  ]

  let showUserMenu = false

  function handleNav(item) {
    dispatch('navChange', item.id)
  }

  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()

  function switchUser(user) {
    currentUser.set(user)
    showUserMenu = false
  }

  function toggleUserMenu() {
    showUserMenu = !showUserMenu
  }

  function handleClickOutside() {
    showUserMenu = false
  }
</script>

<aside class="sidebar">
  <div class="logo">
    <span class="logo-icon">📱</span>
    <span class="logo-text">社媒排期</span>
  </div>

  <nav class="nav">
    {#each navItems as item}
      <button 
        class="nav-item {currentView === item.id ? 'active' : ''}"
        on:click={() => handleNav(item)}
      >
        <span class="nav-icon">{item.icon}</span>
        <span class="nav-name">{item.name}</span>
      </button>
    {/each}
  </nav>

  <div class="user-section" on:click|self={handleClickOutside}>
    <button class="user-btn" on:click={toggleUserMenu}>
      <span class="user-avatar">{$currentUser?.avatar}</span>
      <div class="user-info">
        <span class="user-name">{$currentUser?.name}</span>
        <span class="user-role">
          {$currentUser?.role === 'admin' ? '管理员' : '编辑'}
        </span>
      </div>
      <span class="arrow">{showUserMenu ? '▲' : '▼'}</span>
    </button>

    {#if showUserMenu}
      <div class="user-menu">
        <div class="menu-title">切换用户</div>
        {#each $users as user}
          <button 
            class="menu-item {$currentUser?.id === user.id ? 'active' : ''}"
            on:click={() => switchUser(user)}
          >
            <span class="menu-avatar">{user.avatar}</span>
            <span class="menu-name">{user.name}</span>
            <span class="menu-role">{user.role === 'admin' ? '管理员' : '编辑'}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</aside>

<style>
  .sidebar {
    width: 220px;
    background: white;
    border-right: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  .logo {
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid #f3f4f6;
  }

  .logo-icon {
    font-size: 24px;
  }

  .logo-text {
    font-size: 18px;
    font-weight: 600;
    color: #111827;
  }

  .nav {
    flex: 1;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border: none;
    background: none;
    border-radius: 8px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
    color: #4b5563;
  }

  .nav-item:hover {
    background: #f3f4f6;
  }

  .nav-item.active {
    background: #eff6ff;
    color: #2563eb;
    font-weight: 500;
  }

  .nav-icon {
    font-size: 18px;
  }

  .nav-name {
    font-size: 14px;
  }

  .user-section {
    padding: 12px;
    border-top: 1px solid #f3f4f6;
    position: relative;
  }

  .user-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px;
    border: none;
    background: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
  }

  .user-btn:hover {
    background: #f3f4f6;
  }

  .user-avatar {
    font-size: 28px;
  }

  .user-info {
    flex: 1;
    text-align: left;
  }

  .user-name {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #111827;
  }

  .user-role {
    font-size: 12px;
    color: #6b7280;
  }

  .arrow {
    font-size: 10px;
    color: #9ca3af;
  }

  .user-menu {
    position: absolute;
    bottom: 100%;
    left: 12px;
    right: 12px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);
    padding: 8px;
    z-index: 100;
  }

  .menu-title {
    font-size: 12px;
    color: #9ca3af;
    padding: 8px 12px;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: none;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
  }

  .menu-item:hover {
    background: #f3f4f6;
  }

  .menu-item.active {
    background: #eff6ff;
  }

  .menu-avatar {
    font-size: 22px;
  }

  .menu-name {
    flex: 1;
    font-size: 14px;
    color: #111827;
  }

  .menu-role {
    font-size: 12px;
    color: #6b7280;
  }
</style>
