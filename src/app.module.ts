import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { CepModule } from './cep/cep.module'; 

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './environments/.dev.env', //for dev mode
    }),
    DatabaseModule,
    QueueModule,
    CepModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
