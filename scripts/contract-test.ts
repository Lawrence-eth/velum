import { VM } from '@ethereumjs/vm';
import { Common, Hardfork } from '@ethereumjs/common';
import { Address, Account } from '@ethereumjs/util';
import { Block } from '@ethereumjs/block';
import solc from 'solc';
import { encodeDeployData, encodeFunctionData, decodeFunctionResult, encodePacked, keccak256, toHex, hexToBytes, bytesToHex } from 'viem';
import { fixture } from '../src/fixtures';
import { encodeDecision } from '../src/policy';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('contracts/InvoiceGate.sol', 'utf8');
const output = JSON.parse(solc.compile(JSON.stringify({ language: 'Solidity', sources: { 'InvoiceGate.sol': { content: source } }, settings: { evmVersion: 'shanghai', optimizer: { enabled: true, runs: 200 }, outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } } } })));
const errors = output.errors?.filter((e: any) => e.severity === 'error') || [];
assert.equal(errors.length, 0, JSON.stringify(errors));
const contract = output.contracts['InvoiceGate.sol'].InvoiceGate;
const common = Common.custom({ chainId: 11155111 }, { hardfork: Hardfork.Shanghai });
const vm = await VM.create({ common });
const treasury = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as const;
const forwarder = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as const;
const attacker = '0xcccccccccccccccccccccccccccccccccccccccc' as const;
await vm.stateManager.putAccount(Address.fromString(treasury), Account.fromAccountData({ balance: 10n ** 20n }));
const workflowId = keccak256(toHex('veilpay-test-workflow'));
const now = Math.floor(Date.now() / 1000);
let timestamp = now;
const block = () => Block.fromBlockData({ header: { timestamp: BigInt(timestamp), gasLimit: 30000000n } }, { common });
const deployed = await vm.evm.runCall({ caller: Address.fromString(treasury), data: hexToBytes(encodeDeployData({ abi: contract.abi, bytecode: `0x${contract.evm.bytecode.object}`, args: [treasury, forwarder, workflowId] })), gasLimit: 10000000n, block: block() });
assert.equal(deployed.execResult.exceptionError, undefined);
const address = deployed.createdAddress!.toString() as `0x${string}`;
const metadata = encodePacked(['bytes32', 'bytes10', 'address', 'bytes2'], [workflowId, '0x00000000000000000000', treasury, '0x0000']);
const b = fixture('approved', now, address);
const send = async (fn: string, args: unknown[], account: string = treasury) => {
  const result = await vm.evm.runCall({ caller: Address.fromString(account), to: Address.fromString(address), data: hexToBytes(encodeFunctionData({ abi: contract.abi, functionName: fn, args })), gasLimit: 1000000n, block: block() });
  return { status: result.execResult.exceptionError ? 'reverted' : 'success', output: result.execResult.returnValue };
};
let checks = 0;
async function expectRevert(fn: string, args: unknown[], account: string = treasury) {
  const r = await send(fn, args, account); assert.equal(r.status, 'reverted', `Expected ${fn} to revert`); checks++;
}
async function status(id: `0x${string}`) { const r = await send('requests', [id]); return (decodeFunctionResult({ abi: contract.abi, functionName: 'requests', data: bytesToHex(r.output) }) as any)[2]; }
const registerArgs = [b.request.id, b.request.recipient, b.request.token, BigInt(b.request.amount), BigInt(b.request.expiresAt)];
try {
  await expectRevert('register', registerArgs, attacker);
  assert.equal((await send('register', registerArgs)).status, 'success'); checks++;
  await expectRevert('register', registerArgs);
  await expectRevert('consume', [b.request.id]);
  const report = encodeDecision(b, true);
  await expectRevert('onReport', [metadata, report], attacker);
  const badMetadata = encodePacked(['bytes32', 'bytes10', 'address'], [keccak256(toHex('other')), '0x00000000000000000000', treasury]);
  await expectRevert('onReport', [badMetadata, report], forwarder);
  const tampered = structuredClone(b); tampered.request.amount = '1';
  await expectRevert('onReport', [metadata, encodeDecision(tampered, true)], forwarder);
  const wrongDomain = structuredClone(b); wrongDomain.request.chainId = 1;
  await expectRevert('onReport', [metadata, encodeDecision(wrongDomain, true)], forwarder);
  assert.equal((await send('onReport', [metadata, report], forwarder)).status, 'success');
  assert.equal(await status(b.request.id), 2); checks++;
  await expectRevert('onReport', [metadata, report], forwarder);
  await expectRevert('consume', [b.request.id], attacker);
  assert.equal((await send('consume', [b.request.id])).status, 'success');
  assert.equal(await status(b.request.id), 4); checks++;
  await expectRevert('consume', [b.request.id]);
  const denied = fixture('over-limit', now, address);
  assert.equal((await send('register', [denied.request.id, denied.request.recipient, denied.request.token, BigInt(denied.request.amount), BigInt(denied.request.expiresAt)])).status, 'success');
  assert.equal((await send('onReport', [metadata, encodeDecision(denied, false)], forwarder)).status, 'success');
  assert.equal(await status(denied.request.id), 3); checks++;
  await expectRevert('consume', [denied.request.id]);
  const expired = fixture('duplicate', now, address); expired.request.expiresAt = now + 60;
  assert.equal((await send('register', [expired.request.id, expired.request.recipient, expired.request.token, BigInt(expired.request.amount), BigInt(expired.request.expiresAt)])).status, 'success');
  timestamp += 120;
  await expectRevert('onReport', [metadata, encodeDecision(expired, true)], forwarder);
  console.log(JSON.stringify({ success: true, checks, environment: 'In-memory EthereumJS EVM, mock forwarder caller; not Chainlink network delivery', compiler: solc.version(), contract: address }, null, 2));
} finally { /* In-memory execution only. */ }
