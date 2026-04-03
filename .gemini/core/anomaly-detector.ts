import sqlite3 from 'sqlite3';
import { Logger } from './utils/logger.ts';
import { handleError } from './utils/errors.ts';

const logger = new Logger('AnomalyDetector');

/**
 * 🕵️ Proactive Anomaly Detector
 * Analyzes the roi_metrics table for deviations in performance.
 */
export class AnomalyDetector {
  private db: sqlite3.Database;

  constructor(dbPath: string = '.gemini/data/memory.db') {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        throw handleError(logger, err, 'Failed to connect to SQLite for anomaly detection');
      }
    });
  }

  /**
   * Analyze metrics for a specific project or all projects
   */
  async checkForAnomalies(projectId?: string): Promise<void> {
    try {
      const metrics = await this.getMetrics(projectId);
      if (metrics.length < 5) {
        logger.info('Insufficient data for anomaly detection. Minimum 5 records required.');
        return;
      }

      const groupedMetrics = this.groupMetricsByName(metrics);

      for (const [metricName, values] of Object.entries(groupedMetrics)) {
        this.analyzeMetricSeries(metricName, values);
      }
    } catch (e) {
      logger.error('Anomaly detection run failed', e);
    }
  }

  private async getMetrics(projectId?: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      let query = 'SELECT metric_name, value FROM roi_metrics';
      const params: any[] = [];
      if (projectId) {
        query += ' WHERE project_id = ?';
        params.push(projectId);
      }
      query += ' ORDER BY date DESC';

      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  private groupMetricsByName(metrics: any[]): Record<string, number[]> {
    return metrics.reduce((acc, curr) => {
      if (!acc[curr.metric_name]) acc[curr.metric_name] = [];
      acc[curr.metric_name].push(curr.value);
      return acc;
    }, {} as Record<string, number[]>);
  }

  private analyzeMetricSeries(name: string, values: number[]) {
    if (values.length < 3) return;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / values.length);
    const latestValue = values[0];
    const previousValue = values[1];

    // 1. Sudden Spike Check (40% increase)
    const percentChange = ((latestValue - previousValue) / previousValue);
    if (percentChange > 0.4) {
      logger.warn(`⚠️ ANOMALY DETECTED: Sudden spike in ${name}. Value increased by ${(percentChange * 100).toFixed(1)}% compared to previous record.`);
    }

    // 2. Statistical Deviation Check (Standard Deviation)
    // If the latest value is more than 2 standard deviations from the mean
    if (stdDev > 0 && Math.abs(latestValue - mean) > 2 * stdDev) {
      logger.warn(`⚠️ ANOMALY DETECTED: Statistical outlier in ${name}. Current value (${latestValue}) is >2 standard deviations from the mean (${mean.toFixed(2)}).`);
    }
  }
}
