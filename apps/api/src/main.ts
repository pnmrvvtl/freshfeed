import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import helmet from 'helmet'
import { AppModule } from './app.module'
import * as fs from 'fs'
import * as path from 'path'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { defaultSrc: ["'self'"] },
      },
      hsts: { maxAge: 31536000 },
    }),
  )

  app.enableCors({
    origin: process.env.FRONTEND_URL,
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

  SwaggerModule.setup('api/docs', app, document)

  const port = process.env.PORT ?? 3001
  await app.listen(port)
}

bootstrap().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
