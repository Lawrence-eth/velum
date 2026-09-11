import { cre, hexToBase64, text, ok, getNetwork, TxStatus, bytesToHex, type TeeRuntime } from '@chainlink/cre-sdk';
import { z } from 'zod';
import { bundleSchema, evaluate, encodeDecision, paymentCommitment } from '../src/policy';

export const configSchema = z.object({
  schedule: z.string(), apiUrl: z.string().url(), apiSecretId: z.string(),
  consumer: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  chainId: z.literal(11155111), deliverOnchain: z.boolean(),
});
type Config = z.infer<typeof configSchema>;

export function onCron(runtime: TeeRuntime<Config>): string {
  const token = runtime.getSecret({ id: runtime.config.apiSecretId }).result().value;
  if (!token) throw new Error('Missing invoice API credential');
  const response = new cre.capabilities.HTTPClient().sendRequest(runtime, {
    url: runtime.config.apiUrl, method: 'GET',
    multiHeaders: { Authorization: { values: [`Bearer ${token}`] } },
  }).result();
  if (!ok(response)) throw new Error(`Invoice API failed (${response.statusCode})`);
  // Do not include raw response/schema errors in logs: they may contain invoice details.
  let bundle;
  try { bundle = bundleSchema.parse(JSON.parse(text(response))); }
  catch { throw new Error('Invalid invoice API response'); }
  if (bundle.request.chainId !== runtime.config.chainId || bundle.request.consumer !== runtime.config.consumer.toLowerCase()) {
    throw new Error('Payment domain does not match configured receiver');
  }
  const now = Math.floor(runtime.now().getTime() / 1000);
  const decision = evaluate(bundle, now);
  const encodedPayload = encodeDecision(bundle, decision.approved);
  // Only an opaque ID, payment commitment, verdict and expiry cross this boundary.
  // No private invoice/PO values, reasons, thresholds or API credentials leave it.
  const don = runtime.usingTheDons();
  const report = don.report({ encodedPayload: hexToBase64(encodedPayload), encoderName: 'evm', signingAlgo: 'ecdsa', hashingAlgo: 'keccak256' }).result();
  let txHash: string | undefined;
  if (runtime.config.deliverOnchain) {
    const network = getNetwork({ chainFamily: 'evm', chainSelectorName: 'ethereum-testnet-sepolia' });
    if (!network) throw new Error('Sepolia network unavailable');
    const result = new cre.capabilities.EVMClient(network.chainSelector.selector).writeReport(don, {
      receiver: runtime.config.consumer, report, gasConfig: { gasLimit: '500000' },
    }).result();
    if (result.txStatus !== TxStatus.SUCCESS) throw new Error('Report delivery failed');
    if (!result.txHash) throw new Error('Report delivery returned no transaction hash');
    txHash = bytesToHex(result.txHash);
  }
  return JSON.stringify({ requestId: bundle.request.id, commitment: paymentCommitment(bundle.request), approved: decision.approved, expiresAt: bundle.request.expiresAt, encodedPayload, reportGenerated: true, deliveryRequested: runtime.config.deliverOnchain, ...(txHash ? { txHash } : {}) });
}

export function initWorkflow(config: Config) {
  return [cre.handlerInTee(new cre.capabilities.CronCapability().trigger({ schedule: config.schedule }), onCron, [{ tee: 'nitro', regions: ['us-west-2'] }])];
}
