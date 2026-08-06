type MutationTask = {
  id: string;
  key?: string; // Unique queue deduplication key, e.g., 'job_approve_123'
  execute: (idempotencyKey: string) => Promise<unknown>;
  rollback: () => void;
  status: 'pending' | 'running' | 'completed' | 'failed';
  idempotencyKey: string;
  attempts: number;
};

class MutationQueue {
  private queue: MutationTask[] = [];
  private isProcessing = false;
  private readonly MAX_QUEUE_SIZE = 50;
  private readonly MAX_RETRIES = 3;

  /**
   * Enqueues a mutation task.
   * Ensures that tasks with the same `key` cannot run concurrently.
   * Enforces a hard queue size cap of 50 to prevent memory exhaustion.
   * Automatically passes a unique `idempotencyKey` to the execute callback.
   * If the execution fails, the queue retries up to 3 times before rolling back.
   */
  async enqueue<T>(
    execute: (idempotencyKey: string) => Promise<T>,
    rollback: () => void,
    options?: { key?: string; idempotencyKey?: string }
  ): Promise<T> {
    const id = Math.random().toString(36).substring(7);

    // 1. Enforce max queue length boundary
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      console.warn(`[MutationQueue] Max queue threshold (${this.MAX_QUEUE_SIZE}) exceeded. Rejecting request.`);
      throw new Error('Server mutation queue is busy. Please try again in a moment.');
    }

    // 2. Deduplicate check: if a pending/running task shares the same key, reject
    if (options?.key) {
      const existing = this.queue.find(
        (t) => t.key === options.key && (t.status === 'pending' || t.status === 'running')
      );
      if (existing) {
        console.warn(`[MutationQueue] Rejected duplicate task for key: ${options.key}`);
        throw new Error('Duplicate mutation request is already in progress.');
      }
    }

    // 3. Resolve or generate idempotency key
    const idempotencyKey = 
      options?.idempotencyKey || 
      `idem_${options?.key || 'action'}_${Math.random().toString(36).substring(2, 15)}`;

    const task: MutationTask = {
      id,
      key: options?.key,
      execute,
      rollback,
      status: 'pending',
      idempotencyKey,
      attempts: 0
    };

    this.queue.push(task);

    return new Promise<T>((resolve, reject) => {
      this.processNext(resolve, reject);
    });
  }

  private async processNext(resolve: (value: any) => void, reject: (reason: any) => void) {
    if (this.isProcessing) return;

    const nextTask = this.queue.find((t) => t.status === 'pending');
    if (!nextTask) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    nextTask.status = 'running';

    console.log(`[MutationQueue] Executing task ${nextTask.id} (key: ${nextTask.key || 'none'}, idempotencyKey: ${nextTask.idempotencyKey})`);

    const executeWithRetry = async () => {
      try {
        nextTask.attempts++;
        const result = await nextTask.execute(nextTask.idempotencyKey);
        nextTask.status = 'completed';
        
        // Remove from queue on success
        this.queue = this.queue.filter((t) => t.id !== nextTask.id);
        resolve(result);
      } catch (error) {
        if (nextTask.attempts < this.MAX_RETRIES) {
          console.warn(`[MutationQueue] Task ${nextTask.id} failed (attempt ${nextTask.attempts}/${this.MAX_RETRIES}). Retrying in 1s...`, error);
          // Wait 1 second before retrying
          await new Promise(r => setTimeout(r, 1000));
          await executeWithRetry();
        } else {
          nextTask.status = 'failed';
          console.error(`[MutationQueue] Task ${nextTask.id} failed after max retry attempts (${this.MAX_RETRIES}/${this.MAX_RETRIES}). Initializing rollback...`, error);
          
          try {
            nextTask.rollback();
          } catch (rollbackError) {
            console.error(`[MutationQueue] Rollback execution failed for task ${nextTask.id}:`, rollbackError);
          }
          
          this.queue = this.queue.filter((t) => t.id !== nextTask.id);
          reject(error);
        }
      }
    };

    await executeWithRetry().finally(() => {
      this.isProcessing = false;
      // Yield execution context to allow subsequent tasks to proceed
      setTimeout(() => this.processNext(() => {}, () => {}), 0);
    });
  }

  /**
   * Cancels a pending task by its unique key.
   */
  cancel(key: string) {
    this.queue = this.queue.filter((t) => {
      if (t.key === key && t.status === 'pending') {
        console.log(`[MutationQueue] Cancelled pending task: ${key}`);
        return false;
      }
      return true;
    });
  }

  /**
   * Returns current size of the mutation queue.
   */
  getQueueSize(): number {
    return this.queue.length;
  }
}

export const mutationQueue = new MutationQueue();
