const Queue = require('bull');
const Redis = require('ioredis');

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Create Redis client for Bull
const createRedisClient = () => {
  return new Redis(redisConfig);
};

// Email blast queue with rate limiting
class QueueService {
  constructor() {
    this.emailBlastQueue = null;
    this.initialized = false;
  }

  // Initialize the queue service
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Create email blast queue
      this.emailBlastQueue = new Queue('email-blast', {
        createClient: (type) => {
          switch (type) {
            case 'client':
              return createRedisClient();
            case 'subscriber':
              return createRedisClient();
            case 'bclient':
              return createRedisClient();
            default:
              return createRedisClient();
          }
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 200, // Keep last 200 failed jobs
        },
        limiter: {
          max: 5, // Maximum 5 jobs
          duration: 1000, // Per 1 second (1000ms)
          bounceBack: false,
        },
      });

      // Set up event listeners
      this.emailBlastQueue.on('error', (error) => {
        console.error('📧 Email blast queue error:', error);
      });

      this.emailBlastQueue.on('waiting', (jobId) => {
        console.log(`📧 Job ${jobId} is waiting`);
      });

      this.emailBlastQueue.on('active', (job) => {
        console.log(`📧 Job ${job.id} is now active`);
      });

      this.emailBlastQueue.on('completed', (job, result) => {
        console.log(`📧 Job ${job.id} completed:`, result);
      });

      this.emailBlastQueue.on('failed', (job, err) => {
        console.error(`📧 Job ${job.id} failed:`, err.message);
      });

      this.initialized = true;
      console.log('📧 Queue service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize queue service:', error);
      throw error;
    }
  }

  // Add email blast job
  async addEmailBlastJob(data) {
    if (!this.initialized) {
      await this.initialize();
    }

    const job = await this.emailBlastQueue.add('send-email', data, {
      priority: data.priority || 1,
    });

    return {
      jobId: job.id,
      status: 'queued',
    };
  }

  // Get job status
  async getJobStatus(jobId) {
    if (!this.initialized) {
      await this.initialize();
    }

    const job = await this.emailBlastQueue.getJob(jobId);
    
    if (!job) {
      return {
        status: 'not_found',
        message: 'Job not found',
      };
    }

    const state = await job.getState();
    const progress = job.progress();
    const failedReason = job.failedReason;

    return {
      jobId: job.id,
      status: state,
      progress: progress,
      data: job.data,
      failedReason: failedReason,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
    };
  }

  // Get all jobs for a blast
  async getBlastJobs(blastId) {
    if (!this.initialized) {
      await this.initialize();
    }

    const jobs = await this.emailBlastQueue.getJobs([
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
    ]);

    const blastJobs = jobs.filter(job => job.data.blastId === blastId);

    const jobStatuses = await Promise.all(
      blastJobs.map(async (job) => {
        const state = await job.getState();
        return {
          jobId: job.id,
          status: state,
          progress: job.progress(),
          recipientEmail: job.data.recipientEmail,
          failedReason: job.failedReason,
        };
      })
    );

    return jobStatuses;
  }

  // Get blast summary
  async getBlastSummary(blastId) {
    const jobs = await this.getBlastJobs(blastId);

    const summary = {
      total: jobs.length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      active: jobs.filter(j => j.status === 'active').length,
      waiting: jobs.filter(j => j.status === 'waiting').length,
      jobs: jobs,
    };

    // Calculate overall status
    if (summary.completed === summary.total) {
      summary.overallStatus = 'completed';
    } else if (summary.failed === summary.total) {
      summary.overallStatus = 'failed';
    } else if (summary.active > 0 || summary.waiting > 0) {
      summary.overallStatus = 'processing';
    } else {
      summary.overallStatus = 'partial';
    }

    return summary;
  }

  // Clean old jobs
  async cleanOldJobs(gracePeriod = 24 * 60 * 60 * 1000) {
    if (!this.initialized) {
      await this.initialize();
    }

    await this.emailBlastQueue.clean(gracePeriod, 'completed');
    await this.emailBlastQueue.clean(gracePeriod, 'failed');
  }

  // Pause queue
  async pauseQueue() {
    if (!this.initialized) {
      await this.initialize();
    }

    await this.emailBlastQueue.pause();
    console.log('📧 Email blast queue paused');
  }

  // Resume queue
  async resumeQueue() {
    if (!this.initialized) {
      await this.initialize();
    }

    await this.emailBlastQueue.resume();
    console.log('📧 Email blast queue resumed');
  }

  // Close queue connections
  async close() {
    if (this.emailBlastQueue) {
      await this.emailBlastQueue.close();
      this.initialized = false;
      console.log('📧 Queue service closed');
    }
  }
}

// Export singleton instance
const queueService = new QueueService();
module.exports = queueService;

