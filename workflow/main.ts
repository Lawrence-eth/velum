import { Runner } from '@chainlink/cre-sdk';
import { configSchema, initWorkflow } from './workflow';
const runner = await Runner.newRunner({ configSchema });
await runner.run(initWorkflow);
