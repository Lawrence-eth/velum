import { Runner, cre, text, ok, hexToBase64, type TeeRuntime } from '@chainlink/cre-sdk';
import { z } from 'zod';
import { batchSchema, evaluateBatch } from '../src/batch';

const configSchema = z.object({ schedule: z.string(), apiUrl: z.string().regex(/^https?:\/\/[a-zA-Z0-9.-]+(?::[0-9]+)?\//), consumer: z.string().regex(/^0x[0-9a-fA-F]{40}$/), chainId: z.literal(11155111), apiSecretId: z.string() });
type Config = z.infer<typeof configSchema>;
function onCron(runtime: TeeRuntime<Config>) {
  const secret = runtime.getSecret({ id: runtime.config.apiSecretId }).result().value;
  if (!secret) throw new Error('Missing API credential');
  const response = new cre.capabilities.HTTPClient().sendRequest(runtime, { url: runtime.config.apiUrl, method: 'GET', multiHeaders: { Authorization: { values: [`Bearer ${secret}`] } } }).result();
  if (!ok(response)) throw new Error('Accounting API unavailable');
  let batch;
  try { batch = batchSchema.parse(JSON.parse(text(response))); } catch { throw new Error('Invalid accounting response'); }
  for (const e of batch.entries) if (e.bundle.request.consumer !== runtime.config.consumer.toLowerCase() || e.bundle.request.chainId !== runtime.config.chainId) throw new Error('Unexpected payment domain');
  const result = evaluateBatch(batch, Math.floor(runtime.now().getTime() / 1000));
  // Never release labels, invoice keys, policy parameters, reasons, or ledger balances.
  runtime.usingTheDons().report({ encodedPayload: hexToBase64(result.encodedPayload), encoderName: 'evm', signingAlgo: 'ecdsa', hashingAlgo: 'keccak256' }).result();
  return JSON.stringify({ batchId: batch.batchId, manifest: result.manifest, encodedPayload: result.encodedPayload, reportGenerated: true, deliveryRequested: false });
}
export async function main() {
  const runner = await Runner.newRunner({ configSchema });
  await runner.run((config: Config) => [cre.handlerInTee(new cre.capabilities.CronCapability().trigger({ schedule: config.schedule }), onCron, [{ tee: 'nitro', regions: ['us-west-2'] }])]);
}
main();
