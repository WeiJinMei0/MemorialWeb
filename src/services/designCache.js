import localforage from 'localforage';
import designService from './designService';

/**
 * Design Cache Manager using IndexedDB (via localforage)
 * 
 * Cache Strategy:
 * 1. On login: fetch all designs from server and cache locally
 * 2. On save: save to local cache first, then async sync to server
 * 3. On load: read from cache first, fallback to server
 * 4. IndexedDB supports large data (hundreds of MB)
 */

// Configure localforage to use IndexedDB
localforage.config({
  driver: localforage.INDEXEDDB,
  name: 'MemorialDesigner',
  storeName: 'designs',
  description: 'Design cache storage'
});

const CACHE_KEYS = {
  DESIGNS: 'designs',           // Design list
  DETAIL_PREFIX: 'detail_',     // Design details (detail_123, detail_456, etc.)
  LAST_SYNC: 'lastSyncTime',
  PENDING_SYNC: 'pendingSync',
  PENDING_DELETE: 'pendingDelete'
};

class DesignCache {
  constructor() {
    // Memory cache for fast access
    this.cache = {
      designs: [],
      detailMap: {},
      lastSyncTime: null,
      pendingSync: [],
      pendingDelete: [],
    };
    
    this.syncTimer = null;
    this.isInitialized = false;
    this.isSyncing = false;
  }

  /**
   * Initialize cache from IndexedDB
   */
  async init() {
    if (this.isInitialized) return;
    
    try {
      // Load from IndexedDB to memory
      const [designs, lastSyncTime, pendingSync, pendingDelete] = await Promise.all([
        localforage.getItem(CACHE_KEYS.DESIGNS),
        localforage.getItem(CACHE_KEYS.LAST_SYNC),
        localforage.getItem(CACHE_KEYS.PENDING_SYNC),
        localforage.getItem(CACHE_KEYS.PENDING_DELETE)
      ]);

      this.cache.designs = designs || [];
      this.cache.lastSyncTime = lastSyncTime;
      this.cache.pendingSync = pendingSync || [];
      this.cache.pendingDelete = pendingDelete || [];
      
      this.isInitialized = true;
      console.log('Design cache initialized from IndexedDB');
    } catch (error) {
      console.error('Failed to init design cache:', error);
      this.isInitialized = true; // Mark as initialized even on error
    }
  }

  /**
   * Save cache to IndexedDB
   */
  async persistCache() {
    try {
      await Promise.all([
        localforage.setItem(CACHE_KEYS.DESIGNS, this.cache.designs),
        localforage.setItem(CACHE_KEYS.LAST_SYNC, this.cache.lastSyncTime),
        localforage.setItem(CACHE_KEYS.PENDING_SYNC, this.cache.pendingSync),
        localforage.setItem(CACHE_KEYS.PENDING_DELETE, this.cache.pendingDelete)
      ]);
    } catch (error) {
      console.error('Failed to persist design cache:', error);
    }
  }

  /**
   * Save design detail to IndexedDB
   */
  async persistDetail(designId, detail) {
    try {
      await localforage.setItem(CACHE_KEYS.DETAIL_PREFIX + designId, detail);
      this.cache.detailMap[designId] = detail;
    } catch (error) {
      console.error('Failed to persist design detail:', error);
    }
  }

  /**
   * Get design detail from IndexedDB
   */
  async getDetailFromDB(designId) {
    try {
      return await localforage.getItem(CACHE_KEYS.DETAIL_PREFIX + designId);
    } catch (error) {
      console.error('Failed to get design detail from DB:', error);
      return null;
    }
  }

