const API_BASE = '/api';

interface OfflineQueueItem {
  id: string;
  url: string;
  method: string;
  body: any;
  timestamp: number;
}

class ApiService {
  private token: string | null = null;
  private offlineQueueKey = 'medicare_offline_queue';

  constructor() {
    this.token = localStorage.getItem('medicare_token');
    window.addEventListener('online', () => {
      this.syncOfflineQueue();
    });
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('medicare_token', token);
    } else {
      localStorage.removeItem('medicare_token');
    }
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('medicare_token');
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);

      if (response.status === 401) {
        // If unauthorized, clear token and dispatch auth event
        this.setToken(null);
        window.dispatchEvent(new Event('auth_logout'));
        throw new Error('Unauthorized');
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      return data as T;
    } catch (error: any) {
      // If network offline and it's a dose response POST, queue it!
      if (!navigator.onLine && options.method === 'POST' && endpoint.includes('/respond')) {
        this.queueOfflineRequest(endpoint, options.method, options.body ? JSON.parse(options.body as string) : {});
        return { message: 'Action queued offline. Will sync when back online.', isOfflineQueued: true } as any;
      }
      throw error;
    }
  }

  private queueOfflineRequest(url: string, method: string, body: any) {
    const queue = this.getOfflineQueue();
    queue.push({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      url,
      method,
      body,
      timestamp: Date.now(),
    });
    localStorage.setItem(this.offlineQueueKey, JSON.stringify(queue));
    console.log('[Offline] Request queued for sync:', url);
  }

  private getOfflineQueue(): OfflineQueueItem[] {
    try {
      return JSON.parse(localStorage.getItem(this.offlineQueueKey) || '[]');
    } catch {
      return [];
    }
  }

  async syncOfflineQueue() {
    if (!navigator.onLine) return;
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return;

    console.log(`[Offline] Syncing ${queue.length} queued offline actions...`);
    const remaining: OfflineQueueItem[] = [];

    for (const item of queue) {
      try {
        await this.request(item.url, {
          method: item.method,
          body: JSON.stringify(item.body),
        });
      } catch (err) {
        console.error('[Offline] Failed to sync item:', item, err);
        remaining.push(item);
      }
    }

    localStorage.setItem(this.offlineQueueKey, JSON.stringify(remaining));
    if (remaining.length === 0) {
      console.log('[Offline] All offline actions synced successfully!');
    }
  }
}

export const api = new ApiService();

