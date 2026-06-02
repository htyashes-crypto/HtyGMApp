/**
 * 指数退避重连器:1s → 2s → 4s → 8s → 16s → 30s 上限。
 * 由外部状态机决定何时启动 / 停止;本类只管下次延迟与定时回调。
 */
export class GmBridgeReconnector {
  private m_attempt = 0
  private m_timer: number | null = null
  private static readonly MAX_DELAY_MS = 30_000

  get attempt(): number { return this.m_attempt }

  /** 重置重试计数;连接成功时调用。 */
  reset(): void {
    this.m_attempt = 0
    this.cancel()
  }

  /** 调度下一次回调;返回此次延迟(毫秒)。 */
  schedule(callback: () => void): number {
    this.cancel()
    const delay = this.computeDelay()
    this.m_attempt++
    this.m_timer = window.setTimeout(() => {
      this.m_timer = null
      callback()
    }, delay)
    return delay
  }

  cancel(): void {
    if (this.m_timer != null) {
      window.clearTimeout(this.m_timer)
      this.m_timer = null
    }
  }

  private computeDelay(): number {
    const base = Math.min(GmBridgeReconnector.MAX_DELAY_MS, 1000 * Math.pow(2, this.m_attempt))
    return base
  }
}
