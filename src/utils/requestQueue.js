// utils/requestQueue.js
class RequestQueue {
    constructor(maxConcurrent = 3, delay = 100) {
      this.maxConcurrent = maxConcurrent;
      this.delay = delay;
      this.queue = [];
      this.activeCount = 0;
    }
  
    async enqueue(requestFn) {
      return new Promise((resolve, reject) => {
        this.queue.push({ requestFn, resolve, reject });
        this.process();
      });
    }
  
    async process() {
      if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
        return;
      }
  
      this.activeCount++;
      const { requestFn, resolve, reject } = this.queue.shift();
  
      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        this.activeCount--;
        // 添加延迟后再处理下一个请求
        setTimeout(() => this.process(), this.delay);
      }
    }
  }
  
  export const requestQueue = new RequestQueue(3, 200);