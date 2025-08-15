import { SyncMessage, SyncResult, ConflictData, SyncState, SyncStatistics, SyncLog } from './types';

export class BackgroundSyncManager {
  private syncTriggeredListeners: Array<(trigger: string) => void> = [];
  private periodicSyncListeners: Array<(timestamp: number) => void> = [];
  private operationProcessedListeners: Array<(id: string) => void> = [];
  private retryAttemptListeners: Array<(attempt: number) => void> = [];
  private periodicSyncInterval: number | null = null;

  constructor() {
    this.setupEventListeners();
  }

  async initialize(): Promise<void> {
    // Check for pending operations and trigger sync if needed
    const pendingOps = await this.getPendingOperations();
    if (pendingOps.length > 0) {
      this.syncTriggeredListeners.forEach(callback => callback('app-startup'));
    }
  }

  async queueOperation(operation: SyncMessage): Promise<void> {
    // Store operation in IndexedDB (simplified with localStorage for now)
    const queue = this.getOperationQueue();
    queue.push(operation);
    localStorage.setItem('sync-queue', JSON.stringify(queue));

    // Trigger sync for user operations
    this.syncTriggeredListeners.forEach(callback => callback('user-operation'));
  }

  async startPeriodicSync(interval: number): Promise<void> {
    this.periodicSyncInterval = window.setInterval(() => {
      this.periodicSyncListeners.forEach(callback => callback(Date.now()));
    }, interval);
  }

  async stopPeriodicSync(): Promise<void> {
    if (this.periodicSyncInterval !== null) {
      clearInterval(this.periodicSyncInterval);
      this.periodicSyncInterval = null;
    }
  }

  async performIncrementalSync(): Promise<SyncResult> {
    const operations = this.getOperationQueue();
    let processedCount = 0;
    const conflicts: ConflictData[] = [];

    for (const operation of operations) {
      try {
        await this.processOperation(operation);
        processedCount++;
        this.operationProcessedListeners.forEach(callback => callback(operation.id));
      } catch (error) {
        if (error.message.includes('conflict')) {
          conflicts.push(this.createConflictData(operation, error));
        }
      }
    }

    return {
      processed: processedCount,
      conflicts,
      errors: [],
    };
  }

  async performBatchSync(batchSize: number): Promise<SyncResult> {
    const operations = this.getOperationQueue();
    const batches = Math.ceil(operations.length / batchSize);
    let totalProcessed = 0;

    for (let i = 0; i < batches; i++) {
      const batch = operations.slice(i * batchSize, (i + 1) * batchSize);
      
      for (const operation of batch) {
        try {
          await this.processOperation(operation);
          totalProcessed++;
        } catch (error) {
          // Handle error
        }
      }
    }

    return {
      processed: totalProcessed,
      conflicts: [],
      errors: [],
      batches,
      totalProcessed,
    };
  }

  async processQueue(): Promise<void> {
    const operations = this.getOperationQueue()
      .sort((a, b) => {
        // Sort by priority: high -> normal -> low
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const aPriority = priorityOrder[a.priority || 'normal'];
        const bPriority = priorityOrder[b.priority || 'normal'];
        return aPriority - bPriority;
      });

    for (const operation of operations) {
      try {
        await this.processOperation(operation);
        this.operationProcessedListeners.forEach(callback => callback(operation.id));
      } catch (error) {
        // Implement retry logic
        await this.retryOperation(operation);
      }
    }
  }

  async getCompressedSize(operation: SyncMessage): Promise<number> {
    const originalSize = JSON.stringify(operation).length;
    // Simulate compression (assuming 60% compression ratio)
    return Math.floor(originalSize * 0.4);
  }

  async persistState(state: SyncState): Promise<void> {
    localStorage.setItem('sync-state', JSON.stringify(state));
  }

  async getState(): Promise<SyncState> {
    const stored = localStorage.getItem('sync-state');
    return stored ? JSON.parse(stored) : {
      lastSyncTimestamp: 0,
      pendingOperations: 0,
      inProgress: false,
    };
  }

  async getSyncLogs(): Promise<SyncLog[]> {
    const stored = localStorage.getItem('sync-logs');
    return stored ? JSON.parse(stored) : [];
  }

  async getStatistics(): Promise<SyncStatistics> {
    const logs = await this.getSyncLogs();
    const totalOperations = logs.length;
    const successfulOps = logs.filter(log => log.result === 'success').length;
    const avgTime = logs.reduce((sum, log) => sum + (log.duration || 0), 0) / totalOperations;

    return {
      totalOperations,
      successRate: totalOperations > 0 ? successfulOps / totalOperations : 0,
      averageProcessingTime: avgTime || 0,
    };
  }

  async detectConflicts(): Promise<ConflictData[]> {
    const operations = this.getOperationQueue();
    const conflicts: ConflictData[] = [];
    
    // Group operations by entity ID
    const entityGroups = new Map<string, SyncMessage[]>();
    
    operations.forEach(op => {
      const entityId = op.data.id || op.id;
      if (!entityGroups.has(entityId)) {
        entityGroups.set(entityId, []);
      }
      entityGroups.get(entityId)!.push(op);
    });

    // Check for conflicts within each entity group
    entityGroups.forEach((ops, entityId) => {
      if (ops.length > 1) {
        const updateOps = ops.filter(op => op.type === 'UPDATE');
        if (updateOps.length > 1) {
          conflicts.push({
            entityId,
            entity: ops[0].entity,
            localData: updateOps[0].data,
            remoteData: updateOps[1].data,
            options: ['keep-local', 'keep-remote', 'merge'],
          });
        }
      }
    });

    return conflicts;
  }

