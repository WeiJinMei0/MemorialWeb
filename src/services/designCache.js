import designService from './designService';

/**
 * Design Cache Manager
 * 
 * Cache Strategy:
 * 1. On login: fetch all designs from server and cache locally
 * 2. On save: save to local cache first, then async sync to server
 * 3. On load: read from cache first, fallback to server
 * 4. Debounce server sync to avoid frequent requests
 */

const CACHE_KEY = 'designCache';
const SYNC_DEBOUNCE_MS = 2000; // 2 seconds debounce for server sync

class DesignCache {
  constructor() {
    // Memory cache
    this.cache = {
      designs: [],        // List of design summaries
      detailMap: {},      // id -> full design data
      lastSyncTime: null, // Last server sync timestamp
      pendingSync: [],    // Design IDs pending sync to server
      pendingDelete: [],  // Design IDs pending delete from server
    };
    
    this.syncTimer = null;
    this.isInitialized = false;
    this.isSyncing = false;
  }

  /**
   * Initialize cache from localStorage
   */
  init() {
    if (this.isInitialized) return;
    
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        this.cache = { ...this.cache, ...parsed };
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to init design cache:', error);
    }
  }

  /**
   * Save cache to localStorage
   * Note: detailMap is only kept in memory (not persisted) to avoid quota issues
   */
  persistCache() {
    try {
      // Only persist lightweight data, keep detailMap in memory only
      const cacheToSave = {
        designs: this.cache.designs,
        detailMap: {}, // Don't persist - too large, will be fetched on demand
        lastSyncTime: this.cache.lastSyncTime,
        pendingSync: this.cache.pendingSync,
        pendingDelete: this.cache.pendingDelete,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheToSave));
    } catch (error) {
      console.error('Failed to persist design cache:', error);
    }
  }

  /**
   * Sync all designs from server (call on login)
   */
  async syncFromServer(forceRefresh = false) {
    // Skip if recently synced (within 5 minutes) and not forced
    const fiveMinutes = 5 * 60 * 1000;
    if (!forceRefresh && this.cache.lastSyncTime && 
        Date.now() - this.cache.lastSyncTime < fiveMinutes) {
      return this.cache.designs;
    }

    try {
      // Fetch all designs from server
      const response = await designService.list({ page: 1, pageSize: 1000 });
      
      if (response.data && response.data.items) {
        // Update cache with server data
        this.cache.designs = response.data.items.map(item => ({
          id: item.id,
          name: item.name,
          thumbnail: item.previewUrl,
          timestamp: item.updatedAt,
          type: item.type,
          isSynced: true
        }));
        
        this.cache.lastSyncTime = Date.now();
        this.persistCache();
      }
      
      return this.cache.designs;
    } catch (error) {
      console.error('Failed to sync from server:', error);
      // Return cached data on error
      return this.cache.designs;
    }
  }

  /**
   * Get all designs from cache
   */
  getDesigns() {
    this.init();
    return this.cache.designs;
  }

  /**
   * Get design detail from cache or server
   */
  async getDetail(designId) {
    this.init();
    
    // Check memory cache first
    if (this.cache.detailMap[designId]) {
      return this.cache.detailMap[designId];
    }

    // Fetch from server and cache
    try {
      const response = await designService.getDetail(designId);
      
      if (response.data && response.data.data) {
        // response.data.data contains the actual design state (monuments, bases, etc.)
        const designData = response.data.data;
        
        const fullDesign = {
          // Core design state fields
          monuments: designData.monuments || [],
          bases: designData.bases || [],
          subBases: designData.subBases || [],
          artElements: designData.artElements || [],
          vases: designData.vases || [],
          texts: designData.texts || [],
          textElements: designData.textElements || [],
          currentMaterial: designData.currentMaterial || null,
          // Spread any other design data
          ...designData,
          // Metadata
          id: response.data.id,
          name: response.data.name,
          thumbnail: response.data.previewUrl,
          isSynced: true
        };
        
        // Cache the detail
        this.cache.detailMap[designId] = fullDesign;
        this.persistCache();
        
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
    this.init();
    
    const isNew = !designData.id || designData.id.toString().startsWith('local-');
    const localId = isNew ? `local-${Date.now()}` : designData.id;
    
    const designToCache = {
      ...designData,
      id: localId,
      timestamp: new Date().toISOString(),
      isSynced: false
    };

    // Save to detail cache
    this.cache.detailMap[localId] = designToCache;

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

    this.persistCache();

    // Immediately sync to server (not deferred)
    try {
      let response;
      
      if (isNew) {
        // Create new design on server
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
          delete this.cache.detailMap[localId];
          this.cache.detailMap[serverId] = designToCache;

          // Update list cache
          const listIndex = this.cache.designs.findIndex(d => d.id === localId);
          if (listIndex >= 0) {
            this.cache.designs[listIndex].id = serverId;
            this.cache.designs[listIndex].isSynced = true;
          }
          
          this.persistCache();
          return { localId: serverId, design: designToCache };
        }
      } else {
        // Update existing design on server
        response = await designService.update(localId, {
          name: designData.name,
          description: designData.description || '',
          type: designData.type || 'memorial',
          data: this.extractDesignData(designToCache),
          previewUrl: designData.thumbnail || designData.previewUrl
        });

        if (response.data) {
          designToCache.isSynced = true;
          const listIndex = this.cache.designs.findIndex(d => d.id === localId);
          if (listIndex >= 0) {
            this.cache.designs[listIndex].isSynced = true;
          }
          this.persistCache();
        }
      }
    } catch (error) {
      console.error('Failed to sync design to server:', error);
      // Mark as pending sync for retry
      if (!this.cache.pendingSync.includes(localId)) {
        this.cache.pendingSync.push(localId);
      }
      this.persistCache();
      throw error;
    }

    return { localId, design: designToCache };
  }

  /**
   * Schedule server sync with debounce
   */
  scheduleSyncToServer() {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    this.syncTimer = setTimeout(() => {
      this.syncToServer();
    }, SYNC_DEBOUNCE_MS);
  }

  /**
   * Sync pending changes to server
   */
  async syncToServer() {
    if (this.isSyncing || this.cache.pendingSync.length === 0) {
      return;
    }

    this.isSyncing = true;

    try {
      // Process pending saves
      const pendingIds = [...this.cache.pendingSync];
      
      for (const localId of pendingIds) {
        const design = this.cache.detailMap[localId];
        if (!design) continue;

        try {
          let response;
          const isLocalId = localId.toString().startsWith('local-');

          if (isLocalId) {
            // Create new design on server
            response = await designService.create({
              name: design.name,
              description: design.description || '',
              type: design.type || 'memorial',
              data: this.extractDesignData(design),
              previewUrl: design.thumbnail || design.previewUrl
            });

            if (response.data) {
              const serverId = response.data.id;
              
              // Update cache with server ID
              design.id = serverId;
              design.isSynced = true;
              delete this.cache.detailMap[localId];
              this.cache.detailMap[serverId] = design;

              // Update list cache
              const listIndex = this.cache.designs.findIndex(d => d.id === localId);
              if (listIndex >= 0) {
                this.cache.designs[listIndex].id = serverId;
                this.cache.designs[listIndex].isSynced = true;
              }
            }
          } else {
            // Update existing design on server
            response = await designService.update(localId, {
              name: design.name,
              description: design.description || '',
              type: design.type || 'memorial',
              data: this.extractDesignData(design),
              previewUrl: design.thumbnail || design.previewUrl
            });

            if (response.data) {
              design.isSynced = true;
              const listIndex = this.cache.designs.findIndex(d => d.id === localId);
              if (listIndex >= 0) {
                this.cache.designs[listIndex].isSynced = true;
              }
            }
          }

          // Remove from pending
          this.cache.pendingSync = this.cache.pendingSync.filter(id => id !== localId);
        } catch (error) {
          console.error(`Failed to sync design ${localId}:`, error);
          // Keep in pending for retry
        }
      }

      // Process pending deletes
      const pendingDeletes = [...this.cache.pendingDelete];
      for (const designId of pendingDeletes) {
        try {
          await designService.delete(designId);
          this.cache.pendingDelete = this.cache.pendingDelete.filter(id => id !== designId);
        } catch (error) {
          console.error(`Failed to delete design ${designId}:`, error);
        }
      }

      this.persistCache();
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Extract design state data (without metadata)
   */
  extractDesignData(design) {
    const { id, name, thumbnail, previewUrl, timestamp, isSynced, type, description, ...designData } = design;
    return designData;
  }

  /**
   * Delete design from cache and server (immediate sync)
   */
  async deleteDesign(designId) {
    this.init();

    const isLocalId = designId.toString().startsWith('local-');

    // Remove from cache immediately
    delete this.cache.detailMap[designId];
    this.cache.designs = this.cache.designs.filter(d => d.id !== designId);
    this.cache.pendingSync = this.cache.pendingSync.filter(id => id !== designId);
    this.persistCache();

    // If it's a server ID, delete from server immediately (not deferred)
    if (!isLocalId) {
      try {
        await designService.delete(designId);
        console.log(`Design ${designId} deleted from server`);
      } catch (error) {
        console.error(`Failed to delete design ${designId} from server:`, error);
        // Add to pending delete for retry later
        if (!this.cache.pendingDelete.includes(designId)) {
          this.cache.pendingDelete.push(designId);
          this.persistCache();
        }
        throw error; // Re-throw so caller knows it failed
      }
    }
  }

  /**
   * Force immediate sync to server
   */
  async forceSync() {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
    await this.syncToServer();
  }

  /**
   * Clear all cache (call on logout)
   */
  clearCache() {
    this.cache = {
      designs: [],
      detailMap: {},
      lastSyncTime: null,
      pendingSync: [],
      pendingDelete: [],
    };
    localStorage.removeItem(CACHE_KEY);
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
