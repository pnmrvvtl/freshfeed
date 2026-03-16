import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import helmet from 'helmet'
import * as cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import type { Env } from './config/env.validation'
import * as fs from 'fs'
import * as path from 'path'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)

  app.use(cookieParser())

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: { maxAge: 31536000, includeSubDomains: true },
    }),
  )

  const configService = app.get(ConfigService<Env, true>)

  app.enableCors({
    origin: configService.get('FRONTEND_URL', { infer: true }),
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  )

  const config = new DocumentBuilder()
    .setTitle('TermSync API')
    .setDescription('TermSync API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('access_token')
    .build()

  const document = SwaggerModule.createDocument(app, config)

  if (process.env.SWAGGER_DUMP === 'true') {
    const outputPath = path.resolve(process.cwd(), '../../openapi.json')
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2))
    process.exit(0)
  }

  if (configService.get('NODE_ENV', { infer: true }) !== 'production') {
    SwaggerModule.setup('api/docs', app, document)
  }

  const port = configService.get('PORT', { infer: true })
  await app.listen(port)
}

bootstrap().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