  /**
   * Sync all designs from server (call on login)
   */
  async syncFromServer(forceRefresh = false) {
    await this.init();
    
    // Skip if recently synced (within 5 minutes) and not forced
    const fiveMinutes = 5 * 60 * 1000;
    if (!forceRefresh && this.cache.lastSyncTime && 
        Date.now() - this.cache.lastSyncTime < fiveMinutes) {
      return this.cache.designs;
    }

    // Prevent concurrent sync requests
    if (this.isSyncing) {
      return new Promise((resolve) => {
        const checkSync = setInterval(() => {
          if (!this.isSyncing) {
            clearInterval(checkSync);
            resolve(this.cache.designs);
          }
        }, 100);
      });
    }

    this.isSyncing = true;

    try {
      const response = await designService.list({ page: 1, pageSize: 1000 });
      
      if (response.data && response.data.items) {
        this.cache.designs = response.data.items.map(item => ({
          id: item.id,
          name: item.name,
          thumbnail: item.previewUrl,
          timestamp: item.updatedAt,
          type: item.type,
          isSynced: true
        }));
        
        this.cache.lastSyncTime = Date.now();
        await this.persistCache();
      }
      
      return this.cache.designs;
    } catch (error) {
      console.error('Failed to sync from server:', error);
      return this.cache.designs;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get all designs from cache
   */
  getDesigns() {
    return this.cache.designs;
  }

  /**
   * Get design detail from cache or server
   */
  async getDetail(designId) {
    await this.init();
    
    // Check memory cache first
    if (this.cache.detailMap[designId]) {
      return this.cache.detailMap[designId];
    }

    // Check IndexedDB
    const cachedDetail = await this.getDetailFromDB(designId);
    if (cachedDetail) {
      this.cache.detailMap[designId] = cachedDetail;
      return cachedDetail;
    }

    // Fetch from server and cache
    try {
      const response = await designService.getDetail(designId);
      
      if (response.data && response.data.data) {
        const designData = response.data.data;
        
        const fullDesign = {
          monuments: designData.monuments || [],
          bases: designData.bases || [],
          subBases: designData.subBases || [],
          artElements: designData.artElements || [],
          vases: designData.vases || [],
          texts: designData.texts || [],
          textElements: designData.textElements || [],
          currentMaterial: designData.currentMaterial || null,
          ...designData,
          id: response.data.id,
          name: response.data.name,
          thumbnail: response.data.previewUrl,
          isSynced: true
        };
        
        // Cache to IndexedDB
        await this.persistDetail(designId, fullDesign);
        
        return fullDesign;
      } else {
        console.error('Invalid design data from server:', response.data);
        return null;
      }
    } catch (error) {
      console.error('Failed to get design detail:', error);
      throw error;
    }
  }

  /**
   * Save design to cache and immediately sync to server
   */
  async saveDesign(designData) {
    await this.init();
    
    const isNew = !designData.id || designData.id.toString().startsWith('local-');
    const localId = isNew ? `local-${Date.now()}` : designData.id;
    
    const designToCache = {
      ...designData,
      id: localId,
      timestamp: new Date().toISOString(),
      isSynced: false
    };

    // Save to memory and IndexedDB
    this.cache.detailMap[localId] = designToCache;
    await this.persistDetail(localId, designToCache);

    // Update list cache
    const existingIndex = this.cache.designs.findIndex(d => d.id === localId);
    const listItem = {
      id: localId,
      name: designData.name,
      thumbnail: designData.previewUrl || designData.thumbnail,
      timestamp: designToCache.timestamp,
      type: designData.type || 'memorial',
      isSynced: false
    };

    if (existingIndex >= 0) {
      this.cache.designs[existingIndex] = listItem;
    } else {
      this.cache.designs.unshift(listItem);
    }

    await this.persistCache();

    // Immediately sync to server
    try {
      let response;
      
      if (isNew) {
        response = await designService.create({
          name: designData.name,
          description: designData.description || '',
          type: designData.type || 'memorial',
          data: this.extractDesignData(designToCache),
          previewUrl: designData.thumbnail || designData.previewUrl
        });

        if (response.data) {
          const serverId = response.data.id;
          
          // Update cache with server ID
          designToCache.id = serverId;
          designToCache.isSynced = true;
          
          // Remove old local entry, add new server entry
          delete this.cache.detailMap[localId];
          this.cache.detailMap[serverId] = designToCache;
          await localforage.removeItem(CACHE_KEYS.DETAIL_PREFIX + localId);
          await this.persistDetail(serverId, designToCache);

          // Update list cache
          const listIndex = this.cache.designs.findIndex(d => d.id === localId);
          if (listIndex >= 0) {
            this.cache.designs[listIndex].id = serverId;
            this.cache.designs[listIndex].isSynced = true;
          }
          
          await this.persistCache();
          return { localId: serverId, design: designToCache };
        }
      } else {
        response = await designService.update(localId, {
          name: designData.name,
          description: designData.description || '',
          type: designData.type || 'memorial',
          data: this.extractDesignData(designToCache),
          previewUrl: designData.thumbnail || designData.previewUrl
        });

        if (response.data) {
          designToCache.isSynced = true;
          this.cache.detailMap[localId] = designToCache;
          await this.persistDetail(localId, designToCache);
          
          const listIndex = this.cache.designs.findIndex(d => d.id === localId);
          if (listIndex >= 0) {
            this.cache.designs[listIndex].isSynced = true;
          }
          await this.persistCache();
        }
      }
    } catch (error) {
      console.error('Failed to sync design to server:', error);
      // Add to pending sync for later retry
      if (!this.cache.pendingSync.includes(localId)) {
        this.cache.pendingSync.push(localId);
        await this.persistCache();
      }
      throw error;
    }

    return { localId, design: designToCache };
  }

  /**
   * Extract design state data (without metadata)
   */
  extractDesignData(design) {
    const { id, name, thumbnail, previewUrl, timestamp, isSynced, type, description, ...designData } = design;
    return designData;
  }

  /**
   * Delete design from cache and server
   */
  async deleteDesign(designId) {
    await this.init();
    
    // Remove from memory cache
    delete this.cache.detailMap[designId];
    this.cache.designs = this.cache.designs.filter(d => d.id !== designId);
    
    // Remove from IndexedDB
    await localforage.removeItem(CACHE_KEYS.DETAIL_PREFIX + designId);
    await this.persistCache();

    // Delete from server if it's a server ID
    if (!designId.toString().startsWith('local-')) {
      try {
        await designService.delete(designId);
      } catch (error) {
        console.error('Failed to delete design from server:', error);
        if (!this.cache.pendingDelete.includes(designId)) {
          this.cache.pendingDelete.push(designId);
          await this.persistCache();
        }
        throw error;
      }
    }
  }

  /**
   * Force sync pending operations
   */
  async forceSync() {
    await this.init();
    
    // Process pending syncs
    for (const localId of [...this.cache.pendingSync]) {
      const design = this.cache.detailMap[localId] || await this.getDetailFromDB(localId);
      if (design) {
        try {
          const isNew = localId.toString().startsWith('local-');
          if (isNew) {
            const response = await designService.create({
              name: design.name,
              description: design.description || '',
              type: design.type || 'memorial',
              data: this.extractDesignData(design),
              previewUrl: design.thumbnail || design.previewUrl
            });
            if (response.data) {
              const serverId = response.data.id;
              design.id = serverId;
              design.isSynced = true;
              delete this.cache.detailMap[localId];
              this.cache.detailMap[serverId] = design;
              await localforage.removeItem(CACHE_KEYS.DETAIL_PREFIX + localId);
              await this.persistDetail(serverId, design);
              
              const listIndex = this.cache.designs.findIndex(d => d.id === localId);
              if (listIndex >= 0) {
                this.cache.designs[listIndex].id = serverId;
                this.cache.designs[listIndex].isSynced = true;
              }
            }
          } else {
            await designService.update(localId, {
              name: design.name,
              description: design.description || '',
              type: design.type || 'memorial',
              data: this.extractDesignData(design),
              previewUrl: design.thumbnail || design.previewUrl
            });
            design.isSynced = true;
            await this.persistDetail(localId, design);
          }
          this.cache.pendingSync = this.cache.pendingSync.filter(id => id !== localId);
        } catch (error) {
          console.error(`Failed to sync design ${localId}:`, error);
        }
      }
    }

    // Process pending deletes
    for (const designId of [...this.cache.pendingDelete]) {
      try {
        await designService.delete(designId);
        this.cache.pendingDelete = this.cache.pendingDelete.filter(id => id !== designId);
      } catch (error) {
        console.error(`Failed to delete design ${designId}:`, error);
      }
    }

    await this.persistCache();
  }

  /**
   * Clear all cache (call on logout)
   */
  async clearCache() {
    this.cache = {
      designs: [],
      detailMap: {},
      lastSyncTime: null,
      pendingSync: [],
      pendingDelete: [],
    };
    
    try {
      await localforage.clear();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
    
    this.isInitialized = false;
  }

  /**
   * Check if there are pending changes
   */
  hasPendingChanges() {
    return this.cache.pendingSync.length > 0 || this.cache.pendingDelete.length > 0;
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      pendingSyncCount: this.cache.pendingSync.length,
      pendingDeleteCount: this.cache.pendingDelete.length,
      lastSyncTime: this.cache.lastSyncTime
    };
  }
}

// Export singleton instance
const designCache = new DesignCache();
export default designCache;
