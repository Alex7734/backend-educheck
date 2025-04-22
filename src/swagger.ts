import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const setupSwagger = (app: INestApplication) => {
  const configService = app.get(ConfigService);
  const swaggerConfig = configService.get('swagger');

  const config = new DocumentBuilder()
    .setTitle(swaggerConfig.docTitle)
    .setDescription(swaggerConfig.docDescription)
    .setVersion(swaggerConfig.docVersion)
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    ignoreGlobalPrefix: true,
  });

  document.paths = Object.keys(document.paths).reduce((paths, path) => {
    const newPath = `/api${path}`;
    paths[newPath] = document.paths[path];
    return paths;
  }, {});

  const customOptions: SwaggerCustomOptions = {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: swaggerConfig.siteTitle,
  };

  SwaggerModule.setup('docs', app, document, customOptions);
};