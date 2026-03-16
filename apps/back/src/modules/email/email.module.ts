import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { EmailProcessor } from './email.processor'
import { EMAIL_QUEUE } from './email-queue.types'

@Module({
  imports: [
    BullModule.registerQueue({
      name: EMAIL_QUEUE,
    }),
  ],
  providers: [EmailProcessor],
  exports: [BullModule],
})
export class EmailModule {}
