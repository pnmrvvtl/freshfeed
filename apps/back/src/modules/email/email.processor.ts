import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import type { Job } from 'bullmq'
import { EMAIL_QUEUE } from './email-queue.types'
import type { EmailJobData } from './email-queue.types'

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name)

  process(job: Job<EmailJobData>): Promise<void> {
    const { data } = job

    if (data.type === 'verify-email') {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(
          `[DEV] Verify email link for ${data.email}: http://localhost:3000/verify-email?token=${data.token}`,
        )
      }
      return Promise.resolve()
    }

    if (data.type === 'welcome') {
      this.logger.log(`Sending welcome email to ${data.email}`)
      return Promise.resolve()
    }

    return Promise.resolve()
  }
}