  async autoMergeConflicts(): Promise<SyncResult> {
    const conflicts = await this.detectConflicts();
    let autoMerged = 0;
    let requiresUserInput = 0;

    for (const conflict of conflicts) {
      if (this.canAutoMerge(conflict)) {
        await this.performAutoMerge(conflict);
        autoMerged++;
      } else {
        requiresUserInput++;
      }
    }

    return {
      processed: conflicts.length,
      conflicts: [],
      errors: [],
      autoMerged,
      requiresUserInput,
    };
  }

  async resolveConflictWithUserChoice(
    conflict: ConflictData, 
    choice: string
  ): Promise<{ data: any; resolution: string }> {
    let resolvedData;
    
    switch (choice) {
      case 'keep-local':
        resolvedData = conflict.localData;
        break;
      case 'keep-remote':
        resolvedData = conflict.remoteData;
        break;
      case 'merge':
        resolvedData = { ...conflict.remoteData, ...conflict.localData };
        break;
      default:
        resolvedData = conflict.localData;
    }

    return {
      data: resolvedData,
      resolution: 'user-selected',
    };
  }

  async backupConflictData(conflictData: ConflictData): Promise<void> {
    const backups = JSON.parse(localStorage.getItem('conflict-backups') || '{}');
    backups[conflictData.entityId] = conflictData;
    localStorage.setItem('conflict-backups', JSON.stringify(backups));
  }

  async getConflictBackups(entityId: string): Promise<ConflictData[]> {
    const backups = JSON.parse(localStorage.getItem('conflict-backups') || '{}');
    return backups[entityId] ? [backups[entityId]] : [];
  }

  onSyncTriggered(callback: (trigger: string) => void): void {
    this.syncTriggeredListeners.push(callback);
  }

  onPeriodicSync(callback: (timestamp: number) => void): void {
    this.periodicSyncListeners.push(callback);
  }

  onOperationProcessed(callback: (id: string) => void): void {
    this.operationProcessedListeners.push(callback);
  }

  onRetryAttempt(callback: (attempt: number) => void): void {
    this.retryAttemptListeners.push(callback);
  }

  private getOperationQueue(): SyncMessage[] {
    const stored = localStorage.getItem('sync-queue');
    return stored ? JSON.parse(stored) : [];
  }

  private async getPendingOperations(): Promise<SyncMessage[]> {
    return this.getOperationQueue();
  }

  private async processOperation(operation: SyncMessage): Promise<void> {
    // Simulate API call
    const response = await fetch(`/api/${operation.entity}`, {
      method: operation.type === 'CREATE' ? 'POST' : 
              operation.type === 'UPDATE' ? 'PUT' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation.data),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }

    // Remove from queue on success
    this.removeFromQueue(operation.id);
    
    // Log the operation
    await this.logOperation(operation, 'success');
  }

  private async retryOperation(operation: SyncMessage): Promise<void> {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        retryCount++;
        this.retryAttemptListeners.forEach(callback => callback(retryCount));
        
        await this.processOperation(operation);
        return;
      } catch (error) {
        if (retryCount >= maxRetries) {
          await this.logOperation(operation, 'failure', error.message);
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }

  private removeFromQueue(operationId: string): void {
    const queue = this.getOperationQueue();
    const filteredQueue = queue.filter(op => op.id !== operationId);
    localStorage.setItem('sync-queue', JSON.stringify(filteredQueue));
  }

  private async logOperation(
    operation: SyncMessage, 
    result: 'success' | 'failure', 
    error?: string
  ): Promise<void> {
    const logs = await this.getSyncLogs();
    logs.push({
      operation,
      result,
      timestamp: Date.now(),
      duration: 100, // Simulate processing time
      error,
    });
    
    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.splice(0, logs.length - 100);
    }
    
    localStorage.setItem('sync-logs', JSON.stringify(logs));
  }

  private createConflictData(operation: SyncMessage, error: Error): ConflictData {
    return {
      entityId: operation.data.id || operation.id,
      entity: operation.entity,
      localData: operation.data,
      remoteData: {}, // Would be fetched from server
      options: ['keep-local', 'keep-remote', 'merge'],
    };
  }

  private canAutoMerge(conflict: ConflictData): boolean {
    // Simple auto-merge logic: can merge if no overlapping properties
    const localKeys = Object.keys(conflict.localData);
    const remoteKeys = Object.keys(conflict.remoteData);
    
    return localKeys.every(key => !remoteKeys.includes(key));
  }

  private async performAutoMerge(conflict: ConflictData): Promise<void> {
    const mergedData = { ...conflict.remoteData, ...conflict.localData };
    // Update the operation with merged data
    const queue = this.getOperationQueue();
    const operationIndex = queue.findIndex(op => 
      (op.data.id || op.id) === conflict.entityId
    );
    
    if (operationIndex >= 0) {
      queue[operationIndex].data = mergedData;
      localStorage.setItem('sync-queue', JSON.stringify(queue));
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.syncTriggeredListeners.forEach(callback => callback('connection-recovery'));
    });
  }
}